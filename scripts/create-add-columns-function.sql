-- Create a function to add city and state columns to company_settings table
CREATE OR REPLACE FUNCTION add_city_state_columns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Add city column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' 
        AND column_name = 'city'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN city VARCHAR(100);
    END IF;

    -- Add state column if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' 
        AND column_name = 'state'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN state VARCHAR(100);
    END IF;

    -- Add comments
    COMMENT ON COLUMN public.company_settings.city IS 'Company city location';
    COMMENT ON COLUMN public.company_settings.state IS 'Company state/province location';
END;
$$;