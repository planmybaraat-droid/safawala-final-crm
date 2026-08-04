-- Sync user_profiles to users table
-- Add Vardaan to the users table so login works

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
    '7a7c2e1a-b326-474c-9e83-ebf92351c4d9',
    'vardaanbhai@gmail.com',
    'Vardaan Bhai',
    'super_admin',
    'b456374d-87ea-4ae7-b42e-9ccddbf1e162',
    true,
    '$2a$10$dummy.hash.for.supabase.auth.only'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    franchise_id = EXCLUDED.franchise_id,
    is_active = EXCLUDED.is_active
RETURNING id, email, name, role, franchise_id;
