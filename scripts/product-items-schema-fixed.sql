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

-- Completely rewritten function to eliminate ambiguous column references
-- Function to generate unique item code
CREATE OR REPLACE FUNCTION generate_item_code(input_product_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    result_item_code TEXT;
    product_uuid UUID;
BEGIN
    -- First get the product ID
    SELECT id INTO product_uuid 
    FROM products 
    WHERE product_code = input_product_code;
    
    IF product_uuid IS NULL THEN
        RAISE EXCEPTION 'Product with code % not found', input_product_code;
    END IF;
    
    -- Get the next sequential number for this product using explicit column reference
    SELECT COALESCE(MAX(CAST(SUBSTRING(pi.item_code FROM LENGTH(input_product_code) + 2) AS INTEGER)), 0) + 1
    INTO next_number
    FROM product_items pi
    WHERE pi.product_id = product_uuid
    AND pi.item_code ~ ('^' || input_product_code || '-[0-9]+$');
    
    result_item_code := input_product_code || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN result_item_code;
END;
$$ LANGUAGE plpgsql;

-- Renamed parameter to avoid any potential conflicts
-- Function to generate unique barcode for item
CREATE OR REPLACE FUNCTION generate_item_barcode(input_item_code_param TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Generate barcode using item code with checksum
    RETURN 'ITM' || REPLACE(input_item_code_param, '-', '') || LPAD((LENGTH(input_item_code_param) % 10)::TEXT, 1, '0');
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE product_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Enable all for authenticated users" ON product_items FOR ALL USING (true);
