-- ============================================================================
-- TEST: Create Distance Pricing for ONE VARIANT ONLY
-- ============================================================================
-- This tests distance pricing for Package 1: Classic Style (21 Safas) only
-- ============================================================================

DO $$
DECLARE
  v_franchise_id UUID := '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
  v_level RECORD;
  v_pricing_count INT := 0;
BEGIN

RAISE NOTICE '🧪 TEST: Creating distance pricing for Package 1: Classic Style only...';

-- Get levels for Package 1: Classic Style in 21 Safas category
FOR v_level IN 
  SELECT 
    l.id, 
    l.name as level_name, 
    l.base_price,
    v.name as variant_name,
    c.name as category_name
  FROM package_levels l
  JOIN package_variants v ON l.variant_id = v.id
  JOIN packages_categories c ON v.category_id = c.id
  WHERE c.franchise_id = v_franchise_id
    AND c.name = '21 Safas'
    AND v.name = 'Package 1: Classic Style'
  ORDER BY l.base_price
LOOP
  RAISE NOTICE '  📍 Creating pricing for: % - % - % (₹%)', 
    v_level.category_name, 
    v_level.variant_name, 
    v_level.level_name, 
    v_level.base_price;
  
  -- Distance Tier 1: 0-10 km (+₹500)
  INSERT INTO distance_pricing (
    package_level_id,
    franchise_id,
    distance_range,
    min_distance_km,
    max_distance_km,
    additional_price,
    is_active
  )
  VALUES (
    v_level.id,
    v_franchise_id,
    '0-10 km',
    0,
    10,
    500.00,
    true
  );
  
  -- Distance Tier 2: 11-50 km (+₹1,000)
  INSERT INTO distance_pricing (
    package_level_id,
    franchise_id,
    distance_range,
    min_distance_km,
    max_distance_km,
    additional_price,
    is_active
  )
  VALUES (
    v_level.id,
    v_franchise_id,
    '11-50 km',
    11,
    50,
    1000.00,
    true
  );
  
  -- Distance Tier 3: 51-250 km (+₹2,000)
  INSERT INTO distance_pricing (
    package_level_id,
    franchise_id,
    distance_range,
    min_distance_km,
    max_distance_km,
    additional_price,
    is_active
  )
  VALUES (
    v_level.id,
    v_franchise_id,
    '51-250 km',
    51,
    250,
    2000.00,
    true
  );
  
-- Distance Tier 4: 251-1500 km (+₹3,000)
INSERT INTO distance_pricing (
  package_level_id,
  franchise_id,
  distance_range,
  min_distance_km,
  max_distance_km,
  additional_price,
  is_active
)
SELECT 
  pl.id,
  v_franchise_id,
  '251-1500 km',
  251,
  1500,
  3000.00,
  true
FROM package_levels pl
JOIN package_variants pv ON pl.variant_id = pv.id
WHERE pv.name = 'Package 1: Classic Style'
  AND pv.franchise_id = v_franchise_id;

RAISE NOTICE '✅ Created 4 distance tiers for Package 1: Classic Style';
RAISE NOTICE '';
RAISE NOTICE '🎉 TEST SUCCESS: Created 12 distance pricing records!';
RAISE NOTICE 'Expected: 12 records (3 levels × 4 tiers)';

END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
  c.name as category,
  v.name as variant,
  l.name as level,
  l.base_price as level_price,
  d.distance_range,
  d.min_distance_km,
  d.max_distance_km,
  d.additional_price,
  (l.base_price + d.additional_price) as total_price
FROM distance_pricing d
JOIN package_levels l ON d.package_level_id = l.id
JOIN package_variants v ON l.variant_id = v.id
JOIN packages_categories c ON v.category_id = c.id
WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
  AND c.name = '21 Safas'
  AND v.name = 'Package 1: Classic Style'
ORDER BY l.base_price, d.min_distance_km;
