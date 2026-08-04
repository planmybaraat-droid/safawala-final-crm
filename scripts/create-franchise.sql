-- 1. Create a franchise record with all required fields
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
VALUES (
  'Safawala Main Branch',
  'MAIN001',
  '123 Business Park',
  'Mumbai',
  'Maharashtra',
  '400001',
  '+91 9876543210',
  'admin@safawala.com',
  'Super Admin'
)
ON CONFLICT (code) DO NOTHING
RETURNING id;
