-- Verification script to check what data remains after cleanup
-- Run this after the cleanup script to verify results

SELECT 'PRESERVED DATA' as category, 'Users (Admin/Staff)' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'PRESERVED DATA', 'Franchises', COUNT(*) FROM franchises
UNION ALL
SELECT 'PRESERVED DATA', 'Employee Profiles', COUNT(*) FROM employee_profiles
UNION ALL
SELECT 'PRESERVED DATA', 'Product Categories', COUNT(*) FROM product_categories
UNION ALL
SELECT 'PRESERVED DATA', 'Payment Methods', COUNT(*) FROM payment_methods
UNION ALL
SELECT 'PRESERVED DATA', 'Shifts', COUNT(*) FROM shifts
UNION ALL
SELECT 'PRESERVED DATA', 'Leave Types', COUNT(*) FROM leave_types
UNION ALL
SELECT 'CLEARED DATA', 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'CLEARED DATA', 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'CLEARED DATA', 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'CLEARED DATA', 'Quotes', COUNT(*) FROM quotes
UNION ALL
SELECT 'CLEARED DATA', 'Invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'CLEARED DATA', 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'CLEARED DATA', 'Expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'CLEARED DATA', 'Purchases', COUNT(*) FROM purchases
ORDER BY category, table_name;
