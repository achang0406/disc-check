-- Groups-first refactor: wipe-friendly schema (re-seed after applying).

-- Drop game-scoped chat and push
DROP TRIGGER IF EXISTS trim_game_chat_messages_after_insert ON game_chat_messages;
DROP TABLE IF EXISTS game_chat_messages CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  admin_passcode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_public_read" ON groups FOR SELECT USING (true);

ALTER TABLE groups REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE groups;
  END IF;
END $$;

-- Games belong to a group
ALTER TABLE games ADD COLUMN IF NOT EXISTS group_id TEXT;

-- Wipe mocked rows so group_id can be required
TRUNCATE game_guests, game_check_ins, rsvps, games CASCADE;

ALTER TABLE games
  ALTER COLUMN group_id SET NOT NULL;

ALTER TABLE games
  DROP CONSTRAINT IF EXISTS games_group_id_fkey;

ALTER TABLE games
  ADD CONSTRAINT games_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS games_group_id_idx ON games (group_id);

-- Push subscriptions (per group)
CREATE TABLE push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  subscriber_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX push_subscriptions_group_id_idx ON push_subscriptions (group_id);
CREATE INDEX push_subscriptions_subscriber_id_idx ON push_subscriptions (subscriber_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_public_read" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "push_subscriptions_public_insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "push_subscriptions_public_update" ON push_subscriptions FOR UPDATE USING (true);
CREATE POLICY "push_subscriptions_public_delete" ON push_subscriptions FOR DELETE USING (true);

-- Group chat messages
CREATE TABLE group_chat_messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_color TEXT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX group_chat_messages_group_id_created_at_idx
  ON group_chat_messages (group_id, created_at DESC);

ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_chat_messages_public_read" ON group_chat_messages FOR SELECT USING (true);
CREATE POLICY "group_chat_messages_public_insert" ON group_chat_messages FOR INSERT WITH CHECK (true);

ALTER TABLE group_chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_messages;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trim_group_chat_messages()
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
  FROM public.group_chat_messages
  WHERE group_id = NEW.group_id;

  IF excess > 0 THEN
    DELETE FROM public.group_chat_messages
    WHERE id IN (
      SELECT id
      FROM public.group_chat_messages
      WHERE group_id = NEW.group_id
      ORDER BY created_at ASC, id ASC
      LIMIT excess
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trim_group_chat_messages_after_insert
AFTER INSERT ON group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.trim_group_chat_messages();

-- Per-group admin RPCs
CREATE OR REPLACE FUNCTION verify_group_admin_secret(p_group_id TEXT, p_secret TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_group_id IS NULL OR trim(p_group_id) = '' OR p_secret IS NULL OR NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND admin_passcode = p_secret
  ) THEN
    RAISE EXCEPTION 'invalid group admin passcode';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION verify_group_admin(p_group_id TEXT, p_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN p_group_id IS NOT NULL AND trim(p_group_id) <> '' AND p_secret IS NOT NULL AND EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND admin_passcode = p_secret
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_upsert_group(p_secret TEXT, p_group JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_name TEXT;
  v_description TEXT;
  v_passcode TEXT;
BEGIN
  v_id := NULLIF(trim(p_group->>'id'), '');
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'group id is required';
  END IF;

  PERFORM verify_group_admin_secret(v_id, p_secret);

  v_name := NULLIF(trim(p_group->>'name'), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'group name is required';
  END IF;

  v_description := NULLIF(trim(COALESCE(p_group->>'description', '')), '');
  v_passcode := NULLIF(trim(COALESCE(p_group->>'admin_passcode', '')), '');

  UPDATE groups
  SET
    name = v_name,
    description = v_description,
    admin_passcode = COALESCE(v_passcode, admin_passcode)
  WHERE id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_upsert_game(p_secret TEXT, p_game JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_group_id TEXT;
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_name TEXT;
  v_location TEXT;
  v_address TEXT;
  v_type TEXT;
  v_target INTEGER;
  v_status TEXT;
  v_cycle TIMESTAMPTZ;
  v_is_update BOOLEAN;
BEGIN
  v_group_id := NULLIF(trim(p_game->>'group_id'), '');
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'game group_id is required';
  END IF;

  PERFORM verify_group_admin_secret(v_group_id, p_secret);

  v_id := NULLIF(trim(p_game->>'id'), '');
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'game id is required';
  END IF;

  v_name := NULLIF(trim(p_game->>'name'), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'game name is required';
  END IF;

  v_location := NULLIF(trim(p_game->>'location'), '');
  IF v_location IS NULL THEN
    RAISE EXCEPTION 'game location is required';
  END IF;

  IF NOT (p_game ? 'weekday') OR jsonb_typeof(p_game->'weekday') = 'null' THEN
    RAISE EXCEPTION 'game weekday is required';
  END IF;

  IF p_game->>'start_time' IS NULL OR trim(p_game->>'start_time') = '' THEN
    RAISE EXCEPTION 'game start_time is required';
  END IF;

  v_weekday := (p_game->>'weekday')::SMALLINT;
  IF v_weekday < 0 OR v_weekday > 6 THEN
    RAISE EXCEPTION 'game weekday must be between 0 and 6';
  END IF;

  v_start_time := (p_game->>'start_time')::TIME;
  v_timezone := COALESCE(NULLIF(trim(p_game->>'timezone'), ''), 'America/Los_Angeles');
  v_type := COALESCE(NULLIF(trim(p_game->>'type'), ''), 'goaltimate');
  v_target := COALESCE((p_game->>'target')::integer, 8);
  v_status := COALESCE(NULLIF(trim(p_game->>'status'), ''), 'open');
  v_address := NULLIF(trim(COALESCE(p_game->>'address', '')), '');
  v_cycle := get_current_occurrence_start(v_weekday, v_start_time, v_timezone);
  v_is_update := EXISTS (SELECT 1 FROM games WHERE id = v_id);

  IF v_is_update THEN
    UPDATE games
    SET
      group_id = v_group_id,
      name = v_name,
      location = v_location,
      address = v_address,
      weekday = v_weekday,
      start_time = v_start_time,
      timezone = v_timezone,
      type = v_type,
      target = v_target,
      status = v_status
    WHERE id = v_id;

    PERFORM reset_game_rsvp_cycle(v_id, v_cycle);
  ELSE
    INSERT INTO games (
      id, group_id, name, location, address, weekday, start_time, timezone, type, target, status, rsvp_cycle_at
    ) VALUES (
      v_id,
      v_group_id,
      v_name,
      v_location,
      v_address,
      v_weekday,
      v_start_time,
      v_timezone,
      v_type,
      v_target,
      v_status,
      v_cycle
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_game(p_secret TEXT, p_game_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id TEXT;
BEGIN
  IF p_game_id IS NULL OR trim(p_game_id) = '' THEN
    RAISE EXCEPTION 'game id is required';
  END IF;

  SELECT group_id INTO v_group_id FROM games WHERE id = p_game_id;
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'game not found';
  END IF;

  PERFORM verify_group_admin_secret(v_group_id, p_secret);

  DELETE FROM games WHERE id = p_game_id;
END;
$$;

DROP FUNCTION IF EXISTS verify_admin_passcode(TEXT);
DROP FUNCTION IF EXISTS verify_admin_secret(TEXT);

GRANT EXECUTE ON FUNCTION verify_group_admin(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_upsert_group(TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_upsert_game(TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_game(TEXT, TEXT) TO anon, authenticated, service_role;
