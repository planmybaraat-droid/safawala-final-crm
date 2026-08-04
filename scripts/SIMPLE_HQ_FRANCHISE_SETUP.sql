-- ============================================================
-- SIMPLIFIED SUPER ADMIN HQ FRANCHISE SETUP
-- Creates HQ franchise and assigns to super admin
-- Skips settings tables that might have different schemas
-- ============================================================

-- Step 1: Create HQ Franchise
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
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active
RETURNING id, name, code;

-- Step 2: Assign HQ franchise to super admin
DO $$
DECLARE
    hq_franchise_id uuid;
    super_admin_id uuid;
    current_franchise_id uuid;
BEGIN
    -- Get HQ franchise ID
    SELECT id INTO hq_franchise_id 
    FROM franchises 
    WHERE code = 'HQ001' 
    LIMIT 1;
    
    IF hq_franchise_id IS NULL THEN
        RAISE EXCEPTION 'HQ Franchise not found! Please check if it was created.';
    END IF;
    
    RAISE NOTICE '✅ HQ Franchise found: %', hq_franchise_id;
    
    -- Get current super admin user ID
    SELECT id, franchise_id INTO super_admin_id, current_franchise_id
    FROM users 
    WHERE id = auth.uid();
    
    IF super_admin_id IS NULL THEN
        RAISE EXCEPTION 'User not found! Make sure you are logged in.';
    END IF;
    
    -- Check if already assigned
    IF current_franchise_id = hq_franchise_id THEN
        RAISE NOTICE '✅ Super Admin already assigned to HQ Franchise';
    ELSE
        -- Assign HQ franchise to super admin
        UPDATE users 
        SET franchise_id = hq_franchise_id
        WHERE id = super_admin_id;
        
        RAISE NOTICE '✅ Super Admin assigned to HQ Franchise: %', hq_franchise_id;
    END IF;
END $$;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ HQ FRANCHISE DETAILS' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    id,
    name,
    code,
    city || ', ' || state as location,
    phone,
    email,
    owner_name,
    is_active,
    created_at
FROM franchises 
WHERE code = 'HQ001';

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ SUPER ADMIN USER INFO' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    u.email,
    u.role,
    u.franchise_id,
    f.name as franchise_name,
    f.code as franchise_code,
    CASE 
        WHEN u.role = 'super_admin' AND f.code = 'HQ001' THEN '✅ Correctly Configured'
        WHEN u.role = 'super_admin' THEN '⚠️  Super Admin but not assigned to HQ'
        ELSE '❌ Not Super Admin'
    END as status
FROM users u
LEFT JOIN franchises f ON f.id = u.franchise_id
WHERE u.id = auth.uid();

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ ALL FRANCHISES' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    code,
    name,
    city,
    is_active,
    CASE 
        WHEN code = 'HQ001' THEN '🏢 Headquarters'
        ELSE '🏪 Franchise'
    END as type
FROM franchises
ORDER BY 
    CASE WHEN code = 'HQ001' THEN 0 ELSE 1 END,
    created_at DESC;

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🎉 Super Admin HQ Franchise Setup Complete!' as final_status;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- Instructions
SELECT '📝 NEXT STEPS:' as instructions;
SELECT '1. Refresh your browser' as step_1;
SELECT '2. Go to /franchises page' as step_2;
SELECT '3. You should see HQ001 franchise' as step_3;
SELECT '4. Apply middleware to your API routes' as step_4;
