-- Comprehensive SQL script to fetch all real data from Safawala CRM
-- This script retrieves data from all active tables in the system

-- 1. Fetch all users with their roles and franchise information
SELECT 
    id,
    email,
    full_name,
    role,
    franchise_id,
    is_active,
    created_at,
    updated_at
FROM users 
ORDER BY created_at DESC;

-- 2. Fetch all franchises
SELECT 
    id,
    name,
    location,
    contact_email,
    contact_phone,
    is_active,
    created_at,
    updated_at
FROM franchises 
ORDER BY name;

-- 3. Fetch all customers
SELECT 
    id,
    name,
    email,
    phone,
    address,
    franchise_id,
    created_at,
    updated_at
FROM customers 
ORDER BY created_at DESC;

-- 4. Fetch all products with stock information
SELECT 
    id,
    name,
    description,
    price,
    stock_quantity,
    category,
    franchise_id,
    is_active,
    created_at,
    updated_at
FROM products 
ORDER BY name;

-- 5. Fetch all package sets (new packages table)
SELECT 
    id,
    name,
    description,
    package_type,
    category,
    base_price,
    is_active,
    franchise_id,
    created_by,
    created_at,
    updated_at
FROM package_sets 
ORDER BY created_at DESC;

-- 6. Fetch all bookings with customer and franchise details
SELECT 
    b.id,
    b.customer_id,
    c.name as customer_name,
    b.franchise_id,
    f.name as franchise_name,
    b.booking_date,
    b.event_date,
    b.status,
    b.total_amount,
    b.notes,
    b.created_at,
    b.updated_at
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN franchises f ON b.franchise_id = f.id
ORDER BY b.created_at DESC;

-- 7. Fetch all notifications
SELECT 
    id,
    title,
    message,
    type,
    user_id,
    franchise_id,
    is_read,
    created_at,
    updated_at
FROM notifications 
ORDER BY created_at DESC;

-- 8. Fetch booking items (if table exists)
SELECT 
    bi.id,
    bi.booking_id,
    bi.product_id,
    p.name as product_name,
    bi.quantity,
    bi.unit_price,
    bi.total_price
FROM booking_items bi
LEFT JOIN products p ON bi.product_id = p.id
ORDER BY bi.booking_id;

-- 9. Get summary statistics
SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM users
UNION ALL
SELECT 
    'Total Franchises' as metric,
    COUNT(*) as count
FROM franchises
UNION ALL
SELECT 
    'Total Customers' as metric,
    COUNT(*) as count
FROM customers
UNION ALL
SELECT 
    'Total Products' as metric,
    COUNT(*) as count
FROM products
UNION ALL
SELECT 
    'Total Package Sets' as metric,
    COUNT(*) as count
FROM package_sets
UNION ALL
SELECT 
    'Total Bookings' as metric,
    COUNT(*) as count
FROM bookings
UNION ALL
SELECT 
    'Total Notifications' as metric,
    COUNT(*) as count
FROM notifications;

-- 10. Revenue analysis
SELECT 
    DATE_TRUNC('month', booking_date) as month,
    COUNT(*) as total_bookings,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as average_booking_value
FROM bookings 
WHERE status != 'cancelled'
GROUP BY DATE_TRUNC('month', booking_date)
ORDER BY month DESC;

-- 11. Franchise performance
SELECT 
    f.name as franchise_name,
    COUNT(b.id) as total_bookings,
    SUM(b.total_amount) as total_revenue,
    COUNT(c.id) as total_customers,
    COUNT(p.id) as total_products
FROM franchises f
LEFT JOIN bookings b ON f.id = b.franchise_id
LEFT JOIN customers c ON f.id = c.franchise_id
LEFT JOIN products p ON f.id = p.franchise_id
GROUP BY f.id, f.name
ORDER BY total_revenue DESC NULLS LAST;

-- 12. Recent activity (last 30 days)
SELECT 
    'booking' as activity_type,
    id::text as record_id,
    'New booking created' as description,
    created_at
FROM bookings 
WHERE created_at >= NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
    'customer' as activity_type,
    id::text as record_id,
    'New customer registered' as description,
    created_at
FROM customers 
WHERE created_at >= NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
    'package' as activity_type,
    id::text as record_id,
    'New package created' as description,
    created_at
FROM package_sets 
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
