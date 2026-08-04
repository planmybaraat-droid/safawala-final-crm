-- ============================================================================
-- POPULATE SAMPLE BARCODES
-- This script adds sample barcode records for testing the barcode scanner
-- ============================================================================

-- First, let's find the product ID for the products we want to add barcodes to
-- You'll need to update the product_id values based on your actual products

-- Example: Find a product by name to get its ID
-- SELECT id, name FROM products WHERE name ILIKE '%product name%' LIMIT 5;

-- ============================================================================
-- METHOD 1: Using the helper function add_barcode_to_product()
-- ============================================================================
-- This is the recommended approach as it handles validation and returns useful feedback

-- Add multiple barcodes for testing
-- Replace 'YOUR_PRODUCT_ID' with actual product IDs from your database

SELECT add_barcode_to_product(
  (SELECT id FROM products LIMIT 1),  -- Replace with actual product ID
  'PROD-1761634543481-66-001',
  'primary',
  'Main barcode for testing'
);

SELECT add_barcode_to_product(
  (SELECT id FROM products LIMIT 1),
  'PROD-1761634543481-66-002',
  'alternate',
  'Secondary barcode for testing'
);

SELECT add_barcode_to_product(
  (SELECT id FROM products WHERE name ILIKE '%feather%' LIMIT 1),
  'PROD-1761634543481-66-005',
  'primary',
  'Feather product barcode'
);

-- ============================================================================
-- METHOD 2: Direct INSERT (if helper function doesn't exist yet)
-- ============================================================================
-- Uncomment below if you prefer direct insertion

/*
INSERT INTO barcodes (product_id, barcode_number, barcode_type, is_active, created_by, notes, created_at, updated_at)
SELECT 
  p.id,
  'PROD-1761634543481-66-001',
  'primary',
  true,
  auth.uid(),
  'Main barcode',
  NOW(),
  NOW()
FROM products p
WHERE p.name ILIKE '%feather%'
LIMIT 1
ON CONFLICT (barcode_number) DO NOTHING;
*/

-- ============================================================================
-- VERIFY BARCODES WERE ADDED
-- ============================================================================

-- Check all active barcodes
SELECT 
  b.barcode_number,
  b.barcode_type,
  p.name as product_name,
  b.is_active,
  b.created_at
FROM barcodes b
JOIN products p ON b.product_id = p.id
WHERE b.is_active = true
ORDER BY b.created_at DESC;

-- ============================================================================
-- TEST THE BARCODE LOOKUP FUNCTION
-- ============================================================================

-- Test if the lookup function works
SELECT * FROM find_product_by_barcode('PROD-1761634543481-66-005');
SELECT * FROM find_product_by_barcode('PROD-1761634543481-66-001');

-- ============================================================================
-- View all products with their barcode counts
-- ============================================================================

SELECT * FROM v_products_with_barcodes
WHERE total_barcodes > 0
ORDER BY product_name;
