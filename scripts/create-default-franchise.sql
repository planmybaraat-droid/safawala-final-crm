-- Create a default franchise for customer creation
INSERT INTO franchises (
  id,
  name,
  code,
  owner_name,
  manager_name,
  phone,
  email,
  address,
  city,
  state,
  pincode,
  is_active,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Franchise',
  'DEFAULT',
  'System Admin',
  'System Manager',
  '+919999999999',
  'admin@safawala.com',
  'Default Address',
  'Default City',
  'Default State',
  '000000',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
