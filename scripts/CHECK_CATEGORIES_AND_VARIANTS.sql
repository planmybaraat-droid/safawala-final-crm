-- ============================================
-- CHECK CURRENT CATEGORIES AND VARIANTS STATUS
-- ============================================

-- Step 1: Show all categories
SELECT 
    id,
    name,
    display_order,
    franchise_id,
    is_active
FROM packages_categories
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
ORDER BY display_order;

-- Step 2: Count variants per category
SELECT 
    pc.name as category_name,
    pc.id as category_id,
    COUNT(pv.id) as variant_count,
    string_agg(pv.name, ', ') as variant_names
FROM packages_categories pc
LEFT JOIN package_variants pv 
    ON pc.id = pv.category_id 
    AND pv.is_active = true 
    AND pv.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
WHERE pc.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pc.is_active = true
GROUP BY pc.name, pc.id, pc.display_order
ORDER BY pc.display_order;

-- Step 3: Show all variants for your franchise
SELECT 
    pv.id,
    pv.name as variant_name,
    pv.category_id,
    pc.name as category_name,
    pv.base_price,
    pv.extra_safa_price,
    pv.franchise_id
FROM package_variants pv
LEFT JOIN packages_categories pc ON pv.category_id = pc.id
WHERE pv.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pv.is_active = true
ORDER BY pc.display_order, pv.name;

-- Step 4: Summary
SELECT 
    'Total Categories' as metric,
    COUNT(*) as count
FROM packages_categories
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true

UNION ALL

SELECT 
    'Total Variants' as metric,
    COUNT(*) as count
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true;
