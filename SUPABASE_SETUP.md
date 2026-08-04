# Supabase Products Table Setup

## CRITICAL: Run this SQL in your Supabase Database

Go to your Supabase project → SQL Editor → New Query and paste ALL of this code:

```sql
-- Complete Products Table Schema Migration
-- Adds all missing columns to support the product editor

-- Step 1: Add all missing columns at once
ALTER TABLE products
ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
ADD COLUMN IF NOT EXISTS size VARCHAR(100),
ADD COLUMN IF NOT EXISTS color VARCHAR(100),
ADD COLUMN IF NOT EXISTS material VARCHAR(100),
ADD COLUMN IF NOT EXISTS regular_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2) DEFAULT 0;

-- Step 2: Update regular_price to match price for existing products
UPDATE products
SET regular_price = COALESCE(price, 0)
WHERE regular_price IS NULL;

-- Step 3: Make regular_price NOT NULL (required field)
ALTER TABLE products
ALTER COLUMN regular_price SET NOT NULL;
ALTER COLUMN regular_price SET DEFAULT 0;

-- Step 4: Ensure cost_price exists and has default
ALTER TABLE products
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_franchise_id ON products(franchise_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Step 6: Verify RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Step 7: Ensure update policy exists for authenticated users
DROP POLICY IF EXISTS "Enable all for authenticated users" ON products;
CREATE POLICY "Enable all for authenticated users" ON products FOR ALL USING (true) WITH CHECK (true);

-- Done!
SELECT 'Migration complete! Products table now has all required columns' as status;
```

## What This Does

✅ Adds missing columns to products table:
- `brand` - Product brand/designer name
- `size` - Size specification
- `color` - Color of the product
- `material` - Material composition
- `regular_price` - List price (shown with strikethrough on labels)
- `security_deposit` - Refundable deposit amount
- `cost_price` - Cost to acquire

✅ Sets up RLS policies for authenticated users to update products
✅ Creates indexes for better performance

## After Running the SQL

1. Refresh your inventory page
2. Try editing a product
3. Check the browser console (F12) for debug logs
4. All changes should now save to Supabase

## Product Fields Now Supported

- name (required)
- description
- brand
- size
- color
- material
- price (sale price)
- regular_price (list price with strikethrough)
- rental_price
- cost_price
- security_deposit
- stock_total
- stock_available
- reorder_level
- image_url
- images (multiple photos)
- variants (with price adjustments)

## Barcode Label Features

Regular prices now display with:
- Strikethrough styling (4-5pt gray text)
- Sale price in bold (6-7pt black text)
- Both prices on thermal printer labels (50mm × 25mm)
