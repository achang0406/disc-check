-- Platform admin: verify app_config passcode and create new groups (pickup_frisbee schema).

INSERT INTO pickup_frisbee.app_config (key, value)
VALUES ('admin_passcode', '0000')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION pickup_frisbee.verify_platform_admin(p_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pickup_frisbee
AS $$
BEGIN
  RETURN p_secret IS NOT NULL AND EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_passcode' AND value = p_secret
  );
END;
$$;

CREATE OR REPLACE FUNCTION pickup_frisbee.admin_create_group(p_secret TEXT, p_group JSONB)
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
  IF NOT verify_platform_admin(p_secret) THEN
    RAISE EXCEPTION 'invalid platform admin passcode';
  END IF;

  v_id := NULLIF(trim(p_group->>'id'), '');
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'group id is required';
  END IF;

  IF EXISTS (SELECT 1 FROM groups WHERE id = v_id) THEN
    RAISE EXCEPTION 'group id already exists';
  END IF;

  v_name := NULLIF(trim(p_group->>'name'), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'group name is required';
  END IF;

  v_description := NULLIF(trim(COALESCE(p_group->>'description', '')), '');
  v_passcode := NULLIF(trim(COALESCE(p_group->>'admin_passcode', '')), '');

  IF v_passcode IS NULL OR length(v_passcode) <> 4 OR v_passcode !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'group admin passcode must be 4 digits';
  END IF;

  INSERT INTO groups (id, name, description, admin_passcode)
  VALUES (v_id, v_name, v_description, v_passcode);
END;
$$;

GRANT EXECUTE ON FUNCTION pickup_frisbee.verify_platform_admin(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pickup_frisbee.admin_create_group(TEXT, JSONB) TO anon, authenticated, service_role;
