-- Drop live-game bail/unbail exception from RSVP lock trigger.

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

  IF is_rsvp_locked(v_weekday, v_start_time, v_timezone) THEN
    RAISE EXCEPTION 'RSVP is locked while the game is live';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
