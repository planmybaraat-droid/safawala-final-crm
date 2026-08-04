-- ============================================================
-- SUPER ADMIN HQ FRANCHISE SETUP
-- Creates a headquarters franchise for super admin operations
-- ============================================================

-- Step 1: Create HQ Franchise for Super Admin
INSERT INTO franchises (
    name, 
    code, 
    city, 
    state, 
    address, 
    pincode,
    phone, 
    email, 
    owner_name,
    manager_name,
    gst_number,
    is_active
)
VALUES (
    'Safawala Headquarters',
    'HQ001',
    'Mumbai',
    'Maharashtra',
    'Corporate Office, Andheri East',
    '400069',
    '+91 9999999999',
    'hq@safawala.com',
    'Super Admin',
    'HQ Manager',
    '27AABCU9603R1ZX',
    true
)
ON CONFLICT (code) DO NOTHING
RETURNING id, name, code;

-- Step 2: Get the HQ franchise ID
DO $$
DECLARE
    hq_franchise_id uuid;
    super_admin_id uuid;
BEGIN
    -- Get HQ franchise ID
    SELECT id INTO hq_franchise_id 
    FROM franchises 
    WHERE code = 'HQ001' 
    LIMIT 1;
    
    IF hq_franchise_id IS NULL THEN
        RAISE EXCEPTION 'HQ Franchise not found!';
    END IF;
    
    -- Get current super admin user ID
    SELECT id INTO super_admin_id 
    FROM users 
    WHERE id = auth.uid();
    
    -- Assign HQ franchise to super admin
    UPDATE users 
    SET franchise_id = hq_franchise_id
    WHERE id = super_admin_id;
    
    RAISE NOTICE '✅ Super Admin assigned to HQ Franchise: %', hq_franchise_id;
    
    -- Create company settings for HQ
    INSERT INTO company_settings (
        franchise_id,
        company_name,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        gst_number
    )
    VALUES (
        hq_franchise_id,
        'Safawala Headquarters',
        'hq@safawala.com',
        '+91 9999999999',
        'Corporate Office, Andheri East',
        'Mumbai',
        'Maharashtra',
        '400069',
        '27AABCU9603R1ZX'
    )
    ON CONFLICT (franchise_id) DO NOTHING;
    
    -- Create branding settings for HQ
    INSERT INTO branding_settings (
        franchise_id,
        primary_color,
        secondary_color
    )
    VALUES (
        hq_franchise_id,
        '#1e40af',
        '#3b82f6'
    )
    ON CONFLICT (franchise_id) DO NOTHING;
    
    RAISE NOTICE '✅ HQ Franchise setup complete!';
END $$;

-- Verify the setup
SELECT 
    '✅ HQ FRANCHISE CREATED' as status,
    f.id,
    f.name,
    f.code,
    f.city,
    f.is_active
FROM franchises f
WHERE f.code = 'HQ001';

-- Verify super admin assignment
SELECT 
    '✅ SUPER ADMIN USER' as status,
    u.email,
    u.role,
    u.franchise_id,
    f.name as franchise_name,
    f.code as franchise_code
FROM users u
LEFT JOIN franchises f ON f.id = u.franchise_id
WHERE u.id = auth.uid();

SELECT '🎉 Super Admin HQ Franchise Setup Complete!' as final_status;
