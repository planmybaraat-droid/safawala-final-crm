-- COMPREHENSIVE PACKAGE_LEVELS RLS FIX
-- This script will completely reset and fix RLS policies for package_levels
-- Run this in Supabase SQL Editor

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON package_levels;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON package_levels;
DROP POLICY IF EXISTS "Enable update for users based on email" ON package_levels;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON package_levels;
DROP POLICY IF EXISTS "Users can insert levels for their franchise" ON package_levels;
DROP POLICY IF EXISTS "Users can view levels for their franchise" ON package_levels;
DROP POLICY IF EXISTS "Users can update levels for their franchise" ON package_levels;
DROP POLICY IF EXISTS "Users can delete levels for their franchise" ON package_levels;

-- Step 2: Create a simple, working policy set
-- These policies check against the user_profiles table (which has franchise_id)

-- SELECT policy - Allow users to view levels for their franchise
CREATE POLICY "Allow franchise users to view their levels"
ON package_levels
FOR SELECT
TO authenticated
USING (
  -- Match franchise_id from user_profiles
  franchise_id IN (
    SELECT up.franchise_id 
    FROM user_profiles up 
    WHERE up.id = auth.uid()
  )
  OR
  -- OR user is super_admin (check in user_profiles)
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
);

-- INSERT policy
CREATE POLICY "Allow franchise users to create their levels"
ON package_levels
FOR INSERT
TO authenticated
WITH CHECK (
  franchise_id IN (
    SELECT up.franchise_id 
    FROM user_profiles up 
    WHERE up.id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
);

-- UPDATE policy
CREATE POLICY "Allow franchise users to update their levels"
ON package_levels
FOR UPDATE
TO authenticated
USING (
  franchise_id IN (
    SELECT up.franchise_id 
    FROM user_profiles up 
    WHERE up.id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
)
WITH CHECK (
  franchise_id IN (
    SELECT up.franchise_id 
    FROM user_profiles up 
    WHERE up.id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
);

-- DELETE policy
CREATE POLICY "Allow franchise users to delete their levels"
ON package_levels
FOR DELETE
TO authenticated
USING (
  franchise_id IN (
    SELECT up.franchise_id 
    FROM user_profiles up 
    WHERE up.id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
);

-- Step 3: Verify RLS is enabled
ALTER TABLE package_levels ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify policies are created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Read'
    WHEN cmd = 'INSERT' THEN 'Create'
    WHEN cmd = 'UPDATE' THEN 'Modify'
    WHEN cmd = 'DELETE' THEN 'Remove'
  END as action_type
FROM pg_policies
WHERE tablename = 'package_levels'
ORDER BY cmd;

-- Step 5: Test query (run this to verify you can see levels)
SELECT 
  pl.id,
  pl.name,
  pl.base_price,
  pl.franchise_id,
  pv.name as variant_name
FROM package_levels pl
LEFT JOIN package_variants pv ON pl.variant_id = pv.id
LIMIT 5;
