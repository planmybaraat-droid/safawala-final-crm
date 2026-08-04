-- ============================================================================
-- STEP 1: VERIFY BARCODES TABLE SETUP
-- Run this in Supabase SQL Editor to check if everything is ready
-- ============================================================================

-- 1. Check if barcodes table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'barcodes'
) as "barcodes_table_exists";

-- 2. Check barcodes table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'barcodes'
ORDER BY ordinal_position;

-- 3. Check if indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'barcodes'
ORDER BY indexname;

-- 4. Check if triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'barcodes' 
  OR trigger_name LIKE '%barcode%'
ORDER BY trigger_name;

-- 5. Check how many barcodes are in the table
SELECT COUNT(*) as total_barcodes FROM barcodes;
SELECT COUNT(*) as active_barcodes FROM barcodes WHERE is_active = true;

-- 6. View sample barcodes
SELECT 
  b.id,
  b.barcode_number,
  b.barcode_type,
  b.is_active,
  p.name as product_name,
  b.created_at
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
LIMIT 10;

-- 7. Check if helper functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%barcode%'
ORDER BY routine_name;

-- 8. Test the find_product_by_barcode function
-- Replace 'PROD-1761634543481-66-005' with an actual barcode from your system
-- SELECT * FROM find_product_by_barcode('PROD-1761634543481-66-005');

-- 9. Check if sync trigger exists on product_barcodes
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'product_barcodes'
  AND trigger_name LIKE '%sync%';

-- ============================================================================
-- If all checks pass, move to Step 2
-- ============================================================================
