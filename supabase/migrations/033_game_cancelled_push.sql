-- Phase 2a: enqueue game_cancelled when admin sets status open → cancelled.

CREATE OR REPLACE FUNCTION trg_games_push_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'open' AND NEW.status = 'cancelled' THEN
    PERFORM enqueue_push_event('game_cancelled', NEW.group_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS games_push_cancelled ON games;
CREATE TRIGGER games_push_cancelled
AFTER UPDATE OF status ON games
FOR EACH ROW
EXECUTE FUNCTION trg_games_push_cancelled();
