-- Clear all sample package data from package_sets table
-- This will remove all existing packages so you can create fresh data

-- First, show current package count before deletion
SELECT 
    COUNT(*) as total_packages_before_deletion,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_packages,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_packages
FROM package_sets;

-- Delete all package data
DELETE FROM package_sets;

-- Verify deletion
SELECT 
    COUNT(*) as remaining_packages_after_deletion
FROM package_sets;

-- Reset the sequence if needed (optional)
-- This ensures new packages start with clean IDs
SELECT setval(pg_get_serial_sequence('package_sets', 'id'), 1, false);

-- Show table structure for reference
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'package_sets' 
ORDER BY ordinal_position;

-- Confirmation message
SELECT 'All package sample data has been successfully removed. You can now create new packages.' as status;
