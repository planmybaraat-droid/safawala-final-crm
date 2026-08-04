-- Quick check: How many variants do we have now?
SELECT COUNT(*) as total_variants
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true;

-- How many already have category_id?
SELECT 
    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category,
    COUNT(CASE WHEN category_id IS NULL THEN 1 END) as without_category,
    COUNT(*) as total
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true;
