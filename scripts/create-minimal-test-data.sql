-- Create minimal test data for the CRM system
-- This script will only insert data if it doesn't already exist

-- Insert franchise if none exists
INSERT INTO franchises (id, name, address, phone, email)
SELECT 
    'f1111111-1111-1111-1111-111111111111'::uuid,
    'Safawala Main Branch',
    '123 Wedding Street, Bridal Market, Delhi - 110001',
    '+91-9876543210',
    'main@safawala.com'
WHERE NOT EXISTS (SELECT 1 FROM franchises LIMIT 1);

-- Insert user if none exists
INSERT INTO users (id, name, email, password_hash, role, franchise_id, is_active)
SELECT 
    'u1111111-1111-1111-1111-111111111111'::uuid,
    'Demo Staff',
    'staff@safawala.com',
    '$2a$10$example_hash',
    'staff',
    'f1111111-1111-1111-1111-111111111111'::uuid,
    true
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

-- Insert customer if none exists
INSERT INTO customers (id, name, phone, address, franchise_id)
SELECT 
    'c1111111-1111-1111-1111-111111111111'::uuid,
    'Test Customer',
    '+91-9876543210',
    '123 Test Address, Delhi - 110001',
    'f1111111-1111-1111-1111-111111111111'::uuid
WHERE NOT EXISTS (SELECT 1 FROM customers LIMIT 1);

-- Insert products if none exist
INSERT INTO products (id, name, category, price, rental_price, security_deposit, stock_total, stock_available, franchise_id)
SELECT * FROM (VALUES
    ('p1111111-1111-1111-1111-111111111111'::uuid, 'Royal Turban', 'turban', 15000.00, 2500.00, 5000.00, 5, 5, 'f1111111-1111-1111-1111-111111111111'::uuid),
    ('p2222222-2222-2222-2222-222222222222'::uuid, 'Golden Kalgi', 'kalgi', 8000.00, 1500.00, 3000.00, 3, 3, 'f1111111-1111-1111-1111-111111111111'::uuid),
    ('p3333333-3333-3333-3333-333333333333'::uuid, 'Pearl Necklace', 'necklace', 12000.00, 2000.00, 4000.00, 4, 4, 'f1111111-1111-1111-1111-111111111111'::uuid)
) AS new_products(id, name, category, price, rental_price, security_deposit, stock_total, stock_available, franchise_id)
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

-- Show what was created
SELECT 'Data creation completed. Current counts:' as message;

SELECT 'franchises' as table_name, COUNT(*) as count FROM franchises
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'customers' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'bookings' as table_name, COUNT(*) as count FROM bookings
UNION ALL
SELECT 'booking_items' as table_name, COUNT(*) as count FROM booking_items;
