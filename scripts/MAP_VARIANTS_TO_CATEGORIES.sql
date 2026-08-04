-- Check what the package_id values in variants refer to
-- This might be an old packages table or they might need to be remapped

-- Step 1: See if there's a packages table
SELECT id, name 
FROM packages 
WHERE id IN (
    '5ce828a3-c495-405a-bcaa-ca25df025acd',
    'f7b69168-e05e-4dc7-af22-2d96cfcba589',
    '1c91eecb-5ede-40d6-a2ed-765ecd001349'
)
LIMIT 10;

-- Step 2: Count how many variants point to each package_id
SELECT 
    package_id,
    COUNT(*) as variant_count,
    string_agg(DISTINCT name, ', ') as variant_names
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true
GROUP BY package_id
ORDER BY variant_count DESC;

-- Step 3: If packages table doesn't exist or doesn't match,
-- we need to manually assign variants to categories.
-- For example, map all variants to appropriate categories based on their names:

-- UPDATE package_variants
-- SET category_id = '364aa455-ed12-445f-bcd7-c5ab72bdccfa'  -- 21 Safas
-- WHERE name ILIKE '%21%' OR name ILIKE '%standard%'
-- AND franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
