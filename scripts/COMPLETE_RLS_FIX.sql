-- ============================================
-- COMPLETE FIX: Storage + Table RLS Policies
-- Run this in Supabase SQL Editor
-- ============================================

-- PART 1: Enable RLS on settings tables and create permissive policies
-- =====================================================================

-- Enable RLS on all settings tables
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE banking_details ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DO $$ 
BEGIN
  -- Company settings policies
  DROP POLICY IF EXISTS "Allow all access to company_settings" ON company_settings;
  DROP POLICY IF EXISTS "Enable read access for all users" ON company_settings;
  DROP POLICY IF EXISTS "Enable insert for all users" ON company_settings;
  DROP POLICY IF EXISTS "Enable update for all users" ON company_settings;
  
  -- Branding settings policies
  DROP POLICY IF EXISTS "Allow all access to branding_settings" ON branding_settings;
  DROP POLICY IF EXISTS "Enable read access for all users" ON branding_settings;
  DROP POLICY IF EXISTS "Enable insert for all users" ON branding_settings;
  DROP POLICY IF EXISTS "Enable update for all users" ON branding_settings;
  
  -- Banking details policies
  DROP POLICY IF EXISTS "Allow all access to banking_details" ON banking_details;
  DROP POLICY IF EXISTS "Enable read access for all users" ON banking_details;
  DROP POLICY IF EXISTS "Enable insert for all users" ON banking_details;
  DROP POLICY IF EXISTS "Enable update for all users" ON banking_details;
  DROP POLICY IF EXISTS "Enable delete for all users" ON banking_details;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create permissive policies for company_settings (allow all operations for anon and authenticated)
CREATE POLICY "Enable read access for all users"
ON company_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Enable insert for all users"
ON company_settings FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON company_settings FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Create permissive policies for branding_settings
CREATE POLICY "Enable read access for all users"
ON branding_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Enable insert for all users"
ON branding_settings FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON branding_settings FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Create permissive policies for banking_details
CREATE POLICY "Enable read access for all users"
ON banking_details FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Enable insert for all users"
ON banking_details FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON banking_details FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
ON banking_details FOR DELETE
TO anon, authenticated
USING (true);

-- PART 2: Fix Storage Bucket and Policies
-- =========================================

-- Ensure bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'settings-uploads';

-- Drop all existing storage policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to update their files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to delete their files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow anon to upload files to settings-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow anon to read files from settings-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow anon to update files in settings-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow anon to delete files from settings-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "settings-uploads: allow all operations" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create comprehensive storage policies (anon + authenticated + public)
CREATE POLICY "settings-uploads: allow all operations"
ON storage.objects
FOR ALL
TO anon, authenticated, public
USING (bucket_id = 'settings-uploads')
WITH CHECK (bucket_id = 'settings-uploads');

-- PART 3: Verify Everything
-- ==========================

SELECT '✅ TABLE POLICIES' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('company_settings', 'branding_settings', 'banking_details')
ORDER BY tablename, policyname;

SELECT '✅ STORAGE BUCKET' as status;
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE name = 'settings-uploads';

SELECT '✅ STORAGE POLICIES' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%settings-uploads%';

SELECT '🎉 Complete! All RLS policies configured for open access.' as final_status;
