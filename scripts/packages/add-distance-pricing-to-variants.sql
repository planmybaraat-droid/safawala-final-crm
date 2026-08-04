-- ============================================
-- ADD 3 DISTANCE PRICING TIERS TO ALL VARIANTS
-- For mysafawale@gmail.com franchise
-- Distance tiers: 0-50km, 51-150km, 151+km
-- Run this after creating variants
-- ============================================

DO $$
DECLARE
    v_franchise_id UUID;
    v_variant_record RECORD;
    
    -- Distance pricing configurations
    distance_ranges TEXT[] := ARRAY['0-50 km', '51-150 km', '151+ km'];
    min_kms INT[] := ARRAY[0, 51, 151];
    max_kms INT[] := ARRAY[50, 150, 999999]; -- 999999 represents unlimited
    price_additions NUMERIC[] := ARRAY[0, 1000, 3000]; -- Additional charges for distance
    
    tier_counter INT;
    variants_processed INT := 0;
    pricings_created INT := 0;
BEGIN
    -- Get franchise ID for mysafawale@gmail.com
    SELECT franchise_id INTO v_franchise_id 
    FROM users 
    WHERE email = 'mysafawale@gmail.com' 
    LIMIT 1;

    IF v_franchise_id IS NULL THEN
        RAISE EXCEPTION 'Franchise not found for mysafawale@gmail.com';
    END IF;

    RAISE NOTICE 'Starting distance pricing creation for franchise: %', v_franchise_id;
    RAISE NOTICE '===========================================';

    -- Loop through all variants for this franchise
    FOR v_variant_record IN 
        SELECT pv.id, pv.name, pv.base_price, 
               ps.name as package_name, 
               pc.name as category_name
        FROM package_variants pv
        JOIN package_sets ps ON pv.package_id = ps.id
        JOIN packages_categories pc ON ps.category_id = pc.id
        WHERE ps.franchise_id = v_franchise_id
        ORDER BY pc.display_order, ps.display_order, pv.display_order
    LOOP
        variants_processed := variants_processed + 1;
        
        RAISE NOTICE 'Variant: % - % - % (₹%)', 
                     v_variant_record.category_name,
                     v_variant_record.package_name,
                     v_variant_record.name,
                     v_variant_record.base_price;

        -- Create 3 distance pricing tiers for this variant
        FOR tier_counter IN 1..3 LOOP
            -- Check if distance pricing already exists
            IF NOT EXISTS (
                SELECT 1 FROM distance_pricing 
                WHERE variant_id = v_variant_record.id
                AND distance_range = distance_ranges[tier_counter]
            ) THEN
                RAISE NOTICE '  Creating pricing: % (+₹%)', 
                             distance_ranges[tier_counter],
                             price_additions[tier_counter];
                
                -- Create distance pricing
                INSERT INTO distance_pricing (
                    variant_id,
                    distance_range,
                    min_km,
                    max_km,
                    base_price_addition,
                    is_active,
                    created_at,
                    updated_at
                ) VALUES (
                    v_variant_record.id,
                    distance_ranges[tier_counter],
                    min_kms[tier_counter],
                    max_kms[tier_counter],
                    price_additions[tier_counter],
                    true,
                    NOW(),
                    NOW()
                );
                
                pricings_created := pricings_created + 1;
            ELSE
                RAISE NOTICE '  Distance pricing % already exists, skipping', distance_ranges[tier_counter];
            END IF;
        END LOOP;
        
        IF variants_processed % 10 = 0 THEN
            RAISE NOTICE '  --- Processed % variants ---', variants_processed;
        END IF;
    END LOOP;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Distance pricing creation complete!';
    RAISE NOTICE 'Processed % variants', variants_processed;
    RAISE NOTICE 'Created % new distance pricings', pricings_created;
    RAISE NOTICE 'Total: % variants × 3 distance tiers = % expected pricings', 
                 variants_processed, variants_processed * 3;

END $$;

-- Verification Queries
-- ============================================

-- 1. Count variants and distance pricings
SELECT 
    '=== SUMMARY ===' as section,
    (SELECT COUNT(*) FROM package_variants pv 
     JOIN package_sets ps ON pv.package_id = ps.id 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as total_variants,
    (SELECT COUNT(*) FROM distance_pricing dp 
     JOIN package_variants pv ON dp.variant_id = pv.id 
     JOIN package_sets ps ON pv.package_id = ps.id 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as total_distance_pricings;

-- 2. List all variants with distance pricing counts
SELECT 
    '=== VARIANTS WITH DISTANCE PRICING ===' as section,
    pc.name as category,
    ps.name as package,
    pv.name as variant,
    pv.base_price as variant_price,
    COUNT(dp.id) as distance_pricing_count
FROM package_variants pv
JOIN package_sets ps ON pv.package_id = ps.id
JOIN packages_categories pc ON ps.category_id = pc.id
JOIN users u ON ps.franchise_id = u.franchise_id
LEFT JOIN distance_pricing dp ON pv.id = dp.variant_id
WHERE u.email = 'mysafawale@gmail.com'
GROUP BY pc.display_order, ps.display_order, pv.display_order, 
         pc.name, ps.name, pv.name, pv.base_price
ORDER BY pc.display_order, ps.display_order, pv.display_order
LIMIT 20;

-- 3. Show complete pricing for one variant
SELECT 
    '=== SAMPLE PRICING (21 Safa - Silver - Basic) ===' as section,
    pc.name as category,
    ps.name as package,
    pv.name as variant,
    dp.distance_range,
    '₹' || pv.base_price as variant_base_price,
    '₹' || dp.base_price_addition as distance_addition,
    '₹' || (pv.base_price + dp.base_price_addition) as total_price
FROM distance_pricing dp
JOIN package_variants pv ON dp.variant_id = pv.id
JOIN package_sets ps ON pv.package_id = ps.id
JOIN packages_categories pc ON ps.category_id = pc.id
JOIN users u ON ps.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
AND pc.name = '21 Safa'
AND ps.name = 'Silver'
AND pv.name = 'Basic'
ORDER BY dp.min_km;

-- 4. Show pricing breakdown for all tiers in one category
SELECT 
    '=== COMPLETE PRICING (21 Safa Category) ===' as section,
    ps.name as package_tier,
    pv.name as variant,
    dp.distance_range,
    '₹' || (pv.base_price + dp.base_price_addition) as total_price
FROM distance_pricing dp
JOIN package_variants pv ON dp.variant_id = pv.id
JOIN package_sets ps ON pv.package_id = ps.id
JOIN packages_categories pc ON ps.category_id = pc.id
JOIN users u ON ps.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
AND pc.name = '21 Safa'
ORDER BY ps.display_order, pv.display_order, dp.min_km;

-- 5. Overall statistics
SELECT 
    '=== OVERALL STATISTICS ===' as section,
    (SELECT COUNT(*) FROM packages_categories WHERE name LIKE '% Safa') as total_categories,
    (SELECT COUNT(*) FROM package_sets ps 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as total_packages,
    (SELECT COUNT(*) FROM package_variants pv 
     JOIN package_sets ps ON pv.package_id = ps.id 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as total_variants,
    (SELECT COUNT(*) FROM distance_pricing dp 
     JOIN package_variants pv ON dp.variant_id = pv.id 
     JOIN package_sets ps ON pv.package_id = ps.id 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as total_pricings;
