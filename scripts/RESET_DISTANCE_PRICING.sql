-- ============================================
-- RESET AND RECREATE DISTANCE PRICING
-- ============================================
-- Purpose: Drop all existing distance pricing and create fresh 4-tier structure for all variants
-- Expected: ~90 variants × 4 tiers = 360 distance pricing records
-- Date: 25 October 2025
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: DROP ALL EXISTING DISTANCE PRICING
-- ============================================
DELETE FROM distance_pricing;

DO $$
DECLARE
    deleted_count INT;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % existing distance pricing records', deleted_count;
END $$;

-- ============================================
-- STEP 2: CREATE 4 DISTANCE TIERS FOR ALL ACTIVE VARIANTS
-- ============================================

-- Tier 1: 0-10 km (+₹500)
INSERT INTO distance_pricing (
    package_variant_id,
    distance_range,
    min_distance_km,
    max_distance_km,
    additional_price,
    franchise_id,
    is_active,
    created_at,
    updated_at
)
SELECT 
    pv.id,
    '0-10 km',
    0,
    10,
    500,
    COALESCE(pv.franchise_id, pc.franchise_id),
    true,
    NOW(),
    NOW()
FROM package_variants pv
LEFT JOIN packages_categories pc ON pc.id = pv.category_id
WHERE pv.is_active = true
  AND (pv.franchise_id IS NOT NULL OR pc.franchise_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Tier 2: 11-50 km (+₹1,000)
INSERT INTO distance_pricing (
    package_variant_id,
    distance_range,
    min_distance_km,
    max_distance_km,
    additional_price,
    franchise_id,
    is_active,
    created_at,
    updated_at
)
SELECT 
    pv.id,
    '11-50 km',
    11,
    50,
    1000,
    COALESCE(pv.franchise_id, pc.franchise_id),
    true,
    NOW(),
    NOW()
FROM package_variants pv
LEFT JOIN packages_categories pc ON pc.id = pv.category_id
WHERE pv.is_active = true
  AND (pv.franchise_id IS NOT NULL OR pc.franchise_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Tier 3: 51-250 km (+₹2,000)
INSERT INTO distance_pricing (
    package_variant_id,
    distance_range,
    min_distance_km,
    max_distance_km,
    additional_price,
    franchise_id,
    is_active,
    created_at,
    updated_at
)
SELECT 
    pv.id,
    '51-250 km',
    51,
    250,
    2000,
    COALESCE(pv.franchise_id, pc.franchise_id),
    true,
    NOW(),
    NOW()
FROM package_variants pv
LEFT JOIN packages_categories pc ON pc.id = pv.category_id
WHERE pv.is_active = true
  AND (pv.franchise_id IS NOT NULL OR pc.franchise_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Tier 4: 251-1500 km (+₹3,000)
INSERT INTO distance_pricing (
    package_variant_id,
    distance_range,
    min_distance_km,
    max_distance_km,
    additional_price,
    franchise_id,
    is_active,
    created_at,
    updated_at
)
SELECT 
    pv.id,
    '251-1500 km',
    251,
    1500,
    3000,
    COALESCE(pv.franchise_id, pc.franchise_id),
    true,
    NOW(),
    NOW()
FROM package_variants pv
LEFT JOIN packages_categories pc ON pc.id = pv.category_id
WHERE pv.is_active = true
  AND (pv.franchise_id IS NOT NULL OR pc.franchise_id IS NOT NULL)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- VERIFICATION & SUMMARY
-- ============================================
DO $$
DECLARE
    variant_count INT;
    pricing_count INT;
    variants_with_pricing INT;
    variants_without_pricing INT;
BEGIN
    -- Count active variants
    SELECT COUNT(*) INTO variant_count
    FROM package_variants
    WHERE is_active = true;
    
    -- Count total distance pricing records
    SELECT COUNT(*) INTO pricing_count
    FROM distance_pricing;
    
    -- Count variants with pricing
    SELECT COUNT(DISTINCT package_variant_id) INTO variants_with_pricing
    FROM distance_pricing;
    
    -- Calculate variants without pricing
    variants_without_pricing := variant_count - variants_with_pricing;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '✅ DISTANCE PRICING RESET COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '  • Active Variants: %', variant_count;
    RAISE NOTICE '  • Total Distance Pricing Records: %', pricing_count;
    RAISE NOTICE '  • Variants with Pricing: %', variants_with_pricing;
    RAISE NOTICE '  • Variants without Pricing: %', variants_without_pricing;
    RAISE NOTICE '  • Expected Records: % (% variants × 4 tiers)', variant_count * 4, variant_count;
    RAISE NOTICE '';
    
    IF pricing_count = variant_count * 4 THEN
        RAISE NOTICE '✅ SUCCESS: All variants have exactly 4 distance tiers!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Mismatch in expected records';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 Distance Tiers Created:';
    RAISE NOTICE '  1. 0-10 km    → +₹500';
    RAISE NOTICE '  2. 11-50 km   → +₹1,000';
    RAISE NOTICE '  3. 51-250 km  → +₹2,000';
    RAISE NOTICE '  4. 251-1500 km → +₹3,000';
    RAISE NOTICE '';
END $$;

-- ============================================
-- DETAILED VERIFICATION QUERY
-- ============================================
-- Run this to see all variants with their distance pricing
SELECT 
    pc.name AS category,
    pv.name AS variant,
    COUNT(dp.id) AS tier_count,
    ARRAY_AGG(dp.distance_range ORDER BY dp.min_distance_km) AS distance_ranges,
    ARRAY_AGG(dp.additional_price ORDER BY dp.min_distance_km) AS prices
FROM packages_categories pc
JOIN package_variants pv ON pv.category_id = pc.id
LEFT JOIN distance_pricing dp ON dp.package_variant_id = pv.id
WHERE pv.is_active = true
GROUP BY pc.name, pv.name, pc.display_order, pv.display_order
ORDER BY pc.display_order, pv.display_order
LIMIT 20;
