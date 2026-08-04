-- ============================================
-- ADD 3 VARIANTS TO EACH PACKAGE (Silver, Gold, Diamond)
-- For mysafawale@gmail.com franchise
-- Each package gets: Basic, Premium, Deluxe variants
-- Run this after creating the package structure
-- ============================================

DO $$
DECLARE
    v_franchise_id UUID;
    v_package_record RECORD;
    v_variant_id UUID;
    
    -- Variant names
    variant_names TEXT[] := ARRAY['Basic', 'Premium', 'Deluxe'];
    
    variant_counter INT;
    variant_price NUMERIC;
    packages_processed INT := 0;
    variants_created INT := 0;
BEGIN
    -- Get franchise ID for mysafawale@gmail.com
    SELECT franchise_id INTO v_franchise_id 
    FROM users 
    WHERE email = 'mysafawale@gmail.com' 
    LIMIT 1;

    IF v_franchise_id IS NULL THEN
        RAISE EXCEPTION 'Franchise not found for mysafawale@gmail.com';
    END IF;

    RAISE NOTICE 'Starting variant creation for franchise: %', v_franchise_id;
    RAISE NOTICE '===========================================';

    -- Loop through all packages for this franchise
    FOR v_package_record IN 
        SELECT ps.id, ps.name, ps.base_price, pc.name as category_name
        FROM package_sets ps
        JOIN packages_categories pc ON ps.category_id = pc.id
        WHERE ps.franchise_id = v_franchise_id
        ORDER BY pc.display_order, ps.display_order
    LOOP
        packages_processed := packages_processed + 1;
        RAISE NOTICE 'Package: % - % (₹%)', 
                     v_package_record.category_name, 
                     v_package_record.name, 
                     v_package_record.base_price;

        -- Create 3 variants for this package
        FOR variant_counter IN 1..3 LOOP
            -- Check if variant already exists
            IF NOT EXISTS (
                SELECT 1 FROM package_variants 
                WHERE package_id = v_package_record.id
                AND name = variant_names[variant_counter]
            ) THEN
                -- Variant pricing: Basic = base, Premium = base + 500, Deluxe = base + 1000
                variant_price := v_package_record.base_price + ((variant_counter - 1) * 500);
                
                RAISE NOTICE '  Creating variant: % (₹%)', 
                             variant_names[variant_counter], 
                             variant_price;
                
                -- Create variant
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
                    v_package_record.id,
                    variant_names[variant_counter],
                    variant_names[variant_counter] || ' variant of ' || v_package_record.name || ' - ' || v_package_record.category_name || ' with quality accessories',
                    variant_price,
                    true,
                    variant_counter,
                    NOW(),
                    NOW()
                );
                
                variants_created := variants_created + 1;
            ELSE
                RAISE NOTICE '  Variant % already exists, skipping', variant_names[variant_counter];
            END IF;
        END LOOP;
        
        RAISE NOTICE '  ---';
    END LOOP;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Variant creation complete!';
    RAISE NOTICE 'Processed % packages', packages_processed;
    RAISE NOTICE 'Created % new variants', variants_created;
    RAISE NOTICE 'Total: % packages × 3 variants = % expected variants', 
                 packages_processed, packages_processed * 3;

END $$;

-- Verification Queries
-- ============================================

-- 1. Count packages and variants
SELECT 
    '=== SUMMARY ===' as section,
    (SELECT COUNT(*) FROM package_sets ps 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as total_packages,
    (SELECT COUNT(*) FROM package_variants pv 
     JOIN package_sets ps ON pv.package_id = ps.id 
     JOIN users u ON ps.franchise_id = u.franchise_id 
     WHERE u.email = 'mysafawale@gmail.com') as total_variants;

-- 2. List all packages with variant counts
SELECT 
    '=== PACKAGES WITH VARIANTS ===' as section,
    pc.name as category,
    ps.name as package,
    ps.base_price as package_price,
    COUNT(pv.id) as variant_count
FROM package_sets ps
JOIN packages_categories pc ON ps.category_id = pc.id
JOIN users u ON ps.franchise_id = u.franchise_id
LEFT JOIN package_variants pv ON ps.id = pv.package_id
WHERE u.email = 'mysafawale@gmail.com'
GROUP BY pc.display_order, ps.display_order, pc.name, ps.name, ps.base_price
ORDER BY pc.display_order, ps.display_order;

-- 3. Show sample variants for first few packages
SELECT 
    '=== SAMPLE VARIANTS (First 3 Packages) ===' as section,
    pc.name as category,
    ps.name as package,
    pv.name as variant,
    pv.base_price as variant_price,
    pv.display_order
FROM package_variants pv
JOIN package_sets ps ON pv.package_id = ps.id
JOIN packages_categories pc ON ps.category_id = pc.id
JOIN users u ON ps.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
ORDER BY pc.display_order, ps.display_order, pv.display_order
LIMIT 15;

-- 4. Show pricing breakdown for one category
SELECT 
    '=== PRICING BREAKDOWN (21 Safa Category) ===' as section,
    ps.name as package_tier,
    pv.name as variant,
    '₹' || ps.base_price as package_base,
    '₹' || pv.base_price as variant_price,
    '₹' || (pv.base_price - ps.base_price) as variant_addition
FROM package_variants pv
JOIN package_sets ps ON pv.package_id = ps.id
JOIN packages_categories pc ON ps.category_id = pc.id
JOIN users u ON ps.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
AND pc.name = '21 Safa'
ORDER BY ps.display_order, pv.display_order;
