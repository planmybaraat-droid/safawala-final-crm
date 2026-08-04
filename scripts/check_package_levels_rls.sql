-- CHECK AND FIX PACKAGE_LEVELS RLS POLICY
-- Run this in Supabase SQL Editor to diagnose and fix RLS issues

-- 1) Check current RLS policies on package_levels
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'package_levels';

-- 2) Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'package_levels';

-- 3) Temporarily disable RLS to test (ONLY FOR DEBUGGING - REMOVE AFTER TESTING)
-- ALTER TABLE package_levels DISABLE ROW LEVEL SECURITY;

-- 4) Create a permissive INSERT policy for franchise users
DROP POLICY IF EXISTS "Users can insert levels for their franchise" ON package_levels;

CREATE POLICY "Users can insert levels for their franchise"
ON package_levels
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if franchise_id matches user's franchise OR user is super_admin
  franchise_id IN (
    SELECT franchise_id FROM auth.users WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'super_admin'
  )
);

-- 5) Create a SELECT policy
DROP POLICY IF EXISTS "Users can view levels for their franchise" ON package_levels;

CREATE POLICY "Users can view levels for their franchise"
ON package_levels
FOR SELECT
TO authenticated
USING (
  franchise_id IN (
    SELECT franchise_id FROM auth.users WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'super_admin'
  )
);

-- 6) Create UPDATE policy
DROP POLICY IF EXISTS "Users can update levels for their franchise" ON package_levels;

CREATE POLICY "Users can update levels for their franchise"
ON package_levels
FOR UPDATE
TO authenticated
USING (
  franchise_id IN (
    SELECT franchise_id FROM auth.users WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'super_admin'
  )
)
WITH CHECK (
  franchise_id IN (
    SELECT franchise_id FROM auth.users WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'super_admin'
  )
);

-- 7) Create DELETE policy
DROP POLICY IF EXISTS "Users can delete levels for their franchise" ON package_levels;

CREATE POLICY "Users can delete levels for their franchise"
ON package_levels
FOR DELETE
TO authenticated
USING (
  franchise_id IN (
    SELECT franchise_id FROM auth.users WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'super_admin'
  )
);

-- 8) Verify policies are created
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'package_levels';
