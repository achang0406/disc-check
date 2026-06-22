-- Wave 1f: pg_cron jobs for prod hub (pickup_frisbee schema).
-- Project URL is prod hub; run once after pickup_frisbee cutover on mczxxonw.

DO $$
DECLARE
  job_id BIGINT;
  project_url TEXT := 'https://mczxxonwvsztbrqmjzlu.supabase.co';
  service_key TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    RAISE EXCEPTION 'pg_cron not enabled on this project';
  END IF;

  SELECT decrypted_secret
  INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF service_key IS NULL OR service_key = '' THEN
    RAISE EXCEPTION 'vault secret service_role_key not set';
  END IF;

  -- Reset stale RSVP cycles every 10 minutes
  SELECT cron.job.jobid INTO job_id
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

  -- Drain push outbox every 2 minutes
  SELECT cron.job.jobid INTO job_id
  FROM cron.job
  WHERE jobname IN ('disc-check-process-push-outbox', 'pickup_frisbee_process_push_outbox');
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;
  PERFORM cron.schedule(
    'pickup_frisbee_process_push_outbox',
    '*/2 * * * *',
    format(
      $cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body := '{}'::jsonb
      );
      $cron$,
      project_url || '/functions/v1/process-push-outbox',
      service_key
    )
  );

  -- Prune activity retention daily at 4am UTC
  SELECT cron.job.jobid INTO job_id
  FROM cron.job
  WHERE jobname IN ('disc-check-prune-activity-retention', 'pickup_frisbee_prune_activity_retention');
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;
  PERFORM cron.schedule(
    'pickup_frisbee_prune_activity_retention',
    '0 4 * * *',
    $cron$SELECT pickup_frisbee.prune_activity_retention();$cron$
  );
END;
$$;
