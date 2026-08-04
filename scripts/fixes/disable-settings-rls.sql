-- Fix for settings showing same data across franchises
-- ROOT CAUSE: Service role was being used, but RLS was still enabled
-- SOLUTION: Disable RLS on settings tables OR ensure service role truly bypasses RLS

-- Option 1: Disable RLS on settings tables (since API layer handles security)
-- This is safe because:
-- 1. API uses service role (bypasses RLS anyway)
-- 2. API manually filters by franchise_id from session
-- 3. All APIs validate user session before queries

DO $wrap$
BEGIN
  -- Disable RLS on settings tables
  ALTER TABLE IF EXISTS public.company_settings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.branding_settings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.banking_details DISABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✅ RLS disabled on settings tables - API layer handles security';
END
$wrap$;

-- Verify the change
SELECT 
  tablename,
  rowsecurity AS rls_enabled,
  'Settings tables - API layer security' AS security_model
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('company_settings', 'branding_settings', 'banking_details');
