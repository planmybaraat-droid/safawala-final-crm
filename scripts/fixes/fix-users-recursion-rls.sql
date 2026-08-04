-- Fix infinite recursion in users and franchises RLS policies
-- Problem: Policies that query users table while checking users table permissions
-- Solution: Use JWT claims directly instead of subqueries to users table

-- Helpers for JWT extraction (safe to re-run)
DO $wrap$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'jwt_app_role') THEN
    CREATE OR REPLACE FUNCTION jwt_app_role()
    RETURNS text STABLE LANGUAGE sql AS $fn_app_role$
      SELECT COALESCE(
        NULLIF(auth.jwt() ->> 'app_role', ''),
        NULLIF(auth.jwt() ->> 'role', ''),
        NULLIF((auth.jwt() -> 'user_metadata' ->> 'app_role'), ''),
        NULLIF((auth.jwt() -> 'user_metadata' ->> 'role'), '')
      );
    $fn_app_role$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'jwt_franchise_id') THEN
    CREATE OR REPLACE FUNCTION jwt_franchise_id()
    RETURNS uuid STABLE LANGUAGE sql AS $fn_fr_id$
      SELECT COALESCE(
        NULLIF(auth.jwt() ->> 'franchise_id', '')::uuid,
        NULLIF((auth.jwt() -> 'user_metadata' ->> 'franchise_id'), '')::uuid
      );
    $fn_fr_id$;
  END IF;
END
$wrap$;

-- Fix users table policies (drop recursive ones, create JWT-based)
DO $wrap$
BEGIN
  -- Drop problematic recursive policies
  DROP POLICY IF EXISTS "super_admin_full_access_users" ON users;
  DROP POLICY IF EXISTS "users_own_record" ON users;
  DROP POLICY IF EXISTS "users_update_own_record" ON users;
  DROP POLICY IF EXISTS "franchise_users_own_franchise" ON franchises;

  -- Users table: super admin can see all, regular users see own record
  CREATE POLICY "super_admin_all_users" ON users
    FOR ALL
    USING (jwt_app_role() = 'super_admin')
    WITH CHECK (jwt_app_role() = 'super_admin');

  CREATE POLICY "users_own_record_select" ON users
    FOR SELECT
    USING (id = auth.uid());

  CREATE POLICY "users_own_record_update" ON users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND franchise_id = jwt_franchise_id());

  -- Franchises table: super admin sees all, users see their own franchise
  CREATE POLICY "super_admin_all_franchises" ON franchises
    FOR ALL
    USING (jwt_app_role() = 'super_admin')
    WITH CHECK (jwt_app_role() = 'super_admin');

  CREATE POLICY "users_own_franchise_select" ON franchises
    FOR SELECT
    USING (id = jwt_franchise_id());

END
$wrap$;

-- Fix user_profiles if it exists and has similar recursion
DO $wrap$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_profiles') THEN
    -- Drop any recursive policies on user_profiles
    DROP POLICY IF EXISTS "super_admin_full_access_profiles" ON user_profiles;
    DROP POLICY IF EXISTS "users_own_profile" ON user_profiles;
    
    -- Create JWT-based policies
    CREATE POLICY "super_admin_all_profiles" ON user_profiles
      FOR ALL
      USING (jwt_app_role() = 'super_admin')
      WITH CHECK (jwt_app_role() = 'super_admin');

    CREATE POLICY "users_own_profile_select" ON user_profiles
      FOR SELECT
      USING (user_id = auth.uid());

    CREATE POLICY "users_own_profile_update" ON user_profiles
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$wrap$;

SELECT 'Users/franchises RLS recursion fixed - policies now use JWT claims directly' AS status;
