-- Check what variants exist after cleanup
SELECT 
    pv.id,
    pv.name as variant_name,
    pv.category_id,
    pv.franchise_id,
    pc.name as category_name
FROM package_variants pv
LEFT JOIN packages_categories pc ON pv.category_id = pc.id
WHERE pv.is_active = true
ORDER BY pv.name
LIMIT 20;

-- Check if ANY variants exist for your franchise
SELECT COUNT(*) as total_variants
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true;

-- Check variants with mismatched category names
SELECT 
    pv.id,
    pv.name as variant_name,
    pc.id as category_id,
    pc.name as category_name,
    pv.franchise_id
FROM package_variants pv
JOIN packages_categories pc ON pv.category_id = pc.id
WHERE pv.is_active = true
AND pc.name IN ('30 Safas', '31 Safa', '41 Safa', '51 Safa', '61 Safa')
ORDER BY pc.name, pv.name;
