-- Admin passcode config and game CRUD RPCs.
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION verify_admin_secret(p_secret TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_secret IS NULL OR NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_passcode' AND value = p_secret
  ) THEN
    RAISE EXCEPTION 'invalid admin passcode';
  END IF;
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
BEGIN
  PERFORM verify_admin_secret(p_secret);

  v_id := p_game->>'id';
  IF v_id IS NULL OR trim(v_id) = '' THEN
    RAISE EXCEPTION 'game id is required';
  END IF;

  IF p_game->>'name' IS NULL OR trim(p_game->>'name') = '' THEN
    RAISE EXCEPTION 'game name is required';
  END IF;

  IF p_game->>'location' IS NULL OR trim(p_game->>'location') = '' THEN
    RAISE EXCEPTION 'game location is required';
  END IF;

  IF p_game->>'starts_at' IS NULL THEN
    RAISE EXCEPTION 'game starts_at is required';
  END IF;

  INSERT INTO games (
    id,
    name,
    location,
    address,
    starts_at,
    type,
    target,
    status
  ) VALUES (
    v_id,
    trim(p_game->>'name'),
    trim(p_game->>'location'),
    NULLIF(trim(p_game->>'address'), ''),
    (p_game->>'starts_at')::timestamptz,
    COALESCE(NULLIF(trim(p_game->>'type'), ''), 'goaltimate'),
    COALESCE((p_game->>'target')::integer, 8),
    COALESCE(NULLIF(trim(p_game->>'status'), ''), 'open')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    address = EXCLUDED.address,
    starts_at = EXCLUDED.starts_at,
    type = EXCLUDED.type,
    target = EXCLUDED.target,
    status = EXCLUDED.status;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_game(p_secret TEXT, p_game_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM verify_admin_secret(p_secret);

  IF p_game_id IS NULL OR trim(p_game_id) = '' THEN
    RAISE EXCEPTION 'game id is required';
  END IF;

  DELETE FROM games WHERE id = p_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_upsert_game(TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_game(TEXT, TEXT) TO anon, authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE games;

ALTER TABLE games REPLICA IDENTITY FULL;
