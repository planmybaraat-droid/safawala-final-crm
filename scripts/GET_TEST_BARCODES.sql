-- =====================================================
-- QUICK TEST QUERY - Get Barcodes for Testing
-- =====================================================
-- Copy and paste this in Supabase SQL Editor to get
-- test barcodes for scanning
-- =====================================================

-- 1️⃣ STEP 1: List all products with barcoded items
-- See which products have items generated

SELECT 
  p.id,
  p.name AS product_name,
  p.product_code,
  p.stock_available,
  COUNT(pi.id) AS total_items,
  COUNT(pi.id) FILTER (WHERE pi.status = 'available') AS available_items,
  COUNT(pi.id) FILTER (WHERE pi.status = 'booked') AS booked_items
FROM products p
LEFT JOIN product_items pi ON pi.product_id = p.id
WHERE EXISTS (SELECT 1 FROM product_items WHERE product_id = p.id)
GROUP BY p.id, p.name, p.product_code, p.stock_available
ORDER BY p.name;

-- =====================================================

-- 2️⃣ STEP 2: Get 10 test barcodes for a specific product
-- Replace 'Barati Safa' with your product name

SELECT 
  item_code AS "Item Code (e.g., TUR-0001)",
  barcode AS "👉 COPY THIS BARCODE 👈",
  status AS "Status",
  condition AS "Condition"
FROM product_items
WHERE product_id = (
  SELECT id 
  FROM products 
  WHERE name ILIKE '%Barati Safa%'  -- 🔧 CHANGE THIS TO YOUR PRODUCT NAME
  LIMIT 1
)
AND status = 'available'
ORDER BY item_code
LIMIT 10;

-- =====================================================

-- 3️⃣ STEP 3: Get ALL available barcodes (if you have many products)

SELECT 
  p.name AS "Product",
  pi.item_code AS "Item Code",
  pi.barcode AS "Barcode (Copy for testing)",
  pi.status,
  pi.created_at
FROM product_items pi
JOIN products p ON p.id = pi.product_id
WHERE pi.status = 'available'
ORDER BY p.name, pi.item_code
LIMIT 50;

-- =====================================================

-- 4️⃣ STEP 4: Verify trigger is installed

SELECT 
  'Trigger Status' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'trigger_sync_product_stock'
    ) THEN '✅ Installed'
    ELSE '❌ NOT INSTALLED - Run AUTO_SYNC_QUANTITY_FROM_BARCODES.sql'
  END AS status;

-- =====================================================

-- 5️⃣ STEP 5: Check sync status (are quantities accurate?)

SELECT 
  p.name AS "Product",
  p.stock_available AS "System Quantity",
  COUNT(pi.id) FILTER (WHERE pi.status = 'available') AS "Actual Available",
  CASE 
    WHEN p.stock_available = COUNT(pi.id) FILTER (WHERE pi.status = 'available') 
    THEN '✅ SYNCED' 
    ELSE '❌ OUT OF SYNC' 
  END AS "Status"
FROM products p
LEFT JOIN product_items pi ON pi.product_id = p.id
WHERE EXISTS (SELECT 1 FROM product_items WHERE product_id = p.id)
GROUP BY p.id, p.name, p.stock_available
ORDER BY p.name;

-- =====================================================

-- 🎯 QUICK TESTING WORKFLOW:
-- 
-- 1. Run STEP 1 to see which products have items
-- 2. Run STEP 2 (change product name) to get 10 test barcodes
-- 3. Copy a barcode (e.g., "TUR20251020001")
-- 4. Go to http://localhost:3001
-- 5. Navigate to: Bookings → [Any booking] → Select Products
-- 6. Paste barcode in scanner field → Press Enter
-- 7. See: "✅ Item scanned! Barati Safa (TUR-0001) added"
-- 8. Run STEP 5 to verify quantity decreased
-- 
-- ✅ If "System Quantity" = "Actual Available" → IT WORKS!
-- 
-- =====================================================
