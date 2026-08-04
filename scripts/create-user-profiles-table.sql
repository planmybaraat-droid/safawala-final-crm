-- Create user_profiles table for comprehensive profile management
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID NOT NULL,
    user_id UUID NULL, -- Reference to users table if needed
    
    -- Basic Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Professional Information
    role VARCHAR(50) DEFAULT 'staff',
    designation VARCHAR(100),
    department VARCHAR(100),
    employee_id VARCHAR(50),
    date_of_joining DATE,
    
    -- Address Information
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    
    -- Additional Information
    bio TEXT,
    profile_photo_url TEXT,
    signature_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_email_per_franchise UNIQUE(franchise_id, email),
    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'admin', 'manager', 'staff', 'viewer'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_franchise_id ON user_profiles(franchise_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_id ON user_profiles(employee_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Add RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see profiles from their franchise
CREATE POLICY user_profiles_franchise_isolation ON user_profiles
    USING (franchise_id = current_setting('app.current_franchise_id', true)::UUID);

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Comprehensive user profile management with personal and professional information';
COMMENT ON COLUMN user_profiles.user_id IS 'Optional reference to users table for authentication integration';
COMMENT ON COLUMN user_profiles.role IS 'User role within the organization (super_admin, admin, manager, staff, viewer)';
COMMENT ON COLUMN user_profiles.designation IS 'Job title or position';
COMMENT ON COLUMN user_profiles.employee_id IS 'Company-specific employee identifier';
COMMENT ON COLUMN user_profiles.profile_photo_url IS 'URL or base64 data for profile photo';
COMMENT ON COLUMN user_profiles.signature_url IS 'URL or base64 data for digital signature';