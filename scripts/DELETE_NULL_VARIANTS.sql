-- ============================================
-- DELETE ALL VARIANTS WITH NULL CATEGORY_ID
-- ============================================
-- Your categories:
-- 21 Safas: 364aa455-ed12-445f-bcd7-c5ab72bdccfa
-- 31 Safas: 9317fd0c-1fde-4059-bddc-a1f521bcee7c
-- 41 Safas: 129ab88b-e0b4-4888-8b86-eae5b50de6e4
-- 51 Safas: 9afbe91c-bf12-40da-87e3-f8ed24d308ad
-- 61 Safas: e64fdad9-1533-4fe0-983c-fa54699ecb06
-- 71 Safas: 4977b43d-0060-4ee6-b2c1-864efd75cc06
-- 81 Safas: fa925944-5990-4bd9-bd69-ed723635d776
-- 91 Safas: fd3e4497-8cdc-4453-8fe7-fbc1ab927292
-- 101 Safas: a9d6fab7-8044-4e84-802c-729fdf9890ab
-- ============================================

-- Step 1: Count variants that will be deleted
SELECT 
    COUNT(*) as total_to_delete
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND category_id IS NULL
AND is_active = true;

-- Step 2: DELETE all variants with NULL category_id
DELETE FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND category_id IS NULL
AND is_active = true;

-- Step 3: Show remaining variants grouped by category
SELECT 
    pc.name as category_name,
    COUNT(pv.id) as variant_count,
    string_agg(pv.name, ', ') as variants
FROM packages_categories pc
LEFT JOIN package_variants pv 
    ON pc.id = pv.category_id 
    AND pv.is_active = true
WHERE pc.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pc.is_active = true
GROUP BY pc.name, pc.display_order
ORDER BY pc.display_order;
