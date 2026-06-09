-- Phase 2b-ii: game_push_state lifecycle + RSVP headcount maintenance (no enqueue).

CREATE TABLE IF NOT EXISTS game_push_state (
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  cycle_at TIMESTAMPTZ NOT NULL,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  target INTEGER NOT NULL,
  game_status TEXT NOT NULL,
  rsvp_headcount INTEGER NOT NULL DEFAULT 0,
  last_badge_milestone TEXT,
  last_phase TEXT,
  next_live_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, cycle_at)
);

CREATE INDEX IF NOT EXISTS game_push_state_next_live_at_idx
  ON game_push_state (next_live_at)
  WHERE next_live_at IS NOT NULL AND game_status <> 'cancelled';

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
    last_badge_milestone,
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
    last_badge_milestone = NULL,
    last_phase = NULL,
    next_live_at = EXCLUDED.next_live_at,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION reset_game_rsvp_cycle(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('disc_check.resetting_cycle', 'true', true);
  DELETE FROM game_guests WHERE game_id = p_game_id;
  DELETE FROM game_check_ins WHERE game_id = p_game_id;
  DELETE FROM rsvps WHERE game_id = p_game_id;
  UPDATE games SET rsvp_cycle_at = p_cycle WHERE id = p_game_id;
  PERFORM upsert_game_push_state_for_cycle(p_game_id, p_cycle);
END;
$$;

CREATE OR REPLACE FUNCTION sync_game_push_state_denorm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_live TIMESTAMPTZ;
BEGIN
  IF NEW.rsvp_cycle_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    v_next_live := NULL;
  ELSE
    v_next_live := NEW.rsvp_cycle_at;
  END IF;

  INSERT INTO game_push_state (
    game_id,
    cycle_at,
    group_id,
    target,
    game_status,
    next_live_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.rsvp_cycle_at,
    NEW.group_id,
    NEW.target,
    NEW.status,
    v_next_live,
    NOW()
  )
  ON CONFLICT (game_id, cycle_at) DO UPDATE SET
    group_id = EXCLUDED.group_id,
    target = EXCLUDED.target,
    game_status = EXCLUDED.game_status,
    next_live_at = EXCLUDED.next_live_at,
    updated_at = NOW();

  RETURN NEW;
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

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS rsvps_maintain_push_headcount ON rsvps;
DROP TRIGGER IF EXISTS rsvps_maintain_push_headcount_ins_del ON rsvps;
DROP TRIGGER IF EXISTS rsvps_maintain_push_headcount_update ON rsvps;

CREATE TRIGGER rsvps_maintain_push_headcount_ins_del
  AFTER INSERT OR DELETE ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION maintain_rsvp_push_headcount();

CREATE TRIGGER rsvps_maintain_push_headcount_update
  AFTER UPDATE OF plus_ones ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION maintain_rsvp_push_headcount();

DROP TRIGGER IF EXISTS games_sync_push_state ON games;
CREATE TRIGGER games_sync_push_state
  AFTER UPDATE OF status, target, weekday, start_time, timezone, group_id ON games
  FOR EACH ROW
  EXECUTE FUNCTION sync_game_push_state_denorm();

CREATE OR REPLACE FUNCTION admin_upsert_game(p_secret TEXT, p_game JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_group_id TEXT;
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_name TEXT;
  v_location TEXT;
  v_address TEXT;
  v_type TEXT;
  v_target INTEGER;
  v_status TEXT;
  v_cycle TIMESTAMPTZ;
  v_is_update BOOLEAN;
BEGIN
  v_group_id := NULLIF(trim(p_game->>'group_id'), '');
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'game group_id is required';
  END IF;

  PERFORM verify_group_admin_secret(v_group_id, p_secret);

  v_id := NULLIF(trim(p_game->>'id'), '');
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'game id is required';
  END IF;

  v_name := NULLIF(trim(p_game->>'name'), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'game name is required';
  END IF;

  v_location := NULLIF(trim(p_game->>'location'), '');
  IF v_location IS NULL THEN
    RAISE EXCEPTION 'game location is required';
  END IF;

  IF NOT (p_game ? 'weekday') OR jsonb_typeof(p_game->'weekday') = 'null' THEN
    RAISE EXCEPTION 'game weekday is required';
  END IF;

  IF p_game->>'start_time' IS NULL OR trim(p_game->>'start_time') = '' THEN
    RAISE EXCEPTION 'game start_time is required';
  END IF;

  v_weekday := (p_game->>'weekday')::SMALLINT;
  IF v_weekday < 0 OR v_weekday > 6 THEN
    RAISE EXCEPTION 'game weekday must be between 0 and 6';
  END IF;

  v_start_time := (p_game->>'start_time')::TIME;
  v_timezone := COALESCE(NULLIF(trim(p_game->>'timezone'), ''), 'America/Los_Angeles');
  v_type := COALESCE(NULLIF(trim(p_game->>'type'), ''), 'goaltimate');
  v_target := COALESCE((p_game->>'target')::integer, 8);
  v_status := COALESCE(NULLIF(trim(p_game->>'status'), ''), 'open');
  v_address := NULLIF(trim(COALESCE(p_game->>'address', '')), '');
  v_cycle := get_current_occurrence_start(v_weekday, v_start_time, v_timezone);
  v_is_update := EXISTS (SELECT 1 FROM games WHERE id = v_id);

  IF v_is_update THEN
    UPDATE games
    SET
      group_id = v_group_id,
      name = v_name,
      location = v_location,
      address = v_address,
      weekday = v_weekday,
      start_time = v_start_time,
      timezone = v_timezone,
      type = v_type,
      target = v_target,
      status = v_status
    WHERE id = v_id;

    PERFORM reset_game_rsvp_cycle(v_id, v_cycle);
  ELSE
    INSERT INTO games (
      id, group_id, name, location, address, weekday, start_time, timezone, type, target, status, rsvp_cycle_at
    ) VALUES (
      v_id,
      v_group_id,
      v_name,
      v_location,
      v_address,
      v_weekday,
      v_start_time,
      v_timezone,
      v_type,
      v_target,
      v_status,
      v_cycle
    );

    PERFORM upsert_game_push_state_for_cycle(v_id, v_cycle);
  END IF;
END;
$$;

-- Seed rows for existing games; headcount matches current RSVPs.
INSERT INTO game_push_state (
  game_id,
  cycle_at,
  group_id,
  target,
  game_status,
  rsvp_headcount,
  next_live_at,
  updated_at
)
SELECT
  g.id,
  g.rsvp_cycle_at,
  g.group_id,
  g.target,
  g.status,
  COALESCE((
    SELECT SUM(1 + r.plus_ones)::INTEGER
    FROM rsvps r
    WHERE r.game_id = g.id
  ), 0),
  CASE WHEN g.status = 'cancelled' THEN NULL ELSE g.rsvp_cycle_at END,
  NOW()
FROM games g
WHERE g.rsvp_cycle_at IS NOT NULL
ON CONFLICT (game_id, cycle_at) DO NOTHING;

REVOKE ALL ON FUNCTION upsert_game_push_state_for_cycle(TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_game_push_state_for_cycle(TEXT, TIMESTAMPTZ) TO service_role;
