-- ============================================
-- VIEW ALL CUSTOMERS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Count total customers
SELECT 'Total Customers:' as info, COUNT(*) as count FROM customers;

-- 2. Customers grouped by franchise
SELECT 
    f.name as franchise_name,
    f.code as franchise_code,
    COUNT(c.id) as customer_count
FROM franchises f
LEFT JOIN customers c ON c.franchise_id = f.id
GROUP BY f.id, f.name, f.code
ORDER BY customer_count DESC;

-- 3. Sample of customers (first 10)
SELECT 
    c.name,
    c.phone,
    c.email,
    f.name as franchise,
    c.created_at::date as created_date
FROM customers c
LEFT JOIN franchises f ON c.franchise_id = f.id
ORDER BY c.created_at DESC
LIMIT 10;

-- 4. Customers with their booking count
SELECT 
    c.name,
    c.phone,
    f.name as franchise,
    COUNT(b.id) as total_bookings,
    COALESCE(SUM(b.total_amount), 0) as total_spent
FROM customers c
LEFT JOIN franchises f ON c.franchise_id = f.id
LEFT JOIN bookings b ON b.customer_id = c.id
GROUP BY c.id, c.name, c.phone, f.name
ORDER BY total_bookings DESC;
