-- Platform admin passcode 6789; validate group passcode format on edit.

UPDATE pickup_frisbee.app_config
SET value = '6789'
WHERE key = 'admin_passcode';

INSERT INTO pickup_frisbee.app_config (key, value)
VALUES ('admin_passcode', '6789')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

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

  IF v_passcode IS NOT NULL AND (length(v_passcode) <> 4 OR v_passcode !~ '^\d{4}$') THEN
    RAISE EXCEPTION 'group admin passcode must be 4 digits';
  END IF;

  UPDATE groups
  SET
    name = v_name,
    description = v_description,
    admin_passcode = COALESCE(v_passcode, admin_passcode)
  WHERE id = v_id;
END;
$$;
