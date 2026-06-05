-- Group chat retention: FIFO trim on insert only (no weekly cycle wipe).

CREATE OR REPLACE FUNCTION public.trim_group_chat_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_messages CONSTANT INTEGER := 100;
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
