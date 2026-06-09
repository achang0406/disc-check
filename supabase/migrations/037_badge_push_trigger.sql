-- Phase 2b-iii: pregame badge enqueue on RSVP milestone upgrade (almost/go).

CREATE OR REPLACE FUNCTION enqueue_push_event(
  p_event_type TEXT,
  p_group_id TEXT,
  p_game_id TEXT DEFAULT NULL,
  p_exclude_subscriber_ids TEXT[] DEFAULT '{}',
  p_payload JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_group_id IS NULL OR trim(p_group_id) = '' THEN
    RAISE EXCEPTION 'enqueue_push_event requires group_id';
  END IF;

  IF p_event_type IS NULL OR trim(p_event_type) = '' THEN
    RAISE EXCEPTION 'enqueue_push_event requires event_type';
  END IF;

  INSERT INTO push_outbox (
    group_id,
    game_id,
    event_type,
    payload,
    exclude_subscriber_ids
  ) VALUES (
    p_group_id,
    p_game_id,
    p_event_type,
    p_payload,
    COALESCE(p_exclude_subscriber_ids, '{}')
  );
END;
$$;

CREATE OR REPLACE FUNCTION badge_milestone_rank(p_milestone TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_milestone
    WHEN 'almost' THEN 1
    WHEN 'go' THEN 2
    WHEN 'live_some' THEN 3
    WHEN 'live_full' THEN 4
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION compute_pregame_badge_milestone(p_headcount INTEGER, p_target INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_almost_threshold INTEGER;
BEGIN
  IF p_headcount >= p_target THEN
    RETURN 'go';
  END IF;

  v_almost_threshold := GREATEST(1, p_target - 2);

  IF p_headcount >= v_almost_threshold THEN
    RETURN 'almost';
  END IF;

  RETURN 'not';
END;
$$;

CREATE OR REPLACE FUNCTION supersede_pending_badge(p_game_id TEXT, p_new_rank INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_game_id IS NULL OR trim(p_game_id) = '' THEN
    RETURN;
  END IF;

  DELETE FROM push_outbox
  WHERE game_id = p_game_id
    AND processed_at IS NULL
    AND event_type IN ('badge_almost', 'badge_go', 'badge_live_some', 'badge_live_full')
    AND badge_milestone_rank(
      CASE event_type
        WHEN 'badge_almost' THEN 'almost'
        WHEN 'badge_go' THEN 'go'
        WHEN 'badge_live_some' THEN 'live_some'
        WHEN 'badge_live_full' THEN 'live_full'
        ELSE 'not'
      END
    ) < p_new_rank;
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

  v_new_milestone := compute_pregame_badge_milestone(v_headcount, v_target);
  v_last_rank := badge_milestone_rank(COALESCE(v_last_milestone, 'not'));
  v_new_rank := badge_milestone_rank(v_new_milestone);

  IF v_new_rank <= v_last_rank OR v_new_milestone = 'not' OR NOW() >= v_cycle THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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
    PERFORM enqueue_push_event('badge_go', v_group_id, v_game_id);
  END IF;

  UPDATE game_push_state
  SET
    last_badge_milestone = v_new_milestone,
    updated_at = NOW()
  WHERE game_id = v_game_id
    AND cycle_at = v_cycle;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION enqueue_push_event(TEXT, TEXT, TEXT, TEXT[], JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION enqueue_push_event(TEXT, TEXT, TEXT, TEXT[], JSONB) TO service_role;
REVOKE ALL ON FUNCTION badge_milestone_rank(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION compute_pregame_badge_milestone(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION supersede_pending_badge(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION supersede_pending_badge(TEXT, INTEGER) TO service_role;
