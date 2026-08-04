-- Add terms_conditions column to company_settings table
-- Run this in Supabase SQL Editor

DO $$ 
BEGIN
    -- Add terms_conditions column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' 
        AND column_name = 'terms_conditions'
    ) THEN
        ALTER TABLE company_settings ADD COLUMN terms_conditions TEXT;
        RAISE NOTICE '✅ Added terms_conditions column to company_settings';
    ELSE
        RAISE NOTICE 'ℹ️ terms_conditions column already exists in company_settings';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'company_settings'
AND column_name = 'terms_conditions';
