-- ============================================================================
-- AUTOMATIC BARCODE SYNC FROM product_barcodes TO barcodes TABLE
-- ============================================================================
-- This migration syncs existing barcodes from product_barcodes table 
-- to the new dedicated barcodes table, enabling the barcode scanner to work
-- with your existing barcode generation system
-- ============================================================================

-- Step 1: Enable required extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Step 2: Copy existing barcodes from product_barcodes to barcodes table
-- ============================================================================
-- This populates the barcodes table with all active barcodes from your system

INSERT INTO barcodes (product_id, barcode_number, barcode_type, is_active, created_by, notes, created_at, updated_at)
SELECT 
  pb.product_id,
  pb.barcode_number,
  CASE 
    WHEN pb.status = 'available' THEN 'primary'::TEXT
    WHEN pb.status = 'damaged' THEN 'alternate'::TEXT
    WHEN pb.status = 'retired' THEN 'primary'::TEXT
    ELSE 'code128'::TEXT
  END as barcode_type,
  CASE WHEN pb.status = 'available' THEN true ELSE false END as is_active,
  auth.uid() as created_by,
  CONCAT('Synced from product_barcodes - Status: ', pb.status) as notes,
  pb.created_at,
  pb.updated_at
FROM product_barcodes pb
WHERE pb.product_id IS NOT NULL
ON CONFLICT (barcode_number) DO NOTHING;

-- ============================================================================
-- Step 3: Create a trigger to keep barcodes table in sync
-- ============================================================================
-- Whenever a new barcode is generated in product_barcodes, 
-- automatically add it to the barcodes table

DROP FUNCTION IF EXISTS sync_product_barcode_to_barcodes();

CREATE FUNCTION sync_product_barcode_to_barcodes()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into barcodes table when a new product_barcode is created
  INSERT INTO barcodes (product_id, barcode_number, barcode_type, is_active, created_by, notes, created_at, updated_at)
  VALUES (
    NEW.product_id,
    NEW.barcode_number,
    'primary'::TEXT,  -- New barcodes are always primary
    CASE WHEN NEW.status = 'available' THEN true ELSE false END,
    auth.uid(),
    CONCAT('Auto-synced from barcode generation - Product Code: ', 
           (SELECT product_code FROM products WHERE id = NEW.product_id LIMIT 1)),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (barcode_number) DO UPDATE SET
    is_active = CASE WHEN NEW.status = 'available' THEN true ELSE false END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS product_barcode_sync_trigger ON product_barcodes;

-- Create the trigger
CREATE TRIGGER product_barcode_sync_trigger
AFTER INSERT OR UPDATE ON product_barcodes
FOR EACH ROW
EXECUTE FUNCTION sync_product_barcode_to_barcodes();

-- ============================================================================
-- Step 4: Verify the sync worked
-- ============================================================================

-- Check how many barcodes were synced
SELECT 
  COUNT(*) as total_synced_barcodes,
  COUNT(CASE WHEN is_active THEN 1 END) as active_barcodes,
  COUNT(CASE WHEN NOT is_active THEN 1 END) as inactive_barcodes
FROM barcodes;

-- View sample of synced barcodes
SELECT 
  b.barcode_number,
  b.barcode_type,
  p.name as product_name,
  b.is_active,
  b.notes,
  b.created_at
FROM barcodes b
JOIN products p ON b.product_id = p.id
LIMIT 10;

-- ============================================================================
-- Step 5: Test the barcode scanner lookup
-- ============================================================================

-- Test finding a product by barcode
-- Replace 'PROD-1761634543481-66-005' with an actual barcode from your system
SELECT * FROM find_product_by_barcode('PROD-1761634543481-66-005');

-- Show all products with their barcode counts
SELECT * FROM v_products_with_barcodes
WHERE total_barcodes > 0
ORDER BY total_barcodes DESC
LIMIT 20;

-- ============================================================================
-- IMPORTANT: This setup means:
-- ============================================================================
-- 1. ✅ When you generate barcodes in inventory → Auto-synced to barcodes table
-- 2. ✅ When you scan a barcode → Scanner queries barcodes table directly
-- 3. ✅ No manual data entry needed - everything is automatic!
-- 4. ✅ Your existing barcode system continues to work as-is
-- ============================================================================
