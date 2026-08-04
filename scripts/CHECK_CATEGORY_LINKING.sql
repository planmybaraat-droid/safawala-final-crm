-- Check category_id linking in package_variants
SELECT 
    pv.id,
    pv.name,
    pv.category_id,
    pv.franchise_id,
    pc.name as category_name,
    pc.id as actual_category_id
FROM package_variants pv
LEFT JOIN packages_categories pc ON pv.category_id = pc.id
WHERE pv.is_active = true
AND pv.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
LIMIT 20;

-- If category_id is NULL, we need to update it
-- First, let's see the categories
SELECT id, name, franchise_id 
FROM packages_categories 
WHERE is_active = true 
AND franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
ORDER BY display_order;
