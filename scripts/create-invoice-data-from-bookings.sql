-- Create invoice data from existing bookings
-- This script generates invoices for all confirmed and completed bookings

-- First, ensure we have a default franchise if none exists
INSERT INTO franchises (id, name, address, phone, email, is_active)
SELECT 
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Main Branch',
  '123 Business Street, Mumbai 400001',
  '+91 98765 43210',
  'info@safawala.com',
  true
WHERE NOT EXISTS (SELECT 1 FROM franchises LIMIT 1);

-- Create invoices from bookings that don't already have invoices
INSERT INTO invoices (
  id,
  invoice_number,
  booking_id,
  customer_id,
  customer_name,
  customer_email,
  customer_phone,
  customer_address,
  issue_date,
  due_date,
  total_amount,
  paid_amount,
  balance_amount,
  status,
  notes,
  franchise_id,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY b.created_at))::text, 3, '0') as invoice_number,
  b.id as booking_id,
  b.customer_id,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  c.address as customer_address,
  CURRENT_DATE as issue_date,
  CURRENT_DATE + INTERVAL '15 days' as due_date,
  COALESCE(b.total_amount, 0) as total_amount,
  CASE 
    WHEN b.status = 'completed' THEN COALESCE(b.total_amount, 0)
    ELSE 0
  END as paid_amount,
  CASE 
    WHEN b.status = 'completed' THEN 0
    ELSE COALESCE(b.total_amount, 0)
  END as balance_amount,
  CASE 
    WHEN b.status = 'completed' THEN 'paid'
    WHEN b.status = 'confirmed' THEN 'sent'
    ELSE 'draft'
  END as status,
  COALESCE(b.notes, 'Invoice generated from booking ' || b.booking_number) as notes,
  (SELECT id FROM franchises LIMIT 1) as franchise_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE b.status IN ('confirmed', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.booking_id = b.id
  );

-- Create invoice items from booking items
INSERT INTO invoice_items (
  id,
  invoice_id,
  product_id,
  product_name,
  description,
  quantity,
  unit_price,
  line_total,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  i.id as invoice_id,
  bi.product_id,
  COALESCE(p.name, bi.product_name, 'Unknown Product') as product_name,
  COALESCE(p.description, bi.notes, '') as description,
  COALESCE(bi.quantity, 1) as quantity,
  COALESCE(bi.unit_price, bi.price, 0) as unit_price,
  COALESCE(bi.total_price, bi.quantity * bi.unit_price, bi.quantity * bi.price, 0) as line_total,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM invoices i
JOIN bookings b ON i.booking_id = b.id
JOIN booking_items bi ON b.id = bi.booking_id
LEFT JOIN products p ON bi.product_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id
);

-- Update booking status to indicate invoice has been generated
UPDATE bookings 
SET invoice_generated = true,
    updated_at = CURRENT_TIMESTAMP
WHERE status IN ('confirmed', 'completed')
  AND EXISTS (
    SELECT 1 FROM invoices i WHERE i.booking_id = bookings.id
  );

-- Create a summary view for invoice analytics (if it doesn't exist)
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
  i.id,
  i.invoice_number,
  i.customer_name,
  i.customer_email,
  i.customer_phone,
  i.issue_date,
  i.due_date,
  i.paid_date,
  i.total_amount,
  i.paid_amount,
  i.balance_amount,
  i.status,
  i.notes,
  b.booking_number,
  b.event_type,
  b.event_date,
  b.groom_name,
  b.bride_name,
  COUNT(ii.id) as item_count,
  COALESCE(SUM(ii.quantity), 0) as total_quantity,
  f.name as franchise_name
FROM invoices i
LEFT JOIN bookings b ON i.booking_id = b.id
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
LEFT JOIN franchises f ON i.franchise_id = f.id
GROUP BY 
  i.id, i.invoice_number, i.customer_name, i.customer_email, i.customer_phone,
  i.issue_date, i.due_date, i.paid_date, i.total_amount, i.paid_amount, 
  i.balance_amount, i.status, i.notes, b.booking_number, b.event_type, 
  b.event_date, b.groom_name, b.bride_name, f.name;

-- Display summary of created invoices
SELECT 
  COUNT(*) as total_invoices_created,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as pending_invoices,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_invoices,
  SUM(total_amount) as total_invoice_value,
  SUM(paid_amount) as total_paid_amount,
  SUM(balance_amount) as total_outstanding
FROM invoices;
