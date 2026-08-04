-- Seed 30 customers into the customers table in Supabase
-- Paste this into your Supabase SQL Editor and run

-- Ensure franchise exists with the specified ID
INSERT INTO franchises (
  id, code, name, address, city, state, pincode, phone, email, owner_name
)
VALUES (
  '5322e8d9-d4d8-4c48-8563-c9785c1cffd0',
  'MAIN001',
  'Safawala Main Branch',
  'Mumbai, Maharashtra',
  'Mumbai',       -- city
  'Maharashtra',  -- state
  '400001',       -- pincode
  '+91 9876543210',
  'admin@safawala.com',
  'Super Admin'   -- owner_name
)
ON CONFLICT (id) DO NOTHING;

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
  ('CUST002', 'Alice Johnson', '+91 9123456780', 'alice.johnson@example.com', '12 Oak St',    'Mumbai',   '400001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST003', 'Bob Smith',       '+91 9134567891', 'bob.smith@example.com',      '23 Maple Ave', 'Delhi',    '110001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST004', 'Charlie Davis',   '+91 9145678902', 'charlie.davis@example.com',  '34 Pine Rd',   'Bangalore','560001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST005', 'Diana Evans',     '+91 9156789013', 'diana.evans@example.com',    '45 Cedar Blvd','Chennai',  '600001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST006', 'Ethan Brown',     '+91 9167890124', 'ethan.brown@example.com',    '56 Oak St',    'Kolkata',  '700001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST007', 'Fiona Clark',     '+91 9178901235', 'fiona.clark@example.com',    '67 Maple Ave', 'Hyderabad','500001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST008', 'George Wilson',   '+91 9189012346', 'george.wilson@example.com',  '78 Pine Rd',   'Pune',     '411001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST009', 'Hannah Moore',    '+91 9190123457', 'hannah.moore@example.com',   '89 Cedar Blvd','Ahmedabad','380001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST010', 'Ian Taylor',      '+91 9201234568', 'ian.taylor@example.com',     '90 Oak St',    'Jaipur',   '302001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST011', 'Julia Anderson',  '+91 9212345679', 'julia.anderson@example.com', '101 Maple Ave','Lucknow',  '226001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST012', 'Kevin Thomas',    '+91 9223456780', 'kevin.thomas@example.com',   '112 Pine Rd',  'Mumbai',   '400001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST013', 'Laura Jackson',   '+91 9234567891', 'laura.jackson@example.com',  '123 Cedar Blvd','Delhi',   '110001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST014', 'Michael White',   '+91 9245678902', 'michael.white@example.com',  '134 Oak St',   'Bangalore','560001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST015', 'Natalie Harris',  '+91 9256789013', 'natalie.harris@example.com', '145 Maple Ave','Chennai', '600001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST016', 'Oliver Martin',   '+91 9267890124', 'oliver.martin@example.com',  '156 Pine Rd',  'Kolkata',  '700001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST017', 'Paula Thompson',  '+91 9278901235', 'paula.thompson@example.com', '167 Cedar Blvd','Hyderabad','500001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST018', 'Quentin Garcia',  '+91 9289012346', 'quentin.garcia@example.com', '178 Oak St',   'Pune',     '411001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST019', 'Rachel Martinez', '+91 9290123457', 'rachel.martinez@example.com','189 Maple Ave','Ahmedabad','380001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST020', 'Steven Robinson', '+91 9301234568', 'steven.robinson@example.com','190 Pine Rd',  'Jaipur',   '302001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST021', 'Tina Lewis',      '+91 9312345679', 'tina.lewis@example.com',     '201 Cedar Blvd','Lucknow', '226001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST022', 'Uma Walker',      '+91 9323456780', 'uma.walker@example.com',     '212 Oak St',   'Mumbai',   '400001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST023', 'Victor Hall',     '+91 9334567891', 'victor.hall@example.com',    '223 Maple Ave','Delhi',   '110001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST024', 'Wendy Allen',     '+91 9345678902', 'wendy.allen@example.com',    '234 Pine Rd',  'Bangalore','560001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST025', 'Xavier Young',    '+91 9356789013', 'xavier.young@example.com',   '245 Cedar Blvd','Chennai', '600001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST026', 'Yvonne King',     '+91 9367890124', 'yvonne.king@example.com',    '256 Oak St',   'Kolkata',  '700001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST027', 'Zachary Wright',  '+91 9378901235', 'zachary.wright@example.com', '267 Maple Ave','Hyderabad','500001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST028', 'Abigail Scott',   '+91 9389012346', 'abigail.scott@example.com',  '278 Pine Rd',  'Pune',     '411001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST029', 'Brandon Green',   '+91 9390123457', 'brandon.green@example.com',  '289 Cedar Blvd','Ahmedabad','380001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST030', 'Catherine Adams', '+91 9401234568', 'catherine.adams@example.com','290 Oak St',   'Jaipur',   '302001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0'),
  ('CUST031', 'Daniel Baker',    '+91 9412345679', 'daniel.baker@example.com',   '301 Maple Ave','Lucknow',  '226001', '5322e8d9-d4d8-4c48-8563-c9785c1cffd0')
ON CONFLICT (customer_code) DO NOTHING;
