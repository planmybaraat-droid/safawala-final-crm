-- Create session-local claims setter (bridge for non-Supabase-auth login)
-- Safe to run multiple times

CREATE OR REPLACE FUNCTION set_local_claims(
  p_role text,
  p_user_id uuid,
  p_franchise uuid,
  p_app_role text
) RETURNS void AS $$
DECLARE
  claims jsonb;
BEGIN
  claims := jsonb_build_object(
    'role', p_role,
    'sub', p_user_id::text,
    'franchise_id', p_franchise::text,
    'app_role', p_app_role,
    'user_metadata', jsonb_build_object('franchise_id', p_franchise::text, 'app_role', p_app_role)
  );
  PERFORM set_config('request.jwt.claims', claims::text, true);
  PERFORM set_config('role', p_role, true);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION set_local_claims(text, uuid, uuid, text)
IS 'Sets request.jwt.claims in current session to bridge RLS until full Supabase Auth is used.';
