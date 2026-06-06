-- Push outbox, game coordination notifications, and SQL helpers.

CREATE TABLE IF NOT EXISTS game_push_state (
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  cycle_at TIMESTAMPTZ NOT NULL,
  last_rsvp_badge TEXT,
  last_phase TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, cycle_at)
);

CREATE TABLE IF NOT EXISTS chat_push_state (
  group_id TEXT PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  last_push_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS push_outbox (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  exclude_subscriber_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS push_outbox_unprocessed_idx
  ON push_outbox (created_at)
  WHERE processed_at IS NULL;

CREATE OR REPLACE FUNCTION is_game_cycle_stale(p_game_id TEXT, p_now TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_game games%ROWTYPE;
  v_current TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND OR v_game.rsvp_cycle_at IS NULL THEN
    RETURN FALSE;
  END IF;

  v_current := get_current_occurrence_start(
    v_game.weekday,
    v_game.start_time,
    v_game.timezone,
    p_now
  );

  RETURN v_current IS NOT NULL AND v_game.rsvp_cycle_at IS DISTINCT FROM v_current;
END;
$$;

CREATE OR REPLACE FUNCTION is_game_ended_for_game(p_game_id TEXT, p_now TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_game games%ROWTYPE;
  v_occurrence TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF is_game_cycle_stale(p_game_id, p_now) THEN
    RETURN p_now >= v_game.rsvp_cycle_at + INTERVAL '3 hours';
  END IF;

  v_occurrence := get_current_occurrence_start(
    v_game.weekday,
    v_game.start_time,
    v_game.timezone,
    p_now
  );

  IF v_occurrence IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN p_now >= v_occurrence + INTERVAL '3 hours'
    AND p_now < v_occurrence + INTERVAL '12 hours';
END;
$$;

CREATE OR REPLACE FUNCTION is_rsvp_open_for_game(p_game_id TEXT, p_now TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_game games%ROWTYPE;
BEGIN
  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND OR v_game.status = 'cancelled' THEN
    RETURN FALSE;
  END IF;

  IF is_game_cycle_stale(p_game_id, p_now) THEN
    RETURN FALSE;
  END IF;

  IF is_game_live(v_game.weekday, v_game.start_time, v_game.timezone, p_now) THEN
    RETURN FALSE;
  END IF;

  IF is_game_ended_for_game(p_game_id, p_now) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION compute_rsvp_headcount(p_game_id TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(1 + r.plus_ones), 0)::INTEGER
  FROM rsvps r
  WHERE r.game_id = p_game_id;
$$;

CREATE OR REPLACE FUNCTION compute_rsvp_badge(p_game_id TEXT, p_now TIMESTAMPTZ DEFAULT NOW())
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_game games%ROWTYPE;
  v_count INTEGER;
  v_target INTEGER;
BEGIN
  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND OR v_game.status = 'cancelled' THEN
    RETURN NULL;
  END IF;

  IF NOT is_rsvp_open_for_game(p_game_id, p_now) THEN
    RETURN NULL;
  END IF;

  v_count := compute_rsvp_headcount(p_game_id);
  v_target := v_game.target;

  IF v_count >= v_target THEN
    RETURN 'go';
  END IF;

  IF v_count >= GREATEST(1, v_target - 2) THEN
    RETURN 'almost';
  END IF;

  RETURN 'not';
END;
$$;

CREATE OR REPLACE FUNCTION game_display_cycle_at(p_game_id TEXT, p_now TIMESTAMPTZ DEFAULT NOW())
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_game games%ROWTYPE;
  v_current TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_current := get_current_occurrence_start(
    v_game.weekday,
    v_game.start_time,
    v_game.timezone,
    p_now
  );

  IF v_game.rsvp_cycle_at IS NOT NULL
    AND v_current IS NOT NULL
    AND v_game.rsvp_cycle_at IS DISTINCT FROM v_current THEN
    RETURN v_game.rsvp_cycle_at;
  END IF;

  RETURN v_current;
END;
$$;

CREATE OR REPLACE FUNCTION enqueue_push_event(
  p_event_type TEXT,
  p_group_id TEXT,
  p_game_id TEXT DEFAULT NULL,
  p_exclude_subscriber_ids TEXT[] DEFAULT '{}',
  p_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_name TEXT;
  v_group_name TEXT;
  v_title TEXT;
  v_body TEXT;
  v_tag TEXT;
  v_url TEXT;
  v_count INTEGER;
  v_target INTEGER;
  v_need INTEGER;
  v_preview TEXT;
BEGIN
  SELECT name INTO v_group_name FROM groups WHERE id = p_group_id;

  IF p_game_id IS NOT NULL THEN
    SELECT name, target INTO v_game_name, v_target FROM games WHERE id = p_game_id;
    v_url := '/groups/' || p_group_id || '?game=' || p_game_id;
  ELSE
    v_url := '/groups/' || p_group_id;
  END IF;

  v_title := COALESCE(v_game_name, v_group_name, 'DiscCheck');

  CASE p_event_type
    WHEN 'badge_almost' THEN
      v_count := compute_rsvp_headcount(p_game_id);
      v_need := GREATEST(0, v_target - v_count);
      v_body := v_game_name || ' — Almost there — need ' || v_need || ' more';
      v_tag := 'disc-check-badge-' || p_game_id;
    WHEN 'badge_go' THEN
      v_body := v_game_name || ' — Game on. See you there!';
      v_tag := 'disc-check-badge-' || p_game_id;
    WHEN 'phase_live' THEN
      v_body := v_game_name || ' — Game is live — tap I''m here when you arrive';
      v_tag := 'disc-check-phase-' || p_game_id;
    WHEN 'game_cancelled' THEN
      v_body := v_game_name || ' — Cancelled this week';
      v_tag := 'disc-check-cancel-' || p_game_id;
    WHEN 'announcement' THEN
      v_preview := LEFT(COALESCE(p_message, ''), 80);
      v_body := v_game_name || ' — ' || COALESCE(NULLIF(v_preview, ''), 'New announcement');
      v_tag := 'disc-check-announce-' || p_game_id;
    WHEN 'chat_chatter' THEN
      v_title := COALESCE(v_group_name, 'DiscCheck');
      v_body := COALESCE(v_group_name, 'Your group') || ' — There''s some chatter — come say hi';
      v_tag := 'disc-check-chatter-' || p_group_id;
    ELSE
      RAISE EXCEPTION 'unknown push event type: %', p_event_type;
  END CASE;

  INSERT INTO push_outbox (
    group_id,
    game_id,
    event_type,
    payload,
    exclude_subscriber_ids
  ) VALUES (
    p_group_id,
    p_game_id,
    p_event_type,
    jsonb_build_object(
      'title', v_title,
      'body', v_body,
      'tag', v_tag,
      'url', v_url
    ),
    COALESCE(p_exclude_subscriber_ids, '{}')
  );
END;
$$;

CREATE OR REPLACE FUNCTION upsert_game_push_badge_state(
  p_game_id TEXT,
  p_cycle_at TIMESTAMPTZ,
  p_badge TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO game_push_state (game_id, cycle_at, last_rsvp_badge, updated_at)
  VALUES (p_game_id, p_cycle_at, p_badge, NOW())
  ON CONFLICT (game_id, cycle_at) DO UPDATE
  SET last_rsvp_badge = EXCLUDED.last_rsvp_badge,
      updated_at = NOW();
$$;

CREATE OR REPLACE FUNCTION trg_rsvps_push_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id TEXT;
  v_game games%ROWTYPE;
  v_cycle TIMESTAMPTZ;
  v_new_badge TEXT;
  v_old_badge TEXT;
BEGIN
  v_game_id := COALESCE(NEW.game_id, OLD.game_id);

  IF NOT is_rsvp_open_for_game(v_game_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT * INTO v_game FROM games WHERE id = v_game_id;
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_cycle := game_display_cycle_at(v_game_id);
  IF v_cycle IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_new_badge := compute_rsvp_badge(v_game_id);
  IF v_new_badge IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT last_rsvp_badge INTO v_old_badge
  FROM game_push_state
  WHERE game_id = v_game_id AND cycle_at = v_cycle;

  IF v_new_badge = 'almost' AND COALESCE(v_old_badge, 'not') = 'not' THEN
    PERFORM enqueue_push_event('badge_almost', v_game.group_id, v_game_id);
  ELSIF v_new_badge = 'go' AND COALESCE(v_old_badge, 'not') IN ('not', 'almost') THEN
    PERFORM enqueue_push_event('badge_go', v_game.group_id, v_game_id);
  END IF;

  PERFORM upsert_game_push_badge_state(v_game_id, v_cycle, v_new_badge);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS rsvps_push_badge ON rsvps;
CREATE TRIGGER rsvps_push_badge
AFTER INSERT OR UPDATE OR DELETE ON rsvps
FOR EACH ROW
EXECUTE FUNCTION trg_rsvps_push_badge();

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

CREATE OR REPLACE FUNCTION trg_chat_push_chatter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_distinct_senders INTEGER;
  v_last_push TIMESTAMPTZ;
BEGIN
  SELECT COUNT(DISTINCT sender_id)::INTEGER INTO v_distinct_senders
  FROM group_chat_messages
  WHERE group_id = NEW.group_id
    AND created_at >= NOW() - INTERVAL '30 minutes';

  IF v_distinct_senders < 2 THEN
    RETURN NEW;
  END IF;

  SELECT last_push_at INTO v_last_push
  FROM chat_push_state
  WHERE group_id = NEW.group_id;

  IF v_last_push IS NOT NULL AND v_last_push > NOW() - INTERVAL '1 hour' THEN
    RETURN NEW;
  END IF;

  PERFORM enqueue_push_event(
    'chat_chatter',
    NEW.group_id,
    NULL,
    ARRAY[NEW.sender_id]
  );

  INSERT INTO chat_push_state (group_id, last_push_at)
  VALUES (NEW.group_id, NOW())
  ON CONFLICT (group_id) DO UPDATE
  SET last_push_at = EXCLUDED.last_push_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_push_chatter ON group_chat_messages;
CREATE TRIGGER chat_push_chatter
AFTER INSERT ON group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION trg_chat_push_chatter();

CREATE OR REPLACE FUNCTION enqueue_phase_live_events(p_now TIMESTAMPTZ DEFAULT NOW())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game games%ROWTYPE;
  v_cycle TIMESTAMPTZ;
  v_last_phase TEXT;
  v_enqueued INTEGER := 0;
BEGIN
  FOR v_game IN
    SELECT * FROM games WHERE status = 'open'
  LOOP
    IF NOT is_game_live(v_game.weekday, v_game.start_time, v_game.timezone, p_now) THEN
      CONTINUE;
    END IF;

    v_cycle := game_display_cycle_at(v_game.id, p_now);
    IF v_cycle IS NULL THEN
      CONTINUE;
    END IF;

    SELECT last_phase INTO v_last_phase
    FROM game_push_state
    WHERE game_id = v_game.id AND cycle_at = v_cycle;

    IF v_last_phase = 'live' THEN
      CONTINUE;
    END IF;

    PERFORM enqueue_push_event('phase_live', v_game.group_id, v_game.id);

    INSERT INTO game_push_state (game_id, cycle_at, last_phase, updated_at)
    VALUES (v_game.id, v_cycle, 'live', NOW())
    ON CONFLICT (game_id, cycle_at) DO UPDATE
    SET last_phase = 'live',
        updated_at = NOW();

    v_enqueued := v_enqueued + 1;
  END LOOP;

  RETURN v_enqueued;
END;
$$;

GRANT EXECUTE ON FUNCTION enqueue_phase_live_events(TIMESTAMPTZ) TO service_role;
