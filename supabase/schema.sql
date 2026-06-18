-- Run in Supabase SQL Editor after creating a project.
-- Dashboard → SQL → New query → paste and run.
-- App schema: pickup_frisbee (set VITE_SUPABASE_DB_SCHEMA=pickup_frisbee in the client)

CREATE SCHEMA IF NOT EXISTS pickup_frisbee;
GRANT USAGE ON SCHEMA pickup_frisbee TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS pickup_frisbee.groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  admin_passcode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pickup_frisbee.games (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES pickup_frisbee.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  type TEXT NOT NULL DEFAULT 'goaltimate',
  target INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'open',
  rsvp_cycle_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT games_group_weekday_unique UNIQUE (group_id, weekday)
);

CREATE INDEX IF NOT EXISTS games_group_id_idx ON pickup_frisbee.games (group_id);

CREATE TABLE IF NOT EXISTS pickup_frisbee.rsvps (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES pickup_frisbee.games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  plus_ones INTEGER NOT NULL DEFAULT 0,
  bringing_kit BOOLEAN NOT NULL DEFAULT false,
  bailed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, user_id)
);

CREATE INDEX IF NOT EXISTS rsvps_game_id_idx ON pickup_frisbee.rsvps (game_id);

CREATE TABLE IF NOT EXISTS pickup_frisbee.game_check_ins (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES pickup_frisbee.games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  plus_ones INTEGER NOT NULL DEFAULT 0,
  bringing_kit BOOLEAN NOT NULL DEFAULT false,
  cycle_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, user_id, cycle_at)
);

CREATE INDEX IF NOT EXISTS game_check_ins_game_id_idx ON pickup_frisbee.game_check_ins (game_id);

CREATE TABLE IF NOT EXISTS pickup_frisbee.game_guests (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES pickup_frisbee.games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle_at TIMESTAMPTZ NOT NULL,
  guest_phase TEXT NOT NULL DEFAULT 'live',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT game_guests_guest_phase_check CHECK (guest_phase IN ('pregame', 'live'))
);

CREATE INDEX IF NOT EXISTS game_guests_game_id_idx ON pickup_frisbee.game_guests (game_id);
CREATE INDEX IF NOT EXISTS game_guests_game_cycle_phase_idx
  ON pickup_frisbee.game_guests (game_id, cycle_at, guest_phase);

CREATE TABLE IF NOT EXISTS pickup_frisbee.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  bubble_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON pickup_frisbee.profiles (phone)
  WHERE phone IS NOT NULL;

ALTER TABLE pickup_frisbee.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_frisbee.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_frisbee.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_frisbee.game_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_frisbee.game_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_frisbee.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_public_read" ON pickup_frisbee.groups FOR SELECT USING (true);
CREATE POLICY "games_public_read" ON pickup_frisbee.games FOR SELECT USING (true);
CREATE POLICY "rsvps_public_read" ON pickup_frisbee.rsvps FOR SELECT USING (true);
CREATE POLICY "rsvps_public_insert" ON pickup_frisbee.rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "rsvps_public_update" ON pickup_frisbee.rsvps FOR UPDATE USING (true);
CREATE POLICY "rsvps_public_delete" ON pickup_frisbee.rsvps FOR DELETE USING (true);
CREATE POLICY "check_ins_public_read" ON pickup_frisbee.game_check_ins FOR SELECT USING (true);
CREATE POLICY "check_ins_public_insert" ON pickup_frisbee.game_check_ins FOR INSERT WITH CHECK (true);
CREATE POLICY "check_ins_public_update" ON pickup_frisbee.game_check_ins FOR UPDATE USING (true);
CREATE POLICY "check_ins_public_delete" ON pickup_frisbee.game_check_ins FOR DELETE USING (true);
CREATE POLICY "guests_public_read" ON pickup_frisbee.game_guests FOR SELECT USING (true);
CREATE POLICY "guests_public_insert" ON pickup_frisbee.game_guests FOR INSERT WITH CHECK (true);
CREATE POLICY "guests_public_update" ON pickup_frisbee.game_guests FOR UPDATE USING (true);
CREATE POLICY "guests_public_delete" ON pickup_frisbee.game_guests FOR DELETE USING (true);
CREATE POLICY "profiles_public_read" ON pickup_frisbee.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_public_insert" ON pickup_frisbee.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_public_update" ON pickup_frisbee.profiles FOR UPDATE USING (true);
CREATE POLICY "profiles_public_delete" ON pickup_frisbee.profiles FOR DELETE USING (true);

ALTER TABLE pickup_frisbee.rsvps REPLICA IDENTITY FULL;
ALTER TABLE pickup_frisbee.groups REPLICA IDENTITY FULL;
ALTER TABLE pickup_frisbee.games REPLICA IDENTITY FULL;
ALTER TABLE pickup_frisbee.game_check_ins REPLICA IDENTITY FULL;
ALTER TABLE pickup_frisbee.game_guests REPLICA IDENTITY FULL;

-- Enable Realtime for RSVP, game, check-in, and walk-in live updates.
-- If these lines error because the tables are already added, that's OK.
ALTER PUBLICATION supabase_realtime ADD TABLE pickup_frisbee.rsvps;
ALTER PUBLICATION supabase_realtime ADD TABLE pickup_frisbee.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE pickup_frisbee.games;
ALTER PUBLICATION supabase_realtime ADD TABLE pickup_frisbee.game_check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE pickup_frisbee.game_guests;

