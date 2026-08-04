-- ============================================
-- ADD DEMO PACKAGES FOR mysafawale@gmail.com FRANCHISE
-- Creates 9 Safa Packages with Silver/Gold/Diamond tiers
-- Each tier has 3 variants with 5 distance-based pricing
-- Run this in Supabase SQL Editor
-- ============================================

DO $$
DECLARE
    v_franchise_id UUID;
    v_category_id UUID;
    v_user_id UUID;
    v_package_id UUID;
    v_variant_id UUID;
    
    -- Package configurations
    package_names TEXT[] := ARRAY['21 Safa Package', '31 Safa Package', '41 Safa Package', 
                                  '51 Safa Package', '61 Safa Package', '71 Safa Package',
                                  '81 Safa Package', '91 Safa Package', '101 Safa Package'];
    tiers TEXT[] := ARRAY['Silver', 'Gold', 'Diamond'];
    variants TEXT[] := ARRAY['Groom Safa + Accessories', 'Barati Safa + Brooch', 'Complete Wedding Set'];
    
    -- Pricing configuration
    tier_multipliers NUMERIC[] := ARRAY[1.0, 1.5, 2.0]; -- Silver, Gold, Diamond
    base_price NUMERIC;
    tier_price NUMERIC;
    
    package_counter INT;
    tier_counter INT;
    variant_counter INT;
BEGIN
    -- Get franchise ID for mysafawale@gmail.com
    SELECT franchise_id INTO v_franchise_id 
    FROM users 
    WHERE email = 'mysafawale@gmail.com' 
    LIMIT 1;

    IF v_franchise_id IS NULL THEN
        RAISE EXCEPTION 'Franchise not found for mysafawale@gmail.com';
    END IF;

    -- Get user ID
    SELECT id INTO v_user_id 
    FROM users 
    WHERE email = 'mysafawale@gmail.com' 
    LIMIT 1;

    RAISE NOTICE 'Starting demo package creation for franchise: %', v_franchise_id;

    -- Get or create "Wedding Packages" category
    SELECT id INTO v_category_id 
    FROM packages_categories 
    WHERE name = 'Wedding Packages' 
    LIMIT 1;

    IF v_category_id IS NULL THEN
        INSERT INTO packages_categories (name, description, is_active, display_order, created_at, updated_at)
        VALUES ('Wedding Packages', 'Traditional wedding safa packages', true, 1, NOW(), NOW())
        RETURNING id INTO v_category_id;
        RAISE NOTICE 'Created Wedding Packages category: %', v_category_id;
    END IF;

    -- Loop through 9 packages
    FOR package_counter IN 1..9 LOOP
        base_price := 5000 + (package_counter * 1000); -- Base price increases with more safas
        
        RAISE NOTICE 'Creating package %: %', package_counter, package_names[package_counter];
        
        -- Create main package
        INSERT INTO package_sets (
            name,
            description,
            base_price,
            category_id,
            franchise_id,
            is_active,
            display_order,
            created_at,
            updated_at
        ) VALUES (
            package_names[package_counter],
            'Premium wedding safa package with ' || SPLIT_PART(package_names[package_counter], ' ', 1) || ' safas including groom, barati, and accessories',
            base_price,
            v_category_id,
            v_franchise_id,
            true,
            package_counter,
            NOW(),
            NOW()
        ) RETURNING id INTO v_package_id;

        -- Loop through 3 tiers (Silver, Gold, Diamond)
        FOR tier_counter IN 1..3 LOOP
            tier_price := base_price * tier_multipliers[tier_counter];
            
            RAISE NOTICE '  Creating tier: %', tiers[tier_counter];
            
            -- Loop through 3 variants per tier
            FOR variant_counter IN 1..3 LOOP
                RAISE NOTICE '    Creating variant: %', variants[variant_counter];
                
                -- Create package variant
                INSERT INTO package_variants (
                    package_id,
                    name,
                    description,
                    base_price,
                    is_active,
                    display_order,
                    created_at,
                    updated_at
                ) VALUES (
                    v_package_id,
                    tiers[tier_counter] || ' - ' || variants[variant_counter],
                    tiers[tier_counter] || ' tier with ' || variants[variant_counter],
                    tier_price + (variant_counter * 500), -- Each variant slightly more expensive
                    true,
                    (tier_counter - 1) * 3 + variant_counter,
                    NOW(),
                    NOW()
                ) RETURNING id INTO v_variant_id;

                -- Create 5 distance pricing tiers for this variant
                -- All distances calculated FROM base pincode 390007
                -- Tier 1: 0-10 km (Within city)
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
                    v_variant_id,
                    '0-10 km',
                    0,
                    10,
                    0, -- No additional charge for base tier
                    true,
                    NOW(),
                    NOW()
                );

                -- Tier 2: 11-50 km (Nearby areas)
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
                    v_variant_id,
                    '11-50 km',
                    11,
                    50,
                    1000, -- Add ₹1000 for this distance
                    true,
                    NOW(),
                    NOW()
                );

                -- Tier 3: 51-100 km (Regional delivery)
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
                    v_variant_id,
                    '51-100 km',
                    51,
                    100,
                    2000, -- Add ₹2000 for this distance
                    true,
                    NOW(),
                    NOW()
                );

                -- Tier 4: 101-200 km (Long distance)
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
                    v_variant_id,
                    '101-200 km',
                    101,
                    200,
                    3500, -- Add ₹3500 for this distance
                    true,
                    NOW(),
                    NOW()
                );

                -- Tier 5: 201+ km (Interstate/Long distance)
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
                    v_variant_id,
                    '201+ km',
                    201,
                    999999, -- Large number for unlimited distance
                    5000, -- Add ₹5000 for this distance
                    true,
                    NOW(),
                    NOW()
                );

            END LOOP; -- End variants loop
        END LOOP; -- End tiers loop
    END LOOP; -- End packages loop

    RAISE NOTICE 'Successfully created all demo packages!';
    RAISE NOTICE 'Total: 9 packages × 3 tiers × 3 variants × 5 distance tiers = 405 pricing records';
    
