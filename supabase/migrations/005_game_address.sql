-- Optional full address; location is a short label when both are set.
ALTER TABLE games ADD COLUMN IF NOT EXISTS address TEXT;
