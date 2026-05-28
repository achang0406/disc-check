-- Web Push subscriptions for game chat (users who have sent a message in a game).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  subscriber_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_game_id_idx ON push_subscriptions (game_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_subscriber_id_idx ON push_subscriptions (subscriber_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_public_read" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "push_subscriptions_public_insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "push_subscriptions_public_update" ON push_subscriptions FOR UPDATE USING (true);
CREATE POLICY "push_subscriptions_public_delete" ON push_subscriptions FOR DELETE USING (true);
