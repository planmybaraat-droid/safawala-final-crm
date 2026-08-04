-- Create users table with permissions system
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'franchise_admin', 'staff', 'readonly')),
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger for users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_franchise_id ON users(franchise_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions);

-- Add RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view users in their franchise
DROP POLICY IF EXISTS "Users can view users in their franchise" ON users;
CREATE POLICY "Users can view users in their franchise" ON users
    FOR SELECT USING (
        auth.uid()::text IN (
            SELECT id::text FROM users WHERE franchise_id = users.franchise_id
        )
    );

-- Policy: Admins and franchise_admins can insert users in their franchise
DROP POLICY IF EXISTS "Admins and franchise_admins can insert users" ON users;
CREATE POLICY "Admins and franchise_admins can insert users" ON users
    FOR INSERT WITH CHECK (
        auth.uid()::text IN (
            SELECT id::text FROM users 
            WHERE franchise_id = users.franchise_id 
            AND role IN ('super_admin', 'franchise_admin')
        )
    );

-- Policy: Admins and franchise_admins can update users in their franchise
DROP POLICY IF EXISTS "Admins and franchise_admins can update users" ON users;
CREATE POLICY "Admins and franchise_admins can update users" ON users
    FOR UPDATE USING (
        auth.uid()::text IN (
            SELECT id::text FROM users 
            WHERE franchise_id = users.franchise_id 
            AND role IN ('super_admin', 'franchise_admin')
        )
    );

-- Policy: Only super_admins can delete users
DROP POLICY IF EXISTS "Only super_admins can delete users" ON users;
CREATE POLICY "Only super_admins can delete users" ON users
    FOR DELETE USING (
        auth.uid()::text IN (
            SELECT id::text FROM users 
            WHERE franchise_id = users.franchise_id 
            AND role = 'super_admin'
        )
    );

-- Insert default admin user if not exists
INSERT INTO users (
    name, 
    email, 
    password_hash, 
    role, 
    franchise_id, 
    is_active, 
    permissions
) 
SELECT 
    'System Admin',
    'admin@safawala.com',
    'demo_hash_admin123_' || extract(epoch from now()),
    'super_admin',
    f.id,
    true,
    '{
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
FROM franchises f
WHERE f.code = 'HQ001'
AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@safawala.com'
);

-- Update existing users with default permissions based on their role
UPDATE users SET permissions = 
CASE 
    WHEN role IN ('super_admin', 'franchise_admin') THEN '{
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
WHERE permissions IS NULL OR permissions = '{}' OR permissions = 'null';

-- Create sample staff members with different roles and permissions
INSERT INTO users (
    name, 
    email, 
    password_hash, 
    role, 
    franchise_id, 
    is_active, 
    permissions
) 
SELECT 
    'Rajesh Kumar',
    'rajesh@safawala.com',
    'demo_hash_rajesh123_' || extract(epoch from now()),
    'franchise_admin',
    f.id,
    true,
    '{
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
FROM franchises f
WHERE f.code = 'DEL001'
AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'rajesh@safawala.com'
);

INSERT INTO users (
    name, 
    email, 
    password_hash, 
    role, 
    franchise_id, 
    is_active, 
    permissions
) 
SELECT 
    'Priya Sharma',
    'priya@safawala.com',
    'demo_hash_priya123_' || extract(epoch from now()),
    'staff',
    f.id,
    true,
    '{
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
FROM franchises f
WHERE f.code = 'DEL001'
AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'priya@safawala.com'
);

INSERT INTO users (
    name, 
    email, 
    password_hash, 
    role, 
    franchise_id, 
    is_active, 
    permissions
) 
SELECT 
    'Amit Singh',
    'amit@safawala.com',
    'demo_hash_amit123_' || extract(epoch from now()),
    'staff',
    f.id,
    true,
    '{
        "dashboard": true,
        "bookings": true,
        "customers": true,
        "inventory": false,
        "sales": false,
        "laundry": true,
        "purchases": false,
        "expenses": false,
        "deliveries": true,
        "reports": false,
        "financials": false,
        "invoices": false,
        "franchises": false,
        "staff": false,
        "settings": false
    }'::jsonb
