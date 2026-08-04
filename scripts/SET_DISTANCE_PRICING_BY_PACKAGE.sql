-- ================================================================
-- SET DISTANCE PRICING BY PACKAGE NUMBER (Surat Franchise)
-- ================================================================
-- This script removes any dependency on levels and writes distance
-- pricing directly for each variant. Run the migration
-- scripts/REMOVE_LEVELS_SIMPLIFY_STRUCTURE.sql first to drop levels
-- and ensure distance_pricing has package_variant_id.
--
-- What this does:
-- 1) Deletes any existing distance_pricing rows for Surat
-- 2) Inserts 4 tiers per VARIANT using charges that depend on the
--    variant's "Package N:" number in its name, exactly as provided.
--
-- Distance tiers used:
--   - 0-10 km
--   - 11-50 km
--   - 51-250 km
--   - 251-1000 km
--
-- Charges by Package number (applies to all categories):
--   Pkg 1:  500, 1000, 2000, 3000
--   Pkg 2:  600, 1200, 2500, 3500
--   Pkg 3:  700, 1500, 3000, 4000
--   Pkg 4:  800, 1800, 3500, 4500
--   Pkg 5:  900, 2000, 4000, 5000
--   Pkg 6: 1000, 2200, 4500, 5500
--   Pkg 7: 1200, 2500, 5000, 6000
--   Pkg 8: 1400, 2800, 5500, 6500
--   Pkg 9: 1500, 3000, 6000, 7000
-- ================================================================

DO $$
DECLARE
  v_franchise_id UUID := '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
  v_deleted INT := 0;
  v_inserted INT := 0;
BEGIN
  RAISE NOTICE '🚀 Setting distance pricing for Surat variants (%), no levels.', v_franchise_id;

  -- ----------------------------------------------------------------
  -- 1) Delete existing distance pricing for Surat (idempotent reset)
  -- ----------------------------------------------------------------
  WITH to_delete AS (
    SELECT d.id
    FROM distance_pricing d
    JOIN package_variants pv ON d.package_variant_id = pv.id
    JOIN packages_categories pc ON pv.category_id = pc.id
    WHERE d.franchise_id = v_franchise_id
      AND pc.franchise_id = v_franchise_id
  )
  DELETE FROM distance_pricing d
  USING to_delete td
  WHERE d.id = td.id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RAISE NOTICE '🧹 Removed % existing distance_pricing rows for Surat.', v_deleted;

  -- ----------------------------------------------------------------
  -- 2) Insert 4 tiers per VARIANT using per-package charges
  -- ----------------------------------------------------------------
  WITH variants AS (
    SELECT 
      pv.id AS variant_id,
      pv.name AS variant_name,
      /* Extract package number from variant name: "Package N: ..." */
      NULLIF(substring(pv.name from 'Package[[:space:]]+([0-9]+)'), '')::int AS package_no
    FROM package_variants pv
    JOIN packages_categories pc ON pv.category_id = pc.id
    WHERE pc.franchise_id = v_franchise_id
      AND pv.is_active = true
  ), charges AS (
    SELECT * FROM (
      VALUES
        (1,  500, 1000, 2000, 3000),
        (2,  600, 1200, 2500, 3500),
        (3,  700, 1500, 3000, 4000),
        (4,  800, 1800, 3500, 4500),
        (5,  900, 2000, 4000, 5000),
        (6, 1000, 2200, 4500, 5500),
        (7, 1200, 2500, 5000, 6000),
        (8, 1400, 2800, 5500, 6500),
        (9, 1500, 3000, 6000, 7000)
    ) AS t(package_no, r1, r2, r3, r4)
  ), rows_to_insert AS (
    SELECT 
      v.variant_id,
      x.distance_range,
      x.min_km,
      x.max_km,
      x.price
    FROM variants v
    JOIN charges ch ON ch.package_no = v.package_no
    CROSS JOIN LATERAL (
      VALUES 
        ('0-10 km',    0::numeric,   10::numeric,   ch.r1::numeric),
        ('11-50 km',  11::numeric,   50::numeric,   ch.r2::numeric),
        ('51-250 km', 51::numeric,  250::numeric,   ch.r3::numeric),
        ('251-1000 km', 251::numeric, 1000::numeric, ch.r4::numeric)
    ) AS x(distance_range, min_km, max_km, price)
    WHERE v.package_no BETWEEN 1 AND 9
  )
  INSERT INTO distance_pricing (
    package_variant_id,
    franchise_id,
    distance_range,
    min_distance_km,
    max_distance_km,
    additional_price,
    is_active
  )
  SELECT 
    r.variant_id,
    v_franchise_id,
    r.distance_range,
    r.min_km,
    r.max_km,
    r.price,
    true
  FROM rows_to_insert r;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE '✅ Inserted % distance tiers (expected: 4 × variants under Surat).', v_inserted;

  RAISE NOTICE '🎯 Done. Use the verification query below to inspect.';
END $$;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Summary: tiers per variant
SELECT 
  pc.name AS category,
  pv.name AS variant,
  COUNT(dp.id) AS tier_count,
  MIN(dp.additional_price) AS min_additional,
  MAX(dp.additional_price) AS max_additional
FROM package_variants pv
JOIN packages_categories pc ON pv.category_id = pc.id
LEFT JOIN distance_pricing dp ON dp.package_variant_id = pv.id AND dp.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
WHERE pc.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99' AND pv.is_active = true
GROUP BY pc.name, pv.name
ORDER BY pc.name, pv.name
LIMIT 50;

-- Preview a few rows
SELECT 
  pc.name AS category,
  pv.name AS variant,
  dp.distance_range,
  dp.min_distance_km,
  dp.max_distance_km,
  dp.additional_price
FROM distance_pricing dp
JOIN package_variants pv ON dp.package_variant_id = pv.id
JOIN packages_categories pc ON pv.category_id = pc.id
WHERE dp.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
ORDER BY pc.name, pv.name, dp.min_distance_km
LIMIT 100;
