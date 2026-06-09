-- Rollback Phase 2b-iii: remove badge enqueue; restore headcount-only maintain function.

CREATE OR REPLACE FUNCTION enqueue_push_event(
  p_event_type TEXT,
  p_group_id TEXT,
  p_game_id TEXT DEFAULT NULL,
  p_exclude_subscriber_ids TEXT[] DEFAULT '{}'
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
    NULL,
    COALESCE(p_exclude_subscriber_ids, '{}')
  );
END;
$$;

REVOKE ALL ON FUNCTION enqueue_push_event(TEXT, TEXT, TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION enqueue_push_event(TEXT, TEXT, TEXT, TEXT[]) TO service_role;

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
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP FUNCTION IF EXISTS supersede_pending_badge(TEXT, INTEGER);
DROP FUNCTION IF EXISTS compute_pregame_badge_milestone(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS badge_milestone_rank(TEXT);

UPDATE game_push_state
SET
  last_badge_milestone = NULL,
  updated_at = NOW()
WHERE last_badge_milestone IS NOT NULL;

DELETE FROM push_outbox
WHERE processed_at IS NULL
  AND event_type IN ('badge_almost', 'badge_go', 'badge_live_some', 'badge_live_full');
