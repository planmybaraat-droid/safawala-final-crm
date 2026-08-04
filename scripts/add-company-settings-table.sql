-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    gst_number VARCHAR(50),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for company_settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read company settings
CREATE POLICY "Allow authenticated users to read company settings" ON company_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Allow admin users to manage company settings
CREATE POLICY "Allow admin users to manage company settings" ON company_settings
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Insert default company settings if none exist
INSERT INTO company_settings (company_name, email, phone, address, city, state, gst_number, logo_url)
SELECT 'Safawala CRM', 'admin@safawala.com', '', '', '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

COMMENT ON TABLE company_settings IS 'Company settings and branding information';
COMMENT ON COLUMN company_settings.company_name IS 'Company name displayed in the application';
COMMENT ON COLUMN company_settings.email IS 'Primary company email address';
COMMENT ON COLUMN company_settings.phone IS 'Company phone number';
COMMENT ON COLUMN company_settings.address IS 'Company physical address';
COMMENT ON COLUMN company_settings.city IS 'Company city';
COMMENT ON COLUMN company_settings.state IS 'Company state/province';
COMMENT ON COLUMN company_settings.gst_number IS 'Company GST registration number';
COMMENT ON COLUMN company_settings.logo_url IS 'URL to company logo image';