-- ============================================================
-- SUPER ADMIN HQ FRANCHISE - Manual Setup
-- First creates the HQ franchise, then you assign it to your user
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

-- Step 2: Show all users to find your super admin
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '👥 ALL USERS (Find your super admin)' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    id,
    email,
    role,
    franchise_id,
    created_at
FROM users
ORDER BY created_at DESC;

-- Step 3: Show HQ franchise ID
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🏢 HQ FRANCHISE CREATED' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    id as hq_franchise_id,
    name,
    code,
    city || ', ' || state as location
FROM franchises 
WHERE code = 'HQ001';

-- ============================================================
-- Step 4: COPY YOUR IDs FROM ABOVE AND RUN THIS
-- Replace 'YOUR-USER-ID' with your actual user ID from Step 2
-- Replace 'YOUR-HQ-FRANCHISE-ID' with the id from Step 3
-- ============================================================

/*
-- EXAMPLE (UNCOMMENT AND REPLACE IDs):
UPDATE users 
SET franchise_id = 'YOUR-HQ-FRANCHISE-ID'
WHERE id = 'YOUR-USER-ID';
*/

-- ============================================================
-- After running the UPDATE above, verify with this:
-- ============================================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '✅ VERIFICATION - Super Admin Assignment' as section;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

SELECT 
    u.id as user_id,
    u.email,
    u.role,
    f.code as franchise_code,
    f.name as franchise_name,
    CASE 
        WHEN u.role = 'super_admin' AND f.code = 'HQ001' THEN '✅ Correctly Configured'
        WHEN u.role = 'super_admin' THEN '⚠️  Has super_admin role but not assigned to HQ'
        ELSE '❌ Not super admin'
    END as status
FROM users u
LEFT JOIN franchises f ON f.id = u.franchise_id
WHERE u.role = 'super_admin'
ORDER BY u.created_at;

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
    END as type,
    created_at
FROM franchises
ORDER BY 
    CASE WHEN code = 'HQ001' THEN 0 ELSE 1 END,
    created_at DESC;
