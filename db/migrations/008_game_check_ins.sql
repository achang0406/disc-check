-- Live-game check-ins ("who's here") and RSVP lock at game start.

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

ALTER TABLE game_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "check_ins_public_read" ON game_check_ins FOR SELECT USING (true);
CREATE POLICY "check_ins_public_insert" ON game_check_ins FOR INSERT WITH CHECK (true);
CREATE POLICY "check_ins_public_update" ON game_check_ins FOR UPDATE USING (true);
CREATE POLICY "check_ins_public_delete" ON game_check_ins FOR DELETE USING (true);

ALTER TABLE game_check_ins REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE game_check_ins;
