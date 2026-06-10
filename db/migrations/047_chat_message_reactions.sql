-- Group chat message reactions (iMessage-style tapbacks + extras).

CREATE TABLE IF NOT EXISTS group_chat_message_reactions (
  message_id TEXT NOT NULL REFERENCES group_chat_messages(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  reactor_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, reactor_id),
  CHECK (
    emoji = ANY (
      ARRAY[
        '❤️', '👍', '👎', '😂', '‼️', '❓',
        '🔥', '🎉', '👀', '💯', '🙏', '✨'
      ]::TEXT[]
    )
  )
);

CREATE INDEX IF NOT EXISTS group_chat_message_reactions_group_message_idx
  ON group_chat_message_reactions (group_id, message_id);

ALTER TABLE group_chat_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_chat_message_reactions_public_read"
  ON group_chat_message_reactions FOR SELECT USING (true);
CREATE POLICY "group_chat_message_reactions_public_insert"
  ON group_chat_message_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "group_chat_message_reactions_public_update"
  ON group_chat_message_reactions FOR UPDATE USING (true);
CREATE POLICY "group_chat_message_reactions_public_delete"
  ON group_chat_message_reactions FOR DELETE USING (true);

ALTER TABLE group_chat_message_reactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'group_chat_message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_message_reactions;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_group_chat_reaction_set_group_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id TEXT;
BEGIN
  SELECT group_id INTO v_group_id
  FROM public.group_chat_messages
  WHERE id = NEW.message_id;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'message_id % not found in group_chat_messages', NEW.message_id;
  END IF;

  NEW.group_id := v_group_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS group_chat_message_reactions_set_group_id ON group_chat_message_reactions;

CREATE TRIGGER group_chat_message_reactions_set_group_id
  BEFORE INSERT OR UPDATE ON group_chat_message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION trg_group_chat_reaction_set_group_id();

REVOKE ALL ON FUNCTION trg_group_chat_reaction_set_group_id() FROM PUBLIC;
