-- Roll back Phase 2a push outbox (migrations 032–034).

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

DROP TRIGGER IF EXISTS games_push_cancelled ON games;
DROP FUNCTION IF EXISTS trg_games_push_cancelled();

DROP FUNCTION IF EXISTS enqueue_push_event(TEXT, TEXT, TEXT, TEXT[]);
DROP TABLE IF EXISTS push_outbox CASCADE;
