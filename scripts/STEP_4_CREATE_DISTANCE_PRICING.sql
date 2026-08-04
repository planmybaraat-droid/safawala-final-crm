-- ============================================================================
-- STEP 4: Create Distance Pricing (Run AFTER levels are created)
-- ============================================================================
-- This creates 5 distance tiers for each level
-- ============================================================================

DO $$
DECLARE
  v_franchise_id UUID := '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
  v_level RECORD;
  v_pricing_count INT := 0;
  v_level_count INT := 0;
BEGIN

RAISE NOTICE '🚀 Starting distance pricing creation...';

-- First check how many levels exist
SELECT COUNT(*) INTO v_level_count
FROM package_levels l
JOIN package_variants v ON l.variant_id = v.id
JOIN packages_categories c ON v.category_id = c.id
WHERE c.franchise_id = v_franchise_id;

IF v_level_count = 0 THEN
  RAISE EXCEPTION 'No levels found for franchise! Please run STEP_3 first.';
END IF;

RAISE NOTICE '✅ Found % levels under franchise ID: %', v_level_count, v_franchise_id;
RAISE NOTICE '📦 Creating 5 distance tiers for each level...';
RAISE NOTICE '';

-- Loop through all levels for this franchise
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
  ORDER BY c.name, v.base_price, l.base_price
LOOP
  RAISE NOTICE '  📍 %: % - % (₹%)', 
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
  v_pricing_count := v_pricing_count + 1;
  
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
  v_pricing_count := v_pricing_count + 1;
  
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
  v_pricing_count := v_pricing_count + 1;
  
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
  VALUES (
    v_level.id,
    v_franchise_id,
    '251-1500 km',
    251,
    1500,
    3000.00,
    true
  );
  v_pricing_count := v_pricing_count + 1;
  
  RAISE NOTICE '     ✅ Created 4 distance tiers (0-10km: +₹500, 11-50km: +₹1000, 51-250km: +₹2000, 251-1500km: +₹3000)';
END LOOP;

RAISE NOTICE '';
RAISE NOTICE '🎉 SUCCESS: Created % distance pricing records for % levels!', v_pricing_count, v_level_count;
RAISE NOTICE 'Expected: % distance tiers (% levels × 4 tiers)', v_level_count * 4, v_level_count;
RAISE NOTICE '';
RAISE NOTICE '✨ COMPLETE DATA STRUCTURE:';
RAISE NOTICE '   - 9 Categories';
RAISE NOTICE '   - 90 Variants (10 per category)';
RAISE NOTICE '   - % Levels (3 per variant)', v_level_count;
RAISE NOTICE '   - % Distance Pricing Tiers (4 per level)', v_pricing_count;

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  c.name as category,
  v.name as variant,
  l.name as level,
  l.base_price as level_price,
  COUNT(d.id) as distance_tiers,
  MIN(d.additional_price) as min_distance_charge,
  MAX(d.additional_price) as max_distance_charge
FROM package_levels l
JOIN package_variants v ON l.variant_id = v.id
JOIN packages_categories c ON v.category_id = c.id
LEFT JOIN distance_pricing d ON l.id = d.package_level_id
WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
GROUP BY c.name, v.name, l.name, l.base_price
ORDER BY c.name, v.name, l.base_price
LIMIT 20;
