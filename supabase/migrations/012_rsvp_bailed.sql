-- Mark RSVP names as bailed during live games (no-show), without removing the signup.

ALTER TABLE rsvps
  ADD COLUMN IF NOT EXISTS bailed BOOLEAN NOT NULL DEFAULT false;

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
    IF TG_OP = 'UPDATE'
       AND NEW.game_id IS NOT DISTINCT FROM OLD.game_id
       AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
       AND NEW.name IS NOT DISTINCT FROM OLD.name
       AND NEW.plus_ones IS NOT DISTINCT FROM OLD.plus_ones
       AND NEW.bailed IS DISTINCT FROM OLD.bailed THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'RSVP is locked while the game is live';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
