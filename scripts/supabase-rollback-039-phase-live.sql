-- Rollback Phase 3a: remove due phase_live enqueue function.

DROP FUNCTION IF EXISTS enqueue_due_phase_live_events();

DELETE FROM push_outbox
WHERE processed_at IS NULL
  AND event_type = 'phase_live';
