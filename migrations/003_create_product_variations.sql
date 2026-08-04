-- Migration: Create product_variations table
-- Each product can have multiple variations (color, design, material, size)
-- Each variation gets its own unique barcode for tracking

CREATE TABLE IF NOT EXISTS product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  franchise_id UUID NOT NULL,
  variation_name VARCHAR(255) NOT NULL,
  color VARCHAR(100),
  design VARCHAR(100),
  material VARCHAR(100),
  size VARCHAR(50),
  sku VARCHAR(100),
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  rental_price_adjustment DECIMAL(10,2) DEFAULT 0,
  stock_total INTEGER DEFAULT 0,
  stock_available INTEGER DEFAULT 0,
  stock_booked INTEGER DEFAULT 0,
  stock_damaged INTEGER DEFAULT 0,
  barcode VARCHAR(100) UNIQUE,
  qr_code TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_franchise_id ON product_variations(franchise_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_barcode ON product_variations(barcode);

-- Enable RLS
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;

-- RLS policies for franchise isolation
CREATE POLICY "Users can view their franchise variations"
  ON product_variations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = product_variations.franchise_id)
    )
  );

CREATE POLICY "Users can insert their franchise variations"
  ON product_variations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = product_variations.franchise_id)
    )
  );

CREATE POLICY "Users can update their franchise variations"
  ON product_variations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = product_variations.franchise_id)
    )
  );

CREATE POLICY "Users can delete their franchise variations"
  ON product_variations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'super_admin' OR u.franchise_id = product_variations.franchise_id)
    )
  );

-- Auto-generate unique barcode for variations via trigger
CREATE OR REPLACE FUNCTION generate_variation_barcode()
RETURNS TRIGGER AS $$
DECLARE
  new_barcode VARCHAR(100);
  barcode_exists BOOLEAN;
BEGIN
  IF NEW.barcode IS NULL OR NEW.barcode = '' THEN
    LOOP
      -- Generate: VAR-{random 8 digits}
      new_barcode := 'VAR-' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
      SELECT EXISTS(SELECT 1 FROM product_variations WHERE barcode = new_barcode) INTO barcode_exists;
      EXIT WHEN NOT barcode_exists;
    END LOOP;
    NEW.barcode := new_barcode;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_variation_barcode
  BEFORE INSERT ON product_variations
  FOR EACH ROW
  EXECUTE FUNCTION generate_variation_barcode();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_variation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_variation_timestamp
  BEFORE UPDATE ON product_variations
  FOR EACH ROW
  EXECUTE FUNCTION update_variation_timestamp();
