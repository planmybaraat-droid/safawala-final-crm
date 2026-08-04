-- Add missing columns to company_settings table
-- This script adds all the missing columns that the frontend expects

-- Add timezone column
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_settings' 
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN timezone VARCHAR(100) DEFAULT 'Asia/Kolkata';
        RAISE NOTICE 'Added timezone column to company_settings table';
    ELSE
        RAISE NOTICE 'Timezone column already exists in company_settings table';
    END IF;
END $$;

-- Add currency column
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_settings' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN currency VARCHAR(10) DEFAULT 'INR';
        RAISE NOTICE 'Added currency column to company_settings table';
    ELSE
        RAISE NOTICE 'Currency column already exists in company_settings table';
    END IF;
END $$;

-- Add website column
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_settings' 
        AND column_name = 'website'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN website TEXT;
        RAISE NOTICE 'Added website column to company_settings table';
    ELSE
        RAISE NOTICE 'Website column already exists in company_settings table';
    END IF;
END $$;

-- Add language column
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_settings' 
        AND column_name = 'language'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN language VARCHAR(10) DEFAULT 'en';
        RAISE NOTICE 'Added language column to company_settings table';
    ELSE
        RAISE NOTICE 'Language column already exists in company_settings table';
    END IF;
END $$;

-- Add date_format column
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_settings' 
        AND column_name = 'date_format'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY';
        RAISE NOTICE 'Added date_format column to company_settings table';
    ELSE
        RAISE NOTICE 'Date_format column already exists in company_settings table';
    END IF;
END $$;

-- Ensure city column exists (may already exist from previous scripts)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_settings' 
        AND column_name = 'city'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN city VARCHAR(100);
        RAISE NOTICE 'Added city column to company_settings table';
    ELSE
        RAISE NOTICE 'City column already exists in company_settings table';
    END IF;
END $$;

-- Ensure state column exists (may already exist from previous scripts)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_settings' 
        AND column_name = 'state'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN state VARCHAR(100);
        RAISE NOTICE 'Added state column to company_settings table';
    ELSE
        RAISE NOTICE 'State column already exists in company_settings table';
    END IF;
END $$;

-- Ensure logo_url column exists (may already exist from previous scripts)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'company_settings' 
        AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN logo_url TEXT;
        RAISE NOTICE 'Added logo_url column to company_settings table';
    ELSE
        RAISE NOTICE 'Logo_url column already exists in company_settings table';
    END IF;
END $$;

-- Add column comments
COMMENT ON COLUMN public.company_settings.timezone IS 'Company timezone for date/time display';
COMMENT ON COLUMN public.company_settings.currency IS 'Default currency for the company';
COMMENT ON COLUMN public.company_settings.website IS 'Company website URL';
COMMENT ON COLUMN public.company_settings.language IS 'Default language for the company interface';
COMMENT ON COLUMN public.company_settings.date_format IS 'Preferred date format for display';
COMMENT ON COLUMN public.company_settings.city IS 'Company city location';
COMMENT ON COLUMN public.company_settings.state IS 'Company state/province location';
COMMENT ON COLUMN public.company_settings.logo_url IS 'URL to company logo image';

-- Update existing records to have default values for new columns if they are NULL
UPDATE public.company_settings 
SET 
    timezone = COALESCE(timezone, 'Asia/Kolkata'),
    currency = COALESCE(currency, 'INR'),
    language = COALESCE(language, 'en'),
    date_format = COALESCE(date_format, 'DD/MM/YYYY')
WHERE timezone IS NULL OR currency IS NULL OR language IS NULL OR date_format IS NULL;

RAISE NOTICE 'Successfully added all missing columns to company_settings table';