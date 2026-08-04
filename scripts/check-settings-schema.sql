-- Check company_settings table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'company_settings'
ORDER BY ordinal_position;

-- Check branding_settings table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'branding_settings'
ORDER BY ordinal_position;

-- Check what columns we actually have
SELECT 
    'company_settings columns:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_name = 'company_settings';

SELECT 
    'branding_settings columns:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_name = 'branding_settings';
