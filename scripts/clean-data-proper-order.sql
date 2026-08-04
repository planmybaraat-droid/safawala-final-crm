-- Clean test data while preserving admin/staff accounts and system configuration
-- Delete in correct order to respect foreign key constraints

-- Step 1: Clear dependent records first
DELETE FROM activity_logs WHERE entity_type IN ('booking', 'customer', 'quote', 'invoice', 'payment');
DELETE FROM task_reminders;
DELETE FROM tasks WHERE id NOT IN (SELECT id FROM tasks WHERE title LIKE '%system%' OR title LIKE '%admin%');

-- Step 2: Clear chat system
DELETE FROM chat_messages;
DELETE FROM chat_room_members;
DELETE FROM chat_rooms WHERE type != 'system';

-- Step 3: Clear financial transactions and related data
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM payments;
DELETE FROM financial_transactions;

-- Step 4: Clear booking related data
DELETE FROM booking_items;
DELETE FROM bookings;

-- Step 5: Clear quote related data  
DELETE FROM quote_items;
DELETE FROM quotes;

-- Step 6: Clear laundry data
DELETE FROM laundry_batch_items;
DELETE FROM laundry_items;
DELETE FROM laundry_tracking;
DELETE FROM laundry_batches;

-- Step 7: Clear purchase data
DELETE FROM purchase_items;
DELETE FROM purchase_attachments;
DELETE FROM purchase_history;
DELETE FROM purchases;

-- Step 8: Clear expense data
DELETE FROM expenses;

-- Step 9: Clear payroll data (keep employee profiles)
DELETE FROM salary_advances;
DELETE FROM payroll_records;
DELETE FROM leave_requests;
DELETE FROM attendance_records;

-- Step 10: Clear customer data
DELETE FROM customers;

-- Step 11: Clear product inventory (keep product definitions for testing)
DELETE FROM product_items;
UPDATE products SET 
    stock_total = 0,
    stock_available = 0, 
    stock_booked = 0,
    stock_damaged = 0,
    stock_in_laundry = 0,
    usage_count = 0,
    damage_count = 0;

-- Step 12: Clear analytics and summary tables
DELETE FROM analytics_summary;
DELETE FROM category_financial_summary;
DELETE FROM monthly_financial_summary;
DELETE FROM payment_method_summary;
DELETE FROM invoice_summary;
DELETE FROM laundry_batch_summary;

-- Step 13: Clear integration test data
UPDATE integration_settings SET test_phone = NULL WHERE integration_name = 'WATI';

-- Reset sequences for clean numbering
SELECT setval('bookings_id_seq', 1, false);
SELECT setval('customers_id_seq', 1, false);
SELECT setval('quotes_id_seq', 1, false);
SELECT setval('invoices_id_seq', 1, false);

-- Verify cleanup
SELECT 
    'bookings' as table_name, COUNT(*) as remaining_records FROM bookings
UNION ALL
SELECT 'customers', COUNT(*) FROM customers  
UNION ALL
SELECT 'quotes', COUNT(*) FROM quotes
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'franchises', COUNT(*) FROM franchises;
