-- Create a sample booking that will demonstrate automatic invoice generation
-- This script creates a booking and manually triggers invoice creation to show the workflow

-- First, ensure we have a customer
INSERT INTO customers (
  id,
  customer_code,
  name,
  phone,
  email,
  address,
  city,
  state,
  pincode,
  franchise_id,
  credit_limit,
  outstanding_balance,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'CUST-001',
  'Rajesh Kumar',
  '+91-9876543210',
  'rajesh.kumar@email.com',
  '123 MG Road, Sector 15',
  'Gurgaon',
  'Haryana',
  '122001',
  (SELECT id FROM franchises LIMIT 1),
  50000,
  0,
  true,
  NOW(),
  NOW()
) ON CONFLICT (phone) DO NOTHING;

-- Get the customer ID
WITH customer_data AS (
  SELECT id as customer_id FROM customers WHERE phone = '+91-9876543210' LIMIT 1
),
franchise_data AS (
  SELECT id as franchise_id FROM franchises LIMIT 1
),
user_data AS (
  SELECT id as user_id FROM users LIMIT 1
),
-- Create a sample booking
booking_insert AS (
  INSERT INTO bookings (
    id,
    booking_number,
    customer_id,
    franchise_id,
    event_type,
    event_date,
    delivery_date,
    return_date,
    venue_name,
    venue_address,
    groom_name,
    bride_name,
    event_for,
    total_amount,
    tax_amount,
    discount_amount,
    security_deposit,
    special_instructions,
    notes,
    status,
    type,
    payment_type,
    amount_paid,
    pending_amount,
    created_by,
    priority,
    invoice_generated,
    whatsapp_sent,
    created_at,
    updated_at
  )
  SELECT 
    gen_random_uuid(),
    'BK-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(DOY FROM NOW())::text, 3, '0') || '-001',
    customer_data.customer_id,
    franchise_data.franchise_id,
    'Wedding',
    (CURRENT_DATE + INTERVAL '30 days'),
    (CURRENT_DATE + INTERVAL '29 days'),
    (CURRENT_DATE + INTERVAL '31 days'),
    'Grand Palace Hotel',
    'Sector 29, Gurgaon, Haryana',
    'Rajesh Kumar',
    'Priya Sharma',
    'Wedding Reception',
    45000.00,
    8100.00,
    2000.00,
    5000.00,
    'Handle with extra care. Premium wedding setup required.',
    'Sample booking created for invoice demonstration',
    'confirmed',
    'rental',
    'partial',
    15000.00,
    30000.00,
    user_data.user_id,
    1,
    false,
    false,
    NOW(),
    NOW()
  FROM customer_data, franchise_data, user_data
  RETURNING id, booking_number, customer_id, total_amount
),
-- Create booking items
booking_items_insert AS (
  INSERT INTO booking_items (
    booking_id,
    product_id,
    quantity,
    unit_price,
    total_price,
    security_deposit,
    discount_percent,
    condition_on_delivery,
    condition_on_return,
    cleaning_required,
    damage_cost
  )
  SELECT 
    booking_insert.id,
    products.id,
    CASE 
      WHEN products.name ILIKE '%chair%' THEN 50
      WHEN products.name ILIKE '%table%' THEN 10
      ELSE 5
    END as quantity,
    CASE 
      WHEN products.name ILIKE '%chair%' THEN 200.00
      WHEN products.name ILIKE '%table%' THEN 800.00
      ELSE 500.00
    END as unit_price,
    CASE 
      WHEN products.name ILIKE '%chair%' THEN 10000.00
      WHEN products.name ILIKE '%table%' THEN 8000.00
      ELSE 2500.00
    END as total_price,
    100.00 as security_deposit,
    0 as discount_percent,
    NULL,
    NULL,
    false,
    0
  FROM booking_insert, products 
  WHERE products.is_active = true 
  LIMIT 3
  RETURNING booking_id
),
-- Create invoice from the booking
invoice_insert AS (
  INSERT INTO invoices (
    id,
    invoice_number,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    issue_date,
    due_date,
    subtotal_amount,
    tax_amount,
    discount_amount,
    total_amount,
    paid_amount,
    balance_amount,
    status,
    notes,
    terms_conditions,
    booking_id,
    customer_id,
    created_at,
    updated_at
  )
  SELECT 
    gen_random_uuid(),
    'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(DOY FROM NOW())::text, 3, '0') || '-001',
    customers.name,
    customers.email,
    customers.phone,
    customers.address || ', ' || customers.city || ', ' || customers.state || ' - ' || customers.pincode,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '15 days'),
    (booking_insert.total_amount - 8100.00), -- subtotal (total - tax)
    8100.00, -- tax amount
    2000.00, -- discount
    booking_insert.total_amount,
    15000.00, -- paid amount
    (booking_insert.total_amount - 15000.00), -- balance
    'sent',
    'Generated from booking ' || booking_insert.booking_number,
    'Payment due within 15 days. Late payment charges applicable.',
    booking_insert.id,
    booking_insert.customer_id,
    NOW(),
    NOW()
  FROM booking_insert, customers
  WHERE customers.id = booking_insert.customer_id
  RETURNING id, invoice_number
),
-- Create invoice items from booking items
invoice_items_insert AS (
  INSERT INTO invoice_items (
    invoice_id,
    item_name,
    description,
    quantity,
    unit_price,
    line_total
  )
  SELECT 
    invoice_insert.id,
    products.name,
    products.product_code || ' - Quantity: ' || booking_items.quantity,
    booking_items.quantity,
    booking_items.unit_price,
    booking_items.total_price
  FROM invoice_insert, booking_items_insert
  JOIN booking_items ON booking_items.booking_id = booking_items_insert.booking_id
  JOIN products ON products.id = booking_items.product_id
  RETURNING invoice_id
)
-- Update booking to mark invoice as generated
UPDATE bookings 
SET invoice_generated = true, updated_at = NOW()
FROM booking_insert
WHERE bookings.id = booking_insert.id;

-- Display success message
SELECT 
  'Sample booking and invoice created successfully!' as message,
  b.booking_number,
  i.invoice_number,
  c.name as customer_name
FROM bookings b
JOIN invoices i ON i.booking_id = b.id
JOIN customers c ON c.id = b.customer_id
WHERE b.booking_number LIKE 'BK-' || TO_CHAR(NOW(), 'YYYY') || '%'
ORDER BY b.created_at DESC
LIMIT 1;
