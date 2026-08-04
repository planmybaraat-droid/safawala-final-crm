-- ============================================================================
-- FIX_PRODUCT_BOOKINGS_VISIBILITY.sql
-- 
-- This script fixes the visibility issues with product bookings (rentals/sales)
-- in the bookings page by:
-- 1. Ensuring all rental orders have is_quote = false
-- 2. Ensuring all order types are properly set
-- 3. Standardizing order numbers for better identification
-- ============================================================================

-- Step 1: Fix is_quote flag for all rental orders
-- This ensures they show up in the bookings list (not quotes list)
UPDATE product_orders
SET is_quote = false
WHERE booking_type = 'rental' AND (is_quote IS NULL OR is_quote = true);

-- Step 2: Fix is_quote flag for all sale orders  
UPDATE product_orders
SET is_quote = false
WHERE booking_type = 'sale' AND (is_quote IS NULL OR is_quote = true);

-- Step 3: Set booking_type for any NULL values (default to rental)
UPDATE product_orders 
SET booking_type = 'rental' 
WHERE booking_type IS NULL;

-- Step 4: Check franchise_id consistency
-- Note: You may need to set franchise_id for records that have NULL
-- This query shows records without franchise_id that might need assignment
SELECT 'Records without franchise_id that may need assignment:' AS info;
SELECT 
    COUNT(*) as count_without_franchise,
    booking_type
FROM product_orders 
WHERE franchise_id IS NULL
GROUP BY booking_type;

-- Step 4: Standardize rental order numbers (optional - only if you want consistent naming)
-- This changes QT*, BO-*, PO* prefixes to RNT* for rentals
-- Comment out these lines if you want to keep existing order numbers
/*
UPDATE product_orders 
SET order_number = 'RNT' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || RIGHT(id::text, 8)
WHERE booking_type = 'rental' 
AND (
    order_number LIKE 'QT%' OR 
    order_number LIKE 'BO-%' OR 
    order_number LIKE 'PO%'
);
*/

-- Verification queries
SELECT 'Product Orders Summary' AS check_name;
SELECT 
    booking_type,
    is_quote,
    COUNT(*) as count
FROM product_orders 
GROUP BY booking_type, is_quote
ORDER BY booking_type, is_quote;

SELECT 'Franchise Distribution' AS check_name;
SELECT 
    CASE 
        WHEN franchise_id IS NULL THEN 'NULL (Legacy)'
        ELSE 'Has Franchise ID'
    END as franchise_status,
    booking_type,
    COUNT(*) as count
FROM product_orders 
GROUP BY (franchise_id IS NULL), booking_type
ORDER BY franchise_status, booking_type;

SELECT 'Order Number Prefixes' AS check_name;
SELECT 
    booking_type,
    LEFT(order_number, 3) as prefix,
    COUNT(*) as count
FROM product_orders 
GROUP BY booking_type, LEFT(order_number, 3)
ORDER BY booking_type, prefix;

-- Success message
SELECT '✅ Product bookings visibility fix completed!' AS status;
SELECT 'Please hard refresh your browser (Cmd+Shift+R) and check the bookings page.' AS next_step;