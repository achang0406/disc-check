-- One game per weekday per group; max 7 games per group.

DO $$
DECLARE
  v_dup RECORD;
BEGIN
  FOR v_dup IN
    SELECT group_id, weekday, COUNT(*) AS n
    FROM games
    GROUP BY group_id, weekday
    HAVING COUNT(*) > 1
  LOOP
    RAISE EXCEPTION
      'migration blocked: group % has % games on weekday % — resolve duplicates before applying',
      v_dup.group_id, v_dup.n, v_dup.weekday;
  END LOOP;
END $$;

ALTER TABLE games
  DROP CONSTRAINT IF EXISTS games_group_weekday_unique;

ALTER TABLE games
  ADD CONSTRAINT games_group_weekday_unique UNIQUE (group_id, weekday);

CREATE OR REPLACE FUNCTION admin_upsert_game(p_secret TEXT, p_game JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_group_id TEXT;
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_name TEXT;
  v_location TEXT;
  v_address TEXT;
  v_type TEXT;
  v_target INTEGER;
  v_status TEXT;
  v_cycle TIMESTAMPTZ;
  v_is_update BOOLEAN;
  v_game_count INTEGER;
BEGIN
  v_group_id := NULLIF(trim(p_game->>'group_id'), '');
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'game group_id is required';
  END IF;

  PERFORM verify_group_admin_secret(v_group_id, p_secret);

  v_id := NULLIF(trim(p_game->>'id'), '');
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'game id is required';
  END IF;

  v_name := NULLIF(trim(p_game->>'name'), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'game name is required';
  END IF;

  v_location := NULLIF(trim(p_game->>'location'), '');
  IF v_location IS NULL THEN
    RAISE EXCEPTION 'game location is required';
  END IF;

  IF NOT (p_game ? 'weekday') OR jsonb_typeof(p_game->'weekday') = 'null' THEN
    RAISE EXCEPTION 'game weekday is required';
  END IF;

  IF p_game->>'start_time' IS NULL OR trim(p_game->>'start_time') = '' THEN
    RAISE EXCEPTION 'game start_time is required';
  END IF;

  v_weekday := (p_game->>'weekday')::SMALLINT;
  IF v_weekday < 0 OR v_weekday > 6 THEN
    RAISE EXCEPTION 'game weekday must be between 0 and 6';
  END IF;

  v_start_time := (p_game->>'start_time')::TIME;
  v_timezone := COALESCE(NULLIF(trim(p_game->>'timezone'), ''), 'America/Los_Angeles');
  v_type := COALESCE(NULLIF(trim(p_game->>'type'), ''), 'goaltimate');
  v_target := COALESCE((p_game->>'target')::integer, 8);
  v_status := COALESCE(NULLIF(trim(p_game->>'status'), ''), 'open');
  v_address := NULLIF(trim(COALESCE(p_game->>'address', '')), '');
  v_cycle := get_current_occurrence_start(v_weekday, v_start_time, v_timezone);
  v_is_update := EXISTS (SELECT 1 FROM games WHERE id = v_id);

  IF EXISTS (
    SELECT 1
    FROM games g
    WHERE g.group_id = v_group_id
      AND g.weekday = v_weekday
      AND g.id <> v_id
  ) THEN
    RAISE EXCEPTION 'group already has a game on this weekday';
  END IF;

  IF NOT v_is_update THEN
    SELECT COUNT(*)::INTEGER INTO v_game_count
    FROM games g
    WHERE g.group_id = v_group_id;

    IF v_game_count >= 7 THEN
      RAISE EXCEPTION 'group already has maximum of 7 games';
    END IF;
  END IF;

  IF v_is_update THEN
    UPDATE games
    SET
      group_id = v_group_id,
      name = v_name,
      location = v_location,
      address = v_address,
      weekday = v_weekday,
      start_time = v_start_time,
      timezone = v_timezone,
      type = v_type,
      target = v_target,
      status = v_status
    WHERE id = v_id;

    PERFORM reset_game_rsvp_cycle(v_id, v_cycle);
  ELSE
    INSERT INTO games (
      id, group_id, name, location, address, weekday, start_time, timezone, type, target, status, rsvp_cycle_at
    ) VALUES (
      v_id,
      v_group_id,
      v_name,
      v_location,
      v_address,
      v_weekday,
      v_start_time,
      v_timezone,
      v_type,
      v_target,
      v_status,
      v_cycle
    );

    PERFORM upsert_game_push_state_for_cycle(v_id, v_cycle);
  END IF;
END;
$$;
