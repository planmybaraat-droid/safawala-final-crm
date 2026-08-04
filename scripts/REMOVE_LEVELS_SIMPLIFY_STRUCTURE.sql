-- ================================================================
-- REMOVE PACKAGE LEVELS - SIMPLIFY TO CATEGORIES → VARIANTS → DISTANCE PRICING
-- ================================================================
--
-- This migration removes the package_levels table and modifies distance_pricing
-- to reference package_variants directly, simplifying the hierarchy to:
-- Categories → Variants → Distance Pricing (4 tiers per variant)
--
-- ================================================================

BEGIN;

-- Step 1: Add new column to distance_pricing for direct variant reference
ALTER TABLE distance_pricing 
ADD COLUMN IF NOT EXISTS package_variant_id UUID REFERENCES package_variants(id) ON DELETE CASCADE;

-- Step 2: Migrate existing distance_pricing data from levels to variants
-- Each level belongs to a variant, so we copy the level's distance pricing to the variant
UPDATE distance_pricing dp
SET package_variant_id = pl.variant_id
FROM package_levels pl
WHERE dp.package_level_id = pl.id;

-- Step 3: Create index on new column for performance
CREATE INDEX IF NOT EXISTS idx_distance_pricing_variant_id 
ON distance_pricing(package_variant_id);

-- Step 4: Drop the old foreign key constraint and column
ALTER TABLE distance_pricing 
DROP CONSTRAINT IF EXISTS distance_pricing_package_level_id_fkey,
DROP COLUMN IF EXISTS package_level_id,
DROP COLUMN IF EXISTS level_id; -- Remove old column name if it exists

-- Step 5: Make package_variant_id NOT NULL now that data is migrated
ALTER TABLE distance_pricing 
ALTER COLUMN package_variant_id SET NOT NULL;

-- Step 6: Drop the package_levels table entirely
DROP TABLE IF EXISTS package_levels CASCADE;

-- Step 7: Update stats view
DO $$
BEGIN
  RAISE NOTICE '✓ Package levels removed';
  RAISE NOTICE '✓ Distance pricing now links directly to variants';
  RAISE NOTICE '✓ New structure: Categories → Variants → Distance Pricing (4 tiers each)';
  
  -- Count records
  RAISE NOTICE 'Current distance pricing records: %', (SELECT COUNT(*) FROM distance_pricing);
  RAISE NOTICE 'Current variants: %', (SELECT COUNT(*) FROM package_variants);
  RAISE NOTICE 'Current categories: %', (SELECT COUNT(*) FROM packages_categories WHERE is_active = true);
END $$;

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check distance pricing by variant
SELECT 
  pc.name as category,
  pv.name as variant,
  COUNT(dp.id) as distance_tiers,
  MIN(dp.min_distance_km) as min_km,
  MAX(dp.max_distance_km) as max_km
FROM packages_categories pc
JOIN package_variants pv ON pv.category_id = pc.id
LEFT JOIN distance_pricing dp ON dp.package_variant_id = pv.id
WHERE pc.is_active = true AND pv.is_active = true
GROUP BY pc.name, pv.name
ORDER BY pc.name, pv.name;
