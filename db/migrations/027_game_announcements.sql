-- Per-game announcements for current weekly cycle.

CREATE TABLE IF NOT EXISTS game_announcements (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  cycle_at TIMESTAMPTZ NOT NULL,
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 280),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, cycle_at)
);

CREATE INDEX IF NOT EXISTS game_announcements_game_id_cycle_at_idx
  ON game_announcements (game_id, cycle_at DESC);

ALTER TABLE game_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_announcements_public_read" ON game_announcements FOR SELECT USING (true);
CREATE POLICY "game_announcements_public_insert" ON game_announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "game_announcements_public_update" ON game_announcements FOR UPDATE USING (true);
CREATE POLICY "game_announcements_public_delete" ON game_announcements FOR DELETE USING (true);

ALTER TABLE game_announcements REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_announcements;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION admin_post_game_announcement(
  p_secret TEXT,
  p_game_id TEXT,
  p_message TEXT,
  p_subscriber_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game games%ROWTYPE;
  v_cycle TIMESTAMPTZ;
  v_trimmed TEXT;
  v_exclude TEXT[] := '{}';
BEGIN
  v_trimmed := trim(p_message);
  IF v_trimmed IS NULL OR v_trimmed = '' THEN
    RAISE EXCEPTION 'announcement message is required';
  END IF;

  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'game not found';
  END IF;

  PERFORM verify_group_admin_secret(v_game.group_id, p_secret);

  v_cycle := game_display_cycle_at(p_game_id);
  IF v_cycle IS NULL THEN
    RAISE EXCEPTION 'game schedule is invalid';
  END IF;

  INSERT INTO game_announcements (game_id, cycle_at, message)
  VALUES (p_game_id, v_cycle, v_trimmed)
  ON CONFLICT (game_id, cycle_at) DO UPDATE
  SET message = EXCLUDED.message,
      posted_at = NOW();

  IF p_subscriber_id IS NOT NULL AND trim(p_subscriber_id) <> '' THEN
    v_exclude := ARRAY[p_subscriber_id];
  END IF;

  PERFORM enqueue_push_event(
    'announcement',
    v_game.group_id,
    p_game_id,
    v_exclude,
    v_trimmed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_post_game_announcement(TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;
