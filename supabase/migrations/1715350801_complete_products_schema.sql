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

-- Confirm migration completion
SELECT 'Migration complete! Products table now has all required columns' as status;
