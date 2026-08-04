-- ============================================
-- FIX STORAGE BUCKET POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop all existing policies on storage.objects for settings-uploads
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
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 2. Create permissive policies that allow anon and authenticated users
CREATE POLICY "Allow anon to upload files to settings-uploads"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'settings-uploads');

CREATE POLICY "Allow anon to read files from settings-uploads"
ON storage.objects FOR SELECT
TO anon, authenticated, public
USING (bucket_id = 'settings-uploads');

CREATE POLICY "Allow anon to update files in settings-uploads"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'settings-uploads');

CREATE POLICY "Allow anon to delete files from settings-uploads"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'settings-uploads');

-- 3. Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%settings-uploads%';

SELECT '✅ Storage policies updated successfully!' as status;
