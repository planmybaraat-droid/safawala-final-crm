-- ✅ Quick Add Columns Script
-- Run this in Supabase SQL Editor

-- Add extra_safa_price column
ALTER TABLE package_variants 
ADD COLUMN IF NOT EXISTS extra_safa_price NUMERIC(10,2) DEFAULT 0;

-- Add missing_safa_penalty column  
ALTER TABLE package_variants 
ADD COLUMN IF NOT EXISTS missing_safa_penalty NUMERIC(10,2) DEFAULT 0;

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'package_variants'
AND column_name IN ('extra_safa_price', 'missing_safa_penalty');

SELECT '✅ Columns added successfully!' as status;
