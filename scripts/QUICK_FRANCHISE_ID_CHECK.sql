-- Quick check: Which tables have franchise_id?

-- ============================================================
-- STEP 1: List all tables WITH franchise_id
-- ============================================================
SELECT 
    table_name,
    '✅ Has franchise_id' as status
FROM information_schema.columns 
WHERE column_name = 'franchise_id'
AND table_schema = 'public'
ORDER BY table_name;
