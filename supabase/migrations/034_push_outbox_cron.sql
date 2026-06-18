-- Phase 2a: drain push_outbox every 2 minutes (requires pg_cron + pg_net).
-- Set project URL before running on staging/prod:
--   SELECT set_config('pickup_frisbee.supabase_url', 'https://YOUR_REF.supabase.co', false);

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  job_id BIGINT;
  project_url TEXT := coalesce(
    nullif(trim(current_setting('pickup_frisbee.supabase_url', true)), ''),
    'https://mczxxonwvsztbrqmjzlu.supabase.co'
  );
  service_key TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    RAISE NOTICE 'pg_cron not available — enable it in Dashboard → Database → Extensions';
    RETURN;
  END IF;

  SELECT decrypted_secret
  INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF service_key IS NULL OR service_key = '' THEN
    RAISE NOTICE 'vault secret service_role_key not set — cron job skipped. Add it in Dashboard → Project Settings → Vault, then re-run this migration.';
    RETURN;
  END IF;

  SELECT cron.job.jobid
  INTO job_id
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
END;
$$;
