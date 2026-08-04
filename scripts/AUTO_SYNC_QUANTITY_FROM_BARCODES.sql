-- =====================================================
-- AUTO-SYNC PRODUCT QUANTITY FROM BARCODE ITEM STATUS
-- =====================================================
-- This trigger automatically updates products.stock_available
-- based on the count of product_items with status='available'
-- 
-- Use Case: Barati Safa with 200 barcoded items
-- - When item status changes: available → booked
-- - Trigger auto-decrements stock_available
-- - When item returns: booked → available
-- - Trigger auto-increments stock_available
-- =====================================================

-- Function to recalculate product stock from items
CREATE OR REPLACE FUNCTION sync_product_stock_from_items()
RETURNS TRIGGER AS $$
DECLARE
  product_id_to_update UUID;
  available_count INT;
  booked_count INT;
  damaged_count INT;
  laundry_count INT;
BEGIN
  -- Determine which product to update
  IF TG_OP = 'DELETE' THEN
    product_id_to_update := OLD.product_id;
  ELSE
    product_id_to_update := NEW.product_id;
  END IF;

  -- Count items by status
  SELECT 
    COUNT(*) FILTER (WHERE status = 'available'),
    COUNT(*) FILTER (WHERE status = 'booked'),
    COUNT(*) FILTER (WHERE status = 'damaged'),
    COUNT(*) FILTER (WHERE status = 'in_laundry')
  INTO available_count, booked_count, damaged_count, laundry_count
  FROM product_items
  WHERE product_id = product_id_to_update;

  -- Update product stock columns
  UPDATE products
  SET 
    stock_available = available_count,
    stock_booked = booked_count,
    stock_damaged = damaged_count,
    stock_in_laundry = laundry_count,
    updated_at = NOW()
  WHERE id = product_id_to_update;

  -- Log the sync
  RAISE NOTICE 'Auto-synced stock for product %: available=%, booked=%, damaged=%, laundry=%', 
    product_id_to_update, available_count, booked_count, damaged_count, laundry_count;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on product_items table
DROP TRIGGER IF EXISTS trigger_sync_product_stock ON product_items;

CREATE TRIGGER trigger_sync_product_stock
  AFTER INSERT OR UPDATE OF status OR DELETE ON product_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_stock_from_items();

-- =====================================================
-- INITIAL SYNC (Run once to sync existing data)
-- =====================================================

-- Sync all products with existing items
DO $$
DECLARE
  product_record RECORD;
  available_count INT;
  booked_count INT;
  damaged_count INT;
  laundry_count INT;
BEGIN
  FOR product_record IN 
    SELECT DISTINCT product_id 
    FROM product_items
  LOOP
    -- Count items by status
    SELECT 
      COUNT(*) FILTER (WHERE status = 'available'),
      COUNT(*) FILTER (WHERE status = 'booked'),
      COUNT(*) FILTER (WHERE status = 'damaged'),
      COUNT(*) FILTER (WHERE status = 'in_laundry')
    INTO available_count, booked_count, damaged_count, laundry_count
    FROM product_items
    WHERE product_id = product_record.product_id;

    -- Update product
    UPDATE products
    SET 
      stock_available = available_count,
      stock_booked = booked_count,
      stock_damaged = damaged_count,
      stock_in_laundry = laundry_count,
      updated_at = NOW()
    WHERE id = product_record.product_id;

    RAISE NOTICE 'Synced product %: available=%, booked=%, damaged=%, laundry=%', 
      product_record.product_id, available_count, booked_count, damaged_count, laundry_count;
  END LOOP;
END $$;

-- =====================================================
-- USAGE EXAMPLE
-- =====================================================

-- Example 1: Generate 200 items for "Barati Safa"
-- (Use BulkBarcodeGenerator in UI, or manually:)

/*
-- Manually generate items (for reference only - use UI instead)
DO $$
DECLARE
  product_id_var UUID := '<your-product-id>';
  i INT;
BEGIN
  FOR i IN 1..200 LOOP
    INSERT INTO product_items (
      product_id,
      item_code,
      barcode,
      status,
      condition,
      franchise_id
    ) VALUES (
      product_id_var,
      'BAR-' || LPAD(i::TEXT, 4, '0'),
      'BAR' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(i::TEXT, 4, '0'),
      'available',
      'new',
      '<your-franchise-id>'
    );
  END LOOP;
  
  -- Trigger will auto-update stock_available to 200
  RAISE NOTICE 'Created 200 items - stock_available auto-updated';
END $$;
*/

-- Example 2: Scan barcode during booking (changes status)
/*
-- When you scan item BAR-0001 and add to booking:
UPDATE product_items
SET status = 'booked',
    current_booking_id = '<booking-id>',
    last_scanned_at = NOW()
WHERE barcode = 'BAR20251020001';

-- Result: Trigger auto-decrements stock_available from 200 → 199
*/

-- Example 3: Return item from booking
/*
UPDATE product_items
SET status = 'available',
    current_booking_id = NULL
WHERE barcode = 'BAR20251020001';

-- Result: Trigger auto-increments stock_available from 199 → 200
*/

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Check if sync is working
SELECT 
  p.id,
  p.name,
  p.stock_available AS "Stock (from products)",
  COUNT(pi.id) FILTER (WHERE pi.status = 'available') AS "Available Items (from product_items)",
  COUNT(pi.id) FILTER (WHERE pi.status = 'booked') AS "Booked Items",
  COUNT(pi.id) FILTER (WHERE pi.status = 'damaged') AS "Damaged Items",
  COUNT(pi.id) AS "Total Items"
FROM products p
LEFT JOIN product_items pi ON pi.product_id = p.id
WHERE EXISTS (SELECT 1 FROM product_items WHERE product_id = p.id)
GROUP BY p.id, p.name, p.stock_available
ORDER BY p.name;

-- =====================================================
-- SUCCESS! 🎉
-- =====================================================
-- Now when you:
-- 1. Generate 200 barcodes → stock_available = 200
-- 2. Scan 5 barcodes in booking → stock_available = 195
-- 3. Return 5 items → stock_available = 200
-- 
-- Everything syncs automatically! No manual quantity updates needed.
-- =====================================================
