-- This script modifies the 'products' table to allow NULL values in the 'category_legacy_text' column.
-- This is necessary because this column is now a legacy field and is not populated for new products,
-- which use the 'category_id' foreign key instead.

ALTER TABLE products
ALTER COLUMN category_legacy_text DROP NOT NULL;

-- Verification: Check the column properties to confirm 'is_nullable' is now 'YES'.
SELECT 
    column_name, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'products' 
    AND column_name = 'category_legacy_text';
