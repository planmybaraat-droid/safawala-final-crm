-- ============================================
-- CLEANUP UNUSED/LEGACY CATEGORIES (SAFE)
-- ============================================
-- Goal: Identify categories in the current franchise that either:
--  - have 0 variants linked, or
--  - are demo/legacy names you want to hide
-- Then optionally deactivate them (is_active = false) to keep the UI clean.
-- ============================================

-- 1) Inspect categories with zero variants for your franchise
WITH params AS (
  SELECT '1a518dde-85b7-44ef-8bc4-092f53ddfd99'::uuid AS franchise_id
)
SELECT 
  pc.id,
  pc.name,
  pc.is_active,
  COALESCE(COUNT(pv.id),0) AS variants_in_category
FROM packages_categories pc
LEFT JOIN package_variants pv 
  ON pv.category_id = pc.id
  AND pv.is_active = true
  AND pv.franchise_id = (SELECT franchise_id FROM params)
WHERE pc.franchise_id = (SELECT franchise_id FROM params)
GROUP BY pc.id, pc.name, pc.is_active
HAVING COALESCE(COUNT(pv.id),0) = 0
ORDER BY pc.name;

-- 2) Optional: Deactivate categories by name pattern (demo/typos)
-- UPDATE packages_categories
-- SET is_active = false
-- WHERE franchise_id = (SELECT franchise_id FROM params)
--   AND name ILIKE ANY (ARRAY[
--     '%Demo%',
--     '%Safa' -- singular typo
--   ]);

-- 3) Optional: Deactivate categories that have zero variants
-- UPDATE packages_categories pc
-- SET is_active = false
-- FROM (
--   SELECT pc2.id
--   FROM packages_categories pc2
--   LEFT JOIN package_variants pv2 
--     ON pv2.category_id = pc2.id
--     AND pv2.is_active = true
--     AND pv2.franchise_id = (SELECT franchise_id FROM params)
--   WHERE pc2.franchise_id = (SELECT franchise_id FROM params)
--   GROUP BY pc2.id
--   HAVING COALESCE(COUNT(pv2.id),0) = 0
-- ) z
-- WHERE pc.id = z.id;

-- 4) Verify remaining active categories and their variant counts
WITH params AS (
  SELECT '1a518dde-85b7-44ef-8bc4-092f53ddfd99'::uuid AS franchise_id
)
SELECT 
  pc.name AS category,
  COUNT(pv.id) AS variants_in_category
FROM packages_categories pc
LEFT JOIN package_variants pv 
  ON pv.category_id = pc.id
  AND pv.is_active = true
  AND pv.franchise_id = (SELECT franchise_id FROM params)
WHERE pc.franchise_id = (SELECT franchise_id FROM params)
  AND pc.is_active = true
GROUP BY pc.name, pc.display_order
ORDER BY pc.display_order;