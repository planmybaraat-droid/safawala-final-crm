-- ================================================================
-- STEP 4: CREATE DISTANCE PRICING FOR ALL VARIANTS (4 TIERS EACH)
-- ================================================================
-- This script creates 4 distance pricing tiers for each variant
-- Total: ~90 variants × 4 tiers = 360 distance pricing records
-- ================================================================

BEGIN;

-- Distance Tier 1: 0-10 km (+₹500)
INSERT INTO distance_pricing (
  package_variant_id,
  distance_range,
  min_distance_km,
  max_distance_km,
  additional_price,
  franchise_id,
  is_active
)
SELECT 
  pv.id,
  '0-10 km',
  0,
  10,
  500,
  pv.franchise_id,
  true
FROM package_variants pv
WHERE pv.is_active = true
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Created Distance Tier 1 (0-10 km, +₹500) for all active variants';

-- Distance Tier 2: 11-50 km (+₹1,000)
INSERT INTO distance_pricing (
  package_variant_id,
  distance_range,
  min_distance_km,
  max_distance_km,
  additional_price,
  franchise_id,
  is_active
)
SELECT 
  pv.id,
  '11-50 km',
  11,
  50,
  1000,
  pv.franchise_id,
  true
FROM package_variants pv
WHERE pv.is_active = true
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Created Distance Tier 2 (11-50 km, +₹1,000) for all active variants';

-- Distance Tier 3: 51-250 km (+₹2,000)
INSERT INTO distance_pricing (
  package_variant_id,
  distance_range,
  min_distance_km,
  max_distance_km,
  additional_price,
  franchise_id,
  is_active
)
SELECT 
  pv.id,
  '51-250 km',
  51,
  250,
  2000,
  pv.franchise_id,
  true
FROM package_variants pv
WHERE pv.is_active = true
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Created Distance Tier 3 (51-250 km, +₹2,000) for all active variants';

-- Distance Tier 4: 251-1500 km (+₹3,000)
INSERT INTO distance_pricing (
  package_variant_id,
  distance_range,
  min_distance_km,
  max_distance_km,
  additional_price,
  franchise_id,
  is_active
)
SELECT 
  pv.id,
  '251-1500 km',
  251,
  1500,
  3000,
  pv.franchise_id,
  true
FROM package_variants pv
WHERE pv.is_active = true
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Created Distance Tier 4 (251-1500 km, +₹3,000) for all active variants';

COMMIT;

-- ================================================================
-- COMPLETION SUMMARY
-- ================================================================
DO $$
DECLARE
  variant_count INTEGER;
  pricing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO variant_count FROM package_variants WHERE is_active = true;
  SELECT COUNT(*) INTO pricing_count FROM distance_pricing WHERE is_active = true;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Distance Pricing Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Active Variants: %', variant_count;
  RAISE NOTICE 'Distance Pricing Records: %', pricing_count;
  RAISE NOTICE 'Expected: % (% variants × 4 tiers)', variant_count * 4, variant_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Distance Tiers:';
  RAISE NOTICE '  • 0-10 km: +₹500';
  RAISE NOTICE '  • 11-50 km: +₹1,000';
  RAISE NOTICE '  • 51-250 km: +₹2,000';
  RAISE NOTICE '  • 251-1500 km: +₹3,000';
  RAISE NOTICE '========================================';
END $$;
