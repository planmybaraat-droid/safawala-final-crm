-- ============================================================
-- COMPLETE HQ SETUP AND SUPER ADMIN CREATION
-- This will create HQ franchise and promote admin to super_admin
-- ============================================================

-- STEP 1: Create HQ001 Franchise
INSERT INTO franchises (code, name, city)
VALUES ('HQ001', 'Safawala Headquarters', 'Mumbai')
RETURNING id, code, name, city;

-- STEP 2: Get the HQ franchise ID (will be shown above)
-- Copy the ID from the result above and use it in Step 3

-- STEP 3: Promote admin user to super_admin and assign to HQ
-- Replace 'PASTE_HQ_FRANCHISE_ID_HERE' with the ID from Step 1

UPDATE user_profiles
SET 
    role = 'super_admin',
    franchise_id = 'PASTE_HQ_FRANCHISE_ID_HERE'
WHERE email = 'docsing004@gmail.com'
RETURNING id, email, role, franchise_id;

-- STEP 4: Verify the setup
SELECT 
    '✅ VERIFICATION' as status,
    up.email,
    up.role,
    f.code as franchise_code,
    f.name as franchise_name
FROM user_profiles up
LEFT JOIN franchises f ON f.id = up.franchise_id
WHERE up.email = 'docsing004@gmail.com';
