-- Strict RLS policies for settings tables by franchise, with super_admin bypass
-- Safe + idempotent: checks table and policy existence before creating

-- Helpers: extract app role and franchise_id from JWT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'jwt_app_role'
  ) THEN
    CREATE OR REPLACE FUNCTION jwt_app_role()
    RETURNS text
    STABLE
    LANGUAGE sql
    AS $fn_app_role$
      SELECT COALESCE(
        NULLIF(auth.jwt() ->> 'app_role', ''),
        NULLIF((auth.jwt() -> 'user_metadata' ->> 'app_role'), '')
      );
    $fn_app_role$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'jwt_franchise_id'
  ) THEN
    CREATE OR REPLACE FUNCTION jwt_franchise_id()
    RETURNS uuid
    STABLE
    LANGUAGE sql
    AS $fn_fr_id$
      SELECT COALESCE(
        NULLIF(auth.jwt() ->> 'franchise_id', '')::uuid,
        NULLIF((auth.jwt() -> 'user_metadata' ->> 'franchise_id'), '')::uuid
      );
    $fn_fr_id$;
  END IF;
END $$;

-- Utility: create policy if it doesn't already exist
CREATE OR REPLACE FUNCTION ensure_policy(
  p_table regclass,
  p_name text,
  p_cmd text,
  p_roles text,
  p_using text,
  p_check text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_exists boolean;
  v_sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid = p_table AND polname = p_name
  ) INTO v_exists;
  IF v_exists THEN RETURN; END IF;

  v_sql := 'CREATE POLICY ' || quote_ident(p_name) || ' ON ' || p_table::text ||
           CASE WHEN p_cmd IS NOT NULL THEN ' FOR ' || p_cmd ELSE '' END ||
           CASE WHEN p_roles IS NOT NULL THEN ' TO ' || p_roles ELSE '' END ||
           CASE WHEN p_using IS NOT NULL THEN ' USING (' || p_using || ')' ELSE '' END ||
           CASE WHEN p_check IS NOT NULL THEN ' WITH CHECK (' || p_check || ')' ELSE '' END || ';';
  EXECUTE v_sql;
END;
$$;

-- Apply RLS policies for each settings table if it exists
DO $$
DECLARE
  t text;
  tbl regclass;
  r record;
BEGIN
  FOREACH t IN ARRAY ARRAY['company_settings','branding_settings','banking_details'] LOOP
    -- check table exists and has franchise_id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t)
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='franchise_id') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- Identify table regclass and drop overly-permissive policies inline
      tbl := ('public.'||t)::regclass;
      FOR r IN SELECT polname FROM pg_catalog.pg_policy WHERE polrelid = tbl AND polname ILIKE '%Enable all%'
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', r.polname, t);
      END LOOP;

      -- Super admin: full access
      PERFORM ensure_policy(tbl,
        'super_admin_full_access_'||t,
        'ALL',
        'authenticated',
        'jwt_app_role() = ''super_admin''',
        'jwt_app_role() = ''super_admin''' );

      -- Franchise users: SELECT own rows
      PERFORM ensure_policy(tbl,
        'franchise_own_select_'||t,
        'SELECT',
        'authenticated',
        'franchise_id = jwt_franchise_id()',
        NULL);

      -- Franchise users: INSERT own rows
      PERFORM ensure_policy(tbl,
        'franchise_insert_'||t,
        'INSERT',
        'authenticated',
        NULL,
        'franchise_id = jwt_franchise_id()');

      -- Franchise users: UPDATE only their rows and keep franchise_id
      PERFORM ensure_policy(tbl,
        'franchise_own_update_'||t,
        'UPDATE',
        'authenticated',
        'franchise_id = jwt_franchise_id()',
        'franchise_id = jwt_franchise_id()');

      -- Franchise users: DELETE only their rows
      PERFORM ensure_policy(tbl,
        'franchise_own_delete_'||t,
        'DELETE',
        'authenticated',
        'franchise_id = jwt_franchise_id()',
        NULL);
    END IF;
  END LOOP;
END $$;

-- Cleanup helper to avoid leaving functions around if undesired; keep them since reusable.
-- SELECT 'RLS policies ensured for settings tables' AS info;
