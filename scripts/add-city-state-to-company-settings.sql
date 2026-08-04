-- Script to add city and state columns to company_settings table
DO $$
BEGIN
    -- Add city column if it doesn't exist
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

    -- Add state column if it doesn't exist
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