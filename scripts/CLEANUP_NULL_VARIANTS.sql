-- ============================================
-- CLEAN UP PACKAGE VARIANTS
-- ============================================
-- Remove all variants with NULL category_id
-- Keep only variants that are properly linked to categories
-- ============================================

-- Step 1: Count variants to be deleted
SELECT 
    COUNT(*) as variants_to_delete,
    'Variants with NULL category_id' as description
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND category_id IS NULL
AND is_active = true;

-- Step 2: Show which variants will remain (properly linked)
SELECT 
    pv.id,
    pv.name as variant_name,
    pc.name as category_name,
    pv.base_price
FROM package_variants pv
JOIN packages_categories pc ON pv.category_id = pc.id
WHERE pv.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pv.is_active = true
ORDER BY pc.display_order, pv.name;

-- Step 3: DELETE variants with NULL category_id
-- This will remove all unlinked variants
DELETE FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND category_id IS NULL
AND is_active = true;

-- Step 4: Verify - show remaining variants
SELECT 
    pc.name as category_name,
    COUNT(pv.id) as variant_count,
    string_agg(pv.name, ', ') as variant_names
FROM packages_categories pc
LEFT JOIN package_variants pv ON pc.id = pv.category_id 
    AND pv.is_active = true 
    AND pv.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
WHERE pc.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pc.is_active = true
GROUP BY pc.name, pc.display_order
ORDER BY pc.display_order;
