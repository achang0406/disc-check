-- Track whether a player is bringing a game kit on RSVP and check-in.

ALTER TABLE rsvps
  ADD COLUMN IF NOT EXISTS bringing_kit BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE game_check_ins
  ADD COLUMN IF NOT EXISTS bringing_kit BOOLEAN NOT NULL DEFAULT false;
