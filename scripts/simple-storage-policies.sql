-- Simplified Storage Policies for Supabase
-- Run this in Supabase SQL Editor
-- This version uses simpler permissions that should work

-- First, let's check what policies already exist
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- If you see existing policies, you may need to drop them first:
-- DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;
-- DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_1" ON storage.objects;
-- DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_2" ON storage.objects;
-- DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_3" ON storage.objects;

-- Create new policies for uploads bucket
-- Note: You might need to run these one by one instead of all at once

-- 1. Allow users to see files in uploads bucket
CREATE POLICY "uploads_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'uploads');

-- 2. Allow authenticated users to upload files to uploads bucket
CREATE POLICY "uploads_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- 3. Allow authenticated users to update files in uploads bucket
CREATE POLICY "uploads_update_policy" ON storage.objects
FOR UPDATE USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- 4. Allow authenticated users to delete files in uploads bucket
CREATE POLICY "uploads_delete_policy" ON storage.objects
FOR DELETE USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');