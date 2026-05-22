-- reset_game_rsvp_cycle must clear RSVPs and check-ins when the week rolls over.
-- Window enforcement triggers otherwise block those deletes outside the live window.

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
