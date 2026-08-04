-- ============================================
-- COMPLETE CLEANUP - DELETE ALL PACKAGES FOR mysafawale@gmail.com
-- This includes packages in ALL categories, not just specific ones
-- Run this to clean everything before creating new structure
-- ============================================

DO $$
DECLARE
    v_franchise_id UUID;
    v_deleted_count INT;
BEGIN
    -- Get franchise ID for mysafawale@gmail.com
    SELECT franchise_id INTO v_franchise_id 
    FROM users 
    WHERE email = 'mysafawale@gmail.com' 
    LIMIT 1;

    IF v_franchise_id IS NULL THEN
        RAISE EXCEPTION 'Franchise not found for mysafawale@gmail.com';
    END IF;

    RAISE NOTICE 'Found franchise: %', v_franchise_id;

    -- Count packages before deletion
    SELECT COUNT(*) INTO v_deleted_count
    FROM package_sets
    WHERE franchise_id = v_franchise_id;

    RAISE NOTICE 'About to delete % packages (plus their variants and distance pricing)', v_deleted_count;

    -- Delete ALL packages for this franchise
    -- This will cascade delete variants and distance_pricing due to ON DELETE CASCADE
    DELETE FROM package_sets
    WHERE franchise_id = v_franchise_id;

    RAISE NOTICE 'Successfully deleted all % packages for mysafawale@gmail.com', v_deleted_count;

    -- Also clean up any "Wedding Packages" category if not used by others
    DELETE FROM packages_categories
    WHERE name = 'Wedding Packages'
    AND id NOT IN (SELECT DISTINCT category_id FROM package_sets WHERE category_id IS NOT NULL);

    RAISE NOTICE 'Cleanup complete!';

END $$;

-- Verification: Should show 0 packages
SELECT 
    '=== AFTER CLEANUP ===' as section,
    (SELECT COUNT(*) FROM package_sets ps 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as remaining_packages;
