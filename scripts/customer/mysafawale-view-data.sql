-- ============================================
-- VIEW DATA FOR mysafawale@gmail.com FRANCHISE
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Find the franchise for mysafawale@gmail.com
SELECT 
    '=== FRANCHISE INFO ===' as section,
    u.email as user_email,
    u.name as user_name,
    u.role,
    f.id as franchise_id,
    f.name as franchise_name,
    f.code as franchise_code,
    f.city,
    f.created_at::date as created_date
FROM users u
LEFT JOIN franchises f ON u.franchise_id = f.id
WHERE u.email = 'mysafawale@gmail.com';

-- Step 2: Count data for this franchise
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
SELECT 
    '=== DATA COUNTS ===' as section,
    (SELECT COUNT(*) FROM customers WHERE franchise_id = (SELECT franchise_id FROM franchise_info)) as total_customers,
    (SELECT COUNT(*) FROM bookings WHERE franchise_id = (SELECT franchise_id FROM franchise_info)) as total_bookings,
    (SELECT COUNT(*) FROM users WHERE franchise_id = (SELECT franchise_id FROM franchise_info)) as total_users,
    (SELECT COUNT(*) FROM products WHERE franchise_id = (SELECT franchise_id FROM franchise_info)) as total_products;

-- Step 3: List all customers for this franchise
SELECT 
    '=== CUSTOMERS ===' as section,
    c.id,
    c.name,
    c.phone,
    c.email,
    c.created_at::date as created_date,
    COUNT(b.id) as booking_count
FROM users u
JOIN franchises f ON u.franchise_id = f.id
JOIN customers c ON c.franchise_id = f.id
LEFT JOIN bookings b ON b.customer_id = c.id
WHERE u.email = 'mysafawale@gmail.com'
GROUP BY c.id, c.name, c.phone, c.email, c.created_at
ORDER BY c.created_at DESC;

-- Step 4: List all bookings for this franchise
SELECT 
    '=== BOOKINGS ===' as section,
    b.id,
    b.booking_number,
    c.name as customer_name,
    b.event_date,
    b.total_amount,
    b.status,
    b.created_at::date as created_date
FROM users u
JOIN franchises f ON u.franchise_id = f.id
JOIN bookings b ON b.franchise_id = f.id
LEFT JOIN customers c ON c.id = b.customer_id
WHERE u.email = 'mysafawale@gmail.com'
ORDER BY b.created_at DESC;

-- Step 5: List all users for this franchise
SELECT 
    '=== USERS ===' as section,
    u2.id,
    u2.name,
    u2.email,
    u2.role,
    u2.is_active,
    u2.created_at::date as created_date
FROM users u
JOIN franchises f ON u.franchise_id = f.id
JOIN users u2 ON u2.franchise_id = f.id
WHERE u.email = 'mysafawale@gmail.com'
ORDER BY u2.created_at DESC;
