-- Migration: Convert 15 old permissions to 22 new individual page permissions
-- This script maps old generic permissions to new specific page permissions

-- Function to migrate permissions
CREATE OR REPLACE FUNCTION migrate_user_permissions()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  old_perms jsonb;
  new_perms jsonb;
BEGIN
  -- Loop through all users
  FOR user_record IN SELECT id, permissions, role FROM users WHERE permissions IS NOT NULL
  LOOP
    old_perms := user_record.permissions;
    
    -- Build new permissions structure based on old permissions
    new_perms := jsonb_build_object(
      -- Main Navigation (direct mapping)
      'dashboard', COALESCE((old_perms->>'dashboard')::boolean, false),
      'bookings', COALESCE((old_perms->>'bookings')::boolean, false),
      'customers', COALESCE((old_perms->>'customers')::boolean, false),
      'inventory', COALESCE((old_perms->>'inventory')::boolean, false),
      
      -- New main navigation items (map from old permissions)
      'packages', COALESCE((old_perms->>'inventory')::boolean, false),  -- packages uses inventory permission
      'vendors', COALESCE((old_perms->>'purchases')::boolean, false),    -- vendors uses purchases permission
      
      -- Business Operations
      'quotes', COALESCE((old_perms->>'sales')::boolean, false),         -- quotes uses sales permission
      'invoices', COALESCE((old_perms->>'invoices')::boolean, false),
      'laundry', COALESCE((old_perms->>'laundry')::boolean, false),
      'expenses', COALESCE((old_perms->>'expenses')::boolean, false),
      'deliveries', COALESCE((old_perms->>'deliveries')::boolean, false),
      'productArchive', COALESCE((old_perms->>'inventory')::boolean, false), -- product archive uses inventory
      'payroll', COALESCE((old_perms->>'financials')::boolean, false),       -- payroll uses financials
      'attendance', COALESCE((old_perms->>'dashboard')::boolean, false),     -- attendance uses dashboard
      
      -- Analytics & Reports
      'reports', COALESCE((old_perms->>'reports')::boolean, false),
      'financials', COALESCE((old_perms->>'financials')::boolean, false),
      
      -- Administration
      'franchises', COALESCE((old_perms->>'franchises')::boolean, false),
      'staff', COALESCE((old_perms->>'staff')::boolean, false),
      'integrations', COALESCE((old_perms->>'settings')::boolean, false),   -- integrations uses settings
      'settings', COALESCE((old_perms->>'settings')::boolean, false)
    );
    
    -- Update user with new permissions
    UPDATE users 
    SET permissions = new_perms,
        updated_at = NOW()
    WHERE id = user_record.id;
    
    RAISE NOTICE 'Migrated permissions for user: %', user_record.id;
  END LOOP;
  
  RAISE NOTICE 'Permission migration completed successfully!';
END;
$$ LANGUAGE plpgsql;

-- Execute the migration
SELECT migrate_user_permissions();

-- Drop the function after use
DROP FUNCTION migrate_user_permissions();

-- Verify migration
SELECT 
  id,
  email,
  role,
  jsonb_object_keys(permissions) as permission_keys
FROM users 
WHERE permissions IS NOT NULL
ORDER BY email;

-- Show permission counts per user
SELECT 
  email,
  role,
  (SELECT COUNT(*) FROM jsonb_each(permissions) WHERE value::text = 'true') as enabled_permissions,
  (SELECT COUNT(*) FROM jsonb_each(permissions) WHERE value::text = 'false') as disabled_permissions
FROM users
WHERE permissions IS NOT NULL
ORDER BY email;
