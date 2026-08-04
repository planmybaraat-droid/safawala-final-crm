-- ============================================
-- FIX PACKAGE VARIANTS FRANCHISE ID
-- ============================================
-- Purpose: Check and update franchise_id in package_variants table
-- Issue: Variants not showing because franchise_id filter returns 0 results
-- Current franchise: 1a518dde-85b7-44ef-8bc4-092f53ddfd99
-- ============================================

-- Step 1: Check current state
SELECT 
    id,
    name,
    package_id,
    franchise_id,
    is_active,
    base_price
FROM package_variants
WHERE is_active = true
ORDER BY name
LIMIT 20;

-- Step 2: Count variants by franchise
SELECT 
    franchise_id,
    COUNT(*) as variant_count
FROM package_variants
WHERE is_active = true
GROUP BY franchise_id;

-- Step 3: Show variants without franchise_id
SELECT 
    id,
    name,
    package_id,
    franchise_id,
    base_price
FROM package_variants
WHERE is_active = true 
AND (franchise_id IS NULL OR franchise_id != '1a518dde-85b7-44ef-8bc4-092f53ddfd99')
LIMIT 10;

-- Step 4: Update ONLY variants missing franchise_id (safer)
UPDATE package_variants
SET franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
WHERE is_active = true
    AND franchise_id IS NULL;

-- Step 4b: If some variants have category_id NULL but package_id equals a valid category id,
-- map them automatically (helps the UI filter variants by selected category)
UPDATE package_variants pv
SET category_id = pv.package_id
FROM packages_categories pc
WHERE pv.is_active = true
    AND pv.category_id IS NULL
    AND pv.package_id = pc.id;

-- Step 5: Verify updates
SELECT 
        franchise_id,
        COUNT(*) as variant_count
FROM package_variants
WHERE is_active = true
GROUP BY franchise_id
ORDER BY franchise_id NULLS LAST;

-- Also verify mapping by category
SELECT 
        pc.name AS category,
        COUNT(pv.id) AS variants_in_category
FROM packages_categories pc
LEFT JOIN package_variants pv 
    ON pv.category_id = pc.id AND pv.is_active = true
WHERE pc.is_active = true
GROUP BY pc.name, pc.display_order
ORDER BY pc.display_order;
