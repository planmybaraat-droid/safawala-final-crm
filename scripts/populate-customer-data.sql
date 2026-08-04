-- Script to populate customer management related tables with test data

-- 1. First ensure we have franchises
INSERT INTO franchises (
  name, 
  code, 
  address, 
  city, 
  state, 
  pincode, 
  phone, 
  email, 
  owner_name
)
VALUES
  ('Safawala Main Branch', 'MAIN001', 'Linking Road, Bandra West', 'Mumbai', 'Maharashtra', '400050', '+91 9876543210', 'main@safawala.com', 'Suresh Pithara'),
  ('Safawala Delhi Branch', 'DEL001', 'Connaught Place', 'Delhi', 'Delhi', '110001', '+91 9876543211', 'delhi@safawala.com', 'Rakesh Kumar'),
  ('Safawala Bangalore Branch', 'BLR001', 'MG Road', 'Bangalore', 'Karnataka', '560001', '+91 9876543212', 'blr@safawala.com', 'Mahesh Narayan')
ON CONFLICT (code) DO NOTHING
RETURNING id;

-- 2. Create staff users for each franchise
WITH franchise_ids AS (
  SELECT id, code FROM franchises WHERE code IN ('MAIN001', 'DEL001', 'BLR001')
)
INSERT INTO users (
  email,
  first_name,
  last_name,
  role,
  password_hash, -- Note: In production, you should use proper password hashing
  is_active,
  franchise_id
)
SELECT
  CASE f.code
    WHEN 'MAIN001' THEN 'staff_' || i || '@main.safawala.com'
    WHEN 'DEL001' THEN 'staff_' || i || '@delhi.safawala.com'
    WHEN 'BLR001' THEN 'staff_' || i || '@blr.safawala.com'
  END as email,
  CASE 
    WHEN i % 3 = 0 THEN 'Rahul'
    WHEN i % 3 = 1 THEN 'Priya'
    ELSE 'Amit'
  END as first_name,
  CASE 
    WHEN i % 4 = 0 THEN 'Sharma'
    WHEN i % 4 = 1 THEN 'Patel'
    WHEN i % 4 = 2 THEN 'Singh'
    ELSE 'Reddy'
  END as last_name,
  CASE
    WHEN i % 5 = 0 THEN 'franchise_admin'
    ELSE 'staff'
  END as role,
  '$2a$10$EjHpVi0mdZcDnBnLLU9By.wCT9GS87MpQBXS1I5tQZGAzA6YlTJQa', -- dummy hash
  true,
  f.id
FROM 
  franchise_ids f,
  generate_series(1, 3) as i -- Create 3 staff per franchise
ON CONFLICT (email) DO NOTHING;

-- 3. Create customers for each franchise
WITH franchise_ids AS (
  SELECT id, code FROM franchises WHERE code IN ('MAIN001', 'DEL001', 'BLR001')
)
INSERT INTO customers (
  customer_code,
  name,
  phone,
  email,
  address,
  city,
  state,
  pincode,
  franchise_id,
  created_at,
  updated_at,
  status
)
SELECT
  'CUST' || lpad(((row_number() OVER ()) + 1000)::text, 4, '0'),
  CASE 
    WHEN i % 5 = 0 THEN 'Raj' 
    WHEN i % 5 = 1 THEN 'Aamir' 
    WHEN i % 5 = 2 THEN 'Sunita' 
    WHEN i % 5 = 3 THEN 'Pooja'
    ELSE 'Vikram'
  END || ' ' ||
  CASE 
    WHEN i % 4 = 0 THEN 'Shah' 
    WHEN i % 4 = 1 THEN 'Kapoor' 
    WHEN i % 4 = 2 THEN 'Agarwal' 
    ELSE 'Mehra'
  END as name,
  '+91 98765' || lpad(((i + 10000) % 100000)::text, 5, '0'),
  CASE 
    WHEN i % 5 = 0 THEN 'raj'
    WHEN i % 5 = 1 THEN 'aamir'
    WHEN i % 5 = 2 THEN 'sunita'
    WHEN i % 5 = 3 THEN 'pooja'
    ELSE 'vikram'
  END || '.' ||
  CASE 
    WHEN i % 4 = 0 THEN 'shah'
    WHEN i % 4 = 1 THEN 'kapoor'
    WHEN i % 4 = 2 THEN 'agarwal'
    ELSE 'mehra'
  END || i || '@example.com',
  CASE 
    WHEN f.code = 'MAIN001' THEN i || ' Bandra Link Road'
    WHEN f.code = 'DEL001' THEN i || ' Connaught Place'
    ELSE i || ' MG Road'
  END,
  CASE 
    WHEN f.code = 'MAIN001' THEN 'Mumbai'
    WHEN f.code = 'DEL001' THEN 'Delhi'
    ELSE 'Bangalore'
  END,
  CASE 
    WHEN f.code = 'MAIN001' THEN 'Maharashtra'
    WHEN f.code = 'DEL001' THEN 'Delhi'
    ELSE 'Karnataka'
  END,
  CASE 
    WHEN f.code = 'MAIN001' THEN '400050'
    WHEN f.code = 'DEL001' THEN '110001'
    ELSE '560001'
  END,
  f.id,
  NOW() - (i || ' days')::interval,
  NOW() - (i || ' days')::interval,
  CASE
    WHEN i % 10 = 0 THEN 'inactive'
    ELSE 'active'
  END
