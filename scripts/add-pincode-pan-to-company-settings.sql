-- Add pincode and pan_number columns to company_settings table
-- Run this migration to support new company information fields

-- Check if columns exist and add them if they don't
DO $$ 
BEGIN
    -- Add pincode column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' 
        AND column_name = 'pincode'
    ) THEN
        ALTER TABLE company_settings 
        ADD COLUMN pincode VARCHAR(10);
        
        RAISE NOTICE 'Added pincode column to company_settings';
    ELSE
        RAISE NOTICE 'Column pincode already exists in company_settings';
    END IF;

    -- Add pan_number column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' 
        AND column_name = 'pan_number'
    ) THEN
        ALTER TABLE company_settings 
        ADD COLUMN pan_number VARCHAR(10);
        
        RAISE NOTICE 'Added pan_number column to company_settings';
    ELSE
        RAISE NOTICE 'Column pan_number already exists in company_settings';
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'company_settings'
AND column_name IN ('pincode', 'pan_number')
ORDER BY column_name;
