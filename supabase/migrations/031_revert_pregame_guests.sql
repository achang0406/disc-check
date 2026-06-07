-- Revert pregame guest adds; walk-ins remain live-only.

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
