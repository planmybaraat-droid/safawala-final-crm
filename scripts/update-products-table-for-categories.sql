-- This script updates the 'products' table to use the new 'product_categories' table.
-- It adds 'category_id' and 'subcategory_id' columns, sets up foreign key relationships,
-- and renames the old 'category' column to avoid data loss.

DO $$
BEGIN
    -- Add category_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE products ADD COLUMN category_id UUID;
    END IF;

    -- Add subcategory_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'subcategory_id') THEN
        ALTER TABLE products ADD COLUMN subcategory_id UUID;
    END IF;

    -- Add foreign key constraint for category_id to product_categories
    IF NOT EXISTS (SELECT 1 FROM pg_constraint 
                   WHERE conname = 'products_category_id_fkey' AND conrelid = 'products'::regclass) THEN
        ALTER TABLE products 
        ADD CONSTRAINT products_category_id_fkey 
        FOREIGN KEY (category_id) 
        REFERENCES product_categories(id)
        ON DELETE SET NULL;
    END IF;

    -- Add foreign key constraint for subcategory_id to product_categories
    IF NOT EXISTS (SELECT 1 FROM pg_constraint 
                   WHERE conname = 'products_subcategory_id_fkey' AND conrelid = 'products'::regclass) THEN
        ALTER TABLE products 
        ADD CONSTRAINT products_subcategory_id_fkey 
        FOREIGN KEY (subcategory_id) 
        REFERENCES product_categories(id)
        ON DELETE SET NULL;
    END IF;

    -- Rename the old 'category' column to 'category_legacy_text' if it exists
    -- This preserves old data while allowing the new foreign key columns to be used.
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'products' AND column_name = 'category') THEN
        -- Check if it's not already renamed to prevent errors on re-running the script
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_legacy_text') THEN
            ALTER TABLE products RENAME COLUMN category TO category_legacy_text;
        END IF;
    END IF;

END $$;

-- Verify the changes by checking the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('category_id', 'subcategory_id', 'category_legacy_text')
ORDER BY ordinal_position;
