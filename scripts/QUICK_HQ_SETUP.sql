-- ============================================================
-- QUICK HQ FRANCHISE SETUP - 3 Steps
-- ============================================================

-- STEP 1: Create HQ Franchise
-- ============================================================
INSERT INTO franchises (name, code, city, state, address, pincode, phone, email, owner_name, manager_name, gst_number, is_active)
VALUES ('Safawala Headquarters', 'HQ001', 'Mumbai', 'Maharashtra', 'Corporate Office', '400069', '+91 9999999999', 'hq@safawala.com', 'Super Admin', 'HQ Manager', '27AABCU9603R1ZX', true)
ON CONFLICT (code) DO NOTHING;


-- STEP 2: Find your user ID and HQ franchise ID
-- ============================================================
SELECT 
    '🔍 YOUR USER INFO:' as info,
    id as your_user_id, 
    email, 
    role 
FROM users 
WHERE role = 'super_admin' 
LIMIT 1;

SELECT 
    '🏢 HQ FRANCHISE INFO:' as info,
    id as hq_franchise_id, 
    code, 
    name 
FROM franchises 
WHERE code = 'HQ001';


-- STEP 3: Copy the IDs from above and update this line:
-- ============================================================
-- REPLACE 'your-user-id' with the actual ID from STEP 2
-- REPLACE 'hq-franchise-id' with the actual ID from STEP 2

/*
UPDATE users 
SET franchise_id = 'hq-franchise-id'
WHERE id = 'your-user-id';
*/


-- STEP 4: After running UPDATE, verify:
-- ============================================================
SELECT 
    u.email,
    u.role,
    f.code as franchise_code,
    f.name as franchise_name,
    '✅ Success!' as status
FROM users u
JOIN franchises f ON f.id = u.franchise_id
WHERE u.role = 'super_admin';
