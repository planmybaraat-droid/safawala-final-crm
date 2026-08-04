-- Migration: Denormalize product details in product_order_items
-- This fixes the issue where items disappear if products table changes or has RLS issues

-- Add denormalized product details columns to product_order_items
ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE product_order_items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_order_items_barcode ON product_order_items(barcode);
CREATE INDEX IF NOT EXISTS idx_product_order_items_product_name ON product_order_items(product_name);

-- This ensures items are saved WITH their product details, so they're not lost if:
-- 1. The product gets deleted from products table
-- 2. RLS policies change
-- 3. Product is updated

-- Now when loading items, we don't need to join products table
-- We can just read the denormalized columns directly
