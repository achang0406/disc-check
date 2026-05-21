-- UTC timestamps for game start and RSVP cycle tracking.
ALTER TABLE games ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE games ADD COLUMN IF NOT EXISTS rsvp_cycle_at TIMESTAMPTZ;

ALTER TABLE games DROP COLUMN IF EXISTS rsvp_cycle_date;

DROP FUNCTION IF EXISTS reset_game_rsvp_cycle(TEXT, DATE);

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
