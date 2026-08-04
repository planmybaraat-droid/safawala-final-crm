-- Add city and state columns to company_settings table
-- This script will add the missing columns to the existing table

-- Add city column
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Add state column  
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS state VARCHAR(100);

-- Add comments for the new columns
COMMENT ON COLUMN public.company_settings.city IS 'Company city location';
COMMENT ON COLUMN public.company_settings.state IS 'Company state/province location';

-- Optional: Update existing records with default values if needed
-- UPDATE public.company_settings 
-- SET city = 'Default City', state = 'Default State' 
-- WHERE city IS NULL OR state IS NULL;

COMMIT;