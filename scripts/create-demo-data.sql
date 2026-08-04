-- Create comprehensive demo data for testing
-- Run this script in Supabase SQL Editor after the main schema

-- Create additional sample customers
INSERT INTO customers (
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
  'CUST003',
  'Amit Patel',
  '+91-9876543212',
  '+91-9876543212',
  'amit@email.com',
  '789 Park Avenue, Connaught Place',
  'Delhi',
  '110001',
  null,
  150000,
  0,
  0,
  0,
  '11111111-1111-1111-1111-111111111111'
),
(
  'CUST004',
  'Sneha Gupta',
  '+91-9876543213',
  '+91-9876543213',
  'sneha@email.com',
  '321 Rose Garden, Lajpat Nagar',
  'Delhi',
  '110024',
  null,
  80000,
  0,
  0,
  0,
  '11111111-1111-1111-1111-111111111111'
),
(
  'CUST005',
  'Vikram Singh',
  '+91-9876543214',
  '+91-9876543214',
  'vikram@email.com',
  '654 Green Park, South Delhi',
  'Delhi',
  '110016',
  null,
  200000,
  0,
  0,
  0,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (customer_code) DO NOTHING;

-- Create additional sample products
INSERT INTO products (
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
  'SHW002',
  'Designer Groom Sherwani',
  'Groom Wear',
  'Royal blue sherwani with golden embroidery',
  'Royal Collection',
  'Blue & Gold',
  'Silk',
  80000,
  8000,
  15000,
  8,
  6,
  2,
  0,
  18,
  9.2,
  '2023-01-20',
  65000,
  'Delhi Textiles',
  '2025-01-20',
  '2023-12-05',
  '2024-06-05',
  'Rack B1',
  'SHW002BAR',
  'SHW002QR',
  '[]',
  true,
  '11111111-1111-1111-1111-111111111111'
),
(
  'JWL002',
  'Diamond Studded Earrings',
  'Jewelry',
  'Elegant diamond studded earrings for special occasions',
  'Diamond Collection',
  'Silver',
  'Silver & Diamond',
  45000,
  4500,
  8000,
  6,
  5,
  1,
  0,
  15,
  9.8,
  '2023-02-25',
  38000,
  'Diamond House',
  '2026-02-25',
  '2023-11-20',
  '2024-05-20',
  'Jewelry Cabinet A1',
  'JWL002BAR',
  'JWL002QR',
  '[]',
  true,
  '11111111-1111-1111-1111-111111111111'
),
(
  'DEC002',
  'Stage Backdrop Setup',
  'Decoration',
  'Beautiful stage backdrop with lighting and flowers',
  'Stage Craft',
  'Multi-color',
  'Fabric & Lights',
  75000,
  12000,
  15000,
  2,
  1,
  1,
  0,
  6,
  8.8,
  '2023-03-15',
  60000,
  'Stage Suppliers',
  '2024-03-15',
  '2023-10-25',
  '2024-04-25',
  'Decoration Store',
  'DEC002BAR',
  'DEC002QR',
  '[]',
  true,
  '11111111-1111-1111-1111-111111111111'
),
(
  'ACC001',
  'Bridal Makeup Kit',
  'Accessories',
  'Complete bridal makeup kit with premium products',
  'Beauty Pro',
  'Multi-color',
  'Cosmetics',
  15000,
  1500,
  2000,
  12,
  10,
  2,
  0,
  30,
  9.0,
  '2023-04-01',
  12000,
  'Beauty Supplies',
  '2024-04-01',
  '2023-12-10',
  '2024-06-10',
  'Accessories Shelf C1',
  'ACC001BAR',
  'ACC001QR',
  '[]',
  true,
  '11111111-1111-1111-1111-111111111111'
),
(
  'FUR001',
  'Wedding Seating Arrangement',
  'Furniture',
  'Elegant chairs and tables for wedding ceremony',
  'Event Furniture',
  'Golden',
  'Wood & Metal',
  100000,
  5000,
  8000,
  50,
  45,
  5,
  0,
  20,
  8.5,
  '2023-01-10',
  80000,
  'Furniture Mart',
  '2025-01-10',
  '2023-11-30',
  '2024-05-30',
  'Furniture Warehouse',
  'FUR001BAR',
  'FUR001QR',
  '[]',
  true,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (product_code) DO NOTHING;

-- Create a sample booking with items
DO $$
DECLARE
    booking_id uuid;
    customer_id uuid;
    product1_id uuid;
    product2_id uuid;
    product3_id uuid;
BEGIN
    -- Get customer ID
    SELECT id INTO customer_id FROM customers WHERE customer_code = 'CUST001' LIMIT 1;
    
    -- Get product IDs
    SELECT id INTO product1_id FROM products WHERE product_code = 'SHW001' LIMIT 1;
    SELECT id INTO product2_id FROM products WHERE product_code = 'JWL001' LIMIT 1;
    SELECT id INTO product3_id FROM products WHERE product_code = 'DEC001' LIMIT 1;
    
    -- Create booking
    INSERT INTO bookings (
        booking_number,
        customer_id,
        franchise_id,
        type,
        event_type,
        payment_type,
        total_amount,
        discount_amount,
        tax_amount,
        security_deposit,
        amount_paid,
        pending_amount,
        refund_amount,
        status,
        priority,
        event_date,
        delivery_date,
        pickup_date,
        groom_name,
        bride_name,
        venue_name,
        venue_address,
        special_instructions,
        invoice_generated,
        whatsapp_sent,
        created_by
    ) VALUES (
        'REN' || EXTRACT(EPOCH FROM NOW())::bigint,
        customer_id,
        '11111111-1111-1111-1111-111111111111',
        'rental',
        'wedding',
        'advance',
        29440, -- Total after tax
        0,
        4440, -- 18% tax
        35000, -- Security deposit
        14720, -- 50% advance
        14720, -- Remaining 50%
        0,
        'confirmed',
        1,
        CURRENT_DATE + INTERVAL '30 days',
        CURRENT_DATE + INTERVAL '28 days',
        CURRENT_DATE + INTERVAL '32 days',
        'Rajesh Kumar',
        'Priya Sharma',
        'Grand Palace Hotel',
        '123 Wedding Street, Delhi - 110001',
        'Please ensure all items are delivered by 10 AM',
        false,
        false,
        '22222222-2222-2222-2222-222222222222'
    ) RETURNING id INTO booking_id;
    
    -- Create booking items
    INSERT INTO booking_items (
        booking_id,
        product_id,
        quantity,
        unit_price,
        discount_percent,
        total_price,
        security_deposit,
        damage_cost,
        cleaning_required
    ) VALUES 
    (
        booking_id,
        product1_id,
        1,
        15000,
        0,
        15000,
        25000,
        0,
        false
    ),
    (
        booking_id,
        product2_id,
        1,
        2500,
        0,
        2500,
        5000,
        0,
        false
    ),
    (
        booking_id,
        product3_id,
        1,
        8000,
        0,
        8000,
        10000,
        0,
        false
    );
    
    -- Update customer stats
    UPDATE customers 
    SET 
        total_bookings = total_bookings + 1,
        total_spent = total_spent + 29440
    WHERE id = customer_id;
    
    RAISE NOTICE 'Sample booking created with ID: %', booking_id;
END $$;

-- Create additional staff members
INSERT INTO users (
  name,
  email,
  role,
  franchise_id,
  is_active
) VALUES 
(
  'Manager Singh',
  'manager@safawala.com',
  'manager',
  '11111111-1111-1111-1111-111111111111',
  true
),
(
  'Admin Kumar',
  'admin@safawala.com',
  'admin',
  '11111111-1111-1111-1111-111111111111',
  true
),
(
  'Staff Sharma',
  'staff2@safawala.com',
  'staff',
  '11111111-1111-1111-1111-111111111111',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Final verification
SELECT 
    'Setup Complete!' as status,
    (SELECT count(*) FROM franchises) as franchises,
    (SELECT count(*) FROM users) as users,
    (SELECT count(*) FROM customers) as customers,
    (SELECT count(*) FROM products) as products,
    (SELECT count(*) FROM bookings) as bookings,
    (SELECT count(*) FROM booking_items) as booking_items;
