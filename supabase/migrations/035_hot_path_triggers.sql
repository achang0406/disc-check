-- Phase 2b-i: deduped enforce functions (one occurrence per write) + narrow UPDATE triggers.
-- Skips name-only renameRsvps updates on rsvps and game_check_ins.

CREATE OR REPLACE FUNCTION enforce_rsvp_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_game_id TEXT;
  v_stored_cycle TIMESTAMPTZ;
  v_occurrence TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_game_id := COALESCE(NEW.game_id, OLD.game_id);
  SELECT weekday, start_time, timezone, rsvp_cycle_at
  INTO v_weekday, v_start_time, v_timezone, v_stored_cycle
  FROM games
  WHERE id = v_game_id;

  v_occurrence := get_current_occurrence_start(v_weekday, v_start_time, v_timezone, NOW());

  IF v_stored_cycle IS NOT NULL AND v_stored_cycle IS DISTINCT FROM v_occurrence THEN
    RAISE EXCEPTION 'RSVP is locked until the weekly reset';
  END IF;

  IF v_occurrence IS NOT NULL
     AND NOW() >= v_occurrence
     AND NOW() < v_occurrence + INTERVAL '12 hours' THEN
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
  v_occurrence TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN NEW;
  END IF;

  SELECT weekday, start_time, timezone
  INTO v_weekday, v_start_time, v_timezone
  FROM games
  WHERE id = NEW.game_id;

  v_occurrence := get_current_occurrence_start(v_weekday, v_start_time, v_timezone, NOW());

  IF v_occurrence IS NULL
     OR NOT (NOW() >= v_occurrence AND NOW() < v_occurrence + INTERVAL '3 hours') THEN
    RAISE EXCEPTION 'Check-in opens when the game starts';
  END IF;

  IF NEW.cycle_at IS DISTINCT FROM v_occurrence THEN
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
  v_occurrence TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN OLD;
  END IF;

  SELECT weekday, start_time, timezone
  INTO v_weekday, v_start_time, v_timezone
  FROM games
  WHERE id = OLD.game_id;

  v_occurrence := get_current_occurrence_start(v_weekday, v_start_time, v_timezone, NOW());

  IF v_occurrence IS NULL
     OR NOT (NOW() >= v_occurrence AND NOW() < v_occurrence + INTERVAL '3 hours') THEN
    RAISE EXCEPTION 'Check-in is closed';
  END IF;

  RETURN OLD;
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
  v_occurrence TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT weekday, start_time, timezone
  INTO v_weekday, v_start_time, v_timezone
  FROM games
  WHERE id = COALESCE(NEW.game_id, OLD.game_id);

  v_occurrence := get_current_occurrence_start(v_weekday, v_start_time, v_timezone, NOW());

  IF v_occurrence IS NULL
     OR NOT (NOW() >= v_occurrence AND NOW() < v_occurrence + INTERVAL '3 hours') THEN
    RAISE EXCEPTION 'Walk-in guests can only be added while the game is live';
  END IF;

  IF COALESCE(NEW.cycle_at, OLD.cycle_at) IS DISTINCT FROM v_occurrence THEN
    RAISE EXCEPTION 'Walk-in guest cycle mismatch';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS rsvps_enforce_window ON rsvps;
DROP TRIGGER IF EXISTS rsvps_enforce_window_insert_delete ON rsvps;
DROP TRIGGER IF EXISTS rsvps_enforce_window_update ON rsvps;

CREATE TRIGGER rsvps_enforce_window_insert_delete
  BEFORE INSERT OR DELETE ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION enforce_rsvp_window();

CREATE TRIGGER rsvps_enforce_window_update
  BEFORE UPDATE OF plus_ones, bringing_kit, game_id, user_id ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION enforce_rsvp_window();

DROP TRIGGER IF EXISTS game_check_ins_enforce_window ON game_check_ins;
DROP TRIGGER IF EXISTS game_check_ins_enforce_insert ON game_check_ins;
DROP TRIGGER IF EXISTS game_check_ins_enforce_update ON game_check_ins;

CREATE TRIGGER game_check_ins_enforce_insert
  BEFORE INSERT ON game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_check_in_window();

CREATE TRIGGER game_check_ins_enforce_update
  BEFORE UPDATE OF plus_ones, bringing_kit, game_id, user_id, cycle_at ON game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_check_in_window();

DROP TRIGGER IF EXISTS game_check_ins_enforce_delete ON game_check_ins;
CREATE TRIGGER game_check_ins_enforce_delete
  BEFORE DELETE ON game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_check_in_delete();

DROP TRIGGER IF EXISTS game_guests_enforce_window ON game_guests;
DROP TRIGGER IF EXISTS game_guests_enforce_insert_delete ON game_guests;
DROP TRIGGER IF EXISTS game_guests_enforce_update ON game_guests;

CREATE TRIGGER game_guests_enforce_insert_delete
  BEFORE INSERT OR DELETE ON game_guests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_guest_window();

CREATE TRIGGER game_guests_enforce_update
  BEFORE UPDATE OF game_id, cycle_at ON game_guests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_guest_window();
