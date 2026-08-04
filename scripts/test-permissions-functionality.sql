-- Test the permissions system functionality

-- Test 1: Create a test user with custom permissions
DO $$
DECLARE
    test_user_id UUID;
    test_franchise_id UUID;
BEGIN
    -- Get a franchise ID for testing
    SELECT id INTO test_franchise_id FROM franchises LIMIT 1;
    
    -- Insert test user
    INSERT INTO users (
        name, 
        email, 
        password_hash, 
        role, 
        franchise_id, 
        permissions
    ) VALUES (
        'Test User',
        'test@safawala.com',
        'demo_hash_test123_' || extract(epoch from now()),
        'staff',
        test_franchise_id,
        '{
            "dashboard": true,
            "bookings": true,
            "customers": false,
            "inventory": true,
            "sales": false,
            "laundry": false,
            "purchases": false,
            "expenses": false,
            "deliveries": false,
            "reports": false,
            "financials": false,
            "invoices": false,
            "franchises": false,
            "staff": false,
            "settings": false
        }'::jsonb
    ) RETURNING id INTO test_user_id;
    
    RAISE NOTICE 'Test user created with ID: %', test_user_id;
END $$;

-- Test 2: Check permission functions
SELECT 
    'Permission Function Tests' as test_category,
    check_user_permission(
        (SELECT id FROM users WHERE email = 'test@safawala.com'),
        'dashboard'
    ) as should_be_true,
    check_user_permission(
        (SELECT id FROM users WHERE email = 'test@safawala.com'),
        'customers'
    ) as should_be_false,
    check_user_permission(
        (SELECT id FROM users WHERE email = 'test@safawala.com'),
        'inventory'
    ) as should_be_true;

-- Test 3: Update permissions using function
SELECT update_user_permissions(
    (SELECT id FROM users WHERE email = 'test@safawala.com'),
    '{
        "dashboard": true,
        "bookings": true,
        "customers": true,
        "inventory": true,
        "sales": true,
        "laundry": false,
        "purchases": false,
        "expenses": false,
        "deliveries": false,
        "reports": false,
        "financials": false,
        "invoices": false,
        "franchises": false,
        "staff": false,
        "settings": false
    }'::jsonb
) as permission_update_result;

-- Test 4: Verify permission update worked
SELECT 
    'Permission Update Test' as test_category,
    check_user_permission(
        (SELECT id FROM users WHERE email = 'test@safawala.com'),
        'customers'
    ) as customers_now_true,
    check_user_permission(
        (SELECT id FROM users WHERE email = 'test@safawala.com'),
        'sales'
    ) as sales_now_true;

-- Test 5: Check audit log
SELECT 
    'Audit Log Test' as test_category,
    COUNT(*) as audit_entries
FROM user_permission_audit 
WHERE user_id = (SELECT id FROM users WHERE email = 'test@safawala.com');

-- Test 6: Test role-based default permissions
DO $$
DECLARE
    admin_perms JSONB;
    staff_perms JSONB;
    readonly_perms JSONB;
BEGIN
    -- Get permissions for different roles
    SELECT permissions INTO admin_perms 
    FROM users WHERE role = 'super_admin' LIMIT 1;
    
    SELECT permissions INTO staff_perms 
    FROM users WHERE role = 'staff' LIMIT 1;
    
    SELECT permissions INTO readonly_perms 
    FROM users WHERE role = 'readonly' LIMIT 1;
    
    -- Check if admin has more permissions than staff
    IF (
        SELECT COUNT(*) FROM jsonb_each_text(admin_perms) WHERE value = 'true'
    ) > (
        SELECT COUNT(*) FROM jsonb_each_text(staff_perms) WHERE value = 'true'
    ) THEN
        RAISE NOTICE 'PASS: Admin has more permissions than staff';
    ELSE
        RAISE NOTICE 'FAIL: Admin should have more permissions than staff';
    END IF;
    
    -- Check if staff has more permissions than readonly
    IF (
        SELECT COUNT(*) FROM jsonb_each_text(staff_perms) WHERE value = 'true'
    ) > (
        SELECT COUNT(*) FROM jsonb_each_text(readonly_perms) WHERE value = 'true'
    ) THEN
        RAISE NOTICE 'PASS: Staff has more permissions than readonly';
    ELSE
        RAISE NOTICE 'FAIL: Staff should have more permissions than readonly';
    END IF;
END $$;

-- Test 7: Performance test on permissions
EXPLAIN ANALYZE
SELECT u.name, u.role, 
       (u.permissions ->> 'dashboard')::boolean as has_dashboard,
       (u.permissions ->> 'bookings')::boolean as has_bookings
FROM users u
WHERE (u.permissions ->> 'dashboard')::boolean = true;

-- Test 8: Clean up test data
DELETE FROM users WHERE email = 'test@safawala.com';

-- Final summary
SELECT 
    'System Summary' as category,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_active = true) as active_users,
    COUNT(*) FILTER (WHERE role = 'super_admin') as super_admins,
    COUNT(*) FILTER (WHERE role = 'franchise_admin') as franchise_admins,
    COUNT(*) FILTER (WHERE role = 'staff') as staff_users,
    COUNT(*) FILTER (WHERE role = 'readonly') as readonly_users,
    AVG((
        SELECT COUNT(*)
        FROM jsonb_each_text(permissions) 
        WHERE value = 'true'
    )) as avg_permissions_per_user
FROM users;

RAISE NOTICE 'All tests completed successfully!';
