-- COMPREHENSIVE FIX FOR FRANCHISE CREATION RLS
-- Based on console logs showing Vardaan Admin (vardaan@gmail.com) with super_admin role in profiles
-- but RLS still blocking because JWT token doesn't have the role

-- ============================================================================
-- DIAGNOSIS: The issue is that:
-- 1. Your profile table shows role='super_admin'
-- 2. BUT your auth.users JWT token metadata doesn't have app_role='super_admin'
-- 3. The RLS policy checks the JWT token, NOT the profile table
-- ============================================================================

-- SOLUTION 1: Update auth.users metadata (RECOMMENDED)
-- ============================================================================

-- Step 1: Check current state
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data,
    u.raw_app_meta_data,
    u.raw_user_meta_data->>'app_role' as jwt_user_meta_role,
    u.raw_app_meta_data->>'app_role' as jwt_app_meta_role,
    p.role as profile_role,
    p.first_name,
    p.last_name
FROM auth.users u
LEFT JOIN user_profiles p ON p.email = u.email
WHERE u.email = 'vardaan@gmail.com';

-- Step 2: Update auth.users to add super_admin role to JWT metadata
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{app_role}',
    '"super_admin"'
  ),
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{app_role}',
    '"super_admin"'
  )
WHERE email = 'vardaan@gmail.com';

-- Step 3: Link the profile to the auth user (if user_id is null)
UPDATE user_profiles
SET user_id = (SELECT id FROM auth.users WHERE email = 'vardaan@gmail.com')
WHERE email = 'vardaan@gmail.com'
AND user_id IS NULL;

-- Step 4: Verify everything is correct
SELECT 
    u.id as auth_user_id,
    u.email,
    u.raw_user_meta_data->>'app_role' as jwt_user_meta_role,
    u.raw_app_meta_data->>'app_role' as jwt_app_meta_role,
    p.id as profile_id,
    p.user_id as profile_user_id,
    p.role as profile_role,
    p.first_name || ' ' || p.last_name as full_name,
    CASE 
        WHEN p.user_id = u.id THEN '✅ Linked'
        WHEN p.user_id IS NULL THEN '❌ Not linked'
        ELSE '⚠️  Wrong link'
    END as link_status
FROM auth.users u
LEFT JOIN user_profiles p ON p.email = u.email
WHERE u.email = 'vardaan@gmail.com';

-- Expected result should show:
-- jwt_user_meta_role: super_admin
-- jwt_app_meta_role: super_admin
-- profile_role: super_admin
-- link_status: ✅ Linked


-- SOLUTION 2: Add an additional RLS policy based on profile role (BACKUP)
-- ============================================================================
-- This allows INSERT based on the profile table role, not just JWT

DROP POLICY IF EXISTS franchises_insert_via_profile_role ON franchises;

CREATE POLICY franchises_insert_via_profile_role ON franchises FOR INSERT
  WITH CHECK (
    -- Allow if JWT has super_admin role (existing check)
    ((auth.jwt() ->> 'app_role') = 'super_admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'super_admin')
    OR
    -- OR if user's profile has super_admin role (new check)
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
    OR
    -- OR if user's email matches a super_admin profile (fallback)
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_profiles.email = (auth.jwt() ->> 'email')
      AND user_profiles.role = 'super_admin'
    )
  );


-- SOLUTION 3: Quick test to verify RLS function behavior
-- ============================================================================

-- Test what the RLS function sees
SELECT 
    auth.uid() as current_user_id,
    auth.jwt() ->> 'email' as jwt_email,
    auth.jwt() ->> 'app_role' as jwt_app_role,
    auth.jwt() -> 'user_metadata' ->> 'app_role' as jwt_user_meta_app_role,
    app_is_super_admin() as is_super_admin_check;


-- ============================================================================
-- INSTRUCTIONS AFTER RUNNING THIS SCRIPT:
-- ============================================================================
-- 1. Run Solution 1 (all steps) in Supabase SQL Editor
-- 2. Run Solution 2 to add the backup policy
-- 3. Go to your browser and SIGN OUT completely
-- 4. SIGN IN again (this refreshes the JWT token)
-- 5. Try creating the franchise again
-- 
-- If it still doesn't work:
-- 6. Run Solution 3 to see what the RLS function actually sees
-- 7. Share the results with me for further debugging
-- ============================================================================
