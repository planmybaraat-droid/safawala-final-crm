-- ============================================
-- COMPLETE DATA OVERVIEW FOR mysafawale@gmail.com FRANCHISE
-- Run this in Supabase SQL Editor
-- This shows ALL data without deleting anything
-- ============================================

-- 1. FRANCHISE & USER INFO
SELECT '========== FRANCHISE & USER INFO ==========' as section;

SELECT 
    u.name as user_name,
    u.email as user_email,
    u.role,
    f.id as franchise_id,
    f.name as franchise_name,
    f.code as franchise_code,
    f.city,
    f.state,
    f.created_at::date as created_date
FROM users u
JOIN franchises f ON u.franchise_id = f.id
WHERE u.email = 'mysafawale@gmail.com';

-- 2. DATA COUNTS
SELECT '========== DATA COUNTS ==========' as section;

WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
SELECT 
    (SELECT COUNT(*) FROM customers WHERE franchise_id = (SELECT franchise_id FROM franchise_info)) as total_customers,
    (SELECT COUNT(*) FROM bookings WHERE franchise_id = (SELECT franchise_id FROM franchise_info)) as total_bookings,
    (SELECT COUNT(*) FROM quotes q JOIN customers c ON c.id = q.customer_id WHERE c.franchise_id = (SELECT franchise_id FROM franchise_info)) as total_quotes,
    (SELECT COUNT(*) FROM products WHERE franchise_id = (SELECT franchise_id FROM franchise_info)) as total_products,
    (SELECT COUNT(*) FROM users WHERE franchise_id = (SELECT franchise_id FROM franchise_info)) as total_users;

-- 3. CUSTOMERS LIST
SELECT '========== CUSTOMERS ==========' as section;

SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.city,
    c.created_at::date as created_date,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT q.id) as total_quotes,
    COALESCE(SUM(b.total_amount), 0) as total_spent
FROM users u
JOIN franchises f ON u.franchise_id = f.id
JOIN customers c ON c.franchise_id = f.id
LEFT JOIN bookings b ON b.customer_id = c.id
LEFT JOIN quotes q ON q.customer_id = c.id
WHERE u.email = 'mysafawale@gmail.com'
GROUP BY c.id, c.name, c.phone, c.email, c.city, c.created_at
ORDER BY c.created_at DESC;

-- 4. BOOKINGS LIST
SELECT '========== BOOKINGS ==========' as section;

SELECT 
    b.id,
    b.booking_number,
    c.name as customer_name,
    c.phone as customer_phone,
    b.event_type,
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

-- 5. QUOTES LIST
SELECT '========== QUOTES ==========' as section;

SELECT 
    q.id,
    q.quote_number,
    c.name as customer_name,
    c.phone as customer_phone,
    q.total_amount,
    q.status,
    q.valid_until,
    q.created_at::date as created_date
FROM users u
JOIN franchises f ON u.franchise_id = f.id
JOIN customers c ON c.franchise_id = f.id
JOIN quotes q ON q.customer_id = c.id
WHERE u.email = 'mysafawale@gmail.com'
ORDER BY q.created_at DESC;

-- 6. PRODUCTS LIST
SELECT '========== PRODUCTS ==========' as section;

SELECT 
    p.id,
    p.name,
    p.category,
    p.price,
    p.stock_quantity,
    p.is_active,
    p.created_at::date as created_date
FROM users u
JOIN franchises f ON u.franchise_id = f.id
JOIN products p ON p.franchise_id = f.id
WHERE u.email = 'mysafawale@gmail.com'
ORDER BY p.created_at DESC;

-- 7. USERS IN THIS FRANCHISE
SELECT '========== USERS ==========' as section;

SELECT 
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

-- 8. SUMMARY
SELECT '========== SUMMARY ==========' as section;

WITH franchise_info AS (
    SELECT f.id as franchise_id, f.name as franchise_name
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
SELECT 
    fi.franchise_name,
    (SELECT COUNT(*) FROM customers WHERE franchise_id = fi.franchise_id) || ' customers' as customers,
    (SELECT COUNT(*) FROM bookings WHERE franchise_id = fi.franchise_id) || ' bookings' as bookings,
    (SELECT COUNT(*) FROM quotes q JOIN customers c ON c.id = q.customer_id WHERE c.franchise_id = fi.franchise_id) || ' quotes' as quotes,
    (SELECT COUNT(*) FROM products WHERE franchise_id = fi.franchise_id) || ' products' as products,
    (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE franchise_id = fi.franchise_id) || ' INR total revenue' as revenue
FROM franchise_info fi;
