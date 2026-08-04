-- =====================================================
-- SAFAWALA CRM - PACKAGES MANAGEMENT SQL SCRIPT
-- =====================================================

-- 1. FETCH ALL PACKAGES WITH FRANCHISE DETAILS
-- =====================================================
SELECT 
    ps.id,
    ps.name,
    ps.description,
    ps.package_type,
    ps.category,
    ps.base_price,
    ps.is_active,
    ps.created_at,
    ps.updated_at,
    f.name as franchise_name,
    f.location as franchise_location,
    u.name as created_by_name,
    u.email as created_by_email
FROM package_sets ps
LEFT JOIN franchises f ON ps.franchise_id = f.id
LEFT JOIN users u ON ps.created_by = u.id
ORDER BY ps.created_at DESC;

-- 2. FETCH ACTIVE PACKAGES ONLY
-- =====================================================
SELECT 
    id,
    name,
    description,
    package_type,
    category,
    base_price,
    franchise_id,
    created_at
FROM package_sets 
WHERE is_active = true
ORDER BY name ASC;

-- 3. FETCH PACKAGES BY FRANCHISE
-- =====================================================
SELECT 
    ps.*,
    f.name as franchise_name
FROM package_sets ps
JOIN franchises f ON ps.franchise_id = f.id
WHERE f.id = '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050' -- Replace with actual franchise ID
ORDER BY ps.created_at DESC;

-- 4. FETCH PACKAGES BY CATEGORY
-- =====================================================
SELECT 
    id,
    name,
    description,
    base_price,
    package_type,
    created_at
FROM package_sets 
WHERE category = 'wedding' -- Change category as needed
AND is_active = true
ORDER BY base_price ASC;

-- 5. PACKAGE STATISTICS
-- =====================================================
SELECT 
    COUNT(*) as total_packages,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_packages,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_packages,
    AVG(base_price) as average_price,
    MIN(base_price) as min_price,
    MAX(base_price) as max_price
FROM package_sets;

-- 6. PACKAGES BY TYPE BREAKDOWN
-- =====================================================
SELECT 
    package_type,
    COUNT(*) as count,
    AVG(base_price) as avg_price,
    MIN(base_price) as min_price,
    MAX(base_price) as max_price
FROM package_sets 
WHERE is_active = true
GROUP BY package_type
ORDER BY count DESC;

-- 7. PACKAGES BY CATEGORY BREAKDOWN
-- =====================================================
SELECT 
    category,
    COUNT(*) as count,
    AVG(base_price) as avg_price
FROM package_sets 
WHERE is_active = true
GROUP BY category
ORDER BY count DESC;

-- 8. RECENT PACKAGES (LAST 30 DAYS)
-- =====================================================
SELECT 
    ps.name,
    ps.base_price,
    ps.package_type,
    ps.category,
    ps.created_at,
    f.name as franchise_name
FROM package_sets ps
LEFT JOIN franchises f ON ps.franchise_id = f.id
WHERE ps.created_at >= NOW() - INTERVAL '30 days'
ORDER BY ps.created_at DESC;

-- 9. PACKAGES WITH FRANCHISE AND USER DETAILS
-- =====================================================
SELECT 
    ps.id,
    ps.name as package_name,
    ps.description,
    ps.base_price,
    ps.package_type,
    ps.category,
    ps.is_active,
    ps.created_at,
    f.name as franchise_name,
    f.location as franchise_location,
    f.contact_email as franchise_email,
    u.name as creator_name,
    u.email as creator_email,
    u.role as creator_role
FROM package_sets ps
LEFT JOIN franchises f ON ps.franchise_id = f.id
LEFT JOIN users u ON ps.created_by = u.id
ORDER BY ps.created_at DESC
LIMIT 50;

-- 10. SEARCH PACKAGES BY NAME OR DESCRIPTION
-- =====================================================
SELECT 
    id,
    name,
    description,
    base_price,
    package_type,
    category,
    created_at
