-- Disable Row Level Security for services table to allow development operations
-- This removes all RLS restrictions for the services table

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on services" ON services;

-- Disable RLS on services table
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to ensure operations work
GRANT ALL ON services TO anon;
GRANT ALL ON services TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE services_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE services_id_seq TO authenticated;
</sql>
