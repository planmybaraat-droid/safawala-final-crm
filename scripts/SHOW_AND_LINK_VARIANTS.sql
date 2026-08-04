-- ============================================
-- SHOW ALL VARIANTS AND LINK TO CATEGORIES
-- ============================================

-- Step 1: Show all variants with their current linking
SELECT 
    pv.id,
    pv.name as variant_name,
    pv.category_id,
    pv.package_id,
    pv.base_price,
    pv.extra_safa_price,
    pc.name as linked_category_name
FROM package_variants pv
LEFT JOIN packages_categories pc ON pv.category_id = pc.id
WHERE pv.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pv.is_active = true
ORDER BY pv.name;

-- Step 2: Show available categories to map to
SELECT 
    id,
    name,
    display_order
FROM packages_categories
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
ORDER BY display_order;

-- Step 3: DELETE variants with NULL category_id (optional - only if you want to remove them)
-- CAUTION: This will permanently delete these variants
-- Uncomment below to execute:

-- DELETE FROM package_variants
-- WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
-- AND category_id IS NULL
-- AND is_active = true;

-- Step 4: Or UPDATE null category_id variants to link them properly
-- Example: Link all variants to a default category (like 21 Safas)
-- Uncomment and modify as needed:

-- UPDATE package_variants
-- SET category_id = '364aa455-ed12-445f-bcd7-c5ab72bdccfa'  -- 21 Safas
-- WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
-- AND category_id IS NULL
-- AND is_active = true;
