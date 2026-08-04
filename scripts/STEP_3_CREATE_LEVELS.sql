-- ============================================================================
-- STEP 3: Create Levels (Run AFTER variants are created)
-- ============================================================================
-- This creates 3 levels (Premium, VIP, VVIP) for each variant
-- ============================================================================

DO $$
DECLARE
  v_franchise_id UUID := '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
  v_variant RECORD;
  v_level_count INT := 0;
  v_variant_count INT := 0;
BEGIN

RAISE NOTICE '🚀 Starting level creation...';

-- First check how many variants exist
SELECT COUNT(*) INTO v_variant_count
FROM package_variants v
JOIN packages_categories c ON v.category_id = c.id
WHERE c.franchise_id = v_franchise_id;

IF v_variant_count = 0 THEN
  RAISE EXCEPTION 'No variants found for franchise! Please run STEP_2 first.';
END IF;

RAISE NOTICE '✅ Found % variants under franchise ID: %', v_variant_count, v_franchise_id;
RAISE NOTICE '📦 Creating 3 levels for each variant...';
RAISE NOTICE '';

-- Loop through all variants for this franchise
FOR v_variant IN 
  SELECT v.id, v.name, v.base_price, c.name as category_name
  FROM package_variants v
  JOIN packages_categories c ON v.category_id = c.id
  WHERE c.franchise_id = v_franchise_id
  ORDER BY c.name, v.base_price
LOOP
  RAISE NOTICE '  📝 %: % (Base: ₹%)', v_variant.category_name, v_variant.name, v_variant.base_price;
  
  -- Premium Level (base price)
  INSERT INTO package_levels (
    variant_id,
    name,
    base_price,
    is_active
  )
  VALUES (
    v_variant.id,
    'Premium',
    v_variant.base_price,
    true
  );
  v_level_count := v_level_count + 1;
  
  -- VIP Level (base + 500)
  INSERT INTO package_levels (
    variant_id,
    name,
    base_price,
    is_active
  )
  VALUES (
    v_variant.id,
    'VIP',
    v_variant.base_price + 500,
    true
  );
  v_level_count := v_level_count + 1;
  
  -- VVIP Level (base + 1000)
  INSERT INTO package_levels (
    variant_id,
    name,
    base_price,
    is_active
  )
  VALUES (
    v_variant.id,
    'VVIP',
    v_variant.base_price + 1000,
    true
  );
  v_level_count := v_level_count + 1;
  
  RAISE NOTICE '     ✅ Premium: ₹%, VIP: ₹%, VVIP: ₹%', 
    v_variant.base_price, 
    v_variant.base_price + 500, 
    v_variant.base_price + 1000;
END LOOP;

RAISE NOTICE '';
RAISE NOTICE '🎉 SUCCESS: Created % levels for % variants!', v_level_count, v_variant_count;
RAISE NOTICE 'Expected: % levels (% variants × 3 levels)', v_variant_count * 3, v_variant_count;
RAISE NOTICE 'Next step: Run STEP_4_CREATE_DISTANCE_PRICING.sql';

END $$;

-- Verify
SELECT 
  c.name as category,
  v.name as variant,
  l.name as level,
  l.base_price as "Level Price"
FROM package_levels l
JOIN package_variants v ON l.variant_id = v.id
JOIN packages_categories c ON v.category_id = c.id
WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
ORDER BY c.name, v.base_price, l.base_price;
