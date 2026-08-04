-- Add security_deposit and extra_safa_price columns to package_sets table
-- Remove package_type column as requested

-- Add new columns
ALTER TABLE package_sets 
ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_safa_price NUMERIC DEFAULT 0;

-- Remove package_type column
ALTER TABLE package_sets 
DROP COLUMN IF EXISTS package_type;

-- Update existing records to have default values
UPDATE package_sets 
SET security_deposit = 0, extra_safa_price = 0 
WHERE security_deposit IS NULL OR extra_safa_price IS NULL;
