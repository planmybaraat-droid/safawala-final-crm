-- Check new@safawala.com permissions
SELECT 
  name,
  email,
  role,
  permissions,
  franchise_id,
  is_active
FROM users 
WHERE email = 'new@safawala.com';
