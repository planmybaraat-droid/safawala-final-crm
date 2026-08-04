-- ============================================
-- SIMPLE SETTINGS MIGRATION (No Foreign Keys)
-- Creates tables without franchise_id dependencies
-- Copy and run this in Supabase SQL Editor
-- ============================================

-- 1. Create company_settings table (without foreign key for now)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID,  -- No foreign key constraint
  company_name VARCHAR(255) NOT NULL DEFAULT 'Safawala Rental Services',
  email VARCHAR(255),
  phone VARCHAR(20),
  gst_number VARCHAR(20),
  pan_number VARCHAR(10),
  address TEXT,
  pincode VARCHAR(10),
  city VARCHAR(100),
  state VARCHAR(100),
  website VARCHAR(255),
  logo_url TEXT,
  signature_url TEXT,
  terms_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to company_settings (if table already existed)
DO $$ 
BEGIN
  ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
  ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10);
  ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 2. Create branding_settings table (without foreign key for now)
CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID,  -- No foreign key constraint
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#EF4444',
  logo_url TEXT,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add signature_url if table already existed
DO $$ 
BEGIN
  ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS signature_url TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 3. Create banking_details table (without foreign key for now)
CREATE TABLE IF NOT EXISTS banking_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID,  -- No foreign key constraint
  bank_name VARCHAR(100) NOT NULL,
  account_holder_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  branch_name VARCHAR(100),
  account_type VARCHAR(20) DEFAULT 'Current',
  is_primary BOOLEAN DEFAULT FALSE,
  show_on_invoice BOOLEAN DEFAULT TRUE,
  upi_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create storage bucket for uploads (logo & signature)
INSERT INTO storage.buckets (id, name, public)
VALUES ('settings-uploads', 'settings-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Set up storage policies for settings-uploads bucket
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to update their files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to delete their files" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create storage policies
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'settings-uploads');

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'settings-uploads');

CREATE POLICY "Allow authenticated users to update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'settings-uploads');

CREATE POLICY "Allow authenticated users to delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'settings-uploads');

-- 6. Create indexes for better performance (without franchise_id for now)
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_company_settings_id ON company_settings(id);
  CREATE INDEX IF NOT EXISTS idx_branding_settings_id ON branding_settings(id);
  CREATE INDEX IF NOT EXISTS idx_banking_details_id ON banking_details(id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- 7. Verify the setup
SELECT '✅ COMPANY SETTINGS TABLE' as status;
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'company_settings'
ORDER BY ordinal_position;

SELECT '✅ BRANDING SETTINGS TABLE' as status;
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'branding_settings'
ORDER BY ordinal_position;

SELECT '✅ BANKING DETAILS TABLE' as status;
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'banking_details'
ORDER BY ordinal_position;

SELECT '✅ STORAGE BUCKET' as status;
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE name = 'settings-uploads';

SELECT '🎉 Migration complete! All tables and columns are ready.' as final_status;
