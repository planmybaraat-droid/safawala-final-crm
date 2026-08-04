-- Add permissions system to users table
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
    WHEN role = 'admin' THEN '{
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
    WHEN role = 'manager' THEN '{
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
        "staff": true,
        "settings": false,
        "franchises": false
    }'::jsonb
    ELSE '{
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
        "staff": false,
        "settings": false,
        "franchises": false
    }'::jsonb
END
WHERE permissions IS NULL OR permissions = '{}';

-- Create index for better performance on permissions queries
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions);
