-- Quick check for expense_categories table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'expense_categories'
ORDER BY ordinal_position;

-- Check if it has franchise_id
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'expense_categories' 
            AND column_name = 'franchise_id'
        ) THEN '✅ Has franchise_id column'
        ELSE '❌ No franchise_id column - this is a global table'
    END as status;
