-- ============================================================================
-- DELETE ALL DISTANCE PRICING (CLEANUP)
-- ============================================================================

DELETE FROM distance_pricing 
WHERE package_level_id IN (
  SELECT l.id FROM package_levels l
  JOIN package_variants v ON l.variant_id = v.id
  JOIN packages_categories c ON v.category_id = c.id
  WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
);

SELECT 'Deleted all distance pricing records' as status;
