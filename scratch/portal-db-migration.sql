-- Safawala Portal DB Migration
-- Run in Supabase SQL Editor

-- 1. Add department column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT DEFAULT NULL;

-- 2. Update existing staff based on their role
UPDATE users SET department = 'admin' WHERE role = 'super_admin' AND department IS NULL;
UPDATE users SET department = 'manager' WHERE role = 'franchise_admin' AND department IS NULL;

-- 3. Add check constraint for valid departments
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_check;
ALTER TABLE users ADD CONSTRAINT users_department_check
  CHECK (department IS NULL OR department IN (
    'admin', 'manager', 'booking', 'warehouse', 'qc',
    'delivery', 'styling', 'accounts', 'franchise'
  ));

-- 4. Index for fast department lookups
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- 5. Example: Set department for existing staff (run selectively)
-- UPDATE users SET department = 'booking' WHERE role = 'booking_staff';
-- UPDATE users SET department = 'warehouse' WHERE role = 'warehouse_staff';
-- UPDATE users SET department = 'qc' WHERE role = 'qc_staff';
-- UPDATE users SET department = 'delivery' WHERE role = 'delivery_staff';
-- UPDATE users SET department = 'styling' WHERE role = 'styling_staff';
-- UPDATE users SET department = 'accounts' WHERE role = 'accounts_staff';
-- UPDATE users SET department = 'franchise' WHERE role = 'franchise_owner';

-- Verify
SELECT id, name, email, role, department FROM users ORDER BY department NULLS LAST;
