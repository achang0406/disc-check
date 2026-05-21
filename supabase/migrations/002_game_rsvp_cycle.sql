-- Weekly RSVP reset: track which pickup week RSVPs belong to.
ALTER TABLE games ADD COLUMN IF NOT EXISTS rsvp_cycle_date DATE;

CREATE OR REPLACE FUNCTION reset_game_rsvp_cycle(p_game_id TEXT, p_cycle DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rsvps WHERE game_id = p_game_id;
  UPDATE games SET rsvp_cycle_date = p_cycle WHERE id = p_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_game_rsvp_cycle(TEXT, DATE) TO anon, authenticated, service_role;
