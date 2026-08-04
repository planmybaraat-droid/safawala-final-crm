-- ============================================
-- DELETE ALL CUSTOMERS
-- Run this in Supabase SQL Editor
-- CAUTION: This will delete ALL customers
-- ============================================

-- Step 1: Show what will be deleted
SELECT 
    'Will delete ' || COUNT(*) || ' customers' as warning
FROM customers;

-- Step 2: Delete related data first (if you want to keep data integrity)
-- Delete booking_items linked to bookings of these customers
DELETE FROM booking_items 
WHERE booking_id IN (
    SELECT id FROM bookings WHERE customer_id IN (SELECT id FROM customers)
);

-- Delete bookings for all customers
DELETE FROM bookings 
WHERE customer_id IN (SELECT id FROM customers);

-- Delete payments for all customers
DELETE FROM payments 
WHERE customer_id IN (SELECT id FROM customers);

-- Step 3: Now delete all customers
DELETE FROM customers;

-- Step 4: Reset the sequence (so next customer gets ID starting from 1)
ALTER SEQUENCE IF EXISTS customers_id_seq RESTART WITH 1;

-- Step 5: Verify deletion
SELECT 
    'Customers remaining:' as status, 
    COUNT(*) as count 
FROM customers;
