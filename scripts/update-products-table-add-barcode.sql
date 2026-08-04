-- Add barcode and qr_code columns to products table if they don't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN products.barcode IS 'Base64 encoded barcode image data URL for the product';
COMMENT ON COLUMN products.qr_code IS 'Base64 encoded QR code image data URL for the product';

-- Create indexes for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_qr_code ON products(qr_code) WHERE qr_code IS NOT NULL;

-- Update the updated_at trigger to include new columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists for products table
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added barcode and qr_code columns to products table';
END $$;
