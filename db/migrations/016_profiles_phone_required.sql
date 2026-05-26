-- Profiles are only persisted when linked to a phone number.

CREATE POLICY "profiles_public_delete" ON profiles FOR DELETE USING (true);

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