FROM package_sets 
WHERE (
    LOWER(name) LIKE LOWER('%safa%') -- Replace 'safa' with search term
    OR LOWER(description) LIKE LOWER('%safa%')
)
AND is_active = true
ORDER BY created_at DESC;

-- 11. PACKAGES PRICE RANGE QUERY
-- =====================================================
SELECT 
    id,
    name,
    base_price,
    package_type,
    category
FROM package_sets 
WHERE base_price BETWEEN 1000 AND 10000 -- Adjust price range as needed
AND is_active = true
ORDER BY base_price ASC;

-- 12. FRANCHISE PACKAGE SUMMARY
-- =====================================================
SELECT 
    f.name as franchise_name,
    f.location,
    COUNT(ps.id) as total_packages,
    COUNT(CASE WHEN ps.is_active = true THEN 1 END) as active_packages,
    AVG(ps.base_price) as avg_package_price,
    MIN(ps.base_price) as min_price,
    MAX(ps.base_price) as max_price
FROM franchises f
LEFT JOIN package_sets ps ON f.id = ps.franchise_id
GROUP BY f.id, f.name, f.location
ORDER BY total_packages DESC;

-- 13. INSERT NEW PACKAGE (TEMPLATE)
-- =====================================================
-- INSERT INTO package_sets (
--     name,
--     description,
--     package_type,
--     category,
--     base_price,
--     franchise_id,
--     created_by,
--     is_active
-- ) VALUES (
--     'New Package Name',
--     'Package description here',
--     'safa',
--     'wedding',
--     5000.00,
--     '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', -- Replace with actual franchise ID
--     '00000000-0000-0000-0000-000000000001', -- Replace with actual user ID
--     true
-- );

-- 14. UPDATE PACKAGE (TEMPLATE)
-- =====================================================
-- UPDATE package_sets 
-- SET 
--     name = 'Updated Package Name',
--     description = 'Updated description',
--     base_price = 6000.00,
--     updated_at = NOW()
-- WHERE id = 'package-id-here';

-- 15. DEACTIVATE PACKAGE (SOFT DELETE)
-- =====================================================
-- UPDATE package_sets 
-- SET 
--     is_active = false,
--     updated_at = NOW()
-- WHERE id = 'package-id-here';

-- 16. ACTIVATE PACKAGE
-- =====================================================
-- UPDATE package_sets 
-- SET 
--     is_active = true,
--     updated_at = NOW()
-- WHERE id = 'package-id-here';

-- 17. DELETE PACKAGE (HARD DELETE - USE WITH CAUTION)
-- =====================================================
-- DELETE FROM package_sets 
-- WHERE id = 'package-id-here';

-- 18. PACKAGE AUDIT TRAIL
-- =====================================================
SELECT 
    ps.id,
    ps.name,
    ps.created_at,
    ps.updated_at,
    EXTRACT(DAYS FROM (NOW() - ps.created_at)) as days_since_created,
    CASE 
        WHEN ps.updated_at > ps.created_at THEN EXTRACT(DAYS FROM (NOW() - ps.updated_at))
        ELSE NULL 
    END as days_since_updated
FROM package_sets ps
ORDER BY ps.created_at DESC;

-- 19. DUPLICATE PACKAGE CHECK
-- =====================================================
SELECT 
    name,
    COUNT(*) as duplicate_count
FROM package_sets 
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 20. PACKAGE PERFORMANCE METRICS
-- =====================================================
SELECT 
    ps.id,
    ps.name,
    ps.base_price,
    ps.package_type,
    ps.category,
    ps.created_at,
    -- Add booking count if bookings table references packages
    -- COUNT(b.id) as booking_count,
    -- SUM(b.total_amount) as total_revenue
    f.name as franchise_name
FROM package_sets ps
LEFT JOIN franchises f ON ps.franchise_id = f.id
-- LEFT JOIN bookings b ON ps.id = b.package_id
WHERE ps.is_active = true
-- GROUP BY ps.id, ps.name, ps.base_price, ps.package_type, ps.category, ps.created_at, f.name
ORDER BY ps.created_at DESC;
