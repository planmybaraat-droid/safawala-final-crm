-- ============================================
-- UPDATE EXISTING VARIANTS WITH CATEGORY IDs
-- ============================================
-- This updates existing variants by matching their names to categories
-- ============================================

-- Update variants that belong to 21 Safas category
UPDATE package_variants
SET category_id = '364aa455-ed12-445f-bcd7-c5ab72bdccfa'
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND (category_id IS NULL OR category_id != '364aa455-ed12-445f-bcd7-c5ab72bdccfa');

-- Update variants that belong to 31 Safas category  
UPDATE package_variants
SET category_id = '9317fd0c-1fde-4059-bddc-a1f521bcee7c'
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND (category_id IS NULL OR category_id != '9317fd0c-1fde-4059-bddc-a1f521bcee7c');

-- Update variants that belong to 41 Safas category
UPDATE package_variants
SET category_id = '129ab88b-e0b4-4888-8b86-eae5b50de6e4'
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND (category_id IS NULL OR category_id != '129ab88b-e0b4-4888-8b86-eae5b50de6e4');

-- Update variants that belong to 51 Safas category
UPDATE package_variants
SET category_id = '9afbe91c-bf12-40da-87e3-f8ed24d308ad'
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND (category_id IS NULL OR category_id != '9afbe91c-bf12-40da-87e3-f8ed24d308ad');

-- Update variants that belong to 61 Safas category
UPDATE package_variants
SET category_id = 'e64fdad9-1533-4fe0-983c-fa54699ecb06'
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND (category_id IS NULL OR category_id != 'e64fdad9-1533-4fe0-983c-fa54699ecb06');

-- Update variants that belong to 71 Safas category
UPDATE package_variants
SET category_id = '4977b43d-0060-4ee6-b2c1-864efd75cc06'
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND (category_id IS NULL OR category_id != '4977b43d-0060-4ee6-b2c1-864efd75cc06');

-- Update variants that belong to 81 Safas category
UPDATE package_variants
SET category_id = 'fa925944-5990-4bd9-bd69-ed723635d776'
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND (category_id IS NULL OR category_id != 'fa925944-5990-4bd9-bd69-ed723635d776');

-- Update variants that belong to 91 Safas category
UPDATE package_variants
SET category_id = 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292'
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND (category_id IS NULL OR category_id != 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292');

-- Update variants that belong to 101 Safas category
UPDATE package_variants
SET category_id = 'a9d6fab7-8044-4e84-802c-729fdf9890ab'
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND (category_id IS NULL OR category_id != 'a9d6fab7-8044-4e84-802c-729fdf9890ab');

-- Verify the updates
SELECT 
    pc.name as category,
    COUNT(pv.id) as variant_count,
    string_agg(pv.name, ', ') as variants
FROM packages_categories pc
LEFT JOIN package_variants pv ON pc.id = pv.category_id AND pv.is_active = true AND pv.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
WHERE pc.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pc.is_active = true
GROUP BY pc.name, pc.display_order
ORDER BY pc.display_order;
