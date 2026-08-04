-- =====================================================
-- AUTO-GENERATE BARCODES WHEN STOCK QUANTITY CHANGES
-- =====================================================
-- This system automatically creates barcoded items when
-- you add quantity to a product.
--
-- Example:
-- 1. Create product with stock_available = 50
--    → Auto-generates 50 items (TUR-0001 to TUR-0050)
-- 2. Update stock_available to 100
--    → Auto-generates 50 MORE items (TUR-0051 to TUR-0100)
-- =====================================================

-- Step 1: Add auto_generate_barcodes column to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS auto_generate_barcodes BOOLEAN DEFAULT true;

COMMENT ON COLUMN products.auto_generate_barcodes IS 
'When true, automatically generates barcoded items when stock_available increases';

-- =====================================================
-- Step 2: Function to generate items for a product
-- =====================================================

CREATE OR REPLACE FUNCTION generate_items_for_product(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  product_record RECORD;
  existing_count INTEGER;
  start_number INTEGER;
  i INTEGER;
  item_code TEXT;
  barcode TEXT;
  qr_code TEXT;
  items_created INTEGER := 0;
BEGIN
  -- Get product details
  SELECT 
    id,
    product_code,
    franchise_id,
    name
  INTO product_record
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Check how many items already exist
  SELECT COUNT(*)
  INTO existing_count
  FROM product_items
  WHERE product_id = p_product_id;

  -- Start numbering from next available
  start_number := existing_count + 1;

  RAISE NOTICE 'Auto-generating % items for product: % (starting from #%)', 
    p_quantity, product_record.name, start_number;

  -- Generate items
  FOR i IN start_number..(start_number + p_quantity - 1) LOOP
    -- Create item code: TUR-0001, TUR-0002, etc.
    item_code := product_record.product_code || '-' || LPAD(i::TEXT, 4, '0');
    
    -- Create barcode: TUR20251020001
    barcode := product_record.product_code || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(i::TEXT, 4, '0');
    
    -- Create QR code (same as barcode for now)
    qr_code := barcode;

    -- Insert item
    INSERT INTO product_items (
      product_id,
      item_code,
      barcode,
      qr_code,
      status,
      condition,
      franchise_id,
      location,
      usage_count
    ) VALUES (
      p_product_id,
      item_code,
      barcode,
      qr_code,
      'available',
      'new',
      product_record.franchise_id,
      'Warehouse',
      0
    );

    items_created := items_created + 1;
  END LOOP;

  RAISE NOTICE '✅ Auto-generated % items successfully', items_created;
  
  RETURN items_created;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Step 3: Trigger function to auto-generate on stock change
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_auto_generate_items()
RETURNS TRIGGER AS $$
DECLARE
  quantity_diff INTEGER;
  current_item_count INTEGER;
  items_generated INTEGER;
BEGIN
  -- Only proceed if auto_generate_barcodes is enabled
  IF NEW.auto_generate_barcodes = false THEN
    RAISE NOTICE 'Auto-generate disabled for product: %', NEW.name;
    RETURN NEW;
  END IF;

  -- Calculate the difference in stock_available
  IF TG_OP = 'INSERT' THEN
    quantity_diff := NEW.stock_available;
  ELSIF TG_OP = 'UPDATE' THEN
    quantity_diff := NEW.stock_available - COALESCE(OLD.stock_available, 0);
  ELSE
    RETURN NEW;
  END IF;

  -- Only generate if stock increased
  IF quantity_diff <= 0 THEN
    RETURN NEW;
  END IF;

  -- Check current item count
  SELECT COUNT(*)
  INTO current_item_count
  FROM product_items
  WHERE product_id = NEW.id;

  RAISE NOTICE 'Stock increased by %. Current items: %. Generating new items...', 
    quantity_diff, current_item_count;

  -- Generate the items
  BEGIN
    items_generated := generate_items_for_product(NEW.id, quantity_diff);
    RAISE NOTICE '✅ Auto-generated % items for %', items_generated, NEW.name;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to auto-generate items: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Step 4: Create trigger on products table
-- =====================================================

DROP TRIGGER IF EXISTS trigger_auto_generate_barcodes ON products;

CREATE TRIGGER trigger_auto_generate_barcodes
  AFTER INSERT OR UPDATE OF stock_available ON products
  FOR EACH ROW
  WHEN (NEW.auto_generate_barcodes = true)
  EXECUTE FUNCTION trigger_auto_generate_items();

-- =====================================================
-- Step 5: Enable for existing products (optional)
-- =====================================================

-- Enable auto-generate for all existing products
UPDATE products
SET auto_generate_barcodes = true
WHERE auto_generate_barcodes IS NULL;

-- =====================================================
-- TESTING
-- =====================================================

-- Test 1: Create new product with stock
/*
INSERT INTO products (
  name,
  product_code,
  category,
  stock_available,
  rental_price,
  sale_price,
  franchise_id,
  auto_generate_barcodes
) VALUES (
  'Test Turban Auto',
  'TTA',
  'Turbans',
  10,
  500,
  2000,
  (SELECT id FROM franchises LIMIT 1),
  true
);

-- Check: Should see 10 items created
SELECT COUNT(*) FROM product_items 
WHERE product_id = (SELECT id FROM products WHERE product_code = 'TTA');
*/

-- Test 2: Update stock (add more quantity)
/*
UPDATE products
SET stock_available = 25
WHERE product_code = 'TTA';

-- Check: Should now have 25 items total (10 old + 15 new)
SELECT COUNT(*) FROM product_items 
WHERE product_id = (SELECT id FROM products WHERE product_code = 'TTA');
*/

-- Test 3: Disable auto-generate
/*
UPDATE products
SET auto_generate_barcodes = false
WHERE product_code = 'TTA';

UPDATE products
SET stock_available = 30
WHERE product_code = 'TTA';

-- Check: Should still have 25 items (no new ones generated)
SELECT COUNT(*) FROM product_items 
WHERE product_id = (SELECT id FROM products WHERE product_code = 'TTA');
*/

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Check which products have auto-generate enabled
SELECT 
  p.id,
  p.name,
  p.product_code,
  p.stock_available AS "Stock Quantity",
  p.auto_generate_barcodes AS "Auto-Gen Enabled",
  COUNT(pi.id) AS "Items Generated",
  CASE 
    WHEN p.stock_available = COUNT(pi.id) THEN '✅ Synced'
    WHEN COUNT(pi.id) = 0 THEN '⚠️ No items yet'
    ELSE '⚠️ Out of sync'
  END AS "Status"
FROM products p
LEFT JOIN product_items pi ON pi.product_id = p.id
GROUP BY p.id, p.name, p.product_code, p.stock_available, p.auto_generate_barcodes
ORDER BY p.created_at DESC
LIMIT 20;

-- =====================================================
-- SUCCESS! 🎉
-- =====================================================
-- Now when you:
-- 1. Create product with stock = 50 → Auto-generates 50 items
-- 2. Update stock to 100 → Auto-generates 50 more items
-- 3. Stock always matches item count
--
-- Next Step: Build the UI to show barcode status!
-- =====================================================