CREATE OR REPLACE FUNCTION pickup_frisbee.get_current_occurrence_start(
  p_weekday SMALLINT,
  p_start_time TIME,
  p_timezone TEXT,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  local_date DATE;
  local_dow INT;
  days_back INT;
  candidate_date DATE;
  occurrence TIMESTAMPTZ;
BEGIN
  IF p_weekday IS NULL OR p_start_time IS NULL OR p_timezone IS NULL THEN
    RETURN NULL;
  END IF;

  local_date := (p_now AT TIME ZONE p_timezone)::DATE;
  local_dow := EXTRACT(DOW FROM local_date)::INT;
  days_back := (local_dow - p_weekday + 7) % 7;
  candidate_date := local_date - days_back;

  occurrence := (candidate_date + p_start_time) AT TIME ZONE p_timezone;

  IF p_now < occurrence THEN
    candidate_date := candidate_date - 7;
    occurrence := (candidate_date + p_start_time) AT TIME ZONE p_timezone;
  END IF;

  WHILE occurrence + INTERVAL '12 hours' <= p_now LOOP
    candidate_date := candidate_date + 7;
    occurrence := (candidate_date + p_start_time) AT TIME ZONE p_timezone;
  END LOOP;

  RETURN occurrence;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.is_game_live(
  p_weekday SMALLINT,
  p_start_time TIME,
  p_timezone TEXT,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  occurrence TIMESTAMPTZ;
BEGIN
  occurrence := get_current_occurrence_start(p_weekday, p_start_time, p_timezone, p_now);
  IF occurrence IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN p_now >= occurrence AND p_now < occurrence + INTERVAL '3 hours';
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.is_rsvp_locked(
  p_weekday SMALLINT,
  p_start_time TIME,
  p_timezone TEXT,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  occurrence TIMESTAMPTZ;
BEGIN
  occurrence := get_current_occurrence_start(p_weekday, p_start_time, p_timezone, p_now);
  IF occurrence IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN p_now >= occurrence AND p_now < occurrence + INTERVAL '12 hours';
END;
$$;

-- Weekly RSVP reset: clears signups when the pickup week rolls over (~12h after game start).
CREATE OR REPLACE FUNCTION pickup_frisbee.is_cycle_reset_in_progress()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('pickup_frisbee.resetting_cycle', true), '') = 'true';
$$;

CREATE TABLE IF NOT EXISTS pickup_frisbee.game_push_state (
  game_id TEXT NOT NULL REFERENCES pickup_frisbee.games(id) ON DELETE CASCADE,
  cycle_at TIMESTAMPTZ NOT NULL,
  group_id TEXT NOT NULL REFERENCES pickup_frisbee.groups(id) ON DELETE CASCADE,
  target INTEGER NOT NULL,
  game_status TEXT NOT NULL,
  rsvp_headcount INTEGER NOT NULL DEFAULT 0,
  pregame_guest_count INTEGER NOT NULL DEFAULT 0,
  checkin_headcount INTEGER NOT NULL DEFAULT 0,
  last_badge_milestone TEXT,
  last_checkin_badge_milestone TEXT,
  last_phase TEXT,
  next_live_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, cycle_at)
);

CREATE INDEX IF NOT EXISTS game_push_state_next_live_at_idx
  ON pickup_frisbee.game_push_state (next_live_at)
  WHERE next_live_at IS NOT NULL AND game_status <> 'cancelled';

CREATE TABLE IF NOT EXISTS pickup_frisbee.push_outbox (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES pickup_frisbee.groups(id) ON DELETE CASCADE,
  game_id TEXT REFERENCES pickup_frisbee.games(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  exclude_subscriber_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS push_outbox_unprocessed_idx
  ON pickup_frisbee.push_outbox (created_at)
  WHERE processed_at IS NULL;

CREATE OR REPLACE FUNCTION pickup_frisbee.upsert_game_push_state_for_cycle(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_group_id TEXT;
  v_target INTEGER;
  v_status TEXT;
  v_next_live TIMESTAMPTZ;
BEGIN
  IF p_cycle IS NULL THEN
    RETURN;
  END IF;

  SELECT group_id, target, status
  INTO v_group_id, v_target, v_status
  FROM games
  WHERE id = p_game_id;

  IF v_group_id IS NULL THEN
    RETURN;
  END IF;

  IF v_status = 'cancelled' THEN
    v_next_live := NULL;
  ELSE
    v_next_live := p_cycle;
  END IF;

  INSERT INTO game_push_state (
    game_id,
    cycle_at,
    group_id,
    target,
    game_status,
    rsvp_headcount,
    pregame_guest_count,
    checkin_headcount,
    last_badge_milestone,
    last_checkin_badge_milestone,
    last_phase,
    next_live_at,
    updated_at
  ) VALUES (
    p_game_id,
    p_cycle,
    v_group_id,
    v_target,
    v_status,
    0,
    0,
    0,
    NULL,
    NULL,
    NULL,
    v_next_live,
    NOW()
  )
  ON CONFLICT (game_id, cycle_at) DO UPDATE SET
    group_id = EXCLUDED.group_id,
    target = EXCLUDED.target,
    game_status = EXCLUDED.game_status,
    rsvp_headcount = 0,
    pregame_guest_count = 0,
    checkin_headcount = 0,
    last_badge_milestone = NULL,
    last_checkin_badge_milestone = NULL,
    last_phase = NULL,
    next_live_at = EXCLUDED.next_live_at,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.reset_game_rsvp_cycle(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
BEGIN
  PERFORM set_config('pickup_frisbee.resetting_cycle', 'true', true);
  DELETE FROM game_guests WHERE game_id = p_game_id;
  DELETE FROM game_check_ins WHERE game_id = p_game_id;
  DELETE FROM rsvps WHERE game_id = p_game_id;
  UPDATE games SET rsvp_cycle_at = p_cycle WHERE id = p_game_id;
  PERFORM upsert_game_push_state_for_cycle(p_game_id, p_cycle);
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.enforce_rsvp_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_game_id TEXT;
  v_stored_cycle TIMESTAMPTZ;
  v_occurrence TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_game_id := COALESCE(NEW.game_id, OLD.game_id);
  SELECT weekday, start_time, timezone, rsvp_cycle_at
  INTO v_weekday, v_start_time, v_timezone, v_stored_cycle
  FROM games
  WHERE id = v_game_id;

  v_occurrence := get_current_occurrence_start(v_weekday, v_start_time, v_timezone, NOW());

  IF v_stored_cycle IS NOT NULL AND v_stored_cycle IS DISTINCT FROM v_occurrence THEN
    RAISE EXCEPTION 'RSVP is locked until the weekly reset';
  END IF;

  IF v_occurrence IS NOT NULL
     AND NOW() >= v_occurrence
     AND NOW() < v_occurrence + INTERVAL '12 hours' THEN
    RAISE EXCEPTION 'RSVP is locked while the game is live';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.reset_stale_game_cycles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  g RECORD;
  v_cycle TIMESTAMPTZ;
BEGIN
  FOR g IN
    SELECT id, weekday, start_time, timezone, rsvp_cycle_at, status
    FROM games
    WHERE status <> 'cancelled'
  LOOP
    v_cycle := get_current_occurrence_start(g.weekday, g.start_time, g.timezone);
    IF v_cycle IS NULL THEN
      CONTINUE;
    END IF;

    IF g.rsvp_cycle_at IS DISTINCT FROM v_cycle THEN
      PERFORM reset_game_rsvp_cycle(g.id, v_cycle);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.enforce_check_in_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_occurrence TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN NEW;
  END IF;

  SELECT weekday, start_time, timezone
  INTO v_weekday, v_start_time, v_timezone
  FROM games
  WHERE id = NEW.game_id;

  v_occurrence := get_current_occurrence_start(v_weekday, v_start_time, v_timezone, NOW());

  IF v_occurrence IS NULL
     OR NOT (NOW() >= v_occurrence AND NOW() < v_occurrence + INTERVAL '3 hours') THEN
    RAISE EXCEPTION 'Check-in opens when the game starts';
  END IF;

  IF NEW.cycle_at IS DISTINCT FROM v_occurrence THEN
    RAISE EXCEPTION 'Check-in cycle mismatch';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.enforce_check_in_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_occurrence TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN OLD;
  END IF;

  SELECT weekday, start_time, timezone
  INTO v_weekday, v_start_time, v_timezone
  FROM games
  WHERE id = OLD.game_id;

  v_occurrence := get_current_occurrence_start(v_weekday, v_start_time, v_timezone, NOW());

  IF v_occurrence IS NULL
     OR NOT (NOW() >= v_occurrence AND NOW() < v_occurrence + INTERVAL '3 hours') THEN
    RAISE EXCEPTION 'Check-in is closed';
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.enforce_guest_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday SMALLINT;
  v_start_time TIME;
  v_timezone TEXT;
  v_stored_cycle TIMESTAMPTZ;
  v_occurrence TIMESTAMPTZ;
  v_in_live BOOLEAN;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT weekday, start_time, timezone, rsvp_cycle_at
  INTO v_weekday, v_start_time, v_timezone, v_stored_cycle
  FROM games
  WHERE id = COALESCE(NEW.game_id, OLD.game_id);

  v_occurrence := get_current_occurrence_start(v_weekday, v_start_time, v_timezone, NOW());

  IF v_stored_cycle IS NOT NULL AND v_stored_cycle IS DISTINCT FROM v_occurrence THEN
    RAISE EXCEPTION 'Guests are locked until the weekly reset';
  END IF;

  v_in_live := v_occurrence IS NOT NULL
    AND NOW() >= v_occurrence
    AND NOW() < v_occurrence + INTERVAL '3 hours';

  IF TG_OP = 'INSERT' THEN
    IF v_in_live THEN
      IF NOT EXISTS (
        SELECT 1
        FROM game_check_ins
        WHERE game_id = NEW.game_id
          AND cycle_at = v_occurrence
        LIMIT 1
      ) THEN
        RAISE EXCEPTION 'Walk-ins can only be added after someone has checked in';
      END IF;
      NEW.guest_phase := 'live';
    ELSIF v_occurrence IS NOT NULL AND NOW() < v_occurrence THEN
      IF NOT EXISTS (
        SELECT 1 FROM rsvps WHERE game_id = NEW.game_id LIMIT 1
      ) THEN
        RAISE EXCEPTION 'Guests can only be added after someone has RSVP''d';
      END IF;
      NEW.guest_phase := 'pregame';
    ELSE
      RAISE EXCEPTION 'Guests can only be added during pregame or while the game is live';
    END IF;
  END IF;

  IF NOT v_in_live AND NOT (v_occurrence IS NOT NULL AND NOW() < v_occurrence) THEN
    RAISE EXCEPTION 'Guests can only be added during pregame or while the game is live';
  END IF;

  IF COALESCE(NEW.cycle_at, OLD.cycle_at) IS DISTINCT FROM v_occurrence THEN
    RAISE EXCEPTION 'Guest cycle mismatch';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS rsvps_enforce_window ON pickup_frisbee.rsvps;
DROP TRIGGER IF EXISTS rsvps_enforce_window_insert_delete ON pickup_frisbee.rsvps;
DROP TRIGGER IF EXISTS rsvps_enforce_window_update ON pickup_frisbee.rsvps;

CREATE TRIGGER rsvps_enforce_window_insert_delete
  BEFORE INSERT OR DELETE ON pickup_frisbee.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.enforce_rsvp_window();

CREATE TRIGGER rsvps_enforce_window_update
  BEFORE UPDATE OF plus_ones, bringing_kit, game_id, user_id ON pickup_frisbee.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.enforce_rsvp_window();

DROP TRIGGER IF EXISTS game_check_ins_enforce_window ON pickup_frisbee.game_check_ins;
DROP TRIGGER IF EXISTS game_check_ins_enforce_insert ON pickup_frisbee.game_check_ins;
DROP TRIGGER IF EXISTS game_check_ins_enforce_update ON pickup_frisbee.game_check_ins;

CREATE TRIGGER game_check_ins_enforce_insert
  BEFORE INSERT ON pickup_frisbee.game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.enforce_check_in_window();

CREATE TRIGGER game_check_ins_enforce_update
  BEFORE UPDATE OF plus_ones, bringing_kit, game_id, user_id, cycle_at ON pickup_frisbee.game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.enforce_check_in_window();

DROP TRIGGER IF EXISTS game_check_ins_enforce_delete ON pickup_frisbee.game_check_ins;
CREATE TRIGGER game_check_ins_enforce_delete
  BEFORE DELETE ON pickup_frisbee.game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.enforce_check_in_delete();

DROP TRIGGER IF EXISTS game_guests_enforce_window ON pickup_frisbee.game_guests;
DROP TRIGGER IF EXISTS game_guests_enforce_insert_delete ON pickup_frisbee.game_guests;
DROP TRIGGER IF EXISTS game_guests_enforce_update ON pickup_frisbee.game_guests;

CREATE TRIGGER game_guests_enforce_insert_delete
  BEFORE INSERT OR DELETE ON pickup_frisbee.game_guests
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.enforce_guest_window();

CREATE TRIGGER game_guests_enforce_update
  BEFORE UPDATE OF game_id, cycle_at ON pickup_frisbee.game_guests
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.enforce_guest_window();

CREATE OR REPLACE FUNCTION pickup_frisbee.sync_game_push_state_denorm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_next_live TIMESTAMPTZ;
BEGIN
  IF NEW.rsvp_cycle_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    v_next_live := NULL;
  ELSE
    v_next_live := NEW.rsvp_cycle_at;
  END IF;

  INSERT INTO game_push_state (
    game_id,
    cycle_at,
    group_id,
    target,
    game_status,
    next_live_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.rsvp_cycle_at,
    NEW.group_id,
    NEW.target,
    NEW.status,
    v_next_live,
    NOW()
  )
  ON CONFLICT (game_id, cycle_at) DO UPDATE SET
    group_id = EXCLUDED.group_id,
    target = EXCLUDED.target,
    game_status = EXCLUDED.game_status,
    next_live_at = EXCLUDED.next_live_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.enqueue_push_event(
  p_event_type TEXT,
  p_group_id TEXT,
  p_game_id TEXT DEFAULT NULL,
  p_exclude_subscriber_ids TEXT[] DEFAULT '{}',
  p_payload JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
BEGIN
  IF p_group_id IS NULL OR trim(p_group_id) = '' THEN
    RAISE EXCEPTION 'enqueue_push_event requires group_id';
  END IF;

  IF p_event_type IS NULL OR trim(p_event_type) = '' THEN
    RAISE EXCEPTION 'enqueue_push_event requires event_type';
  END IF;

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
    p_payload,
    COALESCE(p_exclude_subscriber_ids, '{}')
  );
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.badge_milestone_rank(p_milestone TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_milestone
    WHEN 'almost' THEN 1
    WHEN 'go' THEN 2
    WHEN 'live_some' THEN 3
    WHEN 'live_full' THEN 4
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.compute_badge_milestone(p_headcount INTEGER, p_target INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_live_some INTEGER;
  v_live_full INTEGER;
BEGIN
  v_live_some := CEIL(p_target * 1.5)::INTEGER;
  v_live_full := CEIL(p_target * 2.0)::INTEGER;

  IF p_headcount >= v_live_full THEN
    RETURN 'live_full';
  END IF;

  IF p_headcount >= v_live_some THEN
    RETURN 'live_some';
  END IF;

  IF p_headcount >= p_target THEN
    RETURN 'go';
  END IF;

  IF p_headcount >= GREATEST(1, p_target - 2) THEN
    RETURN 'almost';
  END IF;

  RETURN 'not';
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.rsvp_milestone_to_event(p_milestone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_milestone
    WHEN 'almost' THEN 'rsvp_almost'
    WHEN 'go' THEN 'rsvp_go'
    WHEN 'live_some' THEN 'rsvp_surge_some'
    WHEN 'live_full' THEN 'rsvp_surge_full'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.checkin_milestone_to_event(p_milestone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_milestone
    WHEN 'almost' THEN 'checkin_almost'
    WHEN 'go' THEN 'checkin_go'
    WHEN 'live_some' THEN 'checkin_live_some'
    WHEN 'live_full' THEN 'checkin_live_full'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.compute_pregame_badge_milestone(p_headcount INTEGER, p_target INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_almost_threshold INTEGER;
BEGIN
  IF p_headcount >= p_target THEN
    RETURN 'go';
  END IF;

  v_almost_threshold := GREATEST(1, p_target - 2);

  IF p_headcount >= v_almost_threshold THEN
    RETURN 'almost';
  END IF;

  RETURN 'not';
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.supersede_pending_rsvp_badge(p_game_id TEXT, p_new_rank INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
BEGIN
  IF p_game_id IS NULL OR trim(p_game_id) = '' THEN
    RETURN;
  END IF;

  DELETE FROM push_outbox
  WHERE game_id = p_game_id
    AND processed_at IS NULL
    AND event_type IN (
      'rsvp_almost',
      'rsvp_go',
      'rsvp_surge_some',
      'rsvp_surge_full',
      'badge_almost',
      'badge_go'
    )
    AND badge_milestone_rank(
      CASE event_type
        WHEN 'rsvp_almost' THEN 'almost'
        WHEN 'rsvp_go' THEN 'go'
        WHEN 'rsvp_surge_some' THEN 'live_some'
        WHEN 'rsvp_surge_full' THEN 'live_full'
        WHEN 'badge_almost' THEN 'almost'
        WHEN 'badge_go' THEN 'go'
        ELSE 'not'
      END
    ) < p_new_rank;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.supersede_pending_checkin_badge(p_game_id TEXT, p_new_rank INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
BEGIN
  IF p_game_id IS NULL OR trim(p_game_id) = '' THEN
    RETURN;
  END IF;

  DELETE FROM push_outbox
  WHERE game_id = p_game_id
    AND processed_at IS NULL
    AND event_type IN (
      'checkin_almost',
      'checkin_go',
      'checkin_live_some',
      'checkin_live_full'
    )
    AND badge_milestone_rank(
      CASE event_type
        WHEN 'checkin_almost' THEN 'almost'
        WHEN 'checkin_go' THEN 'go'
        WHEN 'checkin_live_some' THEN 'live_some'
        WHEN 'checkin_live_full' THEN 'live_full'
        ELSE 'not'
      END
    ) < p_new_rank;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.try_enqueue_rsvp_badge_upgrade(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_group_id TEXT;
  v_target INTEGER;
  v_rsvp_headcount INTEGER;
  v_pregame_guest_count INTEGER;
  v_total_headcount INTEGER;
  v_last_milestone TEXT;
  v_new_milestone TEXT;
  v_last_rank INTEGER;
  v_new_rank INTEGER;
BEGIN
  IF p_game_id IS NULL OR p_cycle IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOW() >= p_cycle THEN
    RETURN FALSE;
  END IF;

  SELECT group_id, target, rsvp_headcount, pregame_guest_count, last_badge_milestone
  INTO v_group_id, v_target, v_rsvp_headcount, v_pregame_guest_count, v_last_milestone
  FROM game_push_state
  WHERE game_id = p_game_id
    AND cycle_at = p_cycle;

  IF NOT FOUND OR v_group_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_total_headcount := COALESCE(v_rsvp_headcount, 0) + COALESCE(v_pregame_guest_count, 0);
  v_new_milestone := compute_badge_milestone(v_total_headcount, v_target);
  v_last_rank := badge_milestone_rank(COALESCE(v_last_milestone, 'not'));
  v_new_rank := badge_milestone_rank(v_new_milestone);

  IF v_new_rank <= v_last_rank OR v_new_milestone = 'not' THEN
    RETURN FALSE;
  END IF;

  PERFORM supersede_pending_rsvp_badge(p_game_id, v_new_rank);

  IF v_new_milestone = 'almost' THEN
    PERFORM enqueue_push_event(
      rsvp_milestone_to_event(v_new_milestone),
      v_group_id,
      p_game_id,
      '{}',
      jsonb_build_object(
        'headcount_at_enqueue', v_total_headcount,
        'target_at_enqueue', v_target
      )
    );
  ELSE
    PERFORM enqueue_push_event(
      rsvp_milestone_to_event(v_new_milestone),
      v_group_id,
      p_game_id,
      '{}',
      NULL
    );
  END IF;

  UPDATE game_push_state
  SET
    last_badge_milestone = v_new_milestone,
    updated_at = NOW()
  WHERE game_id = p_game_id
    AND cycle_at = p_cycle;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.try_enqueue_checkin_badge_upgrade(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_group_id TEXT;
  v_target INTEGER;
  v_headcount INTEGER;
  v_last_milestone TEXT;
  v_new_milestone TEXT;
  v_last_rank INTEGER;
  v_new_rank INTEGER;
BEGIN
  IF p_game_id IS NULL OR p_cycle IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOW() < p_cycle OR NOW() >= p_cycle + INTERVAL '3 hours' THEN
    RETURN FALSE;
  END IF;

  SELECT group_id, target, checkin_headcount, last_checkin_badge_milestone
  INTO v_group_id, v_target, v_headcount, v_last_milestone
  FROM game_push_state
  WHERE game_id = p_game_id
    AND cycle_at = p_cycle;

  IF NOT FOUND OR v_group_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_new_milestone := compute_badge_milestone(v_headcount, v_target);
  v_last_rank := badge_milestone_rank(COALESCE(v_last_milestone, 'not'));
  v_new_rank := badge_milestone_rank(v_new_milestone);

  IF v_new_rank <= v_last_rank OR v_new_milestone = 'not' THEN
    RETURN FALSE;
  END IF;

  PERFORM supersede_pending_checkin_badge(p_game_id, v_new_rank);

  IF v_new_milestone = 'almost' THEN
    PERFORM enqueue_push_event(
      checkin_milestone_to_event(v_new_milestone),
      v_group_id,
      p_game_id,
      '{}',
      jsonb_build_object(
        'headcount_at_enqueue', v_headcount,
        'target_at_enqueue', v_target
      )
    );
  ELSE
    PERFORM enqueue_push_event(
      checkin_milestone_to_event(v_new_milestone),
      v_group_id,
      p_game_id,
      '{}',
      NULL
    );
  END IF;

  UPDATE game_push_state
  SET
    last_checkin_badge_milestone = v_new_milestone,
    updated_at = NOW()
  WHERE game_id = p_game_id
    AND cycle_at = p_cycle;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.supersede_pending_badge(p_game_id TEXT, p_new_rank INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
BEGIN
  PERFORM supersede_pending_rsvp_badge(p_game_id, p_new_rank);
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.maintain_rsvp_push_headcount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_game_id TEXT;
  v_delta INTEGER;
  v_cycle TIMESTAMPTZ;
  v_group_id TEXT;
  v_target INTEGER;
  v_status TEXT;
  v_next_live TIMESTAMPTZ;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_game_id := COALESCE(NEW.game_id, OLD.game_id);

  IF TG_OP = 'INSERT' THEN
    v_delta := 1 + NEW.plus_ones;
  ELSIF TG_OP = 'DELETE' THEN
    v_delta := -(1 + OLD.plus_ones);
  ELSE
    v_delta := (1 + NEW.plus_ones) - (1 + OLD.plus_ones);
    IF v_delta = 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT rsvp_cycle_at, group_id, target, status
  INTO v_cycle, v_group_id, v_target, v_status
  FROM games
  WHERE id = v_game_id;

  IF v_cycle IS NULL OR v_status = 'cancelled' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_next_live := v_cycle;

  INSERT INTO game_push_state (
    game_id,
    cycle_at,
    group_id,
    target,
    game_status,
    rsvp_headcount,
    next_live_at,
    updated_at
  ) VALUES (
    v_game_id,
    v_cycle,
    v_group_id,
    v_target,
    v_status,
    v_delta,
    v_next_live,
    NOW()
  )
  ON CONFLICT (game_id, cycle_at) DO UPDATE SET
    rsvp_headcount = game_push_state.rsvp_headcount + EXCLUDED.rsvp_headcount,
    updated_at = NOW();

  IF NOW() < v_cycle THEN
    PERFORM try_enqueue_rsvp_badge_upgrade(v_game_id, v_cycle);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.maintain_pregame_guest_push_headcount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_game_id TEXT;
  v_cycle TIMESTAMPTZ;
  v_delta INTEGER;
  v_phase TEXT;
  v_status TEXT;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_game_id := COALESCE(NEW.game_id, OLD.game_id);
  v_phase := COALESCE(NEW.guest_phase, OLD.guest_phase);

  IF v_phase IS DISTINCT FROM 'pregame' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_delta := 1;
  ELSE
    v_delta := -1;
  END IF;

  SELECT rsvp_cycle_at, status
  INTO v_cycle, v_status
  FROM games
  WHERE id = v_game_id;

  IF v_cycle IS NULL OR v_status = 'cancelled' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO game_push_state (game_id, cycle_at, group_id, target, game_status, pregame_guest_count, updated_at)
  SELECT v_game_id, v_cycle, g.group_id, g.target, g.status, v_delta, NOW()
  FROM games g
  WHERE g.id = v_game_id
  ON CONFLICT (game_id, cycle_at) DO UPDATE SET
    pregame_guest_count = game_push_state.pregame_guest_count + EXCLUDED.pregame_guest_count,
    updated_at = NOW();

  IF NOW() < v_cycle THEN
    PERFORM try_enqueue_rsvp_badge_upgrade(v_game_id, v_cycle);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.maintain_checkin_push_headcount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_game_id TEXT;
  v_cycle TIMESTAMPTZ;
  v_delta INTEGER;
  v_guest_phase TEXT;
  v_status TEXT;
BEGIN
  IF is_cycle_reset_in_progress() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_game_id := COALESCE(NEW.game_id, OLD.game_id);

  SELECT status INTO v_status FROM games WHERE id = v_game_id;
  IF v_status IS NULL OR v_status = 'cancelled' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'game_check_ins' THEN
    v_cycle := COALESCE(NEW.cycle_at, OLD.cycle_at);

    IF TG_OP = 'INSERT' THEN
      v_delta := 1 + NEW.plus_ones;
    ELSIF TG_OP = 'DELETE' THEN
      v_delta := -(1 + OLD.plus_ones);
    ELSE
      v_delta := (1 + NEW.plus_ones) - (1 + OLD.plus_ones);
      IF v_delta = 0 THEN
        RETURN NEW;
      END IF;
    END IF;
  ELSE
    v_cycle := COALESCE(NEW.cycle_at, OLD.cycle_at);
    v_guest_phase := COALESCE(NEW.guest_phase, OLD.guest_phase);

    IF v_guest_phase IS DISTINCT FROM 'live' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
      v_delta := 1;
    ELSE
      v_delta := -1;
    END IF;
  END IF;

  INSERT INTO game_push_state (game_id, cycle_at, group_id, target, game_status, checkin_headcount, updated_at)
  SELECT v_game_id, v_cycle, g.group_id, g.target, g.status, v_delta, NOW()
  FROM games g
  WHERE g.id = v_game_id
  ON CONFLICT (game_id, cycle_at) DO UPDATE SET
    checkin_headcount = game_push_state.checkin_headcount + EXCLUDED.checkin_headcount,
    updated_at = NOW();

  IF v_cycle IS NOT NULL
     AND NOW() >= v_cycle
     AND NOW() < v_cycle + INTERVAL '3 hours' THEN
    PERFORM try_enqueue_checkin_badge_upgrade(v_game_id, v_cycle);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS rsvps_maintain_push_headcount ON pickup_frisbee.rsvps;
DROP TRIGGER IF EXISTS rsvps_maintain_push_headcount_ins_del ON pickup_frisbee.rsvps;
DROP TRIGGER IF EXISTS rsvps_maintain_push_headcount_update ON pickup_frisbee.rsvps;

CREATE TRIGGER rsvps_maintain_push_headcount_ins_del
  AFTER INSERT OR DELETE ON pickup_frisbee.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.maintain_rsvp_push_headcount();

CREATE TRIGGER rsvps_maintain_push_headcount_update
  AFTER UPDATE OF plus_ones ON pickup_frisbee.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.maintain_rsvp_push_headcount();

DROP TRIGGER IF EXISTS game_guests_maintain_pregame_push_headcount ON pickup_frisbee.game_guests;
CREATE TRIGGER game_guests_maintain_pregame_push_headcount
  AFTER INSERT OR DELETE ON pickup_frisbee.game_guests
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.maintain_pregame_guest_push_headcount();

DROP TRIGGER IF EXISTS game_check_ins_maintain_push_headcount_ins_del ON pickup_frisbee.game_check_ins;
DROP TRIGGER IF EXISTS game_check_ins_maintain_push_headcount_update ON pickup_frisbee.game_check_ins;

CREATE TRIGGER game_check_ins_maintain_push_headcount_ins_del
  AFTER INSERT OR DELETE ON pickup_frisbee.game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.maintain_checkin_push_headcount();

CREATE TRIGGER game_check_ins_maintain_push_headcount_update
  AFTER UPDATE OF plus_ones ON pickup_frisbee.game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.maintain_checkin_push_headcount();

DROP TRIGGER IF EXISTS game_guests_maintain_live_push_headcount ON pickup_frisbee.game_guests;
CREATE TRIGGER game_guests_maintain_live_push_headcount
  AFTER INSERT OR DELETE ON pickup_frisbee.game_guests
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.maintain_checkin_push_headcount();

DROP TRIGGER IF EXISTS games_sync_push_state ON pickup_frisbee.games;
CREATE TRIGGER games_sync_push_state
  AFTER UPDATE OF status, target, weekday, start_time, timezone, group_id ON pickup_frisbee.games
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.sync_game_push_state_denorm();

CREATE TABLE IF NOT EXISTS pickup_frisbee.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE pickup_frisbee.app_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION pickup_frisbee.enqueue_due_phase_live_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_row RECORD;
  v_next_live TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT
      gps.game_id,
      gps.cycle_at,
      gps.group_id,
      g.weekday,
      g.start_time,
      g.timezone
    FROM game_push_state gps
    INNER JOIN games g ON g.id = gps.game_id
    WHERE gps.next_live_at IS NOT NULL
      AND gps.next_live_at <= NOW()
      AND gps.game_status <> 'cancelled'
      AND g.status = 'open'
      AND g.rsvp_cycle_at = gps.cycle_at
      AND gps.last_phase IS DISTINCT FROM 'live'
    FOR UPDATE OF gps SKIP LOCKED
  LOOP
    PERFORM enqueue_push_event('phase_live', v_row.group_id, v_row.game_id, '{}', NULL);

    v_next_live := get_current_occurrence_start(
      v_row.weekday,
      v_row.start_time,
      v_row.timezone,
      v_row.cycle_at + INTERVAL '7 days'
    );

    UPDATE game_push_state
    SET
      last_phase = 'live',
      next_live_at = v_next_live,
      updated_at = NOW()
    WHERE game_id = v_row.game_id
      AND cycle_at = v_row.cycle_at;

    PERFORM try_enqueue_checkin_badge_upgrade(v_row.game_id, v_row.cycle_at);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION pickup_frisbee.reset_game_rsvp_cycle(TEXT, TIMESTAMPTZ) TO service_role;
REVOKE ALL ON FUNCTION pickup_frisbee.enqueue_push_event(TEXT, TEXT, TEXT, TEXT[], JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pickup_frisbee.enqueue_push_event(TEXT, TEXT, TEXT, TEXT[], JSONB) TO service_role;
REVOKE ALL ON FUNCTION pickup_frisbee.badge_milestone_rank(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.compute_badge_milestone(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.rsvp_milestone_to_event(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.checkin_milestone_to_event(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.compute_pregame_badge_milestone(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.supersede_pending_badge(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.supersede_pending_rsvp_badge(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.supersede_pending_checkin_badge(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.try_enqueue_rsvp_badge_upgrade(TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.try_enqueue_checkin_badge_upgrade(TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pickup_frisbee.supersede_pending_rsvp_badge(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.supersede_pending_checkin_badge(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.try_enqueue_rsvp_badge_upgrade(TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.try_enqueue_checkin_badge_upgrade(TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.compute_badge_milestone(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.supersede_pending_badge(TEXT, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION pickup_frisbee.enqueue_due_phase_live_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pickup_frisbee.enqueue_due_phase_live_events() TO service_role;
REVOKE ALL ON FUNCTION pickup_frisbee.upsert_game_push_state_for_cycle(TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pickup_frisbee.upsert_game_push_state_for_cycle(TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.reset_stale_game_cycles() TO service_role;

CREATE OR REPLACE FUNCTION pickup_frisbee.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF digits = '' THEN
    RETURN NULL;
  END IF;

  IF length(digits) = 10 THEN
    digits := '1' || digits;
  END IF;

  RETURN digits;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.find_profile_by_phone(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  normalized TEXT;
  row profiles;
BEGIN
  normalized := normalize_phone(p_phone);
  IF normalized IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO row FROM profiles WHERE phone = normalized;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', row.id,
    'name', row.name,
    'phone', row.phone,
    'bubbleColor', row.bubble_color
  );
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.upsert_profile(p_profile JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_id TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_bubble_color TEXT;
  existing_id TEXT;
BEGIN
  v_id := p_profile->>'id';
  v_name := trim(p_profile->>'name');
  v_phone := normalize_phone(p_profile->>'phone');
  v_bubble_color := NULLIF(trim(p_profile->>'bubbleColor'), '');

  IF v_id IS NULL OR trim(v_id) = '' THEN
    RAISE EXCEPTION 'profile id is required';
  END IF;

  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'profile name is required';
  END IF;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'phone is required to save profile';
  END IF;

  SELECT id INTO existing_id FROM profiles WHERE phone = v_phone AND id <> v_id;
  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'phone already linked to another profile';
  END IF;

  INSERT INTO profiles (id, name, phone, bubble_color, updated_at)
  VALUES (v_id, v_name, v_phone, v_bubble_color, NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    bubble_color = EXCLUDED.bubble_color,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'id', v_id,
    'name', v_name,
    'phone', v_phone,
    'bubbleColor', v_bubble_color
  );
END;
$$;

GRANT EXECUTE ON FUNCTION pickup_frisbee.find_profile_by_phone(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.upsert_profile(JSONB) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION pickup_frisbee.verify_group_admin_secret(p_group_id TEXT, p_secret TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
BEGIN
  IF p_group_id IS NULL OR trim(p_group_id) = '' OR p_secret IS NULL OR NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND admin_passcode = p_secret
  ) THEN
    RAISE EXCEPTION 'invalid group admin passcode';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.verify_group_admin(p_group_id TEXT, p_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
BEGIN
  RETURN p_group_id IS NOT NULL AND trim(p_group_id) <> '' AND p_secret IS NOT NULL AND EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND admin_passcode = p_secret
  );
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.admin_upsert_group(p_secret TEXT, p_group JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_id TEXT;
  v_name TEXT;
  v_description TEXT;
  v_passcode TEXT;
BEGIN
  v_id := NULLIF(trim(p_group->>'id'), '');
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'group id is required';
  END IF;

  PERFORM verify_group_admin_secret(v_id, p_secret);

  v_name := NULLIF(trim(p_group->>'name'), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'group name is required';
  END IF;

  v_description := NULLIF(trim(COALESCE(p_group->>'description', '')), '');
  v_passcode := NULLIF(trim(COALESCE(p_group->>'admin_passcode', '')), '');

  UPDATE groups
  SET
    name = v_name,
    description = v_description,
    admin_passcode = COALESCE(v_passcode, admin_passcode)
  WHERE id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.admin_upsert_game(p_secret TEXT, p_game JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
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

CREATE OR REPLACE FUNCTION pickup_frisbee.admin_delete_game(p_secret TEXT, p_game_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_group_id TEXT;
BEGIN
  IF p_game_id IS NULL OR trim(p_game_id) = '' THEN
    RAISE EXCEPTION 'game id is required';
  END IF;

  SELECT group_id INTO v_group_id FROM games WHERE id = p_game_id;
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'game not found';
  END IF;

  PERFORM verify_group_admin_secret(v_group_id, p_secret);

  DELETE FROM games WHERE id = p_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION pickup_frisbee.verify_group_admin(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.admin_upsert_group(TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.admin_upsert_game(TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.admin_delete_game(TEXT, TEXT) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS pickup_frisbee.push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES pickup_frisbee.groups(id) ON DELETE CASCADE,
  subscriber_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_group_id_idx ON pickup_frisbee.push_subscriptions (group_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_subscriber_id_idx ON pickup_frisbee.push_subscriptions (subscriber_id);

ALTER TABLE pickup_frisbee.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_public_read" ON pickup_frisbee.push_subscriptions FOR SELECT USING (true);
CREATE POLICY "push_subscriptions_public_insert" ON pickup_frisbee.push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "push_subscriptions_public_update" ON pickup_frisbee.push_subscriptions FOR UPDATE USING (true);
CREATE POLICY "push_subscriptions_public_delete" ON pickup_frisbee.push_subscriptions FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS pickup_frisbee.group_chat_messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES pickup_frisbee.groups(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_color TEXT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS group_chat_messages_group_id_created_at_idx
  ON pickup_frisbee.group_chat_messages (group_id, created_at DESC);

ALTER TABLE pickup_frisbee.group_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_chat_messages_public_read" ON pickup_frisbee.group_chat_messages FOR SELECT USING (true);
CREATE POLICY "group_chat_messages_public_insert" ON pickup_frisbee.group_chat_messages FOR INSERT WITH CHECK (true);

ALTER TABLE pickup_frisbee.group_chat_messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE pickup_frisbee.group_chat_messages;

CREATE OR REPLACE FUNCTION pickup_frisbee.trim_group_chat_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  max_messages CONSTANT INTEGER := 100;
  excess INTEGER;
BEGIN
  SELECT COUNT(*) - max_messages INTO excess
  FROM pickup_frisbee.group_chat_messages
  WHERE group_id = NEW.group_id;

  IF excess > 0 THEN
    DELETE FROM pickup_frisbee.group_chat_messages
    WHERE id IN (
      SELECT id
      FROM pickup_frisbee.group_chat_messages
      WHERE group_id = NEW.group_id
      ORDER BY created_at ASC, id ASC
      LIMIT excess
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trim_group_chat_messages_after_insert ON pickup_frisbee.group_chat_messages;

CREATE TRIGGER trim_group_chat_messages_after_insert
AFTER INSERT ON pickup_frisbee.group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION pickup_frisbee.trim_group_chat_messages();

CREATE TABLE IF NOT EXISTS pickup_frisbee.chat_push_state (
  group_id TEXT PRIMARY KEY REFERENCES pickup_frisbee.groups(id) ON DELETE CASCADE,
  window_senders JSONB NOT NULL DEFAULT '[]'::jsonb,
  distinct_sender_count INTEGER NOT NULL DEFAULT 0 CHECK (distinct_sender_count >= 0),
  last_push_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION pickup_frisbee.maintain_chat_push_state(p_group_id TEXT, p_sender_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_window_cutoff TIMESTAMPTZ := NOW() - INTERVAL '30 minutes';
  v_max_senders CONSTANT INTEGER := 20;
  v_now TIMESTAMPTZ := NOW();
  v_senders JSONB;
  v_pruned JSONB;
  v_elem JSONB;
  v_found BOOLEAN;
  v_i INTEGER;
  v_min_at TIMESTAMPTZ;
  v_min_idx INTEGER;
  v_distinct INTEGER;
  v_last_push_at TIMESTAMPTZ;
BEGIN
  IF p_group_id IS NULL OR trim(p_group_id) = '' THEN
    RETURN;
  END IF;

  IF p_sender_id IS NULL OR trim(p_sender_id) = '' THEN
    RETURN;
  END IF;

  INSERT INTO chat_push_state (group_id)
  VALUES (p_group_id)
  ON CONFLICT (group_id) DO NOTHING;

  SELECT window_senders, last_push_at
  INTO v_senders, v_last_push_at
  FROM chat_push_state
  WHERE group_id = p_group_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_pruned := '[]'::jsonb;
  FOR v_i IN 0 .. COALESCE(jsonb_array_length(v_senders), 0) - 1 LOOP
    v_elem := v_senders -> v_i;
    IF (v_elem ->> 'at')::timestamptz >= v_window_cutoff THEN
      v_pruned := v_pruned || jsonb_build_array(v_elem);
    END IF;
  END LOOP;
  v_senders := v_pruned;

  v_found := FALSE;
  v_pruned := '[]'::jsonb;
  FOR v_i IN 0 .. COALESCE(jsonb_array_length(v_senders), 0) - 1 LOOP
    v_elem := v_senders -> v_i;
    IF v_elem ->> 'sender_id' = p_sender_id THEN
      v_pruned := v_pruned || jsonb_build_array(
        jsonb_build_object('sender_id', p_sender_id, 'at', v_now)
      );
      v_found := TRUE;
    ELSE
      v_pruned := v_pruned || jsonb_build_array(v_elem);
    END IF;
  END LOOP;

  IF NOT v_found THEN
    v_pruned := v_pruned || jsonb_build_array(
      jsonb_build_object('sender_id', p_sender_id, 'at', v_now)
    );
  END IF;
  v_senders := v_pruned;

  WHILE COALESCE(jsonb_array_length(v_senders), 0) > v_max_senders LOOP
    v_min_at := NULL;
    v_min_idx := 0;

    FOR v_i IN 0 .. jsonb_array_length(v_senders) - 1 LOOP
      IF v_min_at IS NULL OR (v_senders -> v_i ->> 'at')::timestamptz < v_min_at THEN
        v_min_at := (v_senders -> v_i ->> 'at')::timestamptz;
        v_min_idx := v_i;
      END IF;
    END LOOP;

    v_pruned := '[]'::jsonb;
    FOR v_i IN 0 .. jsonb_array_length(v_senders) - 1 LOOP
      IF v_i <> v_min_idx THEN
        v_pruned := v_pruned || jsonb_build_array(v_senders -> v_i);
      END IF;
    END LOOP;
    v_senders := v_pruned;
  END LOOP;

  v_distinct := COALESCE(jsonb_array_length(v_senders), 0);

  IF v_distinct >= 2
     AND (v_last_push_at IS NULL OR v_last_push_at <= v_now - INTERVAL '1 hour')
  THEN
    DELETE FROM push_outbox
    WHERE group_id = p_group_id
      AND event_type = 'chat_chatter'
      AND processed_at IS NULL;

    PERFORM enqueue_push_event(
      'chat_chatter',
      p_group_id,
      NULL,
      ARRAY[p_sender_id],
      NULL
    );

    v_last_push_at := v_now;
  END IF;

  UPDATE chat_push_state
  SET
    window_senders = v_senders,
    distinct_sender_count = v_distinct,
    last_push_at = v_last_push_at,
    updated_at = v_now
  WHERE group_id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.trg_group_chat_maintain_push_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
BEGIN
  PERFORM maintain_chat_push_state(NEW.group_id, NEW.sender_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS group_chat_messages_maintain_push_state ON pickup_frisbee.group_chat_messages;

CREATE TRIGGER group_chat_messages_maintain_push_state
AFTER INSERT ON pickup_frisbee.group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION pickup_frisbee.trg_group_chat_maintain_push_state();

REVOKE ALL ON FUNCTION pickup_frisbee.maintain_chat_push_state(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.trg_group_chat_maintain_push_state() FROM PUBLIC;

CREATE TABLE IF NOT EXISTS pickup_frisbee.group_chat_message_reactions (
  message_id TEXT NOT NULL REFERENCES pickup_frisbee.group_chat_messages(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES pickup_frisbee.groups(id) ON DELETE CASCADE,
  reactor_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, reactor_id),
  CHECK (
    emoji = ANY (
      ARRAY[
        '❤️', '👍', '👎', '😂', '‼️', '❓',
        '🔥', '🎉', '👀', '💯', '🙏', '✨'
      ]::TEXT[]
    )
  )
);

CREATE INDEX IF NOT EXISTS group_chat_message_reactions_group_message_idx
  ON pickup_frisbee.group_chat_message_reactions (group_id, message_id);

ALTER TABLE pickup_frisbee.group_chat_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_chat_message_reactions_public_read"
  ON pickup_frisbee.group_chat_message_reactions FOR SELECT USING (true);
CREATE POLICY "group_chat_message_reactions_public_insert"
  ON pickup_frisbee.group_chat_message_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "group_chat_message_reactions_public_update"
  ON pickup_frisbee.group_chat_message_reactions FOR UPDATE USING (true);
CREATE POLICY "group_chat_message_reactions_public_delete"
  ON pickup_frisbee.group_chat_message_reactions FOR DELETE USING (true);

ALTER TABLE pickup_frisbee.group_chat_message_reactions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE pickup_frisbee.group_chat_message_reactions;

CREATE OR REPLACE FUNCTION pickup_frisbee.trg_group_chat_reaction_set_group_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_group_id TEXT;
BEGIN
  SELECT group_id INTO v_group_id
  FROM pickup_frisbee.group_chat_messages
  WHERE id = NEW.message_id;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'message_id % not found in group_chat_messages', NEW.message_id;
  END IF;

  NEW.group_id := v_group_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS group_chat_message_reactions_set_group_id ON pickup_frisbee.group_chat_message_reactions;

CREATE TRIGGER group_chat_message_reactions_set_group_id
  BEFORE INSERT OR UPDATE ON pickup_frisbee.group_chat_message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION pickup_frisbee.trg_group_chat_reaction_set_group_id();

REVOKE ALL ON FUNCTION pickup_frisbee.trg_group_chat_reaction_set_group_id() FROM PUBLIC;

CREATE OR REPLACE FUNCTION pickup_frisbee.prune_push_outbox(p_retention_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 1 THEN
    RAISE EXCEPTION 'prune_push_outbox retention_days must be at least 1';
  END IF;

  DELETE FROM push_outbox
  WHERE processed_at IS NOT NULL
    AND processed_at < NOW() - make_interval(days => p_retention_days);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.prune_game_push_state(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 1 THEN
    RAISE EXCEPTION 'prune_game_push_state retention_days must be at least 1';
  END IF;

  DELETE FROM game_push_state gps
  WHERE gps.cycle_at < NOW() - make_interval(days => p_retention_days)
    AND NOT EXISTS (
      SELECT 1
      FROM games g
      WHERE g.id = gps.game_id
        AND g.rsvp_cycle_at = gps.cycle_at
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.prune_activity_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
DECLARE
  v_push_outbox INTEGER;
  v_game_push_state INTEGER;
BEGIN
  v_push_outbox := prune_push_outbox(30);
  v_game_push_state := prune_game_push_state(90);

  RETURN jsonb_build_object(
    'push_outbox_deleted', v_push_outbox,
    'game_push_state_deleted', v_game_push_state,
    'pruned_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION pickup_frisbee.prune_push_outbox(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.prune_game_push_state(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION pickup_frisbee.prune_activity_retention() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION pickup_frisbee.prune_push_outbox(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.prune_game_push_state(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.prune_activity_retention() TO service_role;

-- PostgREST / Supabase API grants for exposed schema
GRANT ALL ON ALL TABLES IN SCHEMA pickup_frisbee TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pickup_frisbee TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pickup_frisbee TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pickup_frisbee GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pickup_frisbee GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pickup_frisbee GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
