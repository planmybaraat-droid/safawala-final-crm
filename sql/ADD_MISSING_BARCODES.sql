-- Add random 11-digit barcodes to products that don't have barcodes
-- Run this in Supabase SQL Editor

UPDATE products 
SET barcode = LPAD(FLOOR(RANDOM() * 100000000000)::TEXT, 11, '0'),
    updated_at = NOW()
WHERE barcode IS NULL OR barcode = '' OR TRIM(barcode) = '';
