-- ============================================
-- LINK EXISTING 90 VARIANTS TO CATEGORIES
-- ============================================
-- 9 categories × 10 variants each = 90 total
-- Based on variant names from Excel sheet
-- ============================================

BEGIN;

-- 21 Safas (10 variants) - Category ID: 364aa455-ed12-445f-bcd7-c5ab72bdccfa
UPDATE package_variants
SET category_id = '364aa455-ed12-445f-bcd7-c5ab72bdccfa'
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND name IN (
    'Classic Style',
    'Rajastani Rajwada Styles',
    'Rajputana Rajwada Styles',
    'Floral Design',
    'Bollywood Styles',
    'Adam''s Wedding Safa',
    'Ram-Sita Wedding Shades',
    'JJ Vijaya Premium Slk',
    'Titsua Silk Premium',
    'Royal Heritage Special'
);

-- 31 Safas (10 variants) - Category ID: 9317fd0c-1fde-4059-bddc-a1f521bcee7c
UPDATE package_variants
SET category_id = '9317fd0c-1fde-4059-bddc-a1f521bcee7c'
WHERE id IN (
    SELECT id FROM package_variants
    WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
    AND is_active = true
    AND category_id IS NULL
    ORDER BY name
    LIMIT 10
);

-- 41 Safas (10 variants) - Category ID: 129ab88b-e0b4-4888-8b86-eae5b50de6e4
UPDATE package_variants
SET category_id = '129ab88b-e0b4-4888-8b86-eae5b50de6e4'
WHERE id IN (
    SELECT id FROM package_variants
    WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
    AND is_active = true
    AND category_id IS NULL
    ORDER BY name
    LIMIT 10
);

-- 51 Safas (10 variants) - Category ID: 9afbe91c-bf12-40da-87e3-f8ed24d308ad
UPDATE package_variants
SET category_id = '9afbe91c-bf12-40da-87e3-f8ed24d308ad'
WHERE id IN (
    SELECT id FROM package_variants
    WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
    AND is_active = true
    AND category_id IS NULL
    ORDER BY name
    LIMIT 10
);

-- 61 Safas (10 variants) - Category ID: e64fdad9-1533-4fe0-983c-fa54699ecb06
UPDATE package_variants
SET category_id = 'e64fdad9-1533-4fe0-983c-fa54699ecb06'
WHERE id IN (
    SELECT id FROM package_variants
    WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
    AND is_active = true
    AND category_id IS NULL
    ORDER BY name
    LIMIT 10
);

-- 71 Safas (10 variants) - Category ID: 4977b43d-0060-4ee6-b2c1-864efd75cc06
UPDATE package_variants
SET category_id = '4977b43d-0060-4ee6-b2c1-864efd75cc06'
WHERE id IN (
    SELECT id FROM package_variants
    WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
    AND is_active = true
    AND category_id IS NULL
    ORDER BY name
    LIMIT 10
);

-- 81 Safas (10 variants) - Category ID: fa925944-5990-4bd9-bd69-ed723635d776
UPDATE package_variants
SET category_id = 'fa925944-5990-4bd9-bd69-ed723635d776'
WHERE id IN (
    SELECT id FROM package_variants
    WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
    AND is_active = true
    AND category_id IS NULL
    ORDER BY name
    LIMIT 10
);

-- 91 Safas (10 variants) - Category ID: fd3e4497-8cdc-4453-8fe7-fbc1ab927292
UPDATE package_variants
SET category_id = 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292'
WHERE id IN (
    SELECT id FROM package_variants
    WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
    AND is_active = true
    AND category_id IS NULL
    ORDER BY name
    LIMIT 10
);

-- 101 Safas (10 variants) - Category ID: a9d6fab7-8044-4e84-802c-729fdf9890ab
UPDATE package_variants
SET category_id = 'a9d6fab7-8044-4e84-802c-729fdf9890ab'
WHERE id IN (
    SELECT id FROM package_variants
    WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
    AND is_active = true
    AND category_id IS NULL
    ORDER BY name
    LIMIT 10
);

COMMIT;

-- Verify the mapping
SELECT 
    pc.name as category_name,
    COUNT(pv.id) as variant_count,
    MIN(pv.base_price) as min_price,
    MAX(pv.base_price) as max_price,
    string_agg(DISTINCT pv.name, ', ' ORDER BY pv.name) as sample_variants
FROM packages_categories pc
LEFT JOIN package_variants pv 
    ON pc.id = pv.category_id 
    AND pv.is_active = true 
    AND pv.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
WHERE pc.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pc.is_active = true
GROUP BY pc.name, pc.display_order
ORDER BY pc.display_order;

-- Show any variants still without category_id
SELECT 
    id,
    name,
    base_price,
    category_id
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
AND category_id IS NULL
ORDER BY base_price;
