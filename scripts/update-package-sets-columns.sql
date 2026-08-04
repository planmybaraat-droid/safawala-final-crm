-- Adding security_deposit and extra_safa_price columns to package_sets table and removing package_type
-- Add security_deposit column to store security deposit amount for packages
ALTER TABLE package_sets 
ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0;

-- Add extra_safa_price column to store per-piece pricing for additional safas
ALTER TABLE package_sets 
ADD COLUMN IF NOT EXISTS extra_safa_price NUMERIC DEFAULT 0;

-- Remove package_type column as requested by user
ALTER TABLE package_sets 
DROP COLUMN IF EXISTS package_type;

-- Update existing records to have default values
UPDATE package_sets 
SET security_deposit = 0 
WHERE security_deposit IS NULL;

UPDATE package_sets 
SET extra_safa_price = 0 
WHERE extra_safa_price IS NULL;
