-- ============================================
-- DROP ALL VARIANTS FOR FRANCHISE (SAFE)
-- ============================================
-- This will soft-delete variants by setting is_active = false
-- Preserves data integrity for existing bookings
-- ============================================

BEGIN;

-- Soft delete all variants for this franchise
UPDATE package_variants
SET is_active = false
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true;

COMMIT;

-- Verify soft deletion
SELECT COUNT(*) as remaining_active_variants
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND is_active = true;

-- Should return 0

-- Show total (including inactive)
SELECT 
    COUNT(*) as total_variants,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
FROM package_variants
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
