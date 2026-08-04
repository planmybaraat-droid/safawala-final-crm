-- FIX USER PERMISSIONS FOR ALL ROLES
-- This script ensures all users have proper default permissions based on their role

-- Step 1: Create default permissions helper function
CREATE OR REPLACE FUNCTION get_default_permissions(user_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  CASE user_role
    WHEN 'super_admin' THEN
      RETURN jsonb_build_object(
        'dashboard', true, 'bookings', true, 'customers', true, 'inventory', true,
        'sales', true, 'laundry', true, 'purchases', true, 'expenses', true,
        'deliveries', true, 'reports', true, 'financials', true, 'invoices', true,
        'franchises', true, 'staff', true, 'settings', true
      );
    WHEN 'franchise_admin' THEN
      RETURN jsonb_build_object(
        'dashboard', true, 'bookings', true, 'customers', true, 'inventory', true,
        'sales', true, 'laundry', true, 'purchases', true, 'expenses', true,
        'deliveries', true, 'reports', true, 'financials', true, 'invoices', true,
        'franchises', false, 'staff', true, 'settings', true
      );
    WHEN 'staff' THEN
      RETURN jsonb_build_object(
        'dashboard', true, 'bookings', true, 'customers', true, 'inventory', true,
        'sales', true, 'laundry', true, 'purchases', false, 'expenses', false,
        'deliveries', true, 'reports', false, 'financials', false, 'invoices', true,
        'franchises', false, 'staff', false, 'settings', false
      );
    WHEN 'readonly' THEN
      RETURN jsonb_build_object(
        'dashboard', true, 'bookings', true, 'customers', true, 'inventory', true,
        'sales', false, 'laundry', false, 'purchases', false, 'expenses', false,
        'deliveries', true, 'reports', true, 'financials', false, 'invoices', false,
        'franchises', false, 'staff', false, 'settings', false
      );
    ELSE
      RETURN jsonb_build_object(
        'dashboard', true, 'bookings', false, 'customers', false, 'inventory', false,
        'sales', false, 'laundry', false, 'purchases', false, 'expenses', false,
        'deliveries', false, 'reports', false, 'financials', false, 'invoices', false,
        'franchises', false, 'staff', false, 'settings', false
      );
  END CASE;
END;
$$;

-- Step 2: Update all users with NULL or missing permissions
UPDATE users
SET permissions = get_default_permissions(role),
    updated_at = NOW()
WHERE permissions IS NULL OR permissions = '{}'::jsonb;

-- Step 3: Fix Ritesh Deshmukh specifically (ensure he has correct permissions)
UPDATE users
SET 
  permissions = get_default_permissions(role),
  updated_at = NOW()
WHERE email ILIKE '%ritesh%' OR name ILIKE '%ritesh%';

-- Step 4: Verify the changes
SELECT 
  id,
  name,
  email,
  role,
  franchise_id,
  is_active,
  permissions
FROM users
WHERE email ILIKE '%ritesh%' OR name ILIKE '%ritesh%'
ORDER BY created_at DESC;

-- Step 5: Show summary of all users with their permissions
SELECT 
  role,
  COUNT(*) as user_count,
  COUNT(CASE WHEN permissions IS NOT NULL AND permissions != '{}'::jsonb THEN 1 END) as with_permissions,
  COUNT(CASE WHEN permissions IS NULL OR permissions = '{}'::jsonb THEN 1 END) as without_permissions
FROM users
WHERE is_active = true
GROUP BY role
ORDER BY 
  CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'franchise_admin' THEN 2
    WHEN 'staff' THEN 3
    WHEN 'readonly' THEN 4
    ELSE 5
  END;
