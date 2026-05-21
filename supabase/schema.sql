-- Run in Supabase SQL Editor after creating a project.
-- Dashboard → SQL → New query → paste and run.

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  time TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'goaltimate',
  target INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'open',
  rsvp_cycle_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rsvps (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  plus_ones INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, user_id)
);

CREATE INDEX IF NOT EXISTS rsvps_game_id_idx ON rsvps (game_id);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "games_public_read" ON games FOR SELECT USING (true);
CREATE POLICY "rsvps_public_read" ON rsvps FOR SELECT USING (true);
CREATE POLICY "rsvps_public_insert" ON rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "rsvps_public_update" ON rsvps FOR UPDATE USING (true);
CREATE POLICY "rsvps_public_delete" ON rsvps FOR DELETE USING (true);

ALTER TABLE rsvps REPLICA IDENTITY FULL;

-- Enable Realtime for RSVP live updates.
-- If this line errors because the table is already added, that's OK.
-- You can also enable it in Dashboard → Database → Publications → supabase_realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE rsvps;

-- Weekly RSVP reset: clears signups when the pickup week rolls over (24h after game start, UTC).
CREATE OR REPLACE FUNCTION reset_game_rsvp_cycle(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rsvps WHERE game_id = p_game_id;
  UPDATE games SET rsvp_cycle_at = p_cycle WHERE id = p_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_game_rsvp_cycle(TEXT, TIMESTAMPTZ) TO anon, authenticated, service_role;
