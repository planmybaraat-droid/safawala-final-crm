-- Complete Service Role Security Setup
-- This disables RLS on tables where API layer handles security
-- Service role bypasses RLS anyway, but disabling it makes the intent clear

-- ============================================================
-- SETTINGS TABLES - Disable RLS (API handles security)
-- ============================================================
DO $wrap$
BEGIN
  -- Disable RLS on settings tables
  ALTER TABLE IF EXISTS public.company_settings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.branding_settings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.banking_details DISABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✅ Settings tables: RLS disabled - API validates & filters by franchise_id';
END
$wrap$;

-- ============================================================
-- USERS & FRANCHISES - Disable RLS (API handles security)
-- ============================================================
DO $wrap$
BEGIN
  -- Drop all existing policies on users
  DROP POLICY IF EXISTS "super_admin_all_users" ON users;
  DROP POLICY IF EXISTS "users_own_record_select" ON users;
  DROP POLICY IF EXISTS "users_own_record_update" ON users;
  DROP POLICY IF EXISTS "super_admin_full_access_users" ON users;
  DROP POLICY IF EXISTS "users_own_record" ON users;
  DROP POLICY IF EXISTS "users_update_own_record" ON users;
  
  -- Drop all existing policies on franchises
  DROP POLICY IF EXISTS "super_admin_all_franchises" ON franchises;
  DROP POLICY IF EXISTS "users_own_franchise_select" ON franchises;
  DROP POLICY IF EXISTS "franchise_users_own_franchise" ON franchises;
  
  -- Drop all existing policies on user_profiles
  DROP POLICY IF EXISTS "super_admin_all_profiles" ON user_profiles;
  DROP POLICY IF EXISTS "users_own_profile_select" ON user_profiles;
  DROP POLICY IF EXISTS "users_own_profile_update" ON user_profiles;
  DROP POLICY IF EXISTS "super_admin_full_access_profiles" ON user_profiles;
  DROP POLICY IF EXISTS "users_own_profile" ON user_profiles;
  
  -- Disable RLS on these tables
  ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.franchises DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.user_profiles DISABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✅ Users/Franchises: RLS disabled - API validates session & controls access';
END
$wrap$;

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 
  tablename,
  rowsecurity AS rls_enabled,
  CASE 
    WHEN tablename IN ('company_settings', 'branding_settings', 'banking_details') 
      THEN 'Settings - API filters by franchise_id'
    WHEN tablename IN ('users', 'franchises', 'user_profiles') 
      THEN 'Identity - API validates session'
    ELSE 'Other'
  END AS security_model
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'company_settings', 'branding_settings', 'banking_details',
    'users', 'franchises', 'user_profiles'
  )
ORDER BY tablename;

-- ============================================================
-- SUMMARY
-- ============================================================
SELECT '
✅ SERVICE ROLE SECURITY MODEL ACTIVE

Your API layer provides security through:

1. Session Validation
   - Every API request validates safawala_session cookie
   - Extracts user_id and franchise_id from session

2. Franchise Isolation
   - All queries filtered by franchise_id from session
   - Users cannot access other franchises data

3. Service Role Access
   - APIs use SUPABASE_SERVICE_ROLE_KEY
   - Bypasses RLS for direct database access
   - Security enforced in application code

4. No RLS Needed On:
   - company_settings, branding_settings, banking_details
   - users, franchises, user_profiles
   
   Because: API already filters all queries by franchise_id

⚠️ IMPORTANT: Always ensure API endpoints:
   - Call getUserFromSession() first
   - Filter queries with .eq("franchise_id", franchiseId)
   - Never accept franchise_id from request body

' AS security_summary;
