-- Roll back push notification refactor (migrations 026–029) on remote Supabase.

-- 029: stop push outbox cron
DO $$
DECLARE
  job_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    SELECT cron.job.jobid
    INTO job_id
    FROM cron.job
    WHERE jobname = 'disc-check-process-push-outbox';

    IF job_id IS NOT NULL THEN
      PERFORM cron.unschedule(job_id);
    END IF;
  END IF;
END;
$$;

-- 026: push triggers
DROP TRIGGER IF EXISTS rsvps_push_badge ON rsvps;
DROP TRIGGER IF EXISTS games_push_cancelled ON games;
DROP TRIGGER IF EXISTS chat_push_chatter ON group_chat_messages;

DROP FUNCTION IF EXISTS trg_rsvps_push_badge();
DROP FUNCTION IF EXISTS trg_games_push_cancelled();
DROP FUNCTION IF EXISTS trg_chat_push_chatter();

-- 027: announcements
DROP FUNCTION IF EXISTS admin_post_game_announcement(TEXT, TEXT, TEXT, TEXT);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE game_announcements;
  END IF;
END $$;

DROP TABLE IF EXISTS game_announcements CASCADE;

-- 026: push tables
DROP TABLE IF EXISTS push_outbox CASCADE;
DROP TABLE IF EXISTS game_push_state CASCADE;
DROP TABLE IF EXISTS chat_push_state CASCADE;

-- 026: push helpers
REVOKE EXECUTE ON FUNCTION enqueue_phase_live_events(TIMESTAMPTZ) FROM service_role;
DROP FUNCTION IF EXISTS enqueue_phase_live_events(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS enqueue_push_event(TEXT, TEXT, TEXT, TEXT[], TEXT);
DROP FUNCTION IF EXISTS upsert_game_push_badge_state(TEXT, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS compute_rsvp_badge(TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS compute_rsvp_headcount(TEXT);
DROP FUNCTION IF EXISTS is_rsvp_open_for_game(TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS is_game_ended_for_game(TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS is_game_cycle_stale(TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS game_display_cycle_at(TEXT, TIMESTAMPTZ);

-- 028: restore admin_upsert_game (pre group limits)
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_group_weekday_unique;

CREATE OR REPLACE FUNCTION admin_upsert_game(p_secret TEXT, p_game JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_group_id TEXT;
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_name TEXT;
  v_location TEXT;
  v_address TEXT;
  v_type TEXT;
  v_target INTEGER;
  v_status TEXT;
  v_cycle TIMESTAMPTZ;
  v_is_update BOOLEAN;
BEGIN
  v_group_id := NULLIF(trim(p_game->>'group_id'), '');
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'game group_id is required';
  END IF;

  PERFORM verify_group_admin_secret(v_group_id, p_secret);

  v_id := NULLIF(trim(p_game->>'id'), '');
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'game id is required';
  END IF;

  v_name := NULLIF(trim(p_game->>'name'), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'game name is required';
  END IF;

  v_location := NULLIF(trim(p_game->>'location'), '');
  IF v_location IS NULL THEN
    RAISE EXCEPTION 'game location is required';
  END IF;

  IF NOT (p_game ? 'weekday') OR jsonb_typeof(p_game->'weekday') = 'null' THEN
    RAISE EXCEPTION 'game weekday is required';
  END IF;

  IF p_game->>'start_time' IS NULL OR trim(p_game->>'start_time') = '' THEN
    RAISE EXCEPTION 'game start_time is required';
  END IF;

  v_weekday := (p_game->>'weekday')::SMALLINT;
  IF v_weekday < 0 OR v_weekday > 6 THEN
    RAISE EXCEPTION 'game weekday must be between 0 and 6';
  END IF;

  v_start_time := (p_game->>'start_time')::TIME;
  v_timezone := COALESCE(NULLIF(trim(p_game->>'timezone'), ''), 'America/Los_Angeles');
  v_type := COALESCE(NULLIF(trim(p_game->>'type'), ''), 'goaltimate');
  v_target := COALESCE((p_game->>'target')::integer, 8);
  v_status := COALESCE(NULLIF(trim(p_game->>'status'), ''), 'open');
  v_address := NULLIF(trim(COALESCE(p_game->>'address', '')), '');
  v_cycle := get_current_occurrence_start(v_weekday, v_start_time, v_timezone);
  v_is_update := EXISTS (SELECT 1 FROM games WHERE id = v_id);

  IF v_is_update THEN
    UPDATE games
    SET
      group_id = v_group_id,
      name = v_name,
      location = v_location,
      address = v_address,
      weekday = v_weekday,
      start_time = v_start_time,
      timezone = v_timezone,
      type = v_type,
      target = v_target,
      status = v_status
    WHERE id = v_id;

    PERFORM reset_game_rsvp_cycle(v_id, v_cycle);
  ELSE
    INSERT INTO games (
      id, group_id, name, location, address, weekday, start_time, timezone, type, target, status, rsvp_cycle_at
    ) VALUES (
      v_id,
      v_group_id,
      v_name,
      v_location,
      v_address,
      v_weekday,
      v_start_time,
      v_timezone,
      v_type,
      v_target,
      v_status,
      v_cycle
    );
  END IF;
END;
$$;
