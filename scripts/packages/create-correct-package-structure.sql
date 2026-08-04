-- ============================================
-- CREATE CORRECT PACKAGE STRUCTURE FOR mysafawale@gmail.com
-- Structure: 9 Categories (21, 31, 41, 51, 61, 71, 81, 91, 101 Safa)
-- Each category has 3 packages: Silver, Gold, Diamond
-- Run this AFTER deleting old packages
-- ============================================

DO $$
DECLARE
    v_franchise_id UUID;
    v_user_id UUID;
    v_category_id UUID;
    
    -- Category names
    category_names TEXT[] := ARRAY[
        '21 Safa', '31 Safa', '41 Safa', '51 Safa', '61 Safa', 
        '71 Safa', '81 Safa', '91 Safa', '101 Safa'
    ];
    
    -- Package tiers
    package_tiers TEXT[] := ARRAY['Silver', 'Gold', 'Diamond'];
    
    -- Base prices for each category (increases with more safas)
    base_prices NUMERIC[] := ARRAY[6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000];
    
    -- Price multipliers for tiers
    tier_multipliers NUMERIC[] := ARRAY[1.0, 1.5, 2.0];
    
    category_counter INT;
    tier_counter INT;
    package_price NUMERIC;
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

    RAISE NOTICE 'Starting package creation for franchise: %', v_franchise_id;
    RAISE NOTICE 'Will create 9 categories with 3 packages each = 27 total packages';

    -- Loop through 9 categories
    FOR category_counter IN 1..9 LOOP
        RAISE NOTICE '=== Creating Category %: % ===', category_counter, category_names[category_counter];
        
        -- Check if category already exists
        SELECT id INTO v_category_id
        FROM packages_categories
        WHERE name = category_names[category_counter]
        LIMIT 1;
        
        -- Create category only if it doesn't exist
        IF v_category_id IS NULL THEN
            INSERT INTO packages_categories (
                name,
                description,
                is_active,
                display_order,
                created_at,
                updated_at
            ) VALUES (
                category_names[category_counter],
                'Premium wedding safa collection with ' || SPLIT_PART(category_names[category_counter], ' ', 1) || ' safas for grand celebrations',
                true,
                category_counter,
                NOW(),
                NOW()
            ) RETURNING id INTO v_category_id;
            RAISE NOTICE '  Created new category with ID: %', v_category_id;
        ELSE
            RAISE NOTICE '  Category already exists with ID: %', v_category_id;
        END IF;


        -- Create 3 packages (Silver, Gold, Diamond) inside this category
        FOR tier_counter IN 1..3 LOOP
            package_price := base_prices[category_counter] * tier_multipliers[tier_counter];
            
            -- Check if package already exists in this category
            IF NOT EXISTS (
                SELECT 1 FROM package_sets 
                WHERE name = package_tiers[tier_counter]
                AND category_id = v_category_id
                AND franchise_id = v_franchise_id
            ) THEN
                RAISE NOTICE '    Creating package: % (₹%)', 
                             package_tiers[tier_counter], package_price;
                
                -- Create package
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
                package_tiers[tier_counter],
                package_tiers[tier_counter] || ' tier ' || category_names[category_counter] || ' package with premium quality safas and accessories',
                package_price,
                v_category_id,
                v_franchise_id,
                true,
                tier_counter,
                NOW(),
                NOW()
            );
            ELSE
                RAISE NOTICE '    Package % already exists in this category, skipping', package_tiers[tier_counter];
            END IF;

        END LOOP; -- End packages loop
    END LOOP; -- End categories loop

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Successfully created all categories and packages!';
    RAISE NOTICE 'Total: 9 categories × 3 packages = 27 packages';
    
END $$;

-- Verification Queries
-- ============================================

-- 1. Count categories and packages created
SELECT 
    '=== SUMMARY ===' as section,
    (SELECT COUNT(*) FROM packages_categories WHERE name LIKE '% Safa') as total_categories,
    (SELECT COUNT(*) FROM package_sets ps 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as total_packages;

-- 2. List all categories with package counts
SELECT 
    '=== CATEGORIES ===' as section,
    pc.name as category_name,
    pc.description,
    COUNT(ps.id) as package_count
FROM packages_categories pc
LEFT JOIN package_sets ps ON pc.id = ps.category_id
WHERE pc.name LIKE '% Safa'
GROUP BY pc.id, pc.name, pc.description
ORDER BY pc.display_order;

-- 3. List all packages grouped by category
SELECT 
    '=== PACKAGES BY CATEGORY ===' as section,
    pc.name as category,
    ps.name as package_name,
    ps.base_price,
    ps.display_order
FROM package_sets ps
JOIN packages_categories pc ON ps.category_id = pc.id
JOIN users u ON ps.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
ORDER BY pc.display_order, ps.display_order;

-- 4. Show pricing structure
SELECT 
    '=== PRICING STRUCTURE ===' as section,
    pc.name as category,
    ps.name as tier,
    '₹' || ps.base_price as price
FROM package_sets ps
JOIN packages_categories pc ON ps.category_id = pc.id
JOIN users u ON ps.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
ORDER BY pc.display_order, ps.display_order;
