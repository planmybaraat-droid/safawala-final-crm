-- ============================================
-- FRANCHISE ISOLATION: Categories, Variants & Distance Pricing
-- ============================================
-- Ensures all records have correct franchise_id
-- Franchise: Surat Branch (1a518dde-85b7-44ef-8bc4-092f53ddfd99)
-- ============================================

BEGIN;

-- Step 1: DON'T update categories - they might be from other franchises
-- Only show what we have for this franchise
-- UPDATE packages_categories
-- SET franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
-- WHERE franchise_id IS NULL
-- OR franchise_id != '1a518dde-85b7-44ef-8bc4-092f53ddfd99';

-- Step 2: Update package_variants - only those without category_id set
UPDATE package_variants
SET franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
WHERE is_active = true
AND (franchise_id IS NULL OR franchise_id != '1a518dde-85b7-44ef-8bc4-092f53ddfd99')
AND category_id IS NULL;

-- Step 3: Update distance_pricing for this franchise only
UPDATE distance_pricing
SET franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
WHERE is_active = true
AND (franchise_id IS NULL OR franchise_id != '1a518dde-85b7-44ef-8bc4-092f53ddfd99');

COMMIT;

-- Verify franchise isolation
SELECT 
    'Categories' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99' THEN 1 END) as franchise_records,
    COUNT(CASE WHEN franchise_id IS NULL THEN 1 END) as null_franchise
FROM packages_categories
WHERE is_active = true

UNION ALL

SELECT 
    'Variants' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99' THEN 1 END) as franchise_records,
    COUNT(CASE WHEN franchise_id IS NULL THEN 1 END) as null_franchise
FROM package_variants
WHERE is_active = true

UNION ALL

SELECT 
    'Distance Pricing' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99' THEN 1 END) as franchise_records,
    COUNT(CASE WHEN franchise_id IS NULL THEN 1 END) as null_franchise
FROM distance_pricing
WHERE is_active = true;

-- Show categories count
SELECT COUNT(*) as categories_count
FROM packages_categories
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true;

-- Show variants count
SELECT COUNT(*) as variants_count
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true;

-- Show distance pricing count
SELECT COUNT(*) as distance_pricing_count
FROM distance_pricing
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true;
