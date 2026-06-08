-- Phase 2a: push outbox + stub enqueue (copy materialized on drain).

CREATE TABLE IF NOT EXISTS push_outbox (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  exclude_subscriber_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS push_outbox_unprocessed_idx
  ON push_outbox (created_at)
  WHERE processed_at IS NULL;

CREATE OR REPLACE FUNCTION enqueue_push_event(
  p_event_type TEXT,
  p_group_id TEXT,
  p_game_id TEXT DEFAULT NULL,
  p_exclude_subscriber_ids TEXT[] DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_group_id IS NULL OR trim(p_group_id) = '' THEN
    RAISE EXCEPTION 'enqueue_push_event requires group_id';
  END IF;

  IF p_event_type IS NULL OR trim(p_event_type) = '' THEN
    RAISE EXCEPTION 'enqueue_push_event requires event_type';
  END IF;

  INSERT INTO push_outbox (
    group_id,
    game_id,
    event_type,
    payload,
    exclude_subscriber_ids
  ) VALUES (
    p_group_id,
    p_game_id,
    p_event_type,
    NULL,
    COALESCE(p_exclude_subscriber_ids, '{}')
  );
END;
$$;

REVOKE ALL ON FUNCTION enqueue_push_event(TEXT, TEXT, TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION enqueue_push_event(TEXT, TEXT, TEXT, TEXT[]) TO service_role;
