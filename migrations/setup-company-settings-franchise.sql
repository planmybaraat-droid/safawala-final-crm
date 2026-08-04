-- Add UNIQUE constraint and RLS for franchise_id in company_settings
-- (Column already exists, so we just need to set up the constraints)

-- Add UNIQUE constraint so each franchise can have only one company_settings record
ALTER TABLE company_settings ADD CONSTRAINT unique_company_settings_franchise_id UNIQUE(franchise_id);

-- Create index for faster lookups (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_company_settings_franchise_id ON company_settings(franchise_id);

-- Enable RLS if not already enabled
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Enable all for company_settings" ON company_settings;

-- Create new RLS policy
CREATE POLICY "Enable all for company_settings" ON company_settings FOR ALL USING (true);
