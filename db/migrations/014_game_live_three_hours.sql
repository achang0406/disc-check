-- Live pickup window is 3 hours; RSVPs stay locked until the 24h cycle reset.

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

  RETURN p_now >= occurrence AND p_now < occurrence + INTERVAL '3 hours';
END;
$$;

CREATE OR REPLACE FUNCTION is_rsvp_locked(
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
    IF is_game_live(v_weekday, v_start_time, v_timezone)
       AND TG_OP = 'UPDATE'
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
