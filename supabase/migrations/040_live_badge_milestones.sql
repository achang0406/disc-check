-- Phase 3b: live-window badge milestones (live_some / live_full) + catch-up at phase_live.

CREATE OR REPLACE FUNCTION compute_live_badge_milestone(p_headcount INTEGER, p_target INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_live_some INTEGER;
  v_live_full INTEGER;
BEGIN
  v_live_some := CEIL(p_target * 1.5)::INTEGER;
  v_live_full := CEIL(p_target * 2.0)::INTEGER;

  IF p_headcount >= v_live_full THEN
    RETURN 'live_full';
  END IF;

  IF p_headcount >= v_live_some THEN
    RETURN 'live_some';
  END IF;

  RETURN 'not';
END;
$$;

CREATE OR REPLACE FUNCTION try_enqueue_live_badge_upgrade(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id TEXT;
  v_target INTEGER;
  v_headcount INTEGER;
  v_last_milestone TEXT;
  v_new_milestone TEXT;
  v_last_rank INTEGER;
  v_new_rank INTEGER;
BEGIN
  IF p_game_id IS NULL OR p_cycle IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOW() < p_cycle OR NOW() >= p_cycle + INTERVAL '3 hours' THEN
    RETURN FALSE;
  END IF;

  SELECT group_id, target, rsvp_headcount, last_badge_milestone
  INTO v_group_id, v_target, v_headcount, v_last_milestone
  FROM game_push_state
  WHERE game_id = p_game_id
    AND cycle_at = p_cycle;

  IF NOT FOUND OR v_group_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_new_milestone := compute_live_badge_milestone(v_headcount, v_target);
  v_last_rank := badge_milestone_rank(COALESCE(v_last_milestone, 'not'));
  v_new_rank := badge_milestone_rank(v_new_milestone);

  IF v_new_rank <= v_last_rank OR v_new_milestone = 'not' THEN
    RETURN FALSE;
  END IF;

  PERFORM supersede_pending_badge(p_game_id, v_new_rank);

  IF v_new_milestone = 'live_some' THEN
    PERFORM enqueue_push_event('badge_live_some', v_group_id, p_game_id, '{}', NULL);
  ELSIF v_new_milestone = 'live_full' THEN
    PERFORM enqueue_push_event('badge_live_full', v_group_id, p_game_id, '{}', NULL);
  END IF;

  UPDATE game_push_state
  SET
    last_badge_milestone = v_new_milestone,
    updated_at = NOW()
  WHERE game_id = p_game_id
    AND cycle_at = p_cycle;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION maintain_rsvp_push_headcount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id TEXT;
  v_delta INTEGER;
  v_cycle TIMESTAMPTZ;
  v_group_id TEXT;
  v_target INTEGER;
  v_status TEXT;
  v_next_live TIMESTAMPTZ;
  v_headcount INTEGER;
  v_last_milestone TEXT;
  v_new_milestone TEXT;
  v_last_rank INTEGER;
  v_new_rank INTEGER;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_game_id := COALESCE(NEW.game_id, OLD.game_id);

  IF TG_OP = 'INSERT' THEN
    v_delta := 1 + NEW.plus_ones;
  ELSIF TG_OP = 'DELETE' THEN
    v_delta := -(1 + OLD.plus_ones);
  ELSE
    v_delta := (1 + NEW.plus_ones) - (1 + OLD.plus_ones);
    IF v_delta = 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT rsvp_cycle_at, group_id, target, status
  INTO v_cycle, v_group_id, v_target, v_status
  FROM games
  WHERE id = v_game_id;

  IF v_cycle IS NULL OR v_status = 'cancelled' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_next_live := v_cycle;

  INSERT INTO game_push_state (
    game_id,
    cycle_at,
    group_id,
    target,
    game_status,
    rsvp_headcount,
    next_live_at,
    updated_at
  ) VALUES (
    v_game_id,
    v_cycle,
    v_group_id,
    v_target,
    v_status,
    v_delta,
    v_next_live,
    NOW()
  )
  ON CONFLICT (game_id, cycle_at) DO UPDATE SET
    rsvp_headcount = game_push_state.rsvp_headcount + EXCLUDED.rsvp_headcount,
    updated_at = NOW()
  RETURNING
    rsvp_headcount,
    last_badge_milestone,
    group_id,
    target
  INTO
    v_headcount,
    v_last_milestone,
    v_group_id,
    v_target;

  IF NOW() < v_cycle THEN
    v_new_milestone := compute_pregame_badge_milestone(v_headcount, v_target);
    v_last_rank := badge_milestone_rank(COALESCE(v_last_milestone, 'not'));
    v_new_rank := badge_milestone_rank(v_new_milestone);

    IF v_new_rank > v_last_rank AND v_new_milestone <> 'not' THEN
      PERFORM supersede_pending_badge(v_game_id, v_new_rank);

      IF v_new_milestone = 'almost' THEN
        PERFORM enqueue_push_event(
          'badge_almost',
          v_group_id,
          v_game_id,
          '{}',
          jsonb_build_object(
            'headcount_at_enqueue', v_headcount,
            'target_at_enqueue', v_target
          )
        );
      ELSIF v_new_milestone = 'go' THEN
        PERFORM enqueue_push_event('badge_go', v_group_id, v_game_id, '{}', NULL);
      END IF;

      UPDATE game_push_state
      SET
        last_badge_milestone = v_new_milestone,
        updated_at = NOW()
      WHERE game_id = v_game_id
        AND cycle_at = v_cycle;
    END IF;
  ELSIF NOW() < v_cycle + INTERVAL '3 hours' THEN
    PERFORM try_enqueue_live_badge_upgrade(v_game_id, v_cycle);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION enqueue_due_phase_live_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_next_live TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT
      gps.game_id,
      gps.cycle_at,
      gps.group_id,
      g.weekday,
      g.start_time,
      g.timezone
    FROM game_push_state gps
    INNER JOIN games g ON g.id = gps.game_id
    WHERE gps.next_live_at IS NOT NULL
      AND gps.next_live_at <= NOW()
      AND gps.game_status <> 'cancelled'
      AND g.status = 'open'
      AND g.rsvp_cycle_at = gps.cycle_at
      AND gps.last_phase IS DISTINCT FROM 'live'
    FOR UPDATE OF gps SKIP LOCKED
  LOOP
    PERFORM enqueue_push_event('phase_live', v_row.group_id, v_row.game_id, '{}', NULL);

    v_next_live := get_current_occurrence_start(
      v_row.weekday,
      v_row.start_time,
      v_row.timezone,
      v_row.cycle_at + INTERVAL '7 days'
    );

    UPDATE game_push_state
    SET
      last_phase = 'live',
      next_live_at = v_next_live,
      updated_at = NOW()
    WHERE game_id = v_row.game_id
      AND cycle_at = v_row.cycle_at;

    PERFORM try_enqueue_live_badge_upgrade(v_row.game_id, v_row.cycle_at);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION compute_live_badge_milestone(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION try_enqueue_live_badge_upgrade(TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION try_enqueue_live_badge_upgrade(TEXT, TIMESTAMPTZ) TO service_role;
