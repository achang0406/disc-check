-- Optional phone-linked profiles for cross-device identity.

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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_public_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_public_update" ON profiles FOR UPDATE USING (true);

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

  IF v_phone IS NOT NULL THEN
    SELECT id INTO existing_id FROM profiles WHERE phone = v_phone AND id <> v_id;
    IF existing_id IS NOT NULL THEN
      RAISE EXCEPTION 'phone already linked to another profile';
    END IF;
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
