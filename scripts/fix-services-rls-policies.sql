-- Fix RLS policies for services table to allow operations in development environment

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view services in their franchise" ON services;
DROP POLICY IF EXISTS "Users can insert services in their franchise" ON services;
DROP POLICY IF EXISTS "Users can update services in their franchise" ON services;
DROP POLICY IF EXISTS "Users can delete services in their franchise" ON services;

-- Create permissive policies for development/demo environment
CREATE POLICY "Allow all operations on services" ON services
FOR ALL
USING (true)
WITH CHECK (true);

-- Alternatively, if you want to disable RLS completely for services table:
-- ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- Ensure the table is accessible
GRANT ALL ON services TO anon;
GRANT ALL ON services TO authenticated;
GRANT USAGE ON SEQUENCE services_id_seq TO anon;
GRANT USAGE ON SEQUENCE services_id_seq TO authenticated;
