-- Phase 3c: check-in milestone pushes, pregame named guests, rsvp_* rename, drop RSVP live 3b paths.

ALTER TABLE game_push_state
  ADD COLUMN IF NOT EXISTS pregame_guest_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkin_headcount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checkin_badge_milestone TEXT;

ALTER TABLE game_guests
  ADD COLUMN IF NOT EXISTS guest_phase TEXT NOT NULL DEFAULT 'live';

ALTER TABLE game_guests
  DROP CONSTRAINT IF EXISTS game_guests_guest_phase_check;

ALTER TABLE game_guests
  ADD CONSTRAINT game_guests_guest_phase_check
  CHECK (guest_phase IN ('pregame', 'live'));

UPDATE game_guests SET guest_phase = 'live' WHERE guest_phase IS NULL OR guest_phase NOT IN ('pregame', 'live');

CREATE INDEX IF NOT EXISTS game_guests_game_cycle_phase_idx
  ON game_guests (game_id, cycle_at, guest_phase);

UPDATE push_outbox SET event_type = 'rsvp_almost'
WHERE event_type = 'badge_almost' AND processed_at IS NULL;

UPDATE push_outbox SET event_type = 'rsvp_go'
WHERE event_type = 'badge_go' AND processed_at IS NULL;

DELETE FROM push_outbox
WHERE processed_at IS NULL
  AND event_type IN ('badge_live_some', 'badge_live_full');

CREATE OR REPLACE FUNCTION compute_badge_milestone(p_headcount INTEGER, p_target INTEGER)
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

  IF p_headcount >= p_target THEN
    RETURN 'go';
  END IF;

  IF p_headcount >= GREATEST(1, p_target - 2) THEN
    RETURN 'almost';
  END IF;

  RETURN 'not';
END;
$$;

CREATE OR REPLACE FUNCTION rsvp_event_to_milestone(p_milestone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_milestone
    WHEN 'almost' THEN 'rsvp_almost'
    WHEN 'go' THEN 'rsvp_go'
    WHEN 'live_some' THEN 'rsvp_surge_some'
    WHEN 'live_full' THEN 'rsvp_surge_full'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION checkin_event_to_milestone(p_milestone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_milestone
    WHEN 'almost' THEN 'checkin_almost'
    WHEN 'go' THEN 'checkin_go'
    WHEN 'live_some' THEN 'checkin_live_some'
    WHEN 'live_full' THEN 'checkin_live_full'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION compute_pregame_badge_milestone(p_headcount INTEGER, p_target INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT compute_badge_milestone(p_headcount, p_target);
$$;

CREATE OR REPLACE FUNCTION supersede_pending_rsvp_badge(p_game_id TEXT, p_new_rank INTEGER)
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
    AND event_type IN (
      'rsvp_almost',
      'rsvp_go',
      'rsvp_surge_some',
      'rsvp_surge_full',
      'badge_almost',
      'badge_go'
    )
    AND badge_milestone_rank(
      CASE event_type
        WHEN 'rsvp_almost' THEN 'almost'
        WHEN 'rsvp_go' THEN 'go'
        WHEN 'rsvp_surge_some' THEN 'live_some'
        WHEN 'rsvp_surge_full' THEN 'live_full'
        WHEN 'badge_almost' THEN 'almost'
        WHEN 'badge_go' THEN 'go'
        ELSE 'not'
      END
    ) < p_new_rank;
END;
$$;

CREATE OR REPLACE FUNCTION supersede_pending_checkin_badge(p_game_id TEXT, p_new_rank INTEGER)
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
    AND event_type IN (
      'checkin_almost',
      'checkin_go',
      'checkin_live_some',
      'checkin_live_full'
    )
    AND badge_milestone_rank(
      CASE event_type
        WHEN 'checkin_almost' THEN 'almost'
        WHEN 'checkin_go' THEN 'go'
        WHEN 'checkin_live_some' THEN 'live_some'
        WHEN 'checkin_live_full' THEN 'live_full'
        ELSE 'not'
      END
    ) < p_new_rank;
END;
$$;

CREATE OR REPLACE FUNCTION try_enqueue_rsvp_badge_upgrade(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id TEXT;
  v_target INTEGER;
  v_rsvp_headcount INTEGER;
  v_pregame_guest_count INTEGER;
  v_total_headcount INTEGER;
  v_last_milestone TEXT;
  v_new_milestone TEXT;
  v_last_rank INTEGER;
  v_new_rank INTEGER;
BEGIN
  IF p_game_id IS NULL OR p_cycle IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOW() >= p_cycle THEN
    RETURN FALSE;
  END IF;

  SELECT group_id, target, rsvp_headcount, pregame_guest_count, last_badge_milestone
  INTO v_group_id, v_target, v_rsvp_headcount, v_pregame_guest_count, v_last_milestone
  FROM game_push_state
  WHERE game_id = p_game_id
    AND cycle_at = p_cycle;

  IF NOT FOUND OR v_group_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_total_headcount := COALESCE(v_rsvp_headcount, 0) + COALESCE(v_pregame_guest_count, 0);
  v_new_milestone := compute_badge_milestone(v_total_headcount, v_target);
  v_last_rank := badge_milestone_rank(COALESCE(v_last_milestone, 'not'));
  v_new_rank := badge_milestone_rank(v_new_milestone);

  IF v_new_rank <= v_last_rank OR v_new_milestone = 'not' THEN
    RETURN FALSE;
  END IF;

  PERFORM supersede_pending_rsvp_badge(p_game_id, v_new_rank);

  IF v_new_milestone = 'almost' THEN
    PERFORM enqueue_push_event(
      rsvp_event_to_milestone(v_new_milestone),
      v_group_id,
      p_game_id,
      '{}',
      jsonb_build_object(
        'headcount_at_enqueue', v_total_headcount,
        'target_at_enqueue', v_target
      )
    );
  ELSE
    PERFORM enqueue_push_event(
      rsvp_event_to_milestone(v_new_milestone),
      v_group_id,
      p_game_id,
      '{}',
      NULL
    );
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

CREATE OR REPLACE FUNCTION try_enqueue_checkin_badge_upgrade(p_game_id TEXT, p_cycle TIMESTAMPTZ)
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

  SELECT group_id, target, checkin_headcount, last_checkin_badge_milestone
  INTO v_group_id, v_target, v_headcount, v_last_milestone
  FROM game_push_state
  WHERE game_id = p_game_id
    AND cycle_at = p_cycle;

  IF NOT FOUND OR v_group_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_new_milestone := compute_badge_milestone(v_headcount, v_target);
  v_last_rank := badge_milestone_rank(COALESCE(v_last_milestone, 'not'));
  v_new_rank := badge_milestone_rank(v_new_milestone);

  IF v_new_rank <= v_last_rank OR v_new_milestone = 'not' THEN
    RETURN FALSE;
  END IF;

  PERFORM supersede_pending_checkin_badge(p_game_id, v_new_rank);

  IF v_new_milestone = 'almost' THEN
    PERFORM enqueue_push_event(
      checkin_event_to_milestone(v_new_milestone),
      v_group_id,
      p_game_id,
      '{}',
      jsonb_build_object(
        'headcount_at_enqueue', v_headcount,
        'target_at_enqueue', v_target
      )
    );
  ELSE
    PERFORM enqueue_push_event(
      checkin_event_to_milestone(v_new_milestone),
      v_group_id,
      p_game_id,
      '{}',
      NULL
    );
  END IF;

  UPDATE game_push_state
  SET
    last_checkin_badge_milestone = v_new_milestone,
    updated_at = NOW()
  WHERE game_id = p_game_id
    AND cycle_at = p_cycle;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_guest_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_stored_cycle TIMESTAMPTZ;
  v_occurrence TIMESTAMPTZ;
  v_in_live BOOLEAN;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT weekday, start_time, timezone, rsvp_cycle_at
  INTO v_weekday, v_start_time, v_timezone, v_stored_cycle
  FROM games
  WHERE id = COALESCE(NEW.game_id, OLD.game_id);

  v_occurrence := get_current_occurrence_start(v_weekday, v_start_time, v_timezone, NOW());

  IF v_stored_cycle IS NOT NULL AND v_stored_cycle IS DISTINCT FROM v_occurrence THEN
    RAISE EXCEPTION 'Guests are locked until the weekly reset';
  END IF;

  v_in_live := v_occurrence IS NOT NULL
    AND NOW() >= v_occurrence
    AND NOW() < v_occurrence + INTERVAL '3 hours';

  IF TG_OP = 'INSERT' THEN
    IF v_in_live THEN
      NEW.guest_phase := 'live';
    ELSIF v_occurrence IS NOT NULL AND NOW() < v_occurrence THEN
      NEW.guest_phase := 'pregame';
    ELSE
      RAISE EXCEPTION 'Guests can only be added during pregame or while the game is live';
    END IF;
  END IF;

  IF NOT v_in_live AND NOT (v_occurrence IS NOT NULL AND NOW() < v_occurrence) THEN
    RAISE EXCEPTION 'Guests can only be added during pregame or while the game is live';
  END IF;

  IF COALESCE(NEW.cycle_at, OLD.cycle_at) IS DISTINCT FROM v_occurrence THEN
    RAISE EXCEPTION 'Guest cycle mismatch';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION upsert_game_push_state_for_cycle(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id TEXT;
  v_target INTEGER;
  v_status TEXT;
  v_next_live TIMESTAMPTZ;
BEGIN
  IF p_cycle IS NULL THEN
    RETURN;
  END IF;

  SELECT group_id, target, status
  INTO v_group_id, v_target, v_status
  FROM games
  WHERE id = p_game_id;

  IF v_group_id IS NULL THEN
    RETURN;
  END IF;

  IF v_status = 'cancelled' THEN
    v_next_live := NULL;
  ELSE
    v_next_live := p_cycle;
  END IF;

  INSERT INTO game_push_state (
    game_id,
    cycle_at,
    group_id,
    target,
    game_status,
    rsvp_headcount,
    pregame_guest_count,
    checkin_headcount,
    last_badge_milestone,
    last_checkin_badge_milestone,
    last_phase,
    next_live_at,
    updated_at
  ) VALUES (
    p_game_id,
    p_cycle,
    v_group_id,
    v_target,
    v_status,
    0,
    0,
    0,
    NULL,
    NULL,
    NULL,
    v_next_live,
    NOW()
  )
  ON CONFLICT (game_id, cycle_at) DO UPDATE SET
    group_id = EXCLUDED.group_id,
    target = EXCLUDED.target,
    game_status = EXCLUDED.game_status,
    rsvp_headcount = 0,
    pregame_guest_count = 0,
    checkin_headcount = 0,
    last_badge_milestone = NULL,
    last_checkin_badge_milestone = NULL,
    last_phase = NULL,
    next_live_at = EXCLUDED.next_live_at,
    updated_at = NOW();
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

  IF NOW() < v_cycle THEN
    PERFORM try_enqueue_rsvp_badge_upgrade(v_game_id, v_cycle);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION maintain_pregame_guest_push_headcount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id TEXT;
  v_cycle TIMESTAMPTZ;
  v_delta INTEGER;
  v_phase TEXT;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_game_id := COALESCE(NEW.game_id, OLD.game_id);
  v_phase := COALESCE(NEW.guest_phase, OLD.guest_phase);

  IF v_phase IS DISTINCT FROM 'pregame' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_delta := 1;
  ELSE
    v_delta := -1;
  END IF;

  SELECT rsvp_cycle_at INTO v_cycle
  FROM games
  WHERE id = v_game_id;

  IF v_cycle IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO game_push_state (game_id, cycle_at, group_id, target, game_status, pregame_guest_count, updated_at)
  SELECT v_game_id, v_cycle, g.group_id, g.target, g.status, v_delta, NOW()
  FROM games g
  WHERE g.id = v_game_id
  ON CONFLICT (game_id, cycle_at) DO UPDATE SET
    pregame_guest_count = game_push_state.pregame_guest_count + EXCLUDED.pregame_guest_count,
    updated_at = NOW();

  IF NOW() < v_cycle THEN
    PERFORM try_enqueue_rsvp_badge_upgrade(v_game_id, v_cycle);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION maintain_checkin_push_headcount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id TEXT;
  v_cycle TIMESTAMPTZ;
  v_delta INTEGER;
  v_guest_phase TEXT;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'game_check_ins' THEN
    v_game_id := COALESCE(NEW.game_id, OLD.game_id);
    v_cycle := COALESCE(NEW.cycle_at, OLD.cycle_at);

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
  ELSE
    v_game_id := COALESCE(NEW.game_id, OLD.game_id);
    v_cycle := COALESCE(NEW.cycle_at, OLD.cycle_at);
    v_guest_phase := COALESCE(NEW.guest_phase, OLD.guest_phase);

    IF v_guest_phase IS DISTINCT FROM 'live' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
      v_delta := 1;
    ELSE
      v_delta := -1;
    END IF;
  END IF;

  INSERT INTO game_push_state (game_id, cycle_at, group_id, target, game_status, checkin_headcount, updated_at)
  SELECT v_game_id, v_cycle, g.group_id, g.target, g.status, v_delta, NOW()
  FROM games g
  WHERE g.id = v_game_id
  ON CONFLICT (game_id, cycle_at) DO UPDATE SET
    checkin_headcount = game_push_state.checkin_headcount + EXCLUDED.checkin_headcount,
    updated_at = NOW();

  IF v_cycle IS NOT NULL
     AND NOW() >= v_cycle
     AND NOW() < v_cycle + INTERVAL '3 hours' THEN
    PERFORM try_enqueue_checkin_badge_upgrade(v_game_id, v_cycle);
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

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


CREATE OR REPLACE FUNCTION supersede_pending_badge(p_game_id TEXT, p_new_rank INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM supersede_pending_rsvp_badge(p_game_id, p_new_rank);
END;
$$;


-- Backfill incremental headcounts for current-cycle rows.
UPDATE game_push_state gps
SET pregame_guest_count = COALESCE(src.cnt, 0)
FROM (
  SELECT game_id, cycle_at, COUNT(*)::INTEGER AS cnt
  FROM game_guests
  WHERE guest_phase = 'pregame'
  GROUP BY game_id, cycle_at
) src
WHERE gps.game_id = src.game_id
  AND gps.cycle_at = src.cycle_at;

UPDATE game_push_state gps
SET checkin_headcount = COALESCE((
  SELECT SUM(1 + ci.plus_ones)::INTEGER
  FROM game_check_ins ci
  WHERE ci.game_id = gps.game_id
    AND ci.cycle_at = gps.cycle_at
), 0) + COALESCE((
  SELECT COUNT(*)::INTEGER
  FROM game_guests gg
  WHERE gg.game_id = gps.game_id
    AND gg.cycle_at = gps.cycle_at
    AND gg.guest_phase = 'live'
), 0);

DROP TRIGGER IF EXISTS game_guests_maintain_pregame_push_headcount ON game_guests;
CREATE TRIGGER game_guests_maintain_pregame_push_headcount
  AFTER INSERT OR DELETE ON game_guests
  FOR EACH ROW
  EXECUTE FUNCTION maintain_pregame_guest_push_headcount();

DROP TRIGGER IF EXISTS game_check_ins_maintain_push_headcount_ins_del ON game_check_ins;
DROP TRIGGER IF EXISTS game_check_ins_maintain_push_headcount_update ON game_check_ins;

CREATE TRIGGER game_check_ins_maintain_push_headcount_ins_del
  AFTER INSERT OR DELETE ON game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION maintain_checkin_push_headcount();

CREATE TRIGGER game_check_ins_maintain_push_headcount_update
  AFTER UPDATE OF plus_ones ON game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION maintain_checkin_push_headcount();

DROP TRIGGER IF EXISTS game_guests_maintain_live_push_headcount ON game_guests;
CREATE TRIGGER game_guests_maintain_live_push_headcount
  AFTER INSERT OR DELETE ON game_guests
  FOR EACH ROW
  EXECUTE FUNCTION maintain_checkin_push_headcount();

DROP FUNCTION IF EXISTS try_enqueue_live_badge_upgrade(TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS compute_live_badge_milestone(INTEGER, INTEGER);

REVOKE ALL ON FUNCTION compute_badge_milestone(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION rsvp_event_to_milestone(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION checkin_event_to_milestone(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION compute_pregame_badge_milestone(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION supersede_pending_badge(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION supersede_pending_rsvp_badge(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION supersede_pending_checkin_badge(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION try_enqueue_rsvp_badge_upgrade(TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION try_enqueue_checkin_badge_upgrade(TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION supersede_pending_rsvp_badge(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION supersede_pending_checkin_badge(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION try_enqueue_rsvp_badge_upgrade(TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION try_enqueue_checkin_badge_upgrade(TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION compute_badge_milestone(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION supersede_pending_badge(TEXT, INTEGER) TO service_role;
