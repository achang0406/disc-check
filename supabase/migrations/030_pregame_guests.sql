-- Allow named guests during pregame (RSVP window) as well as live walk-ins.
-- Reverted by 031_revert_pregame_guests.sql.

CREATE OR REPLACE FUNCTION enforce_guest_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_stored_cycle TIMESTAMPTZ;
  v_expected_cycle TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT weekday, start_time, timezone, rsvp_cycle_at
  INTO v_weekday, v_start_time, v_timezone, v_stored_cycle
  FROM games
  WHERE id = COALESCE(NEW.game_id, OLD.game_id);

  v_expected_cycle := get_current_occurrence_start(v_weekday, v_start_time, v_timezone);

  IF v_stored_cycle IS NOT NULL AND v_stored_cycle IS DISTINCT FROM v_expected_cycle THEN
    RAISE EXCEPTION 'Guests are locked until the weekly reset';
  END IF;

  IF is_game_live(v_weekday, v_start_time, v_timezone) THEN
    NULL;
  ELSIF is_rsvp_locked(v_weekday, v_start_time, v_timezone) THEN
    RAISE EXCEPTION 'Guests can only be added during pregame or while the game is live';
  END IF;

  IF COALESCE(NEW.cycle_at, OLD.cycle_at) IS DISTINCT FROM v_expected_cycle THEN
    RAISE EXCEPTION 'Guest cycle mismatch';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
