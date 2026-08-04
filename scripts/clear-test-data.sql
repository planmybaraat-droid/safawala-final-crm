-- Clear Test Data Script
-- This script removes test/sample data while preserving admin/staff login details
-- and essential system configuration

-- Start transaction to ensure data integrity
BEGIN;

-- Clear transactional data (main business data)
DELETE FROM booking_items;
DELETE FROM bookings;
DELETE FROM quote_items;
DELETE FROM quotes;
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM payments;
DELETE FROM customers;

-- Clear inventory and product data
DELETE FROM product_items;
DELETE FROM products;

-- Clear laundry data
DELETE FROM laundry_batch_items;
DELETE FROM laundry_items;
DELETE FROM laundry_tracking;
DELETE FROM laundry_batches;

-- Clear purchase data
DELETE FROM purchase_items;
DELETE FROM purchase_attachments;
DELETE FROM purchase_history;
DELETE FROM purchases;

-- Clear expense data
DELETE FROM expenses;

-- Clear financial transaction data
DELETE FROM financial_transactions;

-- Clear attendance and payroll data (but keep employee profiles)
DELETE FROM attendance_records;
DELETE FROM payroll_records;
DELETE FROM salary_advances;
DELETE FROM leave_requests;

-- Clear task and chat data
DELETE FROM task_reminders;
DELETE FROM tasks;
DELETE FROM chat_messages;
DELETE FROM chat_room_members;
DELETE FROM chat_rooms;

-- Clear analytics and summary data
DELETE FROM analytics_summary;
DELETE FROM activity_logs;

-- Clear integration test data
UPDATE integration_settings SET test_phone = NULL WHERE test_phone IS NOT NULL;

-- Reset auto-increment sequences/counters if needed
-- Note: PostgreSQL uses sequences, but since we're using UUIDs, this may not be necessary

-- Commit the transaction
COMMIT;

-- Display summary of what was cleared
SELECT 
    'Data cleanup completed successfully. Preserved user accounts and system settings.' as status,
    (SELECT COUNT(*) FROM users) as remaining_users,
    (SELECT COUNT(*) FROM franchises) as remaining_franchises,
    (SELECT COUNT(*) FROM bookings) as remaining_bookings,
    (SELECT COUNT(*) FROM customers) as remaining_customers,
    (SELECT COUNT(*) FROM products) as remaining_products;
