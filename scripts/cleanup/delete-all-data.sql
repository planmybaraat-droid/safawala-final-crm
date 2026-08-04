-- ⚠️  DANGER: This will DELETE ALL DATA from your database
-- This script preserves the schema (tables, columns, functions) but removes all rows
-- Run this ONLY if you want a fresh start

-- Disable triggers temporarily to speed up deletion
SET session_replication_role = 'replica';

-- Delete data in reverse dependency order (children first, parents last)

-- 1. Booking-related data
DELETE FROM booking_items;
DELETE FROM bookings;

-- 2. Invoice and payment data
DELETE FROM invoice_items WHERE TRUE;
DELETE FROM invoices WHERE TRUE;
DELETE FROM payments WHERE TRUE;

-- 3. Purchase data
DELETE FROM purchase_items WHERE TRUE;
DELETE FROM purchases WHERE TRUE;

-- 4. Laundry data
DELETE FROM laundry_batch_items WHERE TRUE;
DELETE FROM laundry_batches WHERE TRUE;
DELETE FROM laundry_items WHERE TRUE;
DELETE FROM laundry_bookings WHERE TRUE;

-- 5. Delivery data
DELETE FROM deliveries WHERE TRUE;

-- 6. Product and inventory data
DELETE FROM product_items WHERE TRUE;
DELETE FROM products WHERE TRUE;
DELETE FROM packages WHERE TRUE;
DELETE FROM package_items WHERE TRUE;
DELETE FROM package_variants WHERE TRUE;
DELETE FROM services WHERE TRUE;

-- 7. Customer data
DELETE FROM customers WHERE TRUE;

-- 8. Vendor data
DELETE FROM vendors WHERE TRUE;

-- 9. Staff and HR data
DELETE FROM attendance WHERE TRUE;
DELETE FROM payroll WHERE TRUE;
DELETE FROM staff WHERE TRUE;

-- 10. Expense data
DELETE FROM expenses WHERE TRUE;
DELETE FROM expense_categories WHERE TRUE;

-- 11. Settings data
DELETE FROM company_settings WHERE TRUE;
DELETE FROM branding_settings WHERE TRUE;
DELETE FROM banking_details WHERE TRUE;
DELETE FROM user_profiles WHERE TRUE;
DELETE FROM document_settings WHERE TRUE;
DELETE FROM locale_settings WHERE TRUE;

-- 12. Pricing data
DELETE FROM distance_pricing WHERE TRUE;
DELETE FROM distance_pricing_tiers WHERE TRUE;

-- 13. Activity and audit logs
DELETE FROM activity_logs WHERE TRUE;
DELETE FROM audit_logs WHERE TRUE;

-- 14. Chat and tasks
DELETE FROM chat_messages WHERE TRUE;
DELETE FROM chat_rooms WHERE TRUE;
DELETE FROM tasks WHERE TRUE;

-- 15. Analytics
DELETE FROM analytics_summary WHERE TRUE;

-- 16. Users (before franchises due to FK)
DELETE FROM users WHERE TRUE;

-- 17. Franchises (last - parent of most tables)
DELETE FROM franchises WHERE TRUE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Reset sequences to start from 1 (for tables with SERIAL columns)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER SEQUENCE IF EXISTS %I.%I_id_seq RESTART WITH 1', r.schemaname, r.tablename);
        EXCEPTION 
            WHEN undefined_table THEN 
                -- Sequence doesn't exist, skip
                NULL;
        END;
    END LOOP;
END $$;

-- Verification: Show row counts
SELECT 
    'franchises' as table_name, COUNT(*) as row_count FROM franchises
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'company_settings', COUNT(*) FROM company_settings
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
ORDER BY table_name;

SELECT '✅ All data deleted successfully. Database is now empty but schema remains intact.' AS status;
