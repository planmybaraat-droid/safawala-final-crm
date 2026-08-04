-- ============================================
-- ADD DEMO INVENTORY FOR mysafawale@gmail.com FRANCHISE
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Get the franchise_id for mysafawale@gmail.com
DO $$
DECLARE
    v_franchise_id UUID;
    v_category_id UUID;
    v_subcategory_id UUID;
    v_user_id UUID;
BEGIN
    -- Get franchise ID
    SELECT franchise_id INTO v_franchise_id 
    FROM users 
    WHERE email = 'mysafawale@gmail.com' 
    LIMIT 1;

    IF v_franchise_id IS NULL THEN
        RAISE EXCEPTION 'Franchise not found for mysafawale@gmail.com';
    END IF;

    -- Get user ID for created_by fields
    SELECT id INTO v_user_id 
    FROM users 
    WHERE email = 'mysafawale@gmail.com' 
    LIMIT 1;

    RAISE NOTICE 'Franchise ID: %', v_franchise_id;
    RAISE NOTICE 'User ID: %', v_user_id;

    -- Step 2: Ensure we have categories (create if not exist)
    -- Wedding Wear
    IF NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Wedding Wear') THEN
        INSERT INTO product_categories (name, description, is_active, created_at, updated_at)
        VALUES ('Wedding Wear', 'Traditional wedding attire and accessories', true, NOW(), NOW());
    END IF;
    
    -- Party Wear
    IF NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Party Wear') THEN
        INSERT INTO product_categories (name, description, is_active, created_at, updated_at)
        VALUES ('Party Wear', 'Party and celebration outfits', true, NOW(), NOW());
    END IF;
    
    -- Accessories
    IF NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Accessories') THEN
        INSERT INTO product_categories (name, description, is_active, created_at, updated_at)
        VALUES ('Accessories', 'Jewelry and fashion accessories', true, NOW(), NOW());
    END IF;

    -- Get category IDs
    SELECT id INTO v_category_id FROM product_categories WHERE name = 'Wedding Wear' LIMIT 1;

    -- Step 3: Insert Demo Products
    RAISE NOTICE 'Inserting demo products...';

    -- Product 1: Men's Sherwani Set
    INSERT INTO products (
        product_code,
        name,
        description,
        brand,
        size,
        color,
        material,
        price,
        rental_price,
        cost_price,
        security_deposit,
        stock_total,
        stock_available,
        stock_booked,
        stock_damaged,
        stock_in_laundry,
        reorder_level,
        usage_count,
        damage_count,
        barcode,
        is_active,
        franchise_id,
        category_id,
        created_at,
        updated_at
    ) VALUES (
        'PROD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'Royal Blue Sherwani Set',
        'Premium silk sherwani with intricate embroidery work, includes dupatta and mojari',
        'Manyavar',
        'L',
        'Royal Blue',
        'Silk',
        25000.00,
        5000.00,
        15000.00,
        3000.00,
        5,
        5,
        0,
        0,
        0,
        2,
        0,
        0,
        'SHW-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 8, '0'),
        true,
        v_franchise_id,
        v_category_id,
        NOW(),
        NOW()
    );

    -- Product 2: Bridal Lehenga
    INSERT INTO products (
        product_code,
        name,
        description,
        brand,
        size,
        color,
        material,
        price,
        rental_price,
        cost_price,
        security_deposit,
        stock_total,
        stock_available,
        stock_booked,
        stock_damaged,
        stock_in_laundry,
        reorder_level,
        usage_count,
        damage_count,
        barcode,
        is_active,
        franchise_id,
        category_id,
        created_at,
        updated_at
    ) VALUES (
        'PROD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'Red Bridal Lehenga with Dupatta',
        'Heavy embellished bridal lehenga with zari work and stone detailing',
        'Sabyasachi',
        'M',
        'Red',
        'Velvet & Silk',
        85000.00,
        15000.00,
        50000.00,
        10000.00,
        3,
        2,
        1,
        0,
        0,
        1,
        5,
        0,
        'LHG-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 8, '0'),
        true,
        v_franchise_id,
        v_category_id,
        NOW(),
        NOW()
    );

    -- Product 3: Groom's Kurta Pajama
    INSERT INTO products (
        product_code,
        name,
        description,
        brand,
        size,
        color,
        material,
        price,
        rental_price,
        cost_price,
        security_deposit,
        stock_total,
        stock_available,
        stock_booked,
        stock_damaged,
        stock_in_laundry,
        reorder_level,
        usage_count,
        damage_count,
        barcode,
        is_active,
        franchise_id,
        category_id,
        created_at,
        updated_at
    ) VALUES (
        'PROD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'Cream Silk Kurta Pajama',
        'Designer kurta pajama with golden embroidery',
        'Raymond',
        'XL',
        'Cream',
        'Silk',
        12000.00,
        2500.00,
        7000.00,
        2000.00,
        10,
        8,
        2,
        0,
        0,
        3,
        12,
        0,
        'KRT-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 8, '0'),
        true,
        v_franchise_id,
        v_category_id,
        NOW(),
        NOW()
    );

    -- Product 4: Designer Saree
    INSERT INTO products (
        product_code,
        name,
        description,
        brand,
        size,
        color,
        material,
        price,
        rental_price,
        cost_price,
        security_deposit,
        stock_total,
        stock_available,
        stock_booked,
        stock_damaged,
        stock_in_laundry,
        reorder_level,
        usage_count,
        damage_count,
        barcode,
        is_active,
        franchise_id,
        category_id,
        created_at,
        updated_at
    ) VALUES (
        'PROD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'Pink Designer Banarasi Saree',
        'Pure silk Banarasi saree with gold zari work',
        'Nalli Silks',
        'One Size',
        'Pink',
        'Pure Silk',
        35000.00,
        6000.00,
        20000.00,
        4000.00,
        6,
        6,
        0,
        0,
        0,
        2,
        0,
        0,
        'SAR-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 8, '0'),
        true,
        v_franchise_id,
        v_category_id,
        NOW(),
        NOW()
    );

    -- Product 5: Men's Indo-Western
    INSERT INTO products (
        product_code,
        name,
        description,
        brand,
        size,
        color,
        material,
        price,
        rental_price,
        cost_price,
        security_deposit,
        stock_total,
        stock_available,
        stock_booked,
        stock_damaged,
        stock_in_laundry,
        reorder_level,
        usage_count,
        damage_count,
        barcode,
        is_active,
        franchise_id,
        category_id,
        created_at,
        updated_at
    ) VALUES (
        'PROD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'Black Indo-Western Jacket Set',
        'Modern indo-western jacket with matching pants',
        'Manish Malhotra',
        'L',
        'Black',
        'Silk Blend',
        18000.00,
        3500.00,
        10000.00,
        2500.00,
        4,
        4,
        0,
        0,
        0,
        1,
        0,
        0,
        'IND-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 8, '0'),
        true,
        v_franchise_id,
        v_category_id,
        NOW(),
        NOW()
    );

    -- Product 6: Anarkali Suit
    INSERT INTO products (
        product_code,
        name,
        description,
        brand,
        size,
        color,
        material,
        price,
        rental_price,
        cost_price,
        security_deposit,
        stock_total,
        stock_available,
        stock_booked,
        stock_damaged,
        stock_in_laundry,
        reorder_level,
        usage_count,
        damage_count,
        barcode,
        is_active,
        franchise_id,
        category_id,
        created_at,
        updated_at
    ) VALUES (
        'PROD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'Green Anarkali Suit Set',
        'Floor length anarkali with heavy dupatta',
        'Fabindia',
        'M',
        'Emerald Green',
        'Georgette',
        15000.00,
        3000.00,
        8000.00,
        2000.00,
        7,
        5,
        2,
        0,
        0,
        2,
        8,
        0,
        'ANR-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 8, '0'),
        true,
        v_franchise_id,
        v_category_id,
        NOW(),
        NOW()
    );

    -- Product 7: Wedding Turban
    INSERT INTO products (
        product_code,
        name,
        description,
        brand,
        size,
        color,
        material,
        price,
        rental_price,
        cost_price,
        security_deposit,
        stock_total,
        stock_available,
        stock_booked,
        stock_damaged,
        stock_in_laundry,
        reorder_level,
        usage_count,
        damage_count,
        barcode,
        is_active,
        franchise_id,
        category_id,
        created_at,
        updated_at
    ) VALUES (
        'PROD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'Traditional Wedding Turban (Safa)',
        'Embellished wedding turban with brooch',
        'Traditional',
        'Adjustable',
        'Maroon',
        'Cotton & Silk',
        5000.00,
        1000.00,
        2500.00,
        500.00,
        15,
        12,
        3,
        0,
        0,
        5,
        20,
        0,
        'TRB-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 8, '0'),
        true,
        v_franchise_id,
        v_category_id,
        NOW(),
        NOW()
    );

    -- Product 8: Bridal Jewelry Set
    SELECT id INTO v_category_id FROM product_categories WHERE name = 'Accessories' LIMIT 1;
    
    INSERT INTO products (
        product_code,
        name,
        description,
        brand,
        size,
        color,
        material,
        price,
        rental_price,
        cost_price,
        security_deposit,
        stock_total,
        stock_available,
        stock_booked,
        stock_damaged,
        stock_in_laundry,
        reorder_level,
        usage_count,
        damage_count,
        barcode,
        is_active,
        franchise_id,
        category_id,
        created_at,
        updated_at
    ) VALUES (
        'PROD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'Kundan Bridal Jewelry Set',
        'Complete bridal jewelry set with necklace, earrings, maang tikka',
        'Tanishq',
        'One Size',
        'Gold',
        'Gold Plated',
        45000.00,
        8000.00,
        25000.00,
        5000.00,
        3,
        3,
        0,
        0,
        0,
        1,
        0,
        0,
        'JWL-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 8, '0'),
        true,
        v_franchise_id,
        v_category_id,
        NOW(),
        NOW()
    );

    -- Product 9: Men's Jooti (Shoes)
    INSERT INTO products (
        product_code,
        name,
        description,
        brand,
        size,
        color,
        material,
        price,
        rental_price,
        cost_price,
        security_deposit,
        stock_total,
        stock_available,
        stock_booked,
        stock_damaged,
        stock_in_laundry,
        reorder_level,
        usage_count,
        damage_count,
        barcode,
        is_active,
        franchise_id,
        category_id,
        created_at,
        updated_at
    ) VALUES (
        'PROD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'Embroidered Wedding Jooti',
        'Handcrafted leather jooti with embroidery',
        'Kolhapuri',
        '10',
        'Gold',
        'Leather',
        3000.00,
        500.00,
        1500.00,
        300.00,
        20,
        15,
        5,
        0,
        0,
        5,
        30,
        0,
        'JTI-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 8, '0'),
        true,
        v_franchise_id,
        v_category_id,
        NOW(),
        NOW()
    );

    -- Product 10: Party Wear Gown
    SELECT id INTO v_category_id FROM product_categories WHERE name = 'Party Wear' LIMIT 1;
    
    INSERT INTO products (
        product_code,
        name,
        description,
        brand,
        size,
        color,
        material,
        price,
        rental_price,
        cost_price,
        security_deposit,
        stock_total,
        stock_available,
        stock_booked,
        stock_damaged,
        stock_in_laundry,
        reorder_level,
        usage_count,
        damage_count,
        barcode,
        is_active,
        franchise_id,
        category_id,
        created_at,
        updated_at
    ) VALUES (
        'PROD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'Navy Blue Evening Gown',
        'Long evening gown with sequin work',
        'Zara',
        'S',
        'Navy Blue',
        'Satin',
        20000.00,
        4000.00,
        12000.00,
        2500.00,
        4,
        4,
        0,
        0,
        0,
        1,
        0,
        0,
        'GWN-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 8, '0'),
        true,
        v_franchise_id,
        v_category_id,
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Successfully added 10 demo products for franchise: %', v_franchise_id;
    
END $$;

-- Step 4: Verify the products were added
SELECT 
    '=== DEMO INVENTORY ADDED ===' as section,
    COUNT(*) as total_products,
    SUM(stock_total) as total_stock,
    SUM(stock_available) as available_stock,
    SUM(stock_booked) as booked_stock
FROM products p
JOIN users u ON p.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
AND p.is_active = true;

-- Step 5: List all products for verification
SELECT 
    '=== PRODUCT LIST ===' as section,
    p.product_code,
    p.name,
    p.brand,
    p.color,
    p.size,
    p.rental_price,
    p.stock_total,
    p.stock_available,
    c.name as category
FROM products p
LEFT JOIN product_categories c ON p.category_id = c.id
JOIN users u ON p.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
AND p.is_active = true
ORDER BY p.created_at DESC;

-- Step 6: Show inventory summary by category
SELECT 
    '=== INVENTORY BY CATEGORY ===' as section,
    c.name as category,
    COUNT(p.id) as product_count,
    SUM(p.stock_total) as total_stock,
    SUM(p.stock_available) as available_stock,
    ROUND(AVG(p.rental_price), 2) as avg_rental_price
FROM products p
LEFT JOIN product_categories c ON p.category_id = c.id
JOIN users u ON p.franchise_id = u.franchise_id
WHERE u.email = 'mysafawale@gmail.com'
AND p.is_active = true
GROUP BY c.name
ORDER BY product_count DESC;