END $$;

-- Verification Queries
-- ============================================

-- 1. Count packages created
SELECT 
    '=== PACKAGES CREATED ===' as section,
    COUNT(*) as total_packages
FROM package_sets ps
JOIN users u ON ps.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
AND ps.is_active = true;

-- 2. List all packages with variant counts
SELECT 
    '=== PACKAGE SUMMARY ===' as section,
    ps.name as package_name,
    ps.base_price,
    COUNT(DISTINCT pv.id) as variant_count,
    COUNT(dp.id) as pricing_count
FROM package_sets ps
JOIN users u ON ps.franchise_id = u.franchise_id
LEFT JOIN package_variants pv ON ps.id = pv.package_id
LEFT JOIN distance_pricing dp ON pv.id = dp.variant_id
WHERE u.email = 'mysafawale@gmail.com'
AND ps.is_active = true
GROUP BY ps.id, ps.name, ps.base_price
ORDER BY ps.display_order;

-- 3. Show sample variants for first package
SELECT 
    '=== SAMPLE VARIANTS (21 Safa Package) ===' as section,
    pv.name as variant_name,
    pv.base_price,
    COUNT(dp.id) as distance_tiers
FROM package_variants pv
JOIN package_sets ps ON pv.package_id = ps.id
JOIN users u ON ps.franchise_id = u.franchise_id
LEFT JOIN distance_pricing dp ON pv.id = dp.variant_id
WHERE u.email = 'mysafawale@gmail.com'
AND ps.name = '21 Safa Package'
GROUP BY pv.id, pv.name, pv.base_price
ORDER BY pv.display_order;

-- 4. Show sample pricing for one variant
SELECT 
    '=== SAMPLE DISTANCE PRICING ===' as section,
    pv.name as variant_name,
    dp.distance_range,
    dp.min_km,
    dp.max_km,
    '₹' || pv.base_price as variant_base_price,
    '₹' || dp.base_price_addition as distance_addition,
    '₹' || (pv.base_price + dp.base_price_addition) as total_price
FROM distance_pricing dp
JOIN package_variants pv ON dp.variant_id = pv.id
JOIN package_sets ps ON pv.package_id = ps.id
JOIN users u ON ps.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
AND ps.name = '21 Safa Package'
AND pv.name LIKE '%Silver - Groom%'
ORDER BY dp.min_km;

-- 5. Total counts
SELECT 
    '=== TOTAL COUNTS ===' as section,
    (SELECT COUNT(*) FROM package_sets ps JOIN users u ON ps.franchise_id = u.franchise_id WHERE u.email = 'mysafawale@gmail.com') as total_packages,
    (SELECT COUNT(*) FROM package_variants pv JOIN package_sets ps ON pv.package_id = ps.id JOIN users u ON ps.franchise_id = u.franchise_id WHERE u.email = 'mysafawale@gmail.com') as total_variants,
    (SELECT COUNT(*) FROM distance_pricing dp JOIN package_variants pv ON dp.variant_id = pv.id JOIN package_sets ps ON pv.package_id = ps.id JOIN users u ON ps.franchise_id = u.franchise_id WHERE u.email = 'mysafawale@gmail.com') as total_distance_pricings;
