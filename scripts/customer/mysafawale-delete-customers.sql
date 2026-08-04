-- ============================================
-- DELETE ALL CUSTOMERS FOR mysafawale@gmail.com FRANCHISE
-- Run this in Supabase SQL Editor
-- This will ONLY delete customers for this specific franchise
-- ============================================

-- Step 1: Show what will be deleted
WITH franchise_info AS (
    SELECT f.id as franchise_id, f.name as franchise_name
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
SELECT 
    '=== DELETION PREVIEW ===' as info,
    fi.franchise_name,
    COUNT(c.id) as customers_to_delete,
    COUNT(DISTINCT b.id) as bookings_to_delete,
    COUNT(DISTINCT bi.id) as booking_items_to_delete
FROM franchise_info fi
LEFT JOIN customers c ON c.franchise_id = fi.franchise_id
LEFT JOIN bookings b ON b.customer_id = c.id
LEFT JOIN booking_items bi ON bi.booking_id = b.id
GROUP BY fi.franchise_name;

-- Step 2: Get the franchise_id (store this for reference)
SELECT 
    '=== FRANCHISE ID ===' as info,
    f.id as franchise_id,
    f.name as franchise_name
FROM users u
JOIN franchises f ON u.franchise_id = f.id
WHERE u.email = 'mysafawale@gmail.com';

-- Step 3: Delete booking_items for bookings of this franchise's customers
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM booking_items 
WHERE booking_id IN (
    SELECT b.id 
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    WHERE c.franchise_id = (SELECT franchise_id FROM franchise_info)
);

-- Step 4: Delete bookings for this franchise's customers
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM bookings 
WHERE customer_id IN (
    SELECT id FROM customers 
    WHERE franchise_id = (SELECT franchise_id FROM franchise_info)
);

-- Step 5: Delete payments for this franchise's customers (if payments table exists)
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM payments 
WHERE customer_id IN (
    SELECT id FROM customers 
    WHERE franchise_id = (SELECT franchise_id FROM franchise_info)
)
-- If payments table doesn't exist, this will show an error but won't stop execution
ON CONFLICT DO NOTHING;

-- Step 6: Now delete all customers for this franchise
WITH franchise_info AS (
    SELECT f.id as franchise_id
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
DELETE FROM customers 
WHERE franchise_id = (SELECT franchise_id FROM franchise_info);

-- Step 7: Verify deletion
WITH franchise_info AS (
    SELECT f.id as franchise_id, f.name as franchise_name
    FROM users u
    JOIN franchises f ON u.franchise_id = f.id
    WHERE u.email = 'mysafawale@gmail.com'
)
SELECT 
    '=== DELETION COMPLETE ===' as status,
    fi.franchise_name,
    COUNT(c.id) as customers_remaining
FROM franchise_info fi
LEFT JOIN customers c ON c.franchise_id = fi.franchise_id
GROUP BY fi.franchise_name;
