-- ============================================================================
-- CREATE DEDICATED BARCODES TABLE FOR BARCODE MANAGEMENT
-- ============================================================================
-- Purpose: Create a separate barcodes table to store all barcode data
--          This allows:
--          1. Multiple barcodes per product
--          2. Track barcode history & usage
--          3. Enable/disable barcodes without affecting products
--          4. Faster barcode lookups with dedicated indexes
--
-- Architecture:
--   products table → (has many) → barcodes table
--   When scanning: barcode → lookup in barcodes table → get product_id → add product
-- ============================================================================

-- Step 1: Create the dedicated barcodes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    barcode_number TEXT NOT NULL UNIQUE,
    barcode_type VARCHAR(50) DEFAULT 'primary', -- primary, alternate, ean, code128, qr, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    notes TEXT -- e.g., "Supplier A barcode", "Old barcode format"
);

-- Step 2: Create indexes for fast barcode lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_barcodes_barcode_number ON barcodes(barcode_number) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_barcodes_product_id ON barcodes(product_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_barcode_type ON barcodes(barcode_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_barcodes_is_active ON barcodes(is_active);
CREATE INDEX IF NOT EXISTS idx_barcodes_created_at ON barcodes(created_at);

-- Step 3: Create unique constraint to prevent duplicate active barcodes
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_barcodes_unique_active 
ON barcodes(barcode_number) 
WHERE is_active = true;

-- Step 4: Create trigger to auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_barcodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_barcodes_updated_at_trigger ON barcodes;
CREATE TRIGGER update_barcodes_updated_at_trigger
    BEFORE UPDATE ON barcodes
    FOR EACH ROW
    EXECUTE FUNCTION update_barcodes_updated_at();

-- Step 5: Create helper function to find product by barcode
-- ============================================================================

DROP FUNCTION IF EXISTS find_product_by_barcode(text);

CREATE FUNCTION find_product_by_barcode(search_barcode TEXT)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    barcode_number TEXT,
    barcode_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.product_id,
        p.name::TEXT as product_name,
        b.barcode_number,
        b.barcode_type::TEXT
    FROM barcodes b
    LEFT JOIN products p ON b.product_id = p.id
    WHERE b.barcode_number = search_barcode
        AND b.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 6: Create function to add barcode to product
-- ============================================================================

DROP FUNCTION IF EXISTS add_barcode_to_product(uuid, text, text, text);

CREATE FUNCTION add_barcode_to_product(
    p_product_id UUID,
    p_barcode_number TEXT,
    p_barcode_type TEXT DEFAULT 'primary',
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    barcode_id UUID
) AS $$
DECLARE
    v_barcode_id UUID;
BEGIN
    -- Check if product exists
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RETURN QUERY SELECT false, 'Product not found', NULL::UUID;
        RETURN;
    END IF;
    
    -- Check if barcode already exists and is active
    IF EXISTS (SELECT 1 FROM barcodes WHERE barcode_number = p_barcode_number AND is_active = true) THEN
        RETURN QUERY SELECT false, 'Barcode already exists for another product', NULL::UUID;
        RETURN;
    END IF;
    
    -- Insert the barcode
    INSERT INTO barcodes (product_id, barcode_number, barcode_type, notes)
    VALUES (p_product_id, p_barcode_number, p_barcode_type, p_notes)
    RETURNING barcodes.id INTO v_barcode_id;
    
    RETURN QUERY SELECT true, 'Barcode added successfully', v_barcode_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to deactivate barcode
-- ============================================================================

DROP FUNCTION IF EXISTS deactivate_barcode(text);

CREATE FUNCTION deactivate_barcode(p_barcode_number TEXT)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    UPDATE barcodes 
    SET is_active = false 
    WHERE barcode_number = p_barcode_number;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Barcode deactivated successfully';
    ELSE
        RETURN QUERY SELECT false, 'Barcode not found';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create view for product-barcode relationship
-- ============================================================================

CREATE OR REPLACE VIEW v_products_with_barcodes AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    COUNT(b.id) as total_barcodes,
    COUNT(CASE WHEN b.is_active THEN 1 END) as active_barcodes,
    STRING_AGG(CASE WHEN b.is_active THEN b.barcode_number END, ', ') as active_barcode_list,
    MAX(b.created_at) as last_barcode_added
FROM products p
LEFT JOIN barcodes b ON p.id = b.product_id
GROUP BY p.id, p.name;

-- Step 9: Add comments to document the table
-- ============================================================================

COMMENT ON TABLE barcodes IS 'Stores all barcodes for products. Allows multiple barcodes per product and tracks barcode history.';
COMMENT ON COLUMN barcodes.id IS 'Unique identifier for the barcode record';
COMMENT ON COLUMN barcodes.product_id IS 'Reference to the product this barcode belongs to';
COMMENT ON COLUMN barcodes.barcode_number IS 'The actual barcode value/code';
COMMENT ON COLUMN barcodes.barcode_type IS 'Type of barcode (primary, alternate, ean, code128, qr, etc.)';
COMMENT ON COLUMN barcodes.is_active IS 'Whether this barcode is currently usable for scanning';
COMMENT ON COLUMN barcodes.created_at IS 'When this barcode was added';
COMMENT ON COLUMN barcodes.updated_at IS 'When this barcode record was last updated';
COMMENT ON COLUMN barcodes.notes IS 'Additional notes about this barcode';

-- Step 10: Enable Row Level Security (if needed)
-- ============================================================================

ALTER TABLE barcodes ENABLE ROW LEVEL SECURITY;

-- Optional RLS policy (modify based on your auth requirements)
-- CREATE POLICY "Enable read access for authenticated users" ON barcodes
--     FOR SELECT USING (auth.role() = 'authenticated');

-- Step 11: Display success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Successfully created barcodes table with:';
    RAISE NOTICE '  - barcodes table (main storage)';
    RAISE NOTICE '  - Indexes for fast lookups';
    RAISE NOTICE '  - find_product_by_barcode() function';
    RAISE NOTICE '  - add_barcode_to_product() function';
    RAISE NOTICE '  - deactivate_barcode() function';
    RAISE NOTICE '  - v_products_with_barcodes view';
END $$;

-- ============================================================================
-- SAMPLE USAGE (commented out - uncomment to use)
-- ============================================================================

/*
-- Add barcodes to products
SELECT * FROM add_barcode_to_product(
    'PRODUCT_ID_HERE',
    'PROD-1761634543481-66-001',
    'primary',
    'Main barcode'
);

-- Find product by barcode
SELECT * FROM find_product_by_barcode('PROD-1761634543481-66-001');

-- View all products with their barcodes
SELECT * FROM v_products_with_barcodes;

-- Get all barcodes for a product
SELECT * FROM barcodes 
WHERE product_id = 'PRODUCT_ID_HERE' 
AND is_active = true
ORDER BY barcode_type, created_at;

-- Deactivate a barcode
SELECT * FROM deactivate_barcode('PROD-1761634543481-66-001');

-- List all active barcodes
SELECT b.barcode_number, p.name, b.barcode_type
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
WHERE b.is_active = true
ORDER BY p.name;
*/
