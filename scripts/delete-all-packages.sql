-- Delete all packages from the package_sets table
-- This will remove all 10 packages and give you a clean slate

-- First, show current package count
SELECT 'Current package count:' as info, COUNT(*) as count FROM package_sets;

-- Show all packages before deletion (for reference)
SELECT 'Packages to be deleted:' as info;
SELECT id, name, package_type, category, base_price, franchise_id, created_at 
FROM package_sets 
ORDER BY created_at DESC;

-- Delete all packages
DELETE FROM package_sets;

-- Verify deletion
SELECT 'Packages after deletion:' as info, COUNT(*) as count FROM package_sets;

-- Reset the sequence for clean ID numbering when you create new packages
ALTER SEQUENCE package_sets_id_seq RESTART WITH 1;

-- Show table structure for reference
SELECT 'Table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'package_sets' 
ORDER BY ordinal_position;

-- Success message
SELECT 'All packages have been successfully deleted from package_sets table' as result;
