-- Check current customers data
\echo '============================================'
\echo 'CUSTOMER DATA CHECK'
\echo '============================================'
\echo ''

-- Count total customers
\echo '1. Total Customers:'
SELECT COUNT(*) as total_customers FROM customers;
\echo ''

-- Show customers grouped by franchise
\echo '2. Customers by Franchise:'
SELECT 
    f.name as franchise_name,
    f.code as franchise_code,
    COUNT(c.id) as customer_count
FROM franchises f
LEFT JOIN customers c ON c.franchise_id = f.id
GROUP BY f.id, f.name, f.code
ORDER BY f.name;
\echo ''

-- Show all customers with basic info
\echo '3. All Customers (with franchise):'
SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    f.name as franchise_name,
    c.created_at
FROM customers c
LEFT JOIN franchises f ON c.franchise_id = f.id
ORDER BY c.created_at DESC
LIMIT 20;
\echo ''

-- Check related bookings
\echo '4. Bookings per Customer:'
SELECT 
    c.name as customer_name,
    COUNT(b.id) as booking_count,
    SUM(b.total_amount) as total_spent
FROM customers c
LEFT JOIN bookings b ON b.customer_id = c.id
GROUP BY c.id, c.name
HAVING COUNT(b.id) > 0
ORDER BY booking_count DESC;
\echo ''

\echo '============================================'
\echo 'CHECK COMPLETE'
\echo '============================================'
