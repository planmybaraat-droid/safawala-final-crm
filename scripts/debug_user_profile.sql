-- DEBUG: Check if user exists in user_profiles
-- Run this to verify Suresh's user record

-- 1. Check if user exists in user_profiles with the correct auth.uid()
SELECT 
  id,
  name,
  email,
  role,
  franchise_id,
  created_at
FROM user_profiles
WHERE id = '5322e8d9-d4d8-4c48-8563-c9785c1cffd0';

-- 2. Check auth.users to see what's available there
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users
WHERE id = '5322e8d9-d4d8-4c48-8563-c9785c1cffd0';

-- 3. If user is missing from user_profiles, we need a different approach
-- Let's check what we CAN access in RLS context
-- This query simulates what the RLS policy sees:
SELECT 
  auth.uid() as current_user_id,
  (SELECT franchise_id FROM user_profiles WHERE id = auth.uid()) as franchise_from_profiles,
  auth.jwt() -> 'user_metadata' ->> 'franchise_id' as franchise_from_jwt;
