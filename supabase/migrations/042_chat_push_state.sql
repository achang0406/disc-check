-- Phase 4a: incremental chat_push_state on message insert (no outbox / no push).

CREATE TABLE IF NOT EXISTS chat_push_state (
  group_id TEXT PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  window_senders JSONB NOT NULL DEFAULT '[]'::jsonb,
  distinct_sender_count INTEGER NOT NULL DEFAULT 0 CHECK (distinct_sender_count >= 0),
  last_push_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION maintain_chat_push_state(p_group_id TEXT, p_sender_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_cutoff TIMESTAMPTZ := NOW() - INTERVAL '30 minutes';
  v_max_senders CONSTANT INTEGER := 20;
  v_now TIMESTAMPTZ := NOW();
  v_senders JSONB;
  v_pruned JSONB;
  v_elem JSONB;
  v_found BOOLEAN;
  v_i INTEGER;
  v_min_at TIMESTAMPTZ;
  v_min_idx INTEGER;
  v_distinct INTEGER;
BEGIN
  IF p_group_id IS NULL OR trim(p_group_id) = '' THEN
    RETURN;
  END IF;

  IF p_sender_id IS NULL OR trim(p_sender_id) = '' THEN
    RETURN;
  END IF;

  INSERT INTO chat_push_state (group_id)
  VALUES (p_group_id)
  ON CONFLICT (group_id) DO NOTHING;

  SELECT window_senders
  INTO v_senders
  FROM chat_push_state
  WHERE group_id = p_group_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_pruned := '[]'::jsonb;
  FOR v_i IN 0 .. COALESCE(jsonb_array_length(v_senders), 0) - 1 LOOP
    v_elem := v_senders -> v_i;
    IF (v_elem ->> 'at')::timestamptz >= v_window_cutoff THEN
      v_pruned := v_pruned || jsonb_build_array(v_elem);
    END IF;
  END LOOP;
  v_senders := v_pruned;

  v_found := FALSE;
  v_pruned := '[]'::jsonb;
  FOR v_i IN 0 .. COALESCE(jsonb_array_length(v_senders), 0) - 1 LOOP
    v_elem := v_senders -> v_i;
    IF v_elem ->> 'sender_id' = p_sender_id THEN
      v_pruned := v_pruned || jsonb_build_array(
        jsonb_build_object('sender_id', p_sender_id, 'at', v_now)
      );
      v_found := TRUE;
    ELSE
      v_pruned := v_pruned || jsonb_build_array(v_elem);
    END IF;
  END LOOP;

  IF NOT v_found THEN
    v_pruned := v_pruned || jsonb_build_array(
      jsonb_build_object('sender_id', p_sender_id, 'at', v_now)
    );
  END IF;
  v_senders := v_pruned;

  WHILE COALESCE(jsonb_array_length(v_senders), 0) > v_max_senders LOOP
    v_min_at := NULL;
    v_min_idx := 0;

    FOR v_i IN 0 .. jsonb_array_length(v_senders) - 1 LOOP
      IF v_min_at IS NULL OR (v_senders -> v_i ->> 'at')::timestamptz < v_min_at THEN
        v_min_at := (v_senders -> v_i ->> 'at')::timestamptz;
        v_min_idx := v_i;
      END IF;
    END LOOP;

    v_pruned := '[]'::jsonb;
    FOR v_i IN 0 .. jsonb_array_length(v_senders) - 1 LOOP
      IF v_i <> v_min_idx THEN
        v_pruned := v_pruned || jsonb_build_array(v_senders -> v_i);
      END IF;
    END LOOP;
    v_senders := v_pruned;
  END LOOP;

  v_distinct := COALESCE(jsonb_array_length(v_senders), 0);

  UPDATE chat_push_state
  SET
    window_senders = v_senders,
    distinct_sender_count = v_distinct,
    updated_at = v_now
  WHERE group_id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_group_chat_maintain_push_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM maintain_chat_push_state(NEW.group_id, NEW.sender_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS group_chat_messages_maintain_push_state ON group_chat_messages;

CREATE TRIGGER group_chat_messages_maintain_push_state
AFTER INSERT ON group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION trg_group_chat_maintain_push_state();

REVOKE ALL ON FUNCTION maintain_chat_push_state(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION trg_group_chat_maintain_push_state() FROM PUBLIC;
