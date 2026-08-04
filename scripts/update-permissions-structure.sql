-- Ensure permissions structure matches the updated requirements

DO $$ 
BEGIN
    -- Add permissions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'permissions') THEN
        ALTER TABLE users ADD COLUMN permissions JSONB DEFAULT '{}';
    END IF;
END $$;

-- Update existing users with default permissions based on their role
UPDATE users SET permissions = 
CASE 
    WHEN role = 'super_admin' THEN '{
        "dashboard": true,
        "bookings": true,
        "customers": true,
        "inventory": true,
        "sales": true,
        "laundry": true,
        "purchases": true,
        "expenses": true,
        "deliveries": true,
        "reports": true,
        "financials": true,
        "invoices": true,
        "franchises": true,
        "staff": true,
        "settings": true
    }'::jsonb
    WHEN role = 'franchise_admin' THEN '{
        "dashboard": true,
        "bookings": true,
        "customers": true,
        "inventory": true,
        "sales": true,
        "laundry": true,
        "purchases": true,
        "expenses": true,
        "deliveries": true,
        "reports": true,
        "financials": true,
        "invoices": true,
        "franchises": false,
        "staff": true,
        "settings": false
    }'::jsonb
    WHEN role = 'staff' THEN '{
        "dashboard": true,
        "bookings": true,
        "customers": true,
        "inventory": true,
        "sales": false,
        "laundry": true,
        "purchases": false,
        "expenses": false,
        "deliveries": true,
        "reports": false,
        "financials": false,
        "invoices": true,
        "franchises": false,
        "staff": false,
        "settings": false
    }'::jsonb
    ELSE '{
        "dashboard": true,
        "bookings": false,
        "customers": false,
        "inventory": false,
        "sales": false,
        "laundry": false,
        "purchases": false,
        "expenses": false,
        "deliveries": false,
        "reports": false,
        "financials": false,
        "invoices": false,
        "franchises": false,
        "staff": false,
        "settings": false
    }'::jsonb
END
WHERE permissions IS NULL OR permissions = '{}';

-- Create index for better performance on permissions queries
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions);

-- Create function to check user permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, permission_name TEXT) 
RETURNS BOOLEAN AS $$
DECLARE
    user_perms JSONB;
    user_role TEXT;
BEGIN
    -- Get user's permissions and role
    SELECT permissions, role INTO user_perms, user_role
    FROM users
    WHERE id = user_id;
    
    -- Super admin always has all permissions
    IF user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if the specific permission is granted
    RETURN COALESCE((user_perms ->> permission_name)::BOOLEAN, FALSE);
END;
$$ LANGUAGE plpgsql;