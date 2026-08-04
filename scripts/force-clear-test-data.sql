-- Creating a more robust cleanup script that handles foreign key constraints
-- Disable foreign key checks temporarily to avoid constraint violations
SET session_replication_role = replica;

-- Clear transactional data in correct order (child tables first)
DELETE FROM booking_items;
DELETE FROM quote_items;
DELETE FROM invoice_items;
DELETE FROM purchase_items;
DELETE FROM laundry_batch_items;
DELETE FROM laundry_items;
DELETE FROM payment_gateway_settings;
DELETE FROM task_reminders;
DELETE FROM chat_messages;
DELETE FROM chat_room_members;
DELETE FROM attendance_records;
DELETE FROM leave_requests;
DELETE FROM salary_advances;
DELETE FROM payroll_records;
DELETE FROM purchase_attachments;
DELETE FROM purchase_history;
DELETE FROM laundry_tracking;
DELETE FROM activity_logs;
DELETE FROM financial_transactions;

-- Clear main transactional tables
DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM bookings;
DELETE FROM quotes;
DELETE FROM purchases;
DELETE FROM laundry_batches;
DELETE FROM expenses;
DELETE FROM tasks;
DELETE FROM chat_rooms;

-- Clear customer and product data
DELETE FROM customers;
DELETE FROM product_items;
DELETE FROM products WHERE name NOT LIKE '%Sample%' AND name NOT LIKE '%Demo%';

-- Clear analytics and summary tables
DELETE FROM analytics_summary;
DELETE FROM category_financial_summary;
DELETE FROM monthly_financial_summary;
DELETE FROM payment_method_summary;
DELETE FROM invoice_summary;
DELETE FROM laundry_batch_summary;

-- Clear integration settings (keep structure but clear test data)
UPDATE integration_settings SET test_phone = NULL, api_key = NULL, secret = NULL;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences to start fresh
SELECT setval(pg_get_serial_sequence('bookings', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('customers', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('quotes', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('invoices', 'id'), 1, false);

-- Verify cleanup
SELECT 'Bookings remaining: ' || COUNT(*) FROM bookings;
SELECT 'Customers remaining: ' || COUNT(*) FROM customers;
SELECT 'Products remaining: ' || COUNT(*) FROM products;
SELECT 'Users remaining: ' || COUNT(*) FROM users;
SELECT 'Franchises remaining: ' || COUNT(*) FROM franchises;
