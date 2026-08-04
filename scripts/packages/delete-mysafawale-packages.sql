-- ============================================
-- DELETE ALL PACKAGES FOR mysafawale@gmail.com FRANCHISE
-- This will cascade delete all variants and distance pricing
-- Run this in Supabase SQL Editor FIRST before creating new structure
-- ============================================

DO $$
DECLARE
    v_franchise_id UUID;
    v_deleted_packages INT;
    v_deleted_variants INT;
    v_deleted_pricing INT;
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

    -- Count before deletion
    SELECT COUNT(*) INTO v_deleted_pricing
    FROM distance_pricing dp
    JOIN package_variants pv ON dp.variant_id = pv.id
    JOIN package_sets ps ON pv.package_id = ps.id
    WHERE ps.franchise_id = v_franchise_id;

    SELECT COUNT(*) INTO v_deleted_variants
    FROM package_variants pv
    JOIN package_sets ps ON pv.package_id = ps.id
    WHERE ps.franchise_id = v_franchise_id;

    SELECT COUNT(*) INTO v_deleted_packages
    FROM package_sets ps
    WHERE ps.franchise_id = v_franchise_id;

    RAISE NOTICE 'About to delete:';
    RAISE NOTICE '  - % distance pricings', v_deleted_pricing;
    RAISE NOTICE '  - % variants', v_deleted_variants;
    RAISE NOTICE '  - % packages', v_deleted_packages;

    -- Delete packages (will cascade to variants and distance_pricing due to ON DELETE CASCADE)
    DELETE FROM package_sets
    WHERE franchise_id = v_franchise_id;

    RAISE NOTICE 'Successfully deleted all packages for mysafawale@gmail.com';
    RAISE NOTICE 'Total deleted: % packages, % variants, % distance pricings', 
                 v_deleted_packages, v_deleted_variants, v_deleted_pricing;

END $$;

-- Verification: Check counts after deletion
SELECT 
    '=== VERIFICATION ===' as section,
    (SELECT COUNT(*) FROM package_sets ps 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as remaining_packages,
    (SELECT COUNT(*) FROM package_variants pv 
     JOIN package_sets ps ON pv.package_id = ps.id 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as remaining_variants,
    (SELECT COUNT(*) FROM distance_pricing dp 
     JOIN package_variants pv ON dp.variant_id = pv.id 
     JOIN package_sets ps ON pv.package_id = ps.id 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as remaining_pricings;
