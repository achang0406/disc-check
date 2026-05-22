-- Walk-in guests (no app profile) counted toward live headcount.

CREATE TABLE IF NOT EXISTS game_guests (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_guests_game_id_idx ON game_guests (game_id);

CREATE OR REPLACE FUNCTION enforce_guest_window()
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
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT weekday, start_time, timezone
  INTO v_weekday, v_start_time, v_timezone
  FROM games
  WHERE id = COALESCE(NEW.game_id, OLD.game_id);

  IF NOT is_game_live(v_weekday, v_start_time, v_timezone) THEN
    RAISE EXCEPTION 'Walk-in guests can only be added while the game is live';
  END IF;

  v_expected_cycle := get_current_occurrence_start(v_weekday, v_start_time, v_timezone);
  IF COALESCE(NEW.cycle_at, OLD.cycle_at) IS DISTINCT FROM v_expected_cycle THEN
    RAISE EXCEPTION 'Walk-in guest cycle mismatch';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS game_guests_enforce_window ON game_guests;
CREATE TRIGGER game_guests_enforce_window
  BEFORE INSERT OR UPDATE OR DELETE ON game_guests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_guest_window();

ALTER TABLE game_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guests_public_read" ON game_guests FOR SELECT USING (true);
CREATE POLICY "guests_public_insert" ON game_guests FOR INSERT WITH CHECK (true);
CREATE POLICY "guests_public_update" ON game_guests FOR UPDATE USING (true);
CREATE POLICY "guests_public_delete" ON game_guests FOR DELETE USING (true);

ALTER TABLE game_guests REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE game_guests;

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
END;
$$;
