-- 2. Insert 30 customers that link to your franchise
WITH main_franchise AS (
  SELECT id AS franchise_id
  FROM franchises 
  WHERE code = 'MAIN001'
)
INSERT INTO customers (
  customer_code,
  name,
  phone,
  email,
  address,
  city,
  pincode,
  franchise_id
)
VALUES
  ('CUST001', 'Alice Johnson', '+91 9123456780', 'alice.johnson@example.com', '12 Oak St', 'Mumbai', '400001', (SELECT franchise_id FROM main_franchise)),
  ('CUST002', 'Bob Smith', '+91 9134567891', 'bob.smith@example.com', '23 Maple Ave', 'Delhi', '110001', (SELECT franchise_id FROM main_franchise)),
  ('CUST003', 'Charlie Davis', '+91 9145678902', 'charlie.davis@example.com', '34 Pine Rd', 'Bangalore', '560001', (SELECT franchise_id FROM main_franchise)),
  ('CUST004', 'Diana Evans', '+91 9156789013', 'diana.evans@example.com', '45 Cedar Blvd', 'Chennai', '600001', (SELECT franchise_id FROM main_franchise)),
  ('CUST005', 'Ethan Brown', '+91 9167890124', 'ethan.brown@example.com', '56 Oak St', 'Kolkata', '700001', (SELECT franchise_id FROM main_franchise))
ON CONFLICT (customer_code) DO NOTHING
RETURNING id;
