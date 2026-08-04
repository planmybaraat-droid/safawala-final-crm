-- Remove all bot and chat related functionality from the database

-- Drop chat-related tables
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_room_members CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;

-- Remove any bot-related demo data
DELETE FROM customers WHERE name LIKE '%Test%' OR name LIKE '%Demo%' OR name LIKE '%Auto%' OR email LIKE '%test%' OR email LIKE '%demo%' OR email LIKE '%auto%';
DELETE FROM products WHERE name LIKE '%Test%' OR name LIKE '%Demo%' OR name LIKE '%Bot%' OR sku LIKE '%TEST%' OR sku LIKE '%DEMO%' OR sku LIKE '%BOT%';
DELETE FROM vendors WHERE name LIKE '%Test%' OR name LIKE '%Demo%' OR name LIKE '%Auto%' OR email LIKE '%test%' OR email LIKE '%demo%' OR email LIKE '%auto%';
DELETE FROM bookings WHERE id IN (
    SELECT b.id FROM bookings b 
    JOIN customers c ON b.customer_id = c.id 
    WHERE c.name LIKE '%Test%' OR c.name LIKE '%Demo%' OR c.name LIKE '%Auto%'
);
DELETE FROM expenses WHERE description LIKE '%Test%' OR description LIKE '%Demo%' OR description LIKE '%Auto%';
DELETE FROM laundry_batches WHERE batch_name LIKE '%Test%' OR batch_name LIKE '%Demo%';
DELETE FROM deliveries WHERE driver_name LIKE '%Test%' OR driver_name LIKE '%Demo%';
DELETE FROM quotes WHERE quote_number LIKE '%TEST%' OR quote_number LIKE '%DEMO%';
DELETE FROM notifications WHERE title LIKE '%Test%' OR title LIKE '%Demo%' OR title LIKE '%Auto%' OR message LIKE '%test%' OR message LIKE '%demo%' OR message LIKE '%bot%';
DELETE FROM packages WHERE name LIKE '%Test%' OR name LIKE '%Demo%' OR name LIKE '%Auto%';
DELETE FROM invoices WHERE invoice_number LIKE '%TEST%' OR invoice_number LIKE '%DEMO%';
DELETE FROM tasks WHERE title LIKE '%Test%' OR title LIKE '%Demo%' OR description LIKE '%test%' OR description LIKE '%demo%' OR description LIKE '%bot%';

-- Remove any staff records that were created for testing
DELETE FROM staff WHERE name LIKE '%Test%' OR name LIKE '%Demo%' OR email LIKE '%test%' OR email LIKE '%demo%';
DELETE FROM attendance WHERE staff_id IN (
    SELECT id FROM staff WHERE name LIKE '%Test%' OR name LIKE '%Demo%'
);
DELETE FROM payroll WHERE staff_id IN (
    SELECT id FROM staff WHERE name LIKE '%Test%' OR name LIKE '%Demo%'
);

-- Drop any bot-related indexes
DROP INDEX IF EXISTS idx_customers_test;
DROP INDEX IF EXISTS idx_products_test;
DROP INDEX IF EXISTS idx_bookings_test;

-- Clean up any orphaned records
DELETE FROM booking_items WHERE booking_id NOT IN (SELECT id FROM bookings);
DELETE FROM package_sub_packages WHERE package_id NOT IN (SELECT id FROM packages);
DELETE FROM package_variants WHERE package_id NOT IN (SELECT id FROM packages);

-- Vacuum tables to reclaim space
VACUUM ANALYZE customers;
VACUUM ANALYZE products;
VACUUM ANALYZE bookings;
VACUUM ANALYZE vendors;
VACUUM ANALYZE expenses;
VACUUM ANALYZE notifications;

SELECT 'Bot functionality and test data removed successfully!' as message;
