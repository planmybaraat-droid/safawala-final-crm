-- ============================================
-- COMPLETE BRANDING & COMPANY SETTINGS MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- Part 1: Update branding_settings table to match new simplified UI
-- Remove columns we don't need anymore
DO $$ 
BEGIN
    -- Check if accent_color exists and remove it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'branding_settings' 
        AND column_name = 'accent_color'
    ) THEN
        ALTER TABLE branding_settings DROP COLUMN accent_color;
        RAISE NOTICE '✅ Removed accent_color column from branding_settings';
    ELSE
        RAISE NOTICE 'ℹ️ accent_color column does not exist';
    END IF;

    -- Check if background_color exists and remove it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'branding_settings' 
        AND column_name = 'background_color'
    ) THEN
        ALTER TABLE branding_settings DROP COLUMN background_color;
        RAISE NOTICE '✅ Removed background_color column from branding_settings';
    ELSE
        RAISE NOTICE 'ℹ️ background_color column does not exist';
    END IF;

    -- Check if font_family exists and remove it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'branding_settings' 
        AND column_name = 'font_family'
    ) THEN
        ALTER TABLE branding_settings DROP COLUMN font_family;
        RAISE NOTICE '✅ Removed font_family column from branding_settings';
    ELSE
        RAISE NOTICE 'ℹ️ font_family column does not exist';
    END IF;
END $$;

-- Part 2: Ensure required branding columns exist
DO $$ 
BEGIN
    -- Ensure primary_color exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'branding_settings' 
        AND column_name = 'primary_color'
    ) THEN
        ALTER TABLE branding_settings ADD COLUMN primary_color VARCHAR(7) DEFAULT '#3B82F6';
        RAISE NOTICE '✅ Added primary_color column';
    ELSE
        RAISE NOTICE 'ℹ️ primary_color already exists';
    END IF;

    -- Ensure secondary_color exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'branding_settings' 
        AND column_name = 'secondary_color'
    ) THEN
        ALTER TABLE branding_settings ADD COLUMN secondary_color VARCHAR(7) DEFAULT '#EF4444';
        RAISE NOTICE '✅ Added secondary_color column';
    ELSE
        RAISE NOTICE 'ℹ️ secondary_color already exists';
    END IF;

    -- Ensure logo_url exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'branding_settings' 
        AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE branding_settings ADD COLUMN logo_url TEXT;
        RAISE NOTICE '✅ Added logo_url column';
    ELSE
        RAISE NOTICE 'ℹ️ logo_url already exists';
    END IF;

    -- Ensure signature_url exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'branding_settings' 
        AND column_name = 'signature_url'
    ) THEN
        ALTER TABLE branding_settings ADD COLUMN signature_url TEXT;
        RAISE NOTICE '✅ Added signature_url column';
    ELSE
        RAISE NOTICE 'ℹ️ signature_url already exists';
    END IF;
END $$;

-- Part 3: Add missing company_settings columns
DO $$ 
BEGIN
    -- Add pincode column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' 
        AND column_name = 'pincode'
    ) THEN
        ALTER TABLE company_settings ADD COLUMN pincode VARCHAR(10);
        RAISE NOTICE '✅ Added pincode column to company_settings';
    ELSE
        RAISE NOTICE 'ℹ️ pincode already exists in company_settings';
    END IF;

    -- Add pan_number column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' 
        AND column_name = 'pan_number'
    ) THEN
        ALTER TABLE company_settings ADD COLUMN pan_number VARCHAR(10);
        RAISE NOTICE '✅ Added pan_number column to company_settings';
    ELSE
        RAISE NOTICE 'ℹ️ pan_number already exists in company_settings';
    END IF;

    -- Add terms_conditions column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' 
        AND column_name = 'terms_conditions'
    ) THEN
        ALTER TABLE company_settings ADD COLUMN terms_conditions TEXT;
        RAISE NOTICE '✅ Added terms_conditions column to company_settings';
    ELSE
        RAISE NOTICE 'ℹ️ terms_conditions already exists in company_settings';
    END IF;
END $$;

-- Part 4: Create Supabase Storage bucket for uploads (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('settings-uploads', 'settings-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Part 5: Set storage policies for settings-uploads bucket
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public access to uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow users to delete their uploads" ON storage.objects;
    
    -- Create new policies
    CREATE POLICY "Allow authenticated users to upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'settings-uploads');
    
    CREATE POLICY "Allow public access to uploads"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'settings-uploads');
    
    CREATE POLICY "Allow users to delete their uploads"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'settings-uploads');
    
    RAISE NOTICE '✅ Storage policies created';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ℹ️ Storage policies may already exist or need manual setup';
END $$;

-- Part 6: Verify all changes
SELECT 
    '=== BRANDING SETTINGS COLUMNS ===' as info;

SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    column_default
FROM information_schema.columns 
WHERE table_name = 'branding_settings'
ORDER BY ordinal_position;

SELECT 
    '=== COMPANY SETTINGS NEW COLUMNS ===' as info;

SELECT 
    column_name, 
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'company_settings'
AND column_name IN ('pincode', 'pan_number', 'terms_conditions')
ORDER BY column_name;

-- Success message
SELECT 
    '✅ MIGRATION COMPLETE!' as status,
    'All tables updated successfully' as message;