FROM franchises f
WHERE f.code = 'MUM001'
AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'amit@safawala.com'
);

INSERT INTO users (
    name, 
    email, 
    password_hash, 
    role, 
    franchise_id, 
    is_active, 
    permissions
) 
SELECT 
    'Sunita Patel',
    'sunita@safawala.com',
    'demo_hash_sunita123_' || extract(epoch from now()),
    'franchise_admin',
    f.id,
    true,
    '{
        "dashboard": true,
        "bookings": true,
        "customers": true,
        "inventory": true,
        "sales": true,
        "laundry": true,
        "purchases": false,
        "expenses": true,
        "deliveries": true,
        "reports": true,
        "financials": false,
        "invoices": true,
        "franchises": false,
        "staff": true,
        "settings": false
    }'::jsonb
FROM franchises f
WHERE f.code = 'MUM001'
AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'sunita@safawala.com'
);

INSERT INTO users (
    name, 
    email, 
    password_hash, 
    role, 
    franchise_id, 
    is_active, 
    permissions
) 
SELECT 
    'Vikram Gupta',
    'vikram@safawala.com',
    'demo_hash_vikram123_' || extract(epoch from now()),
    'readonly',
    f.id,
    false,
    '{
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
FROM franchises f
WHERE f.code = 'BLR001'
AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'vikram@safawala.com'
);

-- Create a view for user permissions summary
CREATE OR REPLACE VIEW user_permissions_summary AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.is_active,
    f.name as franchise_name,
    f.code as franchise_code,
    u.permissions,
    (
        SELECT COUNT(*)
        FROM jsonb_each_text(u.permissions) 
        WHERE value = 'true'
    ) as active_permissions_count,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN franchises f ON u.franchise_id = f.id;

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
    user_id UUID,
    permission_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (
            SELECT (permissions ->> permission_name)::boolean
            FROM users
            WHERE id = user_id AND is_active = true
        ),
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN COALESCE(
        (
            SELECT permissions
            FROM users
            WHERE id = user_id AND is_active = true
        ),
        '{}'::jsonb
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user permissions
CREATE OR REPLACE FUNCTION update_user_permissions(
    user_id UUID,
    new_permissions JSONB
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET permissions = new_permissions,
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT ON user_permissions_summary TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_permissions(UUID, JSONB) TO authenticated;

-- Create audit log for permission changes
CREATE TABLE IF NOT EXISTS user_permission_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    old_permissions JSONB,
    new_permissions JSONB,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for permission audit
CREATE OR REPLACE FUNCTION audit_permission_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if permissions actually changed
    IF OLD.permissions IS DISTINCT FROM NEW.permissions THEN
        INSERT INTO user_permission_audit (
            user_id,
            changed_by,
            old_permissions,
            new_permissions,
            change_reason
        ) VALUES (
            NEW.id,
            auth.uid(),
            OLD.permissions,
            NEW.permissions,
            'Permission update via staff management'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_user_permissions ON users;
CREATE TRIGGER audit_user_permissions
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_permission_changes();

-- Grant permissions for audit table
GRANT SELECT, INSERT ON user_permission_audit TO authenticated;

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_user_permission_audit_user_id ON user_permission_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_audit_changed_by ON user_permission_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_user_permission_audit_created_at ON user_permission_audit(created_at);

-- Display summary of created structure
SELECT 
    'Users table created with permissions system' as status,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_active = true) as active_users,
    COUNT(*) FILTER (WHERE role = 'super_admin') as super_admin_users,
    COUNT(*) FILTER (WHERE role = 'franchise_admin') as franchise_admin_users,
    COUNT(*) FILTER (WHERE role = 'staff') as staff_users,
    COUNT(*) FILTER (WHERE role = 'readonly') as readonly_users
FROM users;
