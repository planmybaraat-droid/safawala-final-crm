-- Fix users table schema to match the expected structure
-- First, let's check what columns exist and add missing ones

-- Add missing columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add password_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
    END IF;
    
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'staff';
    END IF;
    
    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;
    
    -- Ensure franchise_id column exists and has proper foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'franchise_id') THEN
        ALTER TABLE users ADD COLUMN franchise_id UUID REFERENCES franchises(id);
    END IF;
END $$;

-- Update existing users to have password hashes if they don't
-- Using a simple hash for demo purposes - in production, use proper bcrypt
UPDATE users 
SET password_hash = 'demo_password_hash_' || LOWER(SUBSTRING(name FROM 1 FOR 10))
WHERE password_hash IS NULL;

-- Update existing users with default values
UPDATE users SET 
    role = COALESCE(role, 'staff'),
    is_active = COALESCE(is_active, true)
WHERE role IS NULL OR is_active IS NULL;

-- Make password_hash nullable for now to avoid constraint issues
-- In production, you'd want to make this NOT NULL after proper password setup
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