FROM 
  franchise_ids f,
  generate_series(1, 10) as i -- Create 10 customers per franchise
ON CONFLICT (customer_code) DO NOTHING;

-- 4. Assign staff to customers
WITH staff_data AS (
  SELECT u.id AS staff_id, f.id AS franchise_id
  FROM users u
  JOIN franchises f ON u.franchise_id = f.id
  WHERE u.role IN ('staff', 'franchise_admin')
),
customer_data AS (
  SELECT c.id AS customer_id, c.franchise_id
  FROM customers c
)
INSERT INTO customer_staff_assignments (
  customer_id,
  staff_id,
  role,
  assigned_at
)
SELECT 
  c.customer_id,
  s.staff_id,
  CASE WHEN random() < 0.7 THEN 'primary' ELSE 'support' END,
  NOW() - (floor(random() * 30) || ' days')::interval
FROM 
  customer_data c
JOIN 
  staff_data s ON c.franchise_id = s.franchise_id
WHERE 
  random() < 0.8 -- Assign staff to about 80% of customers
ON CONFLICT (customer_id, staff_id, role) DO NOTHING;

-- 5. Add some customer notes
WITH staff_customers AS (
  SELECT 
    a.customer_id, 
    a.staff_id
  FROM customer_staff_assignments a
)
INSERT INTO customer_notes (
  customer_id,
  created_by,
  note,
  created_at
)
SELECT
  sc.customer_id,
  sc.staff_id,
  CASE floor(random() * 5)
    WHEN 0 THEN 'Customer requested wedding accessories catalog'
    WHEN 1 THEN 'Discussed bridal package options'
    WHEN 2 THEN 'Followed up on previous order'
    WHEN 3 THEN 'Customer interested in bulk order for family function'
    ELSE 'Provided discount quote for complete wedding package'
  END,
  NOW() - (floor(random() * 30) || ' days')::interval
FROM 
  staff_customers sc
WHERE 
  random() < 0.6 -- Add notes to about 60% of assignments
ON CONFLICT DO NOTHING;

-- 6. Add some customer activity logs
WITH staff_customers AS (
  SELECT 
    a.customer_id, 
    a.staff_id
  FROM customer_staff_assignments a
)
INSERT INTO customer_activity_logs (
  customer_id,
  user_id,
  activity_type,
  description,
  created_at
)
SELECT
  sc.customer_id,
  sc.staff_id,
  CASE floor(random() * 4)
    WHEN 0 THEN 'PHONE_CALL'
    WHEN 1 THEN 'EMAIL'
    WHEN 2 THEN 'VISIT'
    ELSE 'WHATSAPP'
  END,
  CASE floor(random() * 4)
    WHEN 0 THEN 'Initial contact made with customer'
    WHEN 1 THEN 'Followed up on quote request'
    WHEN 2 THEN 'Discussed product options'
    ELSE 'Resolved customer inquiry'
  END,
  NOW() - (floor(random() * 30) || ' days')::interval
FROM 
  staff_customers sc
WHERE 
  random() < 0.7 -- Add activity logs to about 70% of assignments
ON CONFLICT DO NOTHING;

-- 7. Update the customers with assigned_staff_id based on primary assignments
UPDATE customers c
SET assigned_staff_id = a.staff_id
FROM customer_staff_assignments a
WHERE c.id = a.customer_id AND a.role = 'primary'
AND c.assigned_staff_id IS NULL;

-- 8. Update last_contact_date for customers based on activity logs
UPDATE customers c
SET last_contact_date = (
  SELECT MAX(created_at)
  FROM customer_activity_logs
  WHERE customer_id = c.id
)
WHERE EXISTS (
  SELECT 1
  FROM customer_activity_logs
  WHERE customer_id = c.id
);