-- ============================================================
-- CREATE HQ FRANCHISE AND NEW SUPER ADMIN USER
-- Email: vardaanbhai@gmail.com
-- Password: Vardaan@5678
-- ============================================================

-- STEP 1: Create HQ001 Franchise
INSERT INTO franchises (code, name, city)
VALUES ('HQ001', 'Safawala Headquarters', 'Mumbai')
RETURNING id, code, name, city;

-- ⚠️ COPY THE FRANCHISE ID FROM ABOVE RESULT

-- STEP 2: You need to create the user in Supabase Auth first
-- Go to: Supabase Dashboard → Authentication → Users → Add User
-- Email: vardaanbhai@gmail.com
-- Password: Vardaan@5678
-- Then come back and run Step 3

-- STEP 3: After creating the user in Auth, get the user ID
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE email = 'vardaanbhai@gmail.com';

-- ⚠️ COPY THE USER ID FROM ABOVE RESULT

-- STEP 4: Create user_profile for super admin
-- Replace PASTE_USER_ID_HERE with ID from Step 3
-- Replace PASTE_HQ_FRANCHISE_ID_HERE with ID from Step 1

INSERT INTO user_profiles (
    id,
    email,
    role,
    franchise_id
)
VALUES (
    'PASTE_USER_ID_HERE',
    'vardaanbhai@gmail.com',
    'super_admin',
    'PASTE_HQ_FRANCHISE_ID_HERE'
)
RETURNING id, email, role, franchise_id;

-- STEP 5: Verify the setup
SELECT 
    '✅ SUPER ADMIN SETUP COMPLETE' as status,
    up.id,
    up.email,
    up.role,
    f.code as franchise_code,
    f.name as franchise_name
FROM user_profiles up
JOIN franchises f ON f.id = up.franchise_id
WHERE up.email = 'vardaanbhai@gmail.com';
