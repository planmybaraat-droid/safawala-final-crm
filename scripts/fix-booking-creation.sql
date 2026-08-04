-- Fix user email constraint issue and ensure proper demo data
-- Run this script in Supabase SQL Editor

-- First, let's check if we have any existing users and clean up if needed
DELETE FROM users WHERE email LIKE '%@safawala.com';

-- Create a default franchise if it doesn't exist
INSERT INTO franchises (
  id,
  name,
  code,
  address,
  city,
  state,
  pincode,
  phone,
  email,
  owner_name,
  is_active
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Safawala Main Branch',
  'SWL001',
  '123 Wedding Street, Bridal Market',
  'Delhi',
  'Delhi',
  '110001',
  '+91-9876543210',
  'main@safawala.com',
  'Safawala Owner',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  pincode = EXCLUDED.pincode,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  owner_name = EXCLUDED.owner_name,
  is_active = EXCLUDED.is_active;

-- Create a default user for bookings
INSERT INTO users (
  id,
  name,
  email,
  role,
  franchise_id,
  is_active
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Demo Staff',
  'demo@safawala.com',
  'staff',
  '11111111-1111-1111-1111-111111111111',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  franchise_id = EXCLUDED.franchise_id,
  is_active = EXCLUDED.is_active;

-- Add some sample customers if they don't exist
INSERT INTO customers (
  id,
  customer_code,
  name,
  phone,
  whatsapp,
  email,
  address,
  city,
  pincode,
  gst_number,
  credit_limit,
  outstanding_balance,
  total_bookings,
  total_spent,
  franchise_id
) VALUES 
(
  '33333333-3333-3333-3333-333333333333',
  'CUST001',
  'Rajesh Kumar',
  '+91-9876543210',
  '+91-9876543210',
  'rajesh@email.com',
  '123 Main Street, Sector 15',
  'Delhi',
  '110001',
  null,
  100000,
  0,
  0,
  0,
  '11111111-1111-1111-1111-111111111111'
),
(
  '44444444-4444-4444-4444-444444444444',
  'CUST002',
  'Priya Sharma',
  '+91-9876543211',
  '+91-9876543211',
  'priya@email.com',
  '456 Garden Road, Model Town',
  'Delhi',
  '110009',
  null,
  75000,
  0,
  0,
  0,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO NOTHING;

-- Add some sample products if they don't exist
INSERT INTO products (
  id,
  product_code,
  name,
  category,
  description,
  brand,
  color,
  material,
  price,
  rental_price,
  security_deposit,
  stock_total,
  stock_available,
  stock_booked,
  stock_maintenance,
  usage_count,
  condition_rating,
  purchase_date,
  purchase_cost,
  supplier_name,
  warranty_expiry,
  last_maintenance,
  next_maintenance,
  location,
  barcode,
  qr_code,
  images,
  is_active,
  franchise_id
) VALUES 
(
  '55555555-5555-5555-5555-555555555555',
  'SHW001',
  'Elegant Bridal Lehenga',
  'Bridal Wear',
  'Beautiful red and gold bridal lehenga with heavy embroidery',
  'Designer Collection',
  'Red & Gold',
  'Silk & Velvet',
  150000,
  15000,
  25000,
  5,
  4,
  1,
  0,
  12,
  9.5,
  '2023-01-15',
  120000,
  'Mumbai Textiles',
  '2025-01-15',
  '2023-12-01',
  '2024-06-01',
  'Rack A1',
  'SHW001BAR',
  'SHW001QR',
  '[]',
  true,
  '11111111-1111-1111-1111-111111111111'
),
(
  '66666666-6666-6666-6666-666666666666',
  'JWL001',
  'Gold Plated Necklace Set',
  'Jewelry',
  'Traditional gold plated necklace with matching earrings',
  'Kundan Collection',
  'Gold',
  'Gold Plated',
  25000,
  2500,
  5000,
  10,
  8,
  2,
  0,
  25,
  9.0,
  '2023-02-20',
  20000,
  'Jewelry Mart',
  '2026-02-20',
  '2023-11-15',
  '2024-05-15',
  'Jewelry Cabinet B2',
  'JWL001BAR',
  'JWL001QR',
  '[]',
  true,
  '11111111-1111-1111-1111-111111111111'
),
(
  '77777777-7777-7777-7777-777777777777',
  'DEC001',
  'Wedding Mandap Decoration',
  'Decoration',
  'Complete mandap decoration with flowers and drapes',
  'Floral Dreams',
  'Pink & White',
  'Fabric & Flowers',
  50000,
  8000,
  10000,
  3,
  2,
  1,
  0,
  8,
  8.5,
  '2023-03-10',
  40000,
  'Decoration Supplies',
  '2024-03-10',
  '2023-10-20',
  '2024-04-20',
  'Decoration Store',
  'DEC001BAR',
  'DEC001QR',
  '[]',
  true,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO NOTHING;

-- Update sequences to avoid conflicts
SELECT setval('customers_customer_code_seq', 1000);
SELECT setval('products_product_code_seq', 1000);

-- Verify the setup
SELECT 'Franchises' as table_name, count(*) as count FROM franchises
UNION ALL
SELECT 'Users' as table_name, count(*) as count FROM users
UNION ALL
SELECT 'Customers' as table_name, count(*) as count FROM customers
UNION ALL
SELECT 'Products' as table_name, count(*) as count FROM products;
