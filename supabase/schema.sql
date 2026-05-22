-- Run in Supabase SQL Editor after creating a project.
-- Dashboard → SQL → New query → paste and run.

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  type TEXT NOT NULL DEFAULT 'goaltimate',
  target INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'open',
  rsvp_cycle_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rsvps (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  plus_ones INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, user_id)
);

CREATE INDEX IF NOT EXISTS rsvps_game_id_idx ON rsvps (game_id);

CREATE TABLE IF NOT EXISTS game_check_ins (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  plus_ones INTEGER NOT NULL DEFAULT 0,
  cycle_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, user_id, cycle_at)
);

CREATE INDEX IF NOT EXISTS game_check_ins_game_id_idx ON game_check_ins (game_id);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "games_public_read" ON games FOR SELECT USING (true);
CREATE POLICY "rsvps_public_read" ON rsvps FOR SELECT USING (true);
CREATE POLICY "rsvps_public_insert" ON rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "rsvps_public_update" ON rsvps FOR UPDATE USING (true);
CREATE POLICY "rsvps_public_delete" ON rsvps FOR DELETE USING (true);
CREATE POLICY "check_ins_public_read" ON game_check_ins FOR SELECT USING (true);
CREATE POLICY "check_ins_public_insert" ON game_check_ins FOR INSERT WITH CHECK (true);
CREATE POLICY "check_ins_public_update" ON game_check_ins FOR UPDATE USING (true);
CREATE POLICY "check_ins_public_delete" ON game_check_ins FOR DELETE USING (true);

ALTER TABLE rsvps REPLICA IDENTITY FULL;
ALTER TABLE games REPLICA IDENTITY FULL;
ALTER TABLE game_check_ins REPLICA IDENTITY FULL;

-- Enable Realtime for RSVP, game, and check-in live updates.
-- If these lines error because the tables are already added, that's OK.
ALTER PUBLICATION supabase_realtime ADD TABLE rsvps;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_check_ins;

CREATE OR REPLACE FUNCTION get_current_occurrence_start(
  p_weekday SMALLINT,
  p_start_time TIME,
  p_timezone TEXT,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  local_date DATE;
  local_dow INT;
  days_back INT;
  candidate_date DATE;
  occurrence TIMESTAMPTZ;
BEGIN
  IF p_weekday IS NULL OR p_start_time IS NULL OR p_timezone IS NULL THEN
    RETURN NULL;
  END IF;

  local_date := (p_now AT TIME ZONE p_timezone)::DATE;
  local_dow := EXTRACT(DOW FROM local_date)::INT;
  days_back := (local_dow - p_weekday + 7) % 7;
  candidate_date := local_date - days_back;

  occurrence := (candidate_date + p_start_time) AT TIME ZONE p_timezone;

  IF p_now < occurrence THEN
    candidate_date := candidate_date - 7;
    occurrence := (candidate_date + p_start_time) AT TIME ZONE p_timezone;
  END IF;

  WHILE occurrence + INTERVAL '24 hours' <= p_now LOOP
    candidate_date := candidate_date + 7;
    occurrence := (candidate_date + p_start_time) AT TIME ZONE p_timezone;
  END LOOP;

  RETURN occurrence;
END;
$$;

CREATE OR REPLACE FUNCTION is_game_live(
  p_weekday SMALLINT,
  p_start_time TIME,
  p_timezone TEXT,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  occurrence TIMESTAMPTZ;
BEGIN
  occurrence := get_current_occurrence_start(p_weekday, p_start_time, p_timezone, p_now);
  IF occurrence IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN p_now >= occurrence AND p_now < occurrence + INTERVAL '24 hours';
END;
$$;

-- Weekly RSVP reset: clears signups when the pickup week rolls over (24h after game start, UTC).
CREATE OR REPLACE FUNCTION is_cycle_reset_in_progress()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('disc_check.resetting_cycle', true), '') = 'true';
$$;

CREATE OR REPLACE FUNCTION reset_game_rsvp_cycle(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('disc_check.resetting_cycle', 'true', true);
  DELETE FROM game_check_ins WHERE game_id = p_game_id;
  DELETE FROM rsvps WHERE game_id = p_game_id;
  UPDATE games SET rsvp_cycle_at = p_cycle WHERE id = p_game_id;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_rsvp_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_game_id TEXT;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_game_id := COALESCE(NEW.game_id, OLD.game_id);
  SELECT weekday, start_time, timezone
  INTO v_weekday, v_start_time, v_timezone
  FROM games
  WHERE id = v_game_id;

  IF is_game_live(v_weekday, v_start_time, v_timezone) THEN
    RAISE EXCEPTION 'RSVP is locked while the game is live';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION enforce_check_in_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_expected_cycle TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN NEW;
  END IF;

  SELECT weekday, start_time, timezone
  INTO v_weekday, v_start_time, v_timezone
  FROM games
  WHERE id = NEW.game_id;

  IF NOT is_game_live(v_weekday, v_start_time, v_timezone) THEN
    RAISE EXCEPTION 'Check-in opens when the game starts';
  END IF;

  v_expected_cycle := get_current_occurrence_start(v_weekday, v_start_time, v_timezone);
  IF NEW.cycle_at IS DISTINCT FROM v_expected_cycle THEN
    RAISE EXCEPTION 'Check-in cycle mismatch';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_check_in_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN OLD;
  END IF;

  SELECT weekday, start_time, timezone
  INTO v_weekday, v_start_time, v_timezone
  FROM games
  WHERE id = OLD.game_id;

  IF NOT is_game_live(v_weekday, v_start_time, v_timezone) THEN
    RAISE EXCEPTION 'Check-in is closed';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS rsvps_enforce_window ON rsvps;
CREATE TRIGGER rsvps_enforce_window
  BEFORE INSERT OR UPDATE OR DELETE ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION enforce_rsvp_window();

DROP TRIGGER IF EXISTS game_check_ins_enforce_window ON game_check_ins;
CREATE TRIGGER game_check_ins_enforce_window
  BEFORE INSERT OR UPDATE ON game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_check_in_window();

DROP TRIGGER IF EXISTS game_check_ins_enforce_delete ON game_check_ins;
CREATE TRIGGER game_check_ins_enforce_delete
  BEFORE DELETE ON game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_check_in_delete();

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

GRANT EXECUTE ON FUNCTION reset_game_rsvp_cycle(TEXT, TIMESTAMPTZ) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION verify_admin_secret(p_secret TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_secret IS NULL OR NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_passcode' AND value = p_secret
  ) THEN
    RAISE EXCEPTION 'invalid admin passcode';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_upsert_game(p_secret TEXT, p_game JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_weekday SMALLINT;
BEGIN
  PERFORM verify_admin_secret(p_secret);

  v_id := p_game->>'id';
  IF v_id IS NULL OR trim(v_id) = '' THEN
    RAISE EXCEPTION 'game id is required';
  END IF;

  IF p_game->>'name' IS NULL OR trim(p_game->>'name') = '' THEN
    RAISE EXCEPTION 'game name is required';
  END IF;

  IF p_game->>'location' IS NULL OR trim(p_game->>'location') = '' THEN
    RAISE EXCEPTION 'game location is required';
  END IF;

  IF p_game->>'weekday' IS NULL THEN
    RAISE EXCEPTION 'game weekday is required';
  END IF;

  IF p_game->>'start_time' IS NULL OR trim(p_game->>'start_time') = '' THEN
    RAISE EXCEPTION 'game start_time is required';
  END IF;

  v_weekday := (p_game->>'weekday')::SMALLINT;
  IF v_weekday < 0 OR v_weekday > 6 THEN
    RAISE EXCEPTION 'game weekday must be between 0 and 6';
  END IF;

  INSERT INTO games (
    id, name, location, address, weekday, start_time, timezone, type, target, status
  ) VALUES (
    v_id,
    trim(p_game->>'name'),
    trim(p_game->>'location'),
    NULLIF(trim(p_game->>'address'), ''),
    v_weekday,
    (p_game->>'start_time')::TIME,
    COALESCE(NULLIF(trim(p_game->>'timezone'), ''), 'America/Los_Angeles'),
    COALESCE(NULLIF(trim(p_game->>'type'), ''), 'goaltimate'),
    COALESCE((p_game->>'target')::integer, 8),
    COALESCE(NULLIF(trim(p_game->>'status'), ''), 'open')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    address = EXCLUDED.address,
    weekday = EXCLUDED.weekday,
    start_time = EXCLUDED.start_time,
    timezone = EXCLUDED.timezone,
    type = EXCLUDED.type,
    target = EXCLUDED.target,
    status = EXCLUDED.status;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_game(p_secret TEXT, p_game_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM verify_admin_secret(p_secret);

  IF p_game_id IS NULL OR trim(p_game_id) = '' THEN
    RAISE EXCEPTION 'game id is required';
  END IF;

  DELETE FROM games WHERE id = p_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_upsert_game(TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_game(TEXT, TEXT) TO anon, authenticated, service_role;
