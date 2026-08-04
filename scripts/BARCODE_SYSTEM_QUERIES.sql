-- =====================================================
-- BARCODE SYSTEM - QUICK REFERENCE SQL
-- =====================================================
-- Common queries and operations for barcode management
-- =====================================================

-- =====================================================
-- 1. BARCODE STATUS CHECKS
-- =====================================================

-- Get status of a specific barcode
SELECT * FROM get_barcode_status('SAFA-001-A');

-- Check all available items
SELECT 
    pb.barcode,
    p.name AS product_name,
    p.category,
    pb.status,
    pb.last_scanned_at
FROM product_barcodes pb
JOIN products p ON p.id = pb.product_id
WHERE pb.status = 'available'
ORDER BY p.category, p.name;

-- Check currently rented items
SELECT 
    pb.barcode,
    p.name AS product_name,
    pkg.package_number AS booking_number,
    c.name AS customer_name,
    pkg.event_date,
    pb.last_scanned_at
FROM product_barcodes pb
JOIN products p ON p.id = pb.product_id
LEFT JOIN package_bookings pkg ON pkg.id = pb.current_booking_id
LEFT JOIN customers c ON c.id = pkg.customer_id
WHERE pb.status = 'rented'
ORDER BY pkg.event_date;

-- Check items in laundry
SELECT 
    pb.barcode,
    p.name AS product_name,
    lb.batch_number,
    v.name AS vendor_name,
    lbi.sent_at,
    lbi.expected_return_date,
    lbi.status
FROM product_barcodes pb
JOIN products p ON p.id = pb.product_id
LEFT JOIN laundry_barcode_items lbi ON lbi.barcode_id = pb.id
LEFT JOIN laundry_batches lb ON lb.id = lbi.batch_id
LEFT JOIN vendors v ON v.id = lb.vendor_id
WHERE pb.status = 'in_laundry'
ORDER BY lbi.sent_at DESC;

-- =====================================================
-- 2. BOOKING OPERATIONS
-- =====================================================

-- Get all barcoded items for a specific booking
SELECT 
    pb.barcode,
    p.name AS product_name,
    p.category,
    bbl.status AS link_status,
    bbl.assigned_at,
    bbl.delivered_at,
    bbl.returned_at
FROM booking_barcode_links bbl
JOIN product_barcodes pb ON pb.id = bbl.barcode_id
JOIN products p ON p.id = pb.product_id
WHERE bbl.booking_id = 'YOUR-BOOKING-UUID-HERE'
ORDER BY p.category, p.name;

-- Check what items haven't been delivered yet
SELECT 
    pb.barcode,
    p.name AS product_name,
    bbl.assigned_at
FROM booking_barcode_links bbl
JOIN product_barcodes pb ON pb.id = bbl.barcode_id
JOIN products p ON p.id = pb.product_id
WHERE bbl.booking_id = 'YOUR-BOOKING-UUID-HERE'
  AND bbl.delivered_at IS NULL
ORDER BY p.name;

-- Check what items haven't been returned yet
SELECT 
    pb.barcode,
    p.name AS product_name,
    bbl.delivered_at,
    pkg.return_date AS expected_return
FROM booking_barcode_links bbl
JOIN product_barcodes pb ON pb.id = bbl.barcode_id
JOIN products p ON p.id = pb.product_id
JOIN package_bookings pkg ON pkg.id = bbl.booking_id
WHERE bbl.booking_id = 'YOUR-BOOKING-UUID-HERE'
  AND bbl.delivered_at IS NOT NULL
  AND bbl.returned_at IS NULL
ORDER BY pkg.return_date;

-- =====================================================
-- 3. SCAN HISTORY & AUDIT
-- =====================================================

-- Recent scans (last 24 hours)
SELECT 
    bsh.scanned_at,
    bsh.barcode,
    bsh.scan_action,
    p.name AS product_name,
    u.name AS scanned_by,
    bsh.status_before,
    bsh.status_after
FROM barcode_scan_history bsh
LEFT JOIN product_barcodes pb ON pb.barcode = bsh.barcode
LEFT JOIN products p ON p.id = pb.product_id
LEFT JOIN users u ON u.id = bsh.scanned_by
WHERE bsh.scanned_at > NOW() - INTERVAL '24 hours'
ORDER BY bsh.scanned_at DESC;

