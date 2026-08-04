-- Create product_items table for individual stock tracking
CREATE TABLE IF NOT EXISTS product_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    qr_code VARCHAR(100) UNIQUE,
    serial_number VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'damaged', 'in_laundry', 'sold')),
    condition VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'good', 'fair', 'poor', 'damaged')),
    location VARCHAR(100),
    notes TEXT,
    purchase_date DATE,
    last_used_date DATE,
    usage_count INTEGER DEFAULT 0,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_items_product_id ON product_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_items_status ON product_items(status);
CREATE INDEX IF NOT EXISTS idx_product_items_franchise_id ON product_items(franchise_id);
CREATE INDEX IF NOT EXISTS idx_product_items_barcode ON product_items(barcode);

-- Function to generate unique item code
CREATE OR REPLACE FUNCTION generate_item_code(product_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    item_code TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(item_code FROM LENGTH(product_code) + 2) AS INTEGER)), 0) + 1
    INTO next_number
    FROM product_items pi
    JOIN products p ON pi.product_id = p.id
    WHERE p.product_code = generate_item_code.product_code
    AND pi.item_code ~ ('^' || product_code || '-[0-9]+$');
    
    item_code := product_code || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN item_code;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique barcode for item
CREATE OR REPLACE FUNCTION generate_item_barcode(item_code TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Generate barcode using item code with checksum
    RETURN 'ITM' || REPLACE(item_code, '-', '') || LPAD((LENGTH(item_code) % 10)::TEXT, 1, '0');
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE product_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Enable all for authenticated users" ON product_items FOR ALL USING (true);
