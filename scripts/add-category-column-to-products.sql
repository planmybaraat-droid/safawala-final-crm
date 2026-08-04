-- Add category column to products table if it doesn't exist
DO $$ 
BEGIN
    -- Check if category column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'category'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE products ADD COLUMN category VARCHAR(100);
        
        -- Update existing products with default categories
        UPDATE products SET category = 'Wedding Accessories' WHERE category IS NULL;
        
        -- Add some sample categories for existing products
        UPDATE products SET category = 'Bridal Wear' WHERE name ILIKE '%dress%' OR name ILIKE '%gown%';
        UPDATE products SET category = 'Jewelry' WHERE name ILIKE '%ring%' OR name ILIKE '%necklace%' OR name ILIKE '%earring%';
        UPDATE products SET category = 'Decorations' WHERE name ILIKE '%flower%' OR name ILIKE '%decoration%' OR name ILIKE '%centerpiece%';
        UPDATE products SET category = 'Linens' WHERE name ILIKE '%tablecloth%' OR name ILIKE '%napkin%' OR name ILIKE '%runner%';
        UPDATE products SET category = 'Lighting' WHERE name ILIKE '%light%' OR name ILIKE '%candle%' OR name ILIKE '%lamp%';
        
        RAISE NOTICE 'Category column added to products table successfully';
    ELSE
        RAISE NOTICE 'Category column already exists in products table';
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Show updated products with categories
SELECT id, name, category, is_active 
FROM products 
WHERE is_active = true 
ORDER BY category, name;
