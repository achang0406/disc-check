-- Replace starts_at anchor with explicit weekly schedule fields.

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS weekday SMALLINT,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS timezone TEXT;

UPDATE games
SET
  weekday = EXTRACT(
    DOW FROM (starts_at AT TIME ZONE COALESCE(timezone, 'America/Los_Angeles'))
  )::SMALLINT,
  start_time = (starts_at AT TIME ZONE COALESCE(timezone, 'America/Los_Angeles'))::TIME,
  timezone = COALESCE(timezone, 'America/Los_Angeles')
WHERE starts_at IS NOT NULL
  AND weekday IS NULL;

ALTER TABLE games
  ALTER COLUMN timezone SET DEFAULT 'America/Los_Angeles';

UPDATE games SET timezone = 'America/Los_Angeles' WHERE timezone IS NULL;

ALTER TABLE games
  ALTER COLUMN timezone SET NOT NULL,
  ALTER COLUMN weekday SET NOT NULL,
  ALTER COLUMN start_time SET NOT NULL;

ALTER TABLE games
  ADD CONSTRAINT games_weekday_check CHECK (weekday BETWEEN 0 AND 6);

ALTER TABLE games DROP COLUMN IF EXISTS starts_at;

CREATE OR REPLACE FUNCTION get_current_occurrence_start(
  p_weekday SMALLINT,
  p_start_time TIME,
  p_timezone TEXT,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  local_date DATE;
  local_dow INT;
  days_back INT;
  candidate_date DATE;
  occurrence TIMESTAMPTZ;
BEGIN
  IF p_weekday IS NULL OR p_start_time IS NULL OR p_timezone IS NULL THEN
    RETURN NULL;
  END IF;

  local_date := (p_now AT TIME ZONE p_timezone)::DATE;
  local_dow := EXTRACT(DOW FROM local_date)::INT;
  days_back := (local_dow - p_weekday + 7) % 7;
  candidate_date := local_date - days_back;

  occurrence := (candidate_date + p_start_time) AT TIME ZONE p_timezone;

  IF p_now < occurrence THEN
    candidate_date := candidate_date - 7;
    occurrence := (candidate_date + p_start_time) AT TIME ZONE p_timezone;
  END IF;

  WHILE occurrence + INTERVAL '24 hours' <= p_now LOOP
    candidate_date := candidate_date + 7;
    occurrence := (candidate_date + p_start_time) AT TIME ZONE p_timezone;
  END LOOP;

  RETURN occurrence;
END;
$$;

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

CREATE OR REPLACE FUNCTION admin_upsert_game(p_secret TEXT, p_game JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_weekday SMALLINT;
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

  IF p_game->>'weekday' IS NULL THEN
    RAISE EXCEPTION 'game weekday is required';
  END IF;

  IF p_game->>'start_time' IS NULL OR trim(p_game->>'start_time') = '' THEN
    RAISE EXCEPTION 'game start_time is required';
  END IF;

  v_weekday := (p_game->>'weekday')::SMALLINT;
  IF v_weekday < 0 OR v_weekday > 6 THEN
    RAISE EXCEPTION 'game weekday must be between 0 and 6';
  END IF;

  INSERT INTO games (
    id, name, location, address, weekday, start_time, timezone, type, target, status
  ) VALUES (
    v_id,
    trim(p_game->>'name'),
    trim(p_game->>'location'),
    NULLIF(trim(p_game->>'address'), ''),
    v_weekday,
    (p_game->>'start_time')::TIME,
    COALESCE(NULLIF(trim(p_game->>'timezone'), ''), 'America/Los_Angeles'),
    COALESCE(NULLIF(trim(p_game->>'type'), ''), 'goaltimate'),
    COALESCE((p_game->>'target')::integer, 8),
    COALESCE(NULLIF(trim(p_game->>'status'), ''), 'open')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    address = EXCLUDED.address,
    weekday = EXCLUDED.weekday,
    start_time = EXCLUDED.start_time,
    timezone = EXCLUDED.timezone,
    type = EXCLUDED.type,
    target = EXCLUDED.target,
    status = EXCLUDED.status;
END;
$$;