-- Scan history for specific barcode
SELECT 
    bsh.scanned_at,
    bsh.scan_action,
    bsh.status_before,
    bsh.status_after,
    u.name AS scanned_by,
    pkg.package_number AS related_booking,
    bsh.notes
FROM barcode_scan_history bsh
LEFT JOIN users u ON u.id = bsh.scanned_by
LEFT JOIN package_bookings pkg ON pkg.id = bsh.booking_id
WHERE bsh.barcode = 'SAFA-001-A'
ORDER BY bsh.scanned_at DESC;

-- Most scanned items (popular products)
SELECT 
    pb.barcode,
    p.name AS product_name,
    p.category,
    pb.total_scans,
    pb.total_rentals,
    pb.total_laundry_cycles,
    pb.last_scanned_at
FROM product_barcodes pb
JOIN products p ON p.id = pb.product_id
ORDER BY pb.total_scans DESC
LIMIT 20;

-- User scan activity
SELECT 
    u.name AS user_name,
    COUNT(*) AS total_scans,
    COUNT(DISTINCT bsh.barcode) AS unique_items_scanned,
    MIN(bsh.scanned_at) AS first_scan,
    MAX(bsh.scanned_at) AS last_scan
FROM barcode_scan_history bsh
JOIN users u ON u.id = bsh.scanned_by
GROUP BY u.id, u.name
ORDER BY total_scans DESC;

-- =====================================================
-- 4. LAUNDRY OPERATIONS
-- =====================================================

-- Items currently in laundry
SELECT 
    lb.batch_number,
    v.name AS vendor_name,
    COUNT(lbi.id) AS item_count,
    lb.total_amount,
    lb.sent_date,
    lb.expected_return_date,
    lb.status AS batch_status
FROM laundry_batches lb
JOIN vendors v ON v.id = lb.vendor_id
LEFT JOIN laundry_barcode_items lbi ON lbi.batch_id = lb.id
WHERE lb.status IN ('sent', 'in_process')
GROUP BY lb.id, v.name
ORDER BY lb.sent_date DESC;

-- Items in a specific laundry batch
SELECT 
    pb.barcode,
    p.name AS product_name,
    p.category,
    lbi.status,
    lbi.sent_at,
    lbi.received_at,
    lbi.cleaning_cost
FROM laundry_barcode_items lbi
JOIN product_barcodes pb ON pb.id = lbi.barcode_id
JOIN products p ON p.id = pb.product_id
WHERE lbi.batch_id = 'YOUR-BATCH-UUID-HERE'
ORDER BY p.category, p.name;

-- Overdue laundry items
SELECT 
    lb.batch_number,
    v.name AS vendor_name,
    pb.barcode,
    p.name AS product_name,
    lbi.expected_return_date,
    CURRENT_DATE - lbi.expected_return_date AS days_overdue
FROM laundry_barcode_items lbi
JOIN product_barcodes pb ON pb.id = lbi.barcode_id
JOIN products p ON p.id = pb.product_id
JOIN laundry_batches lb ON lb.id = lbi.batch_id
JOIN vendors v ON v.id = lb.vendor_id
WHERE lbi.expected_return_date < CURRENT_DATE
  AND lbi.status NOT IN ('received')
ORDER BY days_overdue DESC;

-- =====================================================
-- 5. INVENTORY REPORTS
-- =====================================================

-- Stock summary by status
SELECT 
    pb.status,
    COUNT(*) AS item_count,
    COUNT(DISTINCT pb.product_id) AS unique_products
FROM product_barcodes pb
GROUP BY pb.status
ORDER BY item_count DESC;

-- Stock by product
SELECT 
    p.name AS product_name,
    p.category,
    COUNT(*) AS total_items,
    SUM(CASE WHEN pb.status = 'available' THEN 1 ELSE 0 END) AS available,
    SUM(CASE WHEN pb.status = 'rented' THEN 1 ELSE 0 END) AS rented,
    SUM(CASE WHEN pb.status = 'in_laundry' THEN 1 ELSE 0 END) AS in_laundry,
    SUM(CASE WHEN pb.status = 'damaged' THEN 1 ELSE 0 END) AS damaged
FROM product_barcodes pb
JOIN products p ON p.id = pb.product_id
GROUP BY p.id, p.name, p.category
ORDER BY p.category, p.name;

