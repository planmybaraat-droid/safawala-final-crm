-- Add franchise_id to company_settings table to enable franchise-specific company information
-- This allows each franchise to have its own company name, phone, email, address, GST, etc.

ALTER TABLE company_settings ADD COLUMN franchise_id UUID;

-- Create index for faster lookups
CREATE INDEX idx_company_settings_franchise_id ON company_settings(franchise_id);

-- Update existing row to associate with your franchise (if needed)
-- UPDATE company_settings SET franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99' WHERE company_name = 'SAFAWALA';

-- Create UNIQUE constraint so each franchise can have only one company_settings record
ALTER TABLE company_settings ADD CONSTRAINT unique_company_settings_franchise_id UNIQUE(franchise_id);

-- Enable RLS if not already enabled
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Enable all for company_settings" ON company_settings;

-- Create new RLS policy
CREATE POLICY "Enable all for company_settings" ON company_settings FOR ALL USING (true);
