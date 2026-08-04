-- ============================================
-- RESET ALL DATA FOR mysafawale@gmail.com FRANCHISE
-- Run this in Supabase SQL Editor
-- This will delete ALL data (customers, bookings, products, etc.) 
-- for ONLY the mysafawale@gmail.com franchise
-- ============================================

-- Step 1: Show current data counts
WITH franchise_info AS (
    SELECT f.id as franchise_id, f.name as franchise_name
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
SELECT 
    '=== BEFORE DELETION ===' as info,
    fi.franchise_name,
    (SELECT COUNT(*) FROM customers WHERE franchise_id = fi.franchise_id) as customers,
    (SELECT COUNT(*) FROM bookings WHERE franchise_id = fi.franchise_id) as bookings,
    (SELECT COUNT(*) FROM products WHERE franchise_id = fi.franchise_id) as products,
    (SELECT COUNT(*) FROM users WHERE franchise_id = fi.franchise_id) as users_count
FROM franchise_info fi;

-- Step 2: Delete in correct order (children first, parents last)

-- Delete deliveries for this franchise
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM deliveries 
WHERE booking_id IN (
    SELECT id FROM bookings WHERE franchise_id = (SELECT franchise_id FROM franchise_info)
);

-- Delete booking_items
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM booking_items 
WHERE booking_id IN (
    SELECT id FROM bookings WHERE franchise_id = (SELECT franchise_id FROM franchise_info)
);

-- Delete payments
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM payments 
WHERE booking_id IN (
    SELECT id FROM bookings WHERE franchise_id = (SELECT franchise_id FROM franchise_info)
);

-- Delete bookings
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM bookings 
WHERE franchise_id = (SELECT franchise_id FROM franchise_info);

-- Delete quotes (references customers)
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM quotes 
WHERE customer_id IN (
    SELECT id FROM customers WHERE franchise_id = (SELECT franchise_id FROM franchise_info)
);

-- Delete customers
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM customers 
WHERE franchise_id = (SELECT franchise_id FROM franchise_info);

-- Delete products for this franchise (optional - comment out if you want to keep products)
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM products 
WHERE franchise_id = (SELECT franchise_id FROM franchise_info);

-- Delete expense categories
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM expense_categories 
WHERE franchise_id = (SELECT franchise_id FROM franchise_info);

-- Delete expenses
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM expenses 
WHERE franchise_id = (SELECT franchise_id FROM franchise_info);

-- Step 3: Keep the franchise and admin user, just clean the data
-- (We're NOT deleting the franchise or the admin user)

-- Step 4: Verify deletion
WITH franchise_info AS (
    SELECT f.id as franchise_id, f.name as franchise_name
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
SELECT 
    '=== AFTER DELETION ===' as info,
    fi.franchise_name,
    (SELECT COUNT(*) FROM customers WHERE franchise_id = fi.franchise_id) as customers_remaining,
    (SELECT COUNT(*) FROM bookings WHERE franchise_id = fi.franchise_id) as bookings_remaining,
    (SELECT COUNT(*) FROM products WHERE franchise_id = fi.franchise_id) as products_remaining,
    (SELECT COUNT(*) FROM users WHERE franchise_id = fi.franchise_id) as users_remaining
FROM franchise_info fi;

-- Step 5: Show franchise is still intact
SELECT 
    '=== FRANCHISE STILL EXISTS ===' as info,
    f.id,
    f.name,
    f.code,
    u.name as admin_name,
    u.email as admin_email
FROM users u
JOIN franchises f ON u.franchise_id = f.id
WHERE u.email = 'mysafawale@gmail.com';
