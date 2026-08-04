-- ============================================================================
-- ADD BARCODE & PRODUCT CODE FIELDS TO PRODUCTS TABLE
-- ============================================================================
-- Purpose: Add multiple code/barcode fields to products table so each product
--          can have multiple identifiers for scanning and lookup
-- ============================================================================

-- Step 1: Add new columns to products table
-- ============================================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_code TEXT,
ADD COLUMN IF NOT EXISTS barcode_number TEXT,
ADD COLUMN IF NOT EXISTS alternate_barcode_1 TEXT,
ADD COLUMN IF NOT EXISTS alternate_barcode_2 TEXT,
ADD COLUMN IF NOT EXISTS sku TEXT;

-- Step 2: Add indexes for faster barcode lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code) WHERE product_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode_number ON products(barcode_number) WHERE barcode_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_alternate_barcode_1 ON products(alternate_barcode_1) WHERE alternate_barcode_1 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_alternate_barcode_2 ON products(alternate_barcode_2) WHERE alternate_barcode_2 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;

-- Step 3: Add comments to document the fields
-- ============================================================================

COMMENT ON COLUMN products.product_code IS 'Primary product code/identifier (e.g., PROD-1761634543481-66-006)';
COMMENT ON COLUMN products.barcode_number IS 'Primary barcode number for scanning';
COMMENT ON COLUMN products.alternate_barcode_1 IS 'First alternate barcode';
COMMENT ON COLUMN products.alternate_barcode_2 IS 'Second alternate barcode';
COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit (alternative identifier)';

-- Step 4: Create a helper function to search across all barcode fields
-- ============================================================================

CREATE OR REPLACE FUNCTION find_product_by_code(search_code TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    product_code TEXT,
    barcode_number TEXT,
    matched_field TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.product_code,
        p.barcode_number,
        CASE 
            WHEN p.product_code = search_code THEN 'product_code'
            WHEN p.barcode_number = search_code THEN 'barcode_number'
            WHEN p.alternate_barcode_1 = search_code THEN 'alternate_barcode_1'
            WHEN p.alternate_barcode_2 = search_code THEN 'alternate_barcode_2'
            WHEN p.sku = search_code THEN 'sku'
            ELSE 'unknown'
        END as matched_field
    FROM products p
    WHERE p.product_code = search_code
       OR p.barcode_number = search_code
       OR p.alternate_barcode_1 = search_code
       OR p.alternate_barcode_2 = search_code
       OR p.sku = search_code
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 5: Update updated_at trigger to include new columns
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Display completion message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Successfully added barcode/product code fields to products table:';
    RAISE NOTICE '  - product_code: Primary product code';
    RAISE NOTICE '  - barcode_number: Primary barcode';
    RAISE NOTICE '  - alternate_barcode_1: First alternate';
    RAISE NOTICE '  - alternate_barcode_2: Second alternate';
    RAISE NOTICE '  - sku: Stock Keeping Unit';
    RAISE NOTICE 'Helper function created: find_product_by_code()';
END $$;

-- ============================================================================
-- SAMPLE DATA: How to use (commented out - uncomment to populate)
-- ============================================================================

/*
-- Example: Update a product with multiple codes
UPDATE products
SET 
    product_code = 'PROD-1761634543481-66-006',
    barcode_number = '5901234123457',
    alternate_barcode_1 = 'ALT-001-SW9004',
    alternate_barcode_2 = 'ALT-002-TISSUE',
    sku = 'SKU-TISSUE-001'
WHERE id = 'YOUR_PRODUCT_ID';

-- Example: Find a product by any of its codes
SELECT * FROM find_product_by_code('PROD-1761634543481-66-006');
SELECT * FROM find_product_by_code('5901234123457');
SELECT * FROM find_product_by_code('SKU-TISSUE-001');
*/
