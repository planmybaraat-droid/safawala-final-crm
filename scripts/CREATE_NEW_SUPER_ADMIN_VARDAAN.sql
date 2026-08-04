-- ============================================================
-- CREATE NEW SUPER ADMIN: vardaan@gmail.com
-- ============================================================

-- STEP 1: Create HQ Franchise (already done, but keeping for reference)
-- HQ Franchise ID: b456374d-87ea-4ae7-b42e-9ccddbf1e162

-- STEP 2: Go to Supabase Dashboard → Authentication → Users → Add User
-- Email: vardaan@gmail.com
-- Password: Vardaan@5678
-- ✅ Check "Auto Confirm User"
-- Click "Create User"

-- STEP 3: Get the new user ID
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE email = 'vardaan@gmail.com';

-- ⚠️ COPY THE USER ID FROM ABOVE RESULT
-- Then replace 'PASTE_USER_ID_HERE' in the scripts below

-- STEP 4: Create user_profile (replace PASTE_USER_ID_HERE)
INSERT INTO user_profiles (
    id,
    email,
    role,
    franchise_id,
    first_name,
    last_name
)
VALUES (
    'PASTE_USER_ID_HERE',
    'vardaan@gmail.com',
    'super_admin',
    'b456374d-87ea-4ae7-b42e-9ccddbf1e162',
    'Vardaan',
    'Admin'
)
RETURNING id, email, role, franchise_id, first_name, last_name;

-- STEP 5: Create users table record (replace PASTE_USER_ID_HERE)
INSERT INTO users (
    id,
    email,
    name,
    role,
    franchise_id,
    is_active,
    password_hash
)
VALUES (
    'PASTE_USER_ID_HERE',
    'vardaan@gmail.com',
    'Vardaan Admin',
    'super_admin',
    'b456374d-87ea-4ae7-b42e-9ccddbf1e162',
    true,
    '$2a$10$dummy.hash.for.supabase.auth.only'
)
RETURNING id, email, name, role, franchise_id;

-- STEP 6: Verify the setup
SELECT 
    '✅ SUPER ADMIN SETUP COMPLETE' as status,
    up.id,
    up.email,
    up.role,
    f.code as franchise_code,
    f.name as franchise_name
FROM user_profiles up
JOIN franchises f ON f.id = up.franchise_id
WHERE up.email = 'vardaan@gmail.com';
