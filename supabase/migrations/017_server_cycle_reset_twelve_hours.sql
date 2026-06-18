-- 12h cycle rollover, server-side reset cron, and stale-cycle RSVP lock.

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

  WHILE occurrence + INTERVAL '12 hours' <= p_now LOOP
    candidate_date := candidate_date + 7;
    occurrence := (candidate_date + p_start_time) AT TIME ZONE p_timezone;
  END LOOP;

  RETURN occurrence;
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

  RETURN p_now >= occurrence AND p_now < occurrence + INTERVAL '12 hours';
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
  v_stored_cycle TIMESTAMPTZ;
  v_expected_cycle TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_game_id := COALESCE(NEW.game_id, OLD.game_id);
  SELECT weekday, start_time, timezone, rsvp_cycle_at
  INTO v_weekday, v_start_time, v_timezone, v_stored_cycle
  FROM games
  WHERE id = v_game_id;

  v_expected_cycle := get_current_occurrence_start(v_weekday, v_start_time, v_timezone);

  IF v_stored_cycle IS NOT NULL AND v_stored_cycle IS DISTINCT FROM v_expected_cycle THEN
    RAISE EXCEPTION 'RSVP is locked until the weekly reset';
  END IF;

  IF is_rsvp_locked(v_weekday, v_start_time, v_timezone) THEN
    RAISE EXCEPTION 'RSVP is locked while the game is live';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION reset_stale_game_cycles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g RECORD;
  v_cycle TIMESTAMPTZ;
BEGIN
  FOR g IN
    SELECT id, weekday, start_time, timezone, rsvp_cycle_at, status
    FROM games
    WHERE status <> 'cancelled'
  LOOP
    v_cycle := get_current_occurrence_start(g.weekday, g.start_time, g.timezone);
    IF v_cycle IS NULL THEN
      CONTINUE;
    END IF;

    IF g.rsvp_cycle_at IS DISTINCT FROM v_cycle THEN
      PERFORM reset_game_rsvp_cycle(g.id, v_cycle);
    END IF;
  END LOOP;
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
    id, name, location, address, weekday, start_time, timezone, type, target, status, rsvp_cycle_at
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
    COALESCE(NULLIF(trim(p_game->>'status'), ''), 'open'),
    get_current_occurrence_start(
      v_weekday,
      (p_game->>'start_time')::TIME,
      COALESCE(NULLIF(trim(p_game->>'timezone'), ''), 'America/Los_Angeles')
    )
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

REVOKE EXECUTE ON FUNCTION reset_game_rsvp_cycle(TEXT, TIMESTAMPTZ) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_game_rsvp_cycle(TEXT, TIMESTAMPTZ) TO service_role;

GRANT EXECUTE ON FUNCTION reset_stale_game_cycles() TO service_role;

-- Sync any stale cycles immediately on deploy.
SELECT reset_stale_game_cycles();

-- Enable pg_cron in Supabase Dashboard → Database → Extensions if this fails.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
DECLARE
  job_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
  SELECT cron.job.jobid
    INTO job_id
    FROM cron.job
    WHERE jobname IN ('disc-check-reset-stale-cycles', 'pickup_frisbee_reset_stale_cycles');

    IF job_id IS NOT NULL THEN
      PERFORM cron.unschedule(job_id);
    END IF;

    PERFORM cron.schedule(
      'pickup_frisbee_reset_stale_cycles',
      '*/10 * * * *',
      $cron$SELECT pickup_frisbee.reset_stale_game_cycles();$cron$
    );
  END IF;
END;
$$;
