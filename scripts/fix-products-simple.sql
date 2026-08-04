-- Simple fix for products table - Add missing columns individually

-- Add rental_price column
ALTER TABLE products ADD COLUMN IF NOT EXISTS rental_price DECIMAL(10,2) DEFAULT 0;

-- Add sale_price column
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) DEFAULT 0;

-- Add security_deposit column
ALTER TABLE products ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2) DEFAULT 0;

-- Add stock_available column
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_available INTEGER DEFAULT 0;

-- Add product_code column
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);

-- Add description column
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;

-- Add franchise_id column (may already exist)
ALTER TABLE products ADD COLUMN IF NOT EXISTS franchise_id UUID;

-- Add is_active column
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add category_id column
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID;

-- Add image_url column
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update existing products to have default values
UPDATE products SET rental_price = 0 WHERE rental_price IS NULL;
UPDATE products SET sale_price = 0 WHERE sale_price IS NULL;
UPDATE products SET security_deposit = 0 WHERE security_deposit IS NULL;
UPDATE products SET stock_available = 100 WHERE stock_available IS NULL OR stock_available = 0;
UPDATE products SET is_active = true WHERE is_active IS NULL;