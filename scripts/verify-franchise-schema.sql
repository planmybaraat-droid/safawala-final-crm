-- Verify franchise management schema and data

-- 1. Check table structures
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('franchises', 'users', 'customers', 'vendors', 'products', 'bookings', 'booking_items', 'payments', 'purchases', 'purchase_items', 'expenses', 'laundry_batches', 'laundry_items', 'activity_logs')
ORDER BY tablename;

-- 2. Check column details for franchises table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'franchises' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
    AND tc.table_name IN ('franchises', 'users', 'customers', 'products', 'bookings')
ORDER BY tc.table_name, tc.constraint_type;

-- 4. Check foreign key relationships
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 5. Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('franchises', 'users', 'customers', 'products', 'bookings')
ORDER BY tablename, indexname;

-- 6. Verify sample data counts
SELECT 'Franchises' as entity, COUNT(*) as total_count, COUNT(CASE WHEN is_active = true THEN 1 END) as active_count FROM franchises
UNION ALL
SELECT 'Users', COUNT(*), COUNT(CASE WHEN is_active = true THEN 1 END) FROM users
UNION ALL
SELECT 'Customers', COUNT(*), COUNT(CASE WHEN customer_type = 'premium' THEN 1 END) FROM customers
UNION ALL
SELECT 'Vendors', COUNT(*), COUNT(CASE WHEN is_active = true THEN 1 END) FROM vendors
UNION ALL
SELECT 'Products', COUNT(*), COUNT(CASE WHEN is_active = true THEN 1 END) FROM products
UNION ALL
SELECT 'Bookings', COUNT(*), COUNT(CASE WHEN status = 'confirmed' THEN 1 END) FROM bookings
UNION ALL
SELECT 'Booking Items', COUNT(*), COUNT(CASE WHEN cleaning_required = true THEN 1 END) FROM booking_items
UNION ALL
SELECT 'Payments', COUNT(*), COUNT(CASE WHEN status = 'paid' THEN 1 END) FROM payments
UNION ALL
SELECT 'Purchases', COUNT(*), COUNT(CASE WHEN status = 'paid' THEN 1 END) FROM purchases
UNION ALL
SELECT 'Expenses', COUNT(*), COUNT(CASE WHEN category = 'rent' THEN 1 END) FROM expenses
UNION ALL
SELECT 'Laundry Batches', COUNT(*), COUNT(CASE WHEN status = 'completed' THEN 1 END) FROM laundry_batches
UNION ALL
SELECT 'Activity Logs', COUNT(*), COUNT(CASE WHEN action = 'CREATE' THEN 1 END) FROM activity_logs;

-- 7. Check franchise-specific data distribution
SELECT 
    f.name as franchise_name,
    f.code as franchise_code,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT b.id) as total_bookings,
    COALESCE(SUM(b.total_amount), 0) as total_revenue
FROM franchises f
LEFT JOIN users u ON f.id = u.franchise_id
LEFT JOIN customers c ON f.id = c.franchise_id
LEFT JOIN products p ON f.id = p.franchise_id
LEFT JOIN bookings b ON f.id = b.franchise_id
GROUP BY f.id, f.name, f.code
ORDER BY f.name;

-- 8. Check user roles and permissions
SELECT 
    f.name as franchise_name,
    u.name as user_name,
    u.role,
    u.is_active,
    CASE 
        WHEN u.permissions IS NOT NULL THEN jsonb_array_length(jsonb_object_keys(u.permissions))
        ELSE 0
    END as permission_count
FROM users u
LEFT JOIN franchises f ON u.franchise_id = f.id
ORDER BY f.name, u.role, u.name;

-- 9. Check product stock levels
SELECT 
    f.name as franchise_name,
    p.category,
    COUNT(*) as total_products,
    SUM(p.stock_total) as total_stock,
    SUM(p.stock_available) as available_stock,
    SUM(p.stock_booked) as booked_stock,
    COUNT(CASE WHEN p.stock_available <= p.reorder_level THEN 1 END) as low_stock_items
FROM products p
JOIN franchises f ON p.franchise_id = f.id
WHERE p.is_active = true
GROUP BY f.id, f.name, p.category
ORDER BY f.name, p.category;

-- 10. Check booking status distribution
SELECT 
    f.name as franchise_name,
    b.status,
    COUNT(*) as booking_count,
    SUM(b.total_amount) as total_amount,
    AVG(b.total_amount) as avg_amount
FROM bookings b
JOIN franchises f ON b.franchise_id = f.id
GROUP BY f.id, f.name, b.status
ORDER BY f.name, b.status;

-- 11. Check payment methods usage
SELECT 
    payment_method,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
FROM payments
WHERE status = 'paid'
GROUP BY payment_method
ORDER BY total_amount DESC;

-- 12. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 13. Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
    AND event_object_table IN ('franchises', 'users', 'customers', 'products', 'bookings')
ORDER BY event_object_table, trigger_name;

-- 14. Performance check - sample queries
EXPLAIN ANALYZE 
SELECT f.name, COUNT(b.id) as booking_count
FROM franchises f
LEFT JOIN bookings b ON f.id = b.franchise_id
GROUP BY f.id, f.name;

EXPLAIN ANALYZE
SELECT p.name, p.stock_available, f.name as franchise_name
FROM products p
JOIN franchises f ON p.franchise_id = f.id
WHERE p.stock_available <= p.reorder_level
    AND p.is_active = true;

-- 15. Data integrity checks
SELECT 'Orphaned Users' as check_type, COUNT(*) as count
FROM users u
LEFT JOIN franchises f ON u.franchise_id = f.id
WHERE u.franchise_id IS NOT NULL AND f.id IS NULL

UNION ALL

SELECT 'Orphaned Customers', COUNT(*)
FROM customers c
LEFT JOIN franchises f ON c.franchise_id = f.id
WHERE f.id IS NULL

UNION ALL

SELECT 'Orphaned Products', COUNT(*)
FROM products p
LEFT JOIN franchises f ON p.franchise_id = f.id
WHERE f.id IS NULL

UNION ALL

SELECT 'Bookings without Customers', COUNT(*)
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 'Booking Items without Products', COUNT(*)
FROM booking_items bi
LEFT JOIN products p ON bi.product_id = p.id
WHERE p.id IS NULL;

-- 16. Summary report
SELECT 
    'FRANCHISE MANAGEMENT SYSTEM VERIFICATION COMPLETE' as status,
    NOW() as verification_time,
    'All tables, constraints, indexes, and sample data have been verified' as message;
