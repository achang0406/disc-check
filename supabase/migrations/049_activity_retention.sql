-- Prune processed push_outbox rows and historical game_push_state cycles.

CREATE OR REPLACE FUNCTION prune_push_outbox(p_retention_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 1 THEN
    RAISE EXCEPTION 'prune_push_outbox retention_days must be at least 1';
  END IF;

  DELETE FROM push_outbox
  WHERE processed_at IS NOT NULL
    AND processed_at < NOW() - make_interval(days => p_retention_days);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION prune_game_push_state(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 1 THEN
    RAISE EXCEPTION 'prune_game_push_state retention_days must be at least 1';
  END IF;

  -- Keep the active cycle row per game (games.rsvp_cycle_at); drop older history only.
  DELETE FROM game_push_state gps
  WHERE gps.cycle_at < NOW() - make_interval(days => p_retention_days)
    AND NOT EXISTS (
      SELECT 1
      FROM games g
      WHERE g.id = gps.game_id
        AND g.rsvp_cycle_at = gps.cycle_at
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION prune_activity_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_push_outbox INTEGER;
  v_game_push_state INTEGER;
BEGIN
  v_push_outbox := prune_push_outbox(30);
  v_game_push_state := prune_game_push_state(90);

  RETURN jsonb_build_object(
    'push_outbox_deleted', v_push_outbox,
    'game_push_state_deleted', v_game_push_state,
    'pruned_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION prune_push_outbox(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION prune_game_push_state(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION prune_activity_retention() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION prune_push_outbox(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION prune_game_push_state(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION prune_activity_retention() TO service_role;

DO $$
DECLARE
  job_id BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    RAISE NOTICE 'pg_cron not available — enable it in Dashboard → Database → Extensions';
    RETURN;
  END IF;

  SELECT cron.job.jobid
  INTO job_id
  FROM cron.job
  WHERE jobname = 'disc-check-prune-activity-retention';

  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;

  PERFORM cron.schedule(
    'disc-check-prune-activity-retention',
    '0 4 * * *',
    $cron$SELECT prune_activity_retention();$cron$
  );
END;
$$;
