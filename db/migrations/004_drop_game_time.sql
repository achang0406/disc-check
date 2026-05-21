-- Display time is derived from starts_at in the app.
ALTER TABLE games DROP COLUMN IF EXISTS time;
