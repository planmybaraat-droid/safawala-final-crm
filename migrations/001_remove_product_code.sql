/**
 * SQL Migration: Remove product_code column and simplify products table
 * This migration:
 * 1. Drops the product_code column
 * 2. Keeps barcode column for 11-digit random barcodes
 * 3. Prepares for auto-generation trigger
 */

-- Drop the product_code column as it's no longer needed
ALTER TABLE products DROP COLUMN IF EXISTS product_code;

-- Verify barcode column exists and is properly configured
-- The barcode column should store 11-digit random numbers
ALTER TABLE products 
  ALTER COLUMN barcode TYPE varchar(11);

-- Add a unique constraint on barcode to ensure no duplicates
ALTER TABLE products 
  ADD CONSTRAINT unique_barcode UNIQUE(barcode);

-- Create an index for faster barcode searches
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
