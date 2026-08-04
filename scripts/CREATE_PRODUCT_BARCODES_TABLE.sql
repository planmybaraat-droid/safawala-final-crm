-- Product Barcodes System
-- Auto-generates unique barcodes for each physical inventory item

-- Drop existing table and indexes if they exist
DROP TABLE IF EXISTS product_barcodes CASCADE;
DROP INDEX IF EXISTS idx_product_barcodes_product;
DROP INDEX IF EXISTS idx_product_barcodes_status;
DROP INDEX IF EXISTS idx_product_barcodes_franchise;
DROP INDEX IF EXISTS idx_product_barcodes_barcode;

-- Create product_barcodes table
CREATE TABLE product_barcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  barcode_number VARCHAR(50) UNIQUE NOT NULL,
  sequence_number INT NOT NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'damaged', 'retired')),
  is_new BOOLEAN DEFAULT true,
  booking_id UUID REFERENCES package_bookings(id) ON DELETE SET NULL,
  last_used_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, sequence_number)
);

-- Create indexes for fast lookups
CREATE INDEX idx_product_barcodes_product ON product_barcodes(product_id);
CREATE INDEX idx_product_barcodes_status ON product_barcodes(status);
CREATE INDEX idx_product_barcodes_franchise ON product_barcodes(franchise_id);
CREATE INDEX idx_product_barcodes_barcode ON product_barcodes(barcode_number);
CREATE INDEX idx_product_barcodes_is_new ON product_barcodes(is_new);

-- Enable RLS
ALTER TABLE product_barcodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using API key auth, not JWT)
DROP POLICY IF EXISTS "Allow all operations on product_barcodes" ON product_barcodes;
CREATE POLICY "Allow all operations on product_barcodes" 
  ON product_barcodes 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Function to auto-remove NEW badge after 7 days
CREATE OR REPLACE FUNCTION auto_remove_new_badge()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE product_barcodes
  SET is_new = false
  WHERE is_new = true
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_barcodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_barcodes_timestamp ON product_barcodes;
CREATE TRIGGER update_product_barcodes_timestamp
  BEFORE UPDATE ON product_barcodes
  FOR EACH ROW
  EXECUTE FUNCTION update_product_barcodes_updated_at();

-- Grant permissions
GRANT ALL ON product_barcodes TO postgres, anon, authenticated, service_role;

COMMENT ON TABLE product_barcodes IS 'Individual barcode tracking for each physical inventory item';
COMMENT ON COLUMN product_barcodes.status IS 'Status: available, in_use, damaged, retired';
COMMENT ON COLUMN product_barcodes.is_new IS 'Shows NEW badge in UI, auto-removed after 7 days';
COMMENT ON COLUMN product_barcodes.sequence_number IS 'Sequential number for this product (001, 002, etc.)';
