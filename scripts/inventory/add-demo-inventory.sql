-- ============================================
-- ADD DEMO INVENTORY FOR mysafawale@gmail.com FRANCHISE
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Get the franchise_id for mysafawale@gmail.com
DO $$
DECLARE
    v_franchise_id UUID;
    v_user_id UUID;
BEGIN
    -- Get franchise_id from mysafawale@gmail.com user
    SELECT id, franchise_id INTO v_user_id, v_franchise_id
    FROM users 
    WHERE email = 'mysafawale@gmail.com';

    IF v_franchise_id IS NULL THEN
        RAISE EXCEPTION 'No franchise found for mysafawale@gmail.com';
    END IF;

    RAISE NOTICE 'Found franchise_id: % for user: %', v_franchise_id, v_user_id;

    -- Step 2: Insert Demo Inventory Products
    RAISE NOTICE 'Inserting demo inventory products...';

    -- Category 1: Sherwani Collection
    INSERT INTO products (
        product_code, name, description, brand, size, color, material,
        price, rental_price, cost_price, security_deposit,
        stock_total, stock_available, stock_booked, stock_damaged, stock_in_laundry,
        reorder_level, usage_count, damage_count,
        barcode, is_active, franchise_id,
        created_at, updated_at
    ) VALUES
    (
        'PROD-' || LPAD(nextval('products_seq')::TEXT, 4, '0'),
        'Royal Maroon Sherwani',
        'Elegant maroon sherwani with gold embroidery, perfect for weddings',
        'Royal Collection',
        'L',
        'Maroon',
        'Silk Blend',
        45000,  -- price
        4500,   -- rental_price (10% of price)
        30000,  -- cost_price
        5000,   -- security_deposit
        5,      -- stock_total
        5,      -- stock_available
        0,      -- stock_booked
        0,      -- stock_damaged
        0,      -- stock_in_laundry
        2,      -- reorder_level
        0,      -- usage_count
        0,      -- damage_count
        'SHW-MAR-001',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),
    (
        'PROD-' || LPAD((nextval('products_seq') + 1)::TEXT, 4, '0'),
        'Cream Silk Sherwani',
        'Classic cream sherwani with intricate thread work',
        'Royal Collection',
        'XL',
        'Cream',
        'Pure Silk',
        55000,
        5500,
        38000,
        6000,
        3,
        3,
        0,
        0,
        0,
        1,
        0,
        0,
        'SHW-CRM-002',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),
    (
        'PROD-' || LPAD((nextval('products_seq') + 2)::TEXT, 4, '0'),
        'Navy Blue Indo-Western Sherwani',
        'Modern navy blue sherwani with contemporary design',
        'Royal Collection',
        'M',
        'Navy Blue',
        'Cotton Silk',
        40000,
        4000,
        28000,
        4500,
        4,
        4,
        0,
        0,
        0,
        2,
        0,
        0,
        'SHW-NAV-003',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),

    -- Category 2: Lehenga Collection
    (
        'PROD-' || LPAD((nextval('products_seq') + 3)::TEXT, 4, '0'),
        'Red Bridal Lehenga',
        'Heavy embroidered red bridal lehenga with dupatta',
        'Bridal Collection',
        'Free Size',
        'Red',
        'Velvet',
        85000,
        8500,
        60000,
        10000,
        3,
        3,
        0,
        0,
        0,
        1,
        0,
        0,
        'LEH-RED-001',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),
    (
        'PROD-' || LPAD((nextval('products_seq') + 4)::TEXT, 4, '0'),
        'Pink Engagement Lehenga',
        'Pastel pink lehenga with mirror work',
        'Bridal Collection',
        'Free Size',
        'Pink',
        'Georgette',
        65000,
        6500,
        45000,
        7500,
        4,
        4,
        0,
        0,
        0,
        2,
        0,
        0,
        'LEH-PNK-002',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),
    (
        'PROD-' || LPAD((nextval('products_seq') + 5)::TEXT, 4, '0'),
        'Green Designer Lehenga',
        'Mint green lehenga with sequin work',
        'Designer Collection',
        'Free Size',
        'Green',
        'Net',
        55000,
        5500,
        38000,
        6500,
        2,
        2,
        0,
        0,
        0,
        1,
        0,
        0,
        'LEH-GRN-003',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),

    -- Category 3: Saree Collection
    (
        'PROD-' || LPAD((nextval('products_seq') + 6)::TEXT, 4, '0'),
        'Banarasi Silk Saree',
        'Traditional Banarasi silk saree with golden border',
        'Traditional Collection',
        'One Size',
        'Gold',
        'Pure Silk',
        35000,
        3500,
        25000,
        4000,
        6,
        6,
        0,
        0,
        0,
        3,
        0,
        0,
        'SAR-BAN-001',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),
    (
        'PROD-' || LPAD((nextval('products_seq') + 7)::TEXT, 4, '0'),
        'Kanjeevaram Wedding Saree',
        'South Indian style Kanjeevaram saree',
        'Traditional Collection',
        'One Size',
        'Purple',
        'Silk',
        42000,
        4200,
        30000,
        5000,
        4,
        4,
        0,
        0,
        0,
        2,
        0,
        0,
        'SAR-KAN-002',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),

    -- Category 4: Kurta Pajama
    (
        'PROD-' || LPAD((nextval('products_seq') + 8)::TEXT, 4, '0'),
        'White Kurta Pajama Set',
        'Simple white kurta pajama for casual events',
        'Casual Collection',
        'L',
        'White',
        'Cotton',
        8000,
        800,
        5000,
        1000,
        10,
        10,
        0,
        0,
        0,
        5,
        0,
        0,
        'KUR-WHT-001',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),
    (
        'PROD-' || LPAD((nextval('products_seq') + 9)::TEXT, 4, '0'),
        'Beige Kurta Pajama with Jacket',
        'Beige kurta pajama with matching jacket',
        'Ethnic Collection',
        'XL',
        'Beige',
        'Linen',
        15000,
        1500,
        10000,
        2000,
        5,
        5,
        0,
        0,
        0,
        2,
        0,
        0,
        'KUR-BEI-002',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),

    -- Category 5: Kids Wear
    (
        'PROD-' || LPAD((nextval('products_seq') + 10)::TEXT, 4, '0'),
        'Kids Dhoti Kurta Set',
        'Traditional dhoti kurta for kids',
        'Kids Collection',
        '8-10 Years',
        'Orange',
        'Cotton',
        5000,
        500,
        3000,
        500,
        8,
        8,
        0,
        0,
        0,
        4,
        0,
        0,
        'KID-DHO-001',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),
    (
        'PROD-' || LPAD((nextval('products_seq') + 11)::TEXT, 4, '0'),
        'Kids Lehenga Choli',
        'Cute lehenga choli for little girls',
        'Kids Collection',
        '6-8 Years',
        'Pink',
        'Cotton Silk',
        8000,
        800,
        5500,
        1000,
        6,
        6,
        0,
        0,
        0,
        3,
        0,
        0,
        'KID-LEH-002',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),

    -- Category 6: Accessories
    (
        'PROD-' || LPAD((nextval('products_seq') + 12)::TEXT, 4, '0'),
        'Designer Dupatta',
        'Net dupatta with heavy embroidery',
        'Accessories',
        'One Size',
        'Gold',
        'Net',
        5000,
        500,
        3000,
        500,
        15,
        15,
        0,
        0,
        0,
        8,
        0,
        0,
        'ACC-DUP-001',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),
    (
        'PROD-' || LPAD((nextval('products_seq') + 13)::TEXT, 4, '0'),
        'Embroidered Stole',
        'Silk stole with traditional embroidery',
        'Accessories',
        'One Size',
        'Maroon',
        'Silk',
        3000,
        300,
        2000,
        300,
        12,
        12,
        0,
        0,
        0,
        6,
        0,
        0,
        'ACC-STO-002',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    ),
    (
        'PROD-' || LPAD((nextval('products_seq') + 14)::TEXT, 4, '0'),
        'Groom Turban (Safa)',
        'Traditional turban for groom',
        'Accessories',
        'One Size',
        'Red',
        'Silk',
        2500,
        250,
        1500,
        300,
        10,
        10,
        0,
        0,
        0,
        5,
        0,
        0,
        'ACC-TUR-003',
        true,
        v_franchise_id,
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Successfully inserted 15 demo products for franchise: %', v_franchise_id;

END $$;

-- Step 3: Verify the inserted products
SELECT 
    '=== DEMO INVENTORY VERIFICATION ===' as section,
    COUNT(*) as total_products,
    SUM(stock_total) as total_stock,
    SUM(stock_available) as available_stock,
    ROUND(AVG(rental_price)::numeric, 2) as avg_rental_price,
    ROUND(SUM(stock_total * rental_price)::numeric, 2) as total_inventory_value
FROM products
WHERE franchise_id = (
    SELECT franchise_id FROM users WHERE email = 'mysafawale@gmail.com'
)
AND is_active = true;

-- Step 4: List all products by category
SELECT 
    '=== INVENTORY BY PRODUCT TYPE ===' as section,
    CASE 
        WHEN name LIKE '%Sherwani%' THEN 'Sherwani'
        WHEN name LIKE '%Lehenga%' THEN 'Lehenga'
        WHEN name LIKE '%Saree%' THEN 'Saree'
        WHEN name LIKE '%Kurta%' THEN 'Kurta Pajama'
        WHEN name LIKE '%Kids%' THEN 'Kids Wear'
        ELSE 'Accessories'
    END as category,
    COUNT(*) as product_count,
    SUM(stock_total) as total_stock,
    ROUND(AVG(rental_price)::numeric, 2) as avg_rental_price
FROM products
WHERE franchise_id = (
    SELECT franchise_id FROM users WHERE email = 'mysafawale@gmail.com'
)
AND is_active = true
GROUP BY category
ORDER BY category;

-- Step 5: Show sample products
SELECT 
    '=== SAMPLE PRODUCTS ===' as section,
    product_code,
    name,
    brand,
    color,
    size,
    rental_price,
    stock_total,
    stock_available,
    barcode
FROM products
WHERE franchise_id = (
    SELECT franchise_id FROM users WHERE email = 'mysafawale@gmail.com'
)
AND is_active = true
ORDER BY rental_price DESC
LIMIT 10;

-- Done!
SELECT '✅ Demo inventory added successfully for mysafawale@gmail.com!' as status;
