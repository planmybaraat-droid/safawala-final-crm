// Create user_profiles table in Supabase database
const { createClient } = require('@supabase/supabase-js');

// Use environment variables directly (since .env.local is loaded by Next.js)
const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co';
const supabaseServiceKey = '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const createUserProfilesTable = async () => {
  console.log('Creating user_profiles table...');
  
  const sql = `
-- Create user_profiles table for comprehensive profile management
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL,
    user_id UUID NULL, -- Reference to users table if needed
    
    -- Basic Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    
    -- Professional Information
    role VARCHAR(50) DEFAULT 'staff',
    designation VARCHAR(100),
    department VARCHAR(100),
    employee_id VARCHAR(50),
    date_of_joining DATE,
    
    -- Address Information
    address_line_1 TEXT,
    address_line_2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    
    -- Personal Information
    date_of_birth DATE,
    bio TEXT,
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
$$ language 'plpgsql';

CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for franchise isolation
CREATE POLICY user_profiles_franchise_isolation ON user_profiles
    FOR ALL USING (franchise_id = current_setting('app.current_franchise_id', true)::UUID);

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Comprehensive user profile management with personal and professional information';
COMMENT ON COLUMN user_profiles.user_id IS 'Optional reference to users table for authentication integration';
COMMENT ON COLUMN user_profiles.role IS 'User role within the organization (super_admin, admin, manager, staff, viewer)';
COMMENT ON COLUMN user_profiles.franchise_id IS 'Associated franchise for multi-tenant isolation';
  `;

  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error creating table:', error);
      // Try alternative method
      console.log('Trying alternative method...');
      const { data: result, error: altError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'user_profiles');
        
      if (altError) {
        console.error('Alternative method also failed:', altError);
        return false;
      }
    }
    
    console.log('✅ user_profiles table created successfully');
    return true;
  } catch (err) {
    console.error('Exception creating table:', err);
    return false;
  }
};

const testTableExists = async () => {
  console.log('Testing if user_profiles table exists...');
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count(*)')
      .limit(1);
      
    if (error) {
      if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
        console.log('❌ Table does not exist');
        return false;
      }
      console.error('Error testing table:', error);
      return false;
    }
    
    console.log('✅ Table exists and is accessible');
    return true;
  } catch (err) {
    console.error('Exception testing table:', err);
    return false;
  }
};

const main = async () => {
  console.log('🚀 Starting database setup...');
  console.log(`Supabase URL: ${supabaseUrl}`);
  
  // Test if table already exists
  const exists = await testTableExists();
  
  if (!exists) {
    console.log('Table does not exist, creating...');
    const created = await createUserProfilesTable();
    
    if (created) {
      // Test again after creation
      const nowExists = await testTableExists();
      if (nowExists) {
        console.log('🎉 Database setup completed successfully!');
      } else {
        console.log('⚠️ Table creation may have failed or needs manual verification');
      }
    } else {
      console.log('❌ Failed to create table');
    }
  } else {
    console.log('✅ Table already exists - database setup complete!');
  }
};

main().catch(console.error);