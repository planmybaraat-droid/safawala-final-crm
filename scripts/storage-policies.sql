-- Setup storage bucket policies for uploads
-- Run this in Supabase SQL Editor

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON storage.objects;

-- Create storage policies for uploads bucket

-- 1. Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- 2. Allow public read access to all files
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'uploads');

-- 3. Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated users to update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'uploads');

-- 4. Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated users to delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'uploads');

-- Verify policies are created
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO public;