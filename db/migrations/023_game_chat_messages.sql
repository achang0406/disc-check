-- Persisted game chat with a FIFO cap per game (oldest messages drop first).

CREATE TABLE IF NOT EXISTS game_chat_messages (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_color TEXT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_chat_messages_game_id_created_at_idx
  ON game_chat_messages (game_id, created_at DESC);

ALTER TABLE game_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_chat_messages_public_read" ON game_chat_messages FOR SELECT USING (true);
CREATE POLICY "game_chat_messages_public_insert" ON game_chat_messages FOR INSERT WITH CHECK (true);

ALTER TABLE game_chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'game_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_chat_messages;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trim_game_chat_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_messages CONSTANT INTEGER := 50;
  excess INTEGER;
BEGIN
  SELECT COUNT(*) - max_messages INTO excess
  FROM public.game_chat_messages
  WHERE game_id = NEW.game_id;

  IF excess > 0 THEN
    DELETE FROM public.game_chat_messages
    WHERE id IN (
      SELECT id
      FROM public.game_chat_messages
      WHERE game_id = NEW.game_id
      ORDER BY created_at ASC, id ASC
      LIMIT excess
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trim_game_chat_messages_after_insert ON game_chat_messages;

CREATE TRIGGER trim_game_chat_messages_after_insert
AFTER INSERT ON game_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.trim_game_chat_messages();
