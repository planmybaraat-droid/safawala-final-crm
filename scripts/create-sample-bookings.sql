-- Create sample customers first
INSERT INTO customers (id, name, phone, whatsapp, email, address, customer_code, franchise_id, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Rajesh Kumar', '+91-9876543210', '+91-9876543210', 'rajesh@example.com', '123 MG Road, Bangalore, Karnataka 560001', 'CUST001', (SELECT id FROM franchises LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Priya Sharma', '+91-9876543211', '+91-9876543211', 'priya@example.com', '456 Park Street, Mumbai, Maharashtra 400001', 'CUST002', (SELECT id FROM franchises LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Amit Singh', '+91-9876543212', '+91-9876543212', 'amit@example.com', '789 Civil Lines, Delhi 110001', 'CUST003', (SELECT id FROM franchises LIMIT 1), NOW(), NOW())
ON CONFLICT (customer_code) DO NOTHING;

-- Create sample products first
INSERT INTO products (id, name, category, product_code, rental_price, price, stock_total, stock_available, franchise_id, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Royal Red Silk Turban', 'Turbans', 'TUR001', 500, 2500, 10, 8, (SELECT id FROM franchises LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Golden Pearl Sehra', 'Sehras', 'SEH001', 300, 1500, 5, 4, (SELECT id FROM franchises LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Diamond Kalgi Set', 'Kalgis', 'KAL001', 800, 4000, 3, 2, (SELECT id FROM franchises LIMIT 1), NOW(), NOW())
ON CONFLICT (product_code) DO NOTHING;

-- Create sample bookings
WITH sample_customers AS (
  SELECT id, name FROM customers WHERE customer_code IN ('CUST001', 'CUST002', 'CUST003')
),
sample_products AS (
  SELECT id, name, rental_price FROM products WHERE product_code IN ('TUR001', 'SEH001', 'KAL001')
),
booking_data AS (
  SELECT 
    gen_random_uuid() as booking_id,
    generate_booking_number() as booking_number,
    c.id as customer_id,
    c.name as customer_name,
    (SELECT id FROM franchises LIMIT 1) as franchise_id
  FROM sample_customers c
  LIMIT 3
)
INSERT INTO bookings (
  id, booking_number, customer_id, franchise_id, type, status, 
  event_date, delivery_date, return_date, total_amount, 
  groom_name, bride_name, venue_name, venue_address,
  event_type, created_at, updated_at
)
SELECT 
  booking_id,
  booking_number,
  customer_id,
  franchise_id,
  'rental',
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'confirmed'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'pending'
    ELSE 'delivered'
  END,
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '5 days',
  CURRENT_DATE + INTERVAL '8 days',
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 1600
    WHEN ROW_NUMBER() OVER() = 2 THEN 2100
    ELSE 3400
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'Rajesh Kumar'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'Amit Singh'
    ELSE 'Vikram Gupta'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'Sunita Devi'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'Priya Sharma'
    ELSE 'Kavya Singh'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'Grand Palace Hotel'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'Royal Gardens'
    ELSE 'Heritage Banquet Hall'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'MG Road, Bangalore'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'Bandra West, Mumbai'
    ELSE 'Connaught Place, Delhi'
  END,
  'Wedding',
  NOW(),
  NOW()
FROM booking_data;

-- Create booking items for the sample bookings
WITH recent_bookings AS (
  SELECT id as booking_id, total_amount FROM bookings 
  WHERE created_at > NOW() - INTERVAL '1 minute'
),
sample_products AS (
  SELECT id, rental_price FROM products WHERE product_code IN ('TUR001', 'SEH001', 'KAL001')
)
INSERT INTO booking_items (id, booking_id, product_id, quantity, unit_price, total_price, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  b.booking_id,
  p.id,
  CASE 
    WHEN ROW_NUMBER() OVER(PARTITION BY b.booking_id) = 1 THEN 2
    ELSE 1
  END,
  p.rental_price,
  CASE 
    WHEN ROW_NUMBER() OVER(PARTITION BY b.booking_id) = 1 THEN p.rental_price * 2
    ELSE p.rental_price
  END,
  NOW(),
  NOW()
FROM recent_bookings b
CROSS JOIN sample_products p
WHERE (b.booking_id, p.id) IN (
  SELECT booking_id, id FROM (
    SELECT b.booking_id, p.id, ROW_NUMBER() OVER(PARTITION BY b.booking_id ORDER BY p.rental_price) as rn
    FROM recent_bookings b
    CROSS JOIN sample_products p
  ) ranked
  WHERE rn <= 2
);

-- Update product stock counts
UPDATE products 
SET stock_booked = stock_booked + 2,
    stock_available = stock_available - 2
WHERE product_code = 'TUR001';

UPDATE products 
SET stock_booked = stock_booked + 1,
    stock_available = stock_available - 1
WHERE product_code IN ('SEH001', 'KAL001');
