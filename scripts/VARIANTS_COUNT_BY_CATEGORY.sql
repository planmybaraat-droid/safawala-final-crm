-- ============================================
-- DETAILED BREAKDOWN: VARIANTS PER CATEGORY
-- ============================================

-- Show variants count for each category
SELECT 
    pc.name as category_name,
    COUNT(pv.id) as total_variants,
    COALESCE(string_agg(pv.name || ' (₹' || pv.base_price || ')', ', '), 'No variants') as variant_list
FROM packages_categories pc
LEFT JOIN package_variants pv 
    ON pc.id = pv.category_id 
    AND pv.is_active = true 
    AND pv.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
WHERE pc.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pc.is_active = true
GROUP BY pc.name, pc.display_order
ORDER BY pc.display_order;
