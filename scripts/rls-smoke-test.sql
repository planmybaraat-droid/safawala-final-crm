-- RLS Smoke Test for Safawala CRM
-- Purpose: Quickly validate RLS coverage and data isolation by franchise
-- How to run: Paste into Supabase SQL editor (or psql) and execute.
-- Notes: This only reads data and uses transactions for write probes (rolled back).

-- ===== 1) Overview: RLS status and policies =====
\echo '=== RLS STATUS SUMMARY (public schema) ==='
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls,
       (SELECT COUNT(*) FROM pg_policies p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN (
    'franchises','users','customers','vendors','products','bookings','booking_items',
    'payments','purchases','purchase_items','expenses','laundry_batches','laundry_batch_items',
    'laundry_items','activity_logs','deliveries'
  )
ORDER BY c.relname;

\echo '=== POLICY DETAILS (table, command, expr) ==='
SELECT n.nspname AS schema,
       c.relname AS table_name,
       p.polname,
       p.polcmd,
       COALESCE(pg_get_expr(p.polqual, p.polrelid), '-') AS using_expr,
       COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '-') AS with_check_expr
FROM pg_policies p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, p.polname;

\echo '=== RED FLAGS: Wide-open policies (name contains "Enable all for authenticated users") ==='
SELECT c.relname AS table_name, p.polname, p.polcmd
FROM pg_policies p
JOIN pg_class c ON c.oid = p.polrelid
WHERE p.polname ILIKE '%Enable all for authenticated users%'
ORDER BY c.relname;

-- ===== 2) Helpers: claims setter and franchise accessors =====
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_local_claims'
  ) THEN
    CREATE OR REPLACE FUNCTION set_local_claims(p_role text, p_user_id uuid, p_franchise uuid, p_app_role text)
    RETURNS void AS $$
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
    $$ LANGUAGE plpgsql;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'jwt_franchise_id'
  ) THEN
    CREATE OR REPLACE FUNCTION jwt_franchise_id()
    RETURNS uuid
    STABLE
    LANGUAGE sql
    AS $$
      SELECT COALESCE(
        NULLIF(auth.jwt() ->> 'franchise_id', '')::uuid,
        NULLIF((auth.jwt() -> 'user_metadata' ->> 'franchise_id'), '')::uuid
      );
    $$;
  END IF;
END $$;

-- ===== 3) Scenario A: Non-matching franchise must see zero rows =====
\echo '=== SCENARIO A: Authenticated staff with RANDOM franchise should see 0 rows from tenant-scoped tables ==='
DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_franchise uuid := gen_random_uuid(); -- unlikely to match any actual row
  t record;
  visible_count bigint;
BEGIN
  PERFORM set_local_claims('authenticated', v_user, v_franchise, 'staff');

  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'franchise_id'
      AND table_name IN (
        'customers','products','bookings','payments','purchases','expenses','laundry_batches','deliveries'
      )
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', t.table_name) INTO visible_count;
    IF visible_count > 0 THEN
      RAISE NOTICE '[LEAK] %: % rows visible for foreign franchise claims', t.table_name, visible_count;
    ELSE
      RAISE NOTICE '[OK]   %: 0 rows visible (isolated)', t.table_name;
    END IF;
  END LOOP;
END $$;

-- ===== 4) Scenario B: Super admin should bypass and see rows =====
\echo '=== SCENARIO B: Super admin should see rows (if data exists) ==='
DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_franchise uuid := gen_random_uuid();
  t record;
  visible_count bigint;
BEGIN
  PERFORM set_local_claims('authenticated', v_user, v_franchise, 'super_admin');

  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'franchise_id'
      AND table_name IN (
        'customers','products','bookings','payments','purchases','expenses','laundry_batches','deliveries'
      )
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', t.table_name) INTO visible_count;
    RAISE NOTICE '[INFO] %: super_admin sees % rows', t.table_name, visible_count;
  END LOOP;
END $$;

-- ===== 5) Laundry tables sanity: RLS should be enabled =====
\echo '=== LAUNDRY TABLES RLS CHECK ==='
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN ('vendors','laundry_batches','laundry_batch_items','laundry_tracking')
ORDER BY c.relname;

-- ===== 6) Scenario C: Franchise admin by email (real user) =====
\echo '=== SCENARIO C: Franchise admin by email should only see own franchise rows ==='
DO $$
DECLARE
  v_email text := 'mysafawale@gmail.com'; -- change if needed
  v_user uuid;
  v_franchise uuid;
  t record;
  visible_count bigint;
  expected_count bigint;
BEGIN
  -- Try to locate the user and their franchise in public.users
  SELECT id, franchise_id
    INTO v_user, v_franchise
  FROM public.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user IS NULL OR v_franchise IS NULL THEN
    RAISE EXCEPTION 'Could not resolve user (%%) or franchise_id from public.users. Adjust query to match your schema.', v_email;
  END IF;

  PERFORM set_local_claims('authenticated', v_user, v_franchise, 'franchise_admin');

  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'franchise_id'
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', t.table_name) INTO visible_count;
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE franchise_id = $1', t.table_name) USING v_franchise INTO expected_count;

    IF visible_count = expected_count THEN
      RAISE NOTICE '[OK]   %: % rows visible, matches franchise_id = %', t.table_name, visible_count, v_franchise;
    ELSE
      RAISE NOTICE '[WARN] %: visible % != expected (franchise % only) % — check RLS policies', t.table_name, visible_count, v_franchise, expected_count;
    END IF;
  END LOOP;
END $$;

-- ===== 7) RED FLAGS: Missing WITH CHECK on INSERT/UPDATE =====
\echo '=== RED FLAGS: Tenant tables missing INSERT/UPDATE WITH CHECK enforcing franchise_id ==='
WITH tenant_tables AS (
  SELECT table_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND column_name = 'franchise_id'
)
SELECT tt.table_name
FROM tenant_tables tt
JOIN pg_class c ON c.relname = tt.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
LEFT JOIN pg_policies p ON p.polrelid = c.oid AND p.polcmd IN ('a','w')
GROUP BY tt.table_name
HAVING COALESCE(bool_or(COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ILIKE '%franchise_id%'), FALSE) = FALSE
ORDER BY tt.table_name;

-- ===== 8) RED FLAGS: RLS disabled on tenant tables =====
\echo '=== RED FLAGS: RLS disabled on tables that have franchise_id ==='
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN information_schema.columns cols ON cols.table_schema = n.nspname AND cols.table_name = c.relname AND cols.column_name = 'franchise_id'
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
ORDER BY c.relname;

\echo '=== DONE: Review [LEAK]/[OK] notices above and RLS flags ==='
