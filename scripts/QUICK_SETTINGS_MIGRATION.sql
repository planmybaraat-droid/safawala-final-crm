-- ============================================
-- QUICK MIGRATION - Settings Tables
-- Copy and run this in Supabase SQL Editor
-- ============================================

-- 1. Add missing columns to company_settings
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

-- 2. Ensure branding_settings has signature_url
ALTER TABLE branding_settings 
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- 3. Create storage bucket for uploads (logo & signature)
INSERT INTO storage.buckets (id, name, public)
VALUES ('settings-uploads', 'settings-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Verify changes
SELECT 'Company Settings:' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'company_settings'
AND column_name IN ('pincode', 'pan_number', 'terms_conditions')
UNION ALL
SELECT 'Branding Settings:' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'branding_settings'
AND column_name IN ('logo_url', 'signature_url', 'primary_color', 'secondary_color')
ORDER BY table_name, column_name;

SELECT '✅ Migration complete!' as status;
