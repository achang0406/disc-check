-- Run in Supabase SQL Editor after creating a project.
-- Dashboard → SQL → New query → paste and run.

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  admin_passcode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS games_group_id_idx ON games (group_id);

CREATE TABLE IF NOT EXISTS rsvps (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  plus_ones INTEGER NOT NULL DEFAULT 0,
  bringing_kit BOOLEAN NOT NULL DEFAULT false,
  bailed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, user_id)
);

CREATE INDEX IF NOT EXISTS rsvps_game_id_idx ON rsvps (game_id);

CREATE TABLE IF NOT EXISTS game_check_ins (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  plus_ones INTEGER NOT NULL DEFAULT 0,
  bringing_kit BOOLEAN NOT NULL DEFAULT false,
  cycle_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, user_id, cycle_at)
);

CREATE INDEX IF NOT EXISTS game_check_ins_game_id_idx ON game_check_ins (game_id);

CREATE TABLE IF NOT EXISTS game_guests (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_guests_game_id_idx ON game_guests (game_id);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  bubble_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON profiles (phone)
  WHERE phone IS NOT NULL;

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_public_read" ON groups FOR SELECT USING (true);
CREATE POLICY "games_public_read" ON games FOR SELECT USING (true);
CREATE POLICY "rsvps_public_read" ON rsvps FOR SELECT USING (true);
CREATE POLICY "rsvps_public_insert" ON rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "rsvps_public_update" ON rsvps FOR UPDATE USING (true);
CREATE POLICY "rsvps_public_delete" ON rsvps FOR DELETE USING (true);
CREATE POLICY "check_ins_public_read" ON game_check_ins FOR SELECT USING (true);
CREATE POLICY "check_ins_public_insert" ON game_check_ins FOR INSERT WITH CHECK (true);
CREATE POLICY "check_ins_public_update" ON game_check_ins FOR UPDATE USING (true);
CREATE POLICY "check_ins_public_delete" ON game_check_ins FOR DELETE USING (true);
CREATE POLICY "guests_public_read" ON game_guests FOR SELECT USING (true);
CREATE POLICY "guests_public_insert" ON game_guests FOR INSERT WITH CHECK (true);
CREATE POLICY "guests_public_update" ON game_guests FOR UPDATE USING (true);
CREATE POLICY "guests_public_delete" ON game_guests FOR DELETE USING (true);
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_public_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_public_update" ON profiles FOR UPDATE USING (true);
CREATE POLICY "profiles_public_delete" ON profiles FOR DELETE USING (true);

ALTER TABLE rsvps REPLICA IDENTITY FULL;
ALTER TABLE groups REPLICA IDENTITY FULL;
ALTER TABLE games REPLICA IDENTITY FULL;
ALTER TABLE game_check_ins REPLICA IDENTITY FULL;
ALTER TABLE game_guests REPLICA IDENTITY FULL;

-- Enable Realtime for RSVP, game, check-in, and walk-in live updates.
-- If these lines error because the tables are already added, that's OK.
ALTER PUBLICATION supabase_realtime ADD TABLE rsvps;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE game_guests;

CREATE OR REPLACE FUNCTION get_current_occurrence_start(
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

CREATE OR REPLACE FUNCTION is_game_live(
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

CREATE OR REPLACE FUNCTION is_rsvp_locked(
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
CREATE OR REPLACE FUNCTION is_cycle_reset_in_progress()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('disc_check.resetting_cycle', true), '') = 'true';
$$;

CREATE TABLE IF NOT EXISTS game_push_state (
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  cycle_at TIMESTAMPTZ NOT NULL,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  target INTEGER NOT NULL,
  game_status TEXT NOT NULL,
  rsvp_headcount INTEGER NOT NULL DEFAULT 0,
  last_badge_milestone TEXT,
  last_phase TEXT,
  next_live_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, cycle_at)
);

CREATE INDEX IF NOT EXISTS game_push_state_next_live_at_idx
  ON game_push_state (next_live_at)
  WHERE next_live_at IS NOT NULL AND game_status <> 'cancelled';

CREATE OR REPLACE FUNCTION upsert_game_push_state_for_cycle(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    last_badge_milestone,
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
    last_badge_milestone = NULL,
    last_phase = NULL,
    next_live_at = EXCLUDED.next_live_at,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION reset_game_rsvp_cycle(p_game_id TEXT, p_cycle TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('disc_check.resetting_cycle', 'true', true);
  DELETE FROM game_guests WHERE game_id = p_game_id;
  DELETE FROM game_check_ins WHERE game_id = p_game_id;
  DELETE FROM rsvps WHERE game_id = p_game_id;
  UPDATE games SET rsvp_cycle_at = p_cycle WHERE id = p_game_id;
  PERFORM upsert_game_push_state_for_cycle(p_game_id, p_cycle);
END;
$$;

CREATE OR REPLACE FUNCTION enforce_rsvp_window()
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

CREATE OR REPLACE FUNCTION reset_stale_game_cycles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION enforce_check_in_window()
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

CREATE OR REPLACE FUNCTION enforce_check_in_delete()
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

CREATE OR REPLACE FUNCTION enforce_guest_window()
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
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT weekday, start_time, timezone
  INTO v_weekday, v_start_time, v_timezone
  FROM games
  WHERE id = COALESCE(NEW.game_id, OLD.game_id);

  v_occurrence := get_current_occurrence_start(v_weekday, v_start_time, v_timezone, NOW());

  IF v_occurrence IS NULL
     OR NOT (NOW() >= v_occurrence AND NOW() < v_occurrence + INTERVAL '3 hours') THEN
    RAISE EXCEPTION 'Walk-in guests can only be added while the game is live';
  END IF;

  IF COALESCE(NEW.cycle_at, OLD.cycle_at) IS DISTINCT FROM v_occurrence THEN
    RAISE EXCEPTION 'Walk-in guest cycle mismatch';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS rsvps_enforce_window ON rsvps;
DROP TRIGGER IF EXISTS rsvps_enforce_window_insert_delete ON rsvps;
DROP TRIGGER IF EXISTS rsvps_enforce_window_update ON rsvps;

CREATE TRIGGER rsvps_enforce_window_insert_delete
  BEFORE INSERT OR DELETE ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION enforce_rsvp_window();

CREATE TRIGGER rsvps_enforce_window_update
  BEFORE UPDATE OF plus_ones, bringing_kit, game_id, user_id ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION enforce_rsvp_window();

DROP TRIGGER IF EXISTS game_check_ins_enforce_window ON game_check_ins;
DROP TRIGGER IF EXISTS game_check_ins_enforce_insert ON game_check_ins;
DROP TRIGGER IF EXISTS game_check_ins_enforce_update ON game_check_ins;

CREATE TRIGGER game_check_ins_enforce_insert
  BEFORE INSERT ON game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_check_in_window();

CREATE TRIGGER game_check_ins_enforce_update
  BEFORE UPDATE OF plus_ones, bringing_kit, game_id, user_id, cycle_at ON game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_check_in_window();

DROP TRIGGER IF EXISTS game_check_ins_enforce_delete ON game_check_ins;
CREATE TRIGGER game_check_ins_enforce_delete
  BEFORE DELETE ON game_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_check_in_delete();

DROP TRIGGER IF EXISTS game_guests_enforce_window ON game_guests;
DROP TRIGGER IF EXISTS game_guests_enforce_insert_delete ON game_guests;
DROP TRIGGER IF EXISTS game_guests_enforce_update ON game_guests;

CREATE TRIGGER game_guests_enforce_insert_delete
  BEFORE INSERT OR DELETE ON game_guests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_guest_window();

CREATE TRIGGER game_guests_enforce_update
  BEFORE UPDATE OF game_id, cycle_at ON game_guests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_guest_window();

CREATE OR REPLACE FUNCTION sync_game_push_state_denorm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION maintain_rsvp_push_headcount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS rsvps_maintain_push_headcount ON rsvps;
DROP TRIGGER IF EXISTS rsvps_maintain_push_headcount_ins_del ON rsvps;
DROP TRIGGER IF EXISTS rsvps_maintain_push_headcount_update ON rsvps;

CREATE TRIGGER rsvps_maintain_push_headcount_ins_del
  AFTER INSERT OR DELETE ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION maintain_rsvp_push_headcount();

CREATE TRIGGER rsvps_maintain_push_headcount_update
  AFTER UPDATE OF plus_ones ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION maintain_rsvp_push_headcount();

DROP TRIGGER IF EXISTS games_sync_push_state ON games;
CREATE TRIGGER games_sync_push_state
  AFTER UPDATE OF status, target, weekday, start_time, timezone, group_id ON games
  FOR EACH ROW
  EXECUTE FUNCTION sync_game_push_state_denorm();

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

GRANT EXECUTE ON FUNCTION reset_game_rsvp_cycle(TEXT, TIMESTAMPTZ) TO service_role;
REVOKE ALL ON FUNCTION upsert_game_push_state_for_cycle(TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_game_push_state_for_cycle(TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION reset_stale_game_cycles() TO service_role;

CREATE OR REPLACE FUNCTION normalize_phone(p_phone TEXT)
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

CREATE OR REPLACE FUNCTION find_profile_by_phone(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION upsert_profile(p_profile JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION find_profile_by_phone(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_profile(JSONB) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION verify_group_admin_secret(p_group_id TEXT, p_secret TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_group_id IS NULL OR trim(p_group_id) = '' OR p_secret IS NULL OR NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND admin_passcode = p_secret
  ) THEN
    RAISE EXCEPTION 'invalid group admin passcode';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION verify_group_admin(p_group_id TEXT, p_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN p_group_id IS NOT NULL AND trim(p_group_id) <> '' AND p_secret IS NOT NULL AND EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND admin_passcode = p_secret
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_upsert_group(p_secret TEXT, p_group JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION admin_delete_game(p_secret TEXT, p_game_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION verify_group_admin(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_upsert_group(TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_upsert_game(TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_game(TEXT, TEXT) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  subscriber_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_group_id_idx ON push_subscriptions (group_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_subscriber_id_idx ON push_subscriptions (subscriber_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_public_read" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "push_subscriptions_public_insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "push_subscriptions_public_update" ON push_subscriptions FOR UPDATE USING (true);
CREATE POLICY "push_subscriptions_public_delete" ON push_subscriptions FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS group_chat_messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_color TEXT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS group_chat_messages_group_id_created_at_idx
  ON group_chat_messages (group_id, created_at DESC);

ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_chat_messages_public_read" ON group_chat_messages FOR SELECT USING (true);
CREATE POLICY "group_chat_messages_public_insert" ON group_chat_messages FOR INSERT WITH CHECK (true);

ALTER TABLE group_chat_messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_messages;

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

DROP TRIGGER IF EXISTS trim_group_chat_messages_after_insert ON group_chat_messages;

CREATE TRIGGER trim_group_chat_messages_after_insert
AFTER INSERT ON group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.trim_group_chat_messages();
