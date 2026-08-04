-- Creating demo users in the users table for dynamic authentication
-- This script creates users that integrate with the new authentication system

DO $$
DECLARE
    default_franchise_id UUID;
    bangalore_franchise_id UUID;
    dahod_franchise_id UUID;
BEGIN
    -- Get actual franchise IDs from existing data
    SELECT id INTO default_franchise_id FROM franchises WHERE name = 'Default Franchise' LIMIT 1;
    SELECT id INTO bangalore_franchise_id FROM franchises WHERE name LIKE '%Bangalore%' LIMIT 1;
    SELECT id INTO dahod_franchise_id FROM franchises WHERE name LIKE '%Dahod%' LIMIT 1;
    
    -- Create demo users in the users table
    INSERT INTO users (
        id, name, email, phone, role, franchise_id, is_active, 
        permissions, joining_date, created_at, updated_at
    ) VALUES 
    -- Super Admin (no franchise restriction)
    (
        gen_random_uuid(),
        'Super Admin',
        'admin@safawala.com',
        '+91 9876543210',
        'super_admin',
        NULL,
        true,
        '[]'::jsonb,
        CURRENT_DATE,
        NOW(),
        NOW()
    ),
    -- Suresh Pithara (Dahod Branch Owner)
    (
        gen_random_uuid(),
        'Suresh Pithara',
        'mysafawale@gmail.com',
        '+91 9876543211',
        'franchise_admin',
        dahod_franchise_id,
        true,
        '[]'::jsonb,
        CURRENT_DATE,
        NOW(),
        NOW()
    ),
    -- Nishit (Bangalore Staff)
    (
        gen_random_uuid(),
        'Nishit Staff',
        'nishitishere@gmail.com',
        '+91 9876543212',
        'staff',
        bangalore_franchise_id,
        true,
        '[]'::jsonb,
        CURRENT_DATE,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        franchise_id = EXCLUDED.franchise_id,
        updated_at = NOW();
    
    RAISE NOTICE 'Demo users created/updated successfully';
    RAISE NOTICE 'Default franchise ID: %', default_franchise_id;
    RAISE NOTICE 'Bangalore franchise ID: %', bangalore_franchise_id;
    RAISE NOTICE 'Dahod franchise ID: %', dahod_franchise_id;
END $$;
