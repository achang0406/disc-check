-- Run in Supabase SQL Editor after creating a project.
-- Dashboard → SQL → New query → paste and run.

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
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

CREATE OR REPLACE FUNCTION get_current_occurrence_start(p_starts_at TIMESTAMPTZ, p_now TIMESTAMPTZ DEFAULT NOW())
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  occurrence TIMESTAMPTZ := p_starts_at;
BEGIN
  WHILE occurrence + INTERVAL '24 hours' <= p_now LOOP
    occurrence := occurrence + INTERVAL '7 days';
  END LOOP;
  RETURN occurrence;
END;
$$;

CREATE OR REPLACE FUNCTION is_game_live(p_starts_at TIMESTAMPTZ, p_now TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  occurrence TIMESTAMPTZ;
BEGIN
  IF p_starts_at IS NULL THEN
    RETURN FALSE;
  END IF;

  occurrence := get_current_occurrence_start(p_starts_at, p_now);
  RETURN p_now >= occurrence AND p_now < occurrence + INTERVAL '24 hours';
END;
$$;

-- Weekly RSVP reset: clears signups when the pickup week rolls over (24h after game start, UTC).
CREATE OR REPLACE FUNCTION reset_game_rsvp_cycle(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  v_starts_at TIMESTAMPTZ;
  v_game_id TEXT;
BEGIN
  v_game_id := COALESCE(NEW.game_id, OLD.game_id);
  SELECT starts_at INTO v_starts_at FROM games WHERE id = v_game_id;

  IF is_game_live(v_starts_at) THEN
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
  v_starts_at TIMESTAMPTZ;
  v_expected_cycle TIMESTAMPTZ;
BEGIN
  SELECT starts_at INTO v_starts_at FROM games WHERE id = NEW.game_id;

  IF NOT is_game_live(v_starts_at) THEN
    RAISE EXCEPTION 'Check-in opens when the game starts';
  END IF;

  v_expected_cycle := get_current_occurrence_start(v_starts_at);
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
  v_starts_at TIMESTAMPTZ;
BEGIN
  SELECT starts_at INTO v_starts_at FROM games WHERE id = OLD.game_id;

  IF NOT is_game_live(v_starts_at) THEN
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

  IF p_game->>'starts_at' IS NULL THEN
    RAISE EXCEPTION 'game starts_at is required';
  END IF;

  INSERT INTO games (
    id, name, location, address, starts_at, type, target, status
  ) VALUES (
    v_id,
    trim(p_game->>'name'),
    trim(p_game->>'location'),
    NULLIF(trim(p_game->>'address'), ''),
    (p_game->>'starts_at')::timestamptz,
    COALESCE(NULLIF(trim(p_game->>'type'), ''), 'goaltimate'),
    COALESCE((p_game->>'target')::integer, 8),
    COALESCE(NULLIF(trim(p_game->>'status'), ''), 'open')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    address = EXCLUDED.address,
    starts_at = EXCLUDED.starts_at,
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