-- Items never scanned (potential issues)
SELECT 
    pb.barcode,
    p.name AS product_name,
    p.category,
    pb.created_at,
    pb.total_scans
FROM product_barcodes pb
JOIN products p ON p.id = pb.product_id
WHERE pb.total_scans = 0
ORDER BY pb.created_at DESC;

-- =====================================================
-- 6. MAINTENANCE & UTILITIES
-- =====================================================

-- Find duplicate barcodes (shouldn't exist, but good to check)
SELECT 
    barcode,
    COUNT(*) AS duplicate_count
FROM product_barcodes
GROUP BY barcode
HAVING COUNT(*) > 1;

-- Find orphaned barcode links (bookings deleted but links remain)
SELECT 
    bbl.id,
    bbl.booking_id,
    pb.barcode,
    bbl.assigned_at
FROM booking_barcode_links bbl
LEFT JOIN package_bookings pkg ON pkg.id = bbl.booking_id
JOIN product_barcodes pb ON pb.id = bbl.barcode_id
WHERE pkg.id IS NULL;

-- Clean up old scan history (older than 1 year)
-- CAUTION: This deletes data permanently
-- DELETE FROM barcode_scan_history 
-- WHERE scanned_at < NOW() - INTERVAL '1 year';

-- Reset barcode status to available (careful!)
-- UPDATE product_barcodes 
-- SET status = 'available', 
--     current_booking_id = NULL 
-- WHERE barcode = 'SAFA-001-A';

-- =====================================================
-- 7. ANALYTICS QUERIES
-- =====================================================

-- Busiest scanning hours
SELECT 
    EXTRACT(HOUR FROM scanned_at) AS hour,
    COUNT(*) AS scan_count
FROM barcode_scan_history
WHERE scanned_at > NOW() - INTERVAL '30 days'
GROUP BY hour
ORDER BY hour;

-- Most active scanning days
SELECT 
    DATE(scanned_at) AS scan_date,
    COUNT(*) AS scan_count,
    COUNT(DISTINCT scanned_by) AS unique_users,
    COUNT(DISTINCT barcode) AS unique_items
FROM barcode_scan_history
WHERE scanned_at > NOW() - INTERVAL '30 days'
GROUP BY scan_date
ORDER BY scan_date DESC;

-- Scan actions breakdown
SELECT 
    scan_action,
    COUNT(*) AS action_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM barcode_scan_history
WHERE scanned_at > NOW() - INTERVAL '30 days'
GROUP BY scan_action
ORDER BY action_count DESC;

-- Product lifecycle analysis
SELECT 
    p.name AS product_name,
    AVG(pb.total_rentals) AS avg_rentals,
    AVG(pb.total_laundry_cycles) AS avg_laundry,
    AVG(pb.total_scans) AS avg_scans,
    COUNT(pb.id) AS total_items
FROM product_barcodes pb
JOIN products p ON p.id = pb.product_id
GROUP BY p.id, p.name
HAVING COUNT(pb.id) > 0
ORDER BY avg_rentals DESC;

-- =====================================================
-- 8. QUICK ACTION FUNCTIONS
-- =====================================================

-- Record a scan (using helper function)
-- SELECT record_barcode_scan(
--     'SAFA-001-A',              -- barcode
--     'booking_add',             -- action
--     'booking-uuid',            -- booking_id
--     'user-uuid',               -- user_id
--     'Added to booking',        -- notes
--     'franchise-uuid'           -- franchise_id
-- );

-- Bulk update status (e.g., mark multiple items as available)
-- UPDATE product_barcodes 
-- SET status = 'available',
--     current_booking_id = NULL
-- WHERE barcode IN ('SAFA-001-A', 'SAFA-001-B', 'SAFA-001-C');

-- =====================================================
-- 9. PERFORMANCE MONITORING
-- =====================================================

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS times_used,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN (
    'product_barcodes',
    'barcode_scan_history',
    'booking_barcode_links',
    'laundry_barcode_items'
)
ORDER BY tablename, times_used DESC;

-- Table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE tablename IN (
    'product_barcodes',
    'barcode_scan_history',
    'booking_barcode_links',
    'laundry_barcode_items'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- END OF QUICK REFERENCE
-- =====================================================
