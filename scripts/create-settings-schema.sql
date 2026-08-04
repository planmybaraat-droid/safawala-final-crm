-- Create comprehensive settings schema for Safawala CRM

-- Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id),
  company_name VARCHAR(255) NOT NULL DEFAULT 'Safawala Rental Services',
  email VARCHAR(255),
  phone VARCHAR(20),
  gst_number VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  website VARCHAR(255),
  logo_url TEXT,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(franchise_id)
);

-- Branding Settings
CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id),
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#EF4444',
  accent_color VARCHAR(7) DEFAULT '#10B981',
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  font_family VARCHAR(100) DEFAULT 'Inter',
  logo_url TEXT,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(franchise_id)
);

-- Invoice Templates
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('invoice', 'quote')),
  template_data JSONB NOT NULL, -- Stores template structure and styling
  thumbnail_url TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Settings (Invoice/Quote configurations)
CREATE TABLE IF NOT EXISTS document_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id),
  invoice_number_format VARCHAR(100) DEFAULT 'INV-{YYYY}-{0001}',
  quote_number_format VARCHAR(100) DEFAULT 'QTE-{YYYY}-{0001}',
  invoice_template_id UUID REFERENCES invoice_templates(id),
  quote_template_id UUID REFERENCES invoice_templates(id),
  default_payment_terms VARCHAR(50) DEFAULT 'Net 15',
  default_tax_rate DECIMAL(5,2) DEFAULT 18.00,
  show_gst_breakdown BOOLEAN DEFAULT TRUE,
  default_terms_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(franchise_id)
);

-- Banking Details
CREATE TABLE IF NOT EXISTS banking_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id),
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

-- Locale & Fiscal Settings
CREATE TABLE IF NOT EXISTS locale_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id),
  currency_code VARCHAR(3) DEFAULT 'INR',
  currency_symbol VARCHAR(5) DEFAULT '₹',
  number_format VARCHAR(20) DEFAULT 'en-IN',
  decimal_separator VARCHAR(1) DEFAULT '.',
  thousand_separator VARCHAR(1) DEFAULT ',',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  fiscal_year_start_month INTEGER DEFAULT 4, -- April = 4
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(franchise_id)
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(50) NOT NULL,
  permissions JSONB NOT NULL, -- Stores permission structure
  is_default BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_name)
);

-- User Profiles (Extended)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  full_name VARCHAR(100),
  designation VARCHAR(100),
  profile_photo_url TEXT,
  mobile_number VARCHAR(20),
  whatsapp_number VARCHAR(20),
  digital_signature_url TEXT,
  is_mobile_verified BOOLEAN DEFAULT FALSE,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Insert default invoice templates
INSERT INTO invoice_templates (name, type, template_data, is_default) VALUES
('Classic Invoice', 'invoice', '{"layout": "classic", "colors": {"primary": "#3B82F6", "text": "#1F2937"}, "sections": ["header", "items", "totals", "footer"]}', true),
('Modern Invoice', 'invoice', '{"layout": "modern", "colors": {"primary": "#10B981", "text": "#111827"}, "sections": ["header", "items", "totals", "footer"]}', false),
('Minimal Invoice', 'invoice', '{"layout": "minimal", "colors": {"primary": "#6B7280", "text": "#374151"}, "sections": ["header", "items", "totals"]}', false),
('Professional Invoice', 'invoice', '{"layout": "professional", "colors": {"primary": "#7C3AED", "text": "#1F2937"}, "sections": ["header", "company", "items", "totals", "footer"]}', false),
('Creative Invoice', 'invoice', '{"layout": "creative", "colors": {"primary": "#F59E0B", "text": "#1F2937"}, "sections": ["header", "items", "totals", "footer"]}', false),
('Simple Invoice', 'invoice', '{"layout": "simple", "colors": {"primary": "#EF4444", "text": "#374151"}, "sections": ["header", "items", "totals"]}', false),
('Classic Quote', 'quote', '{"layout": "classic", "colors": {"primary": "#3B82F6", "text": "#1F2937"}, "sections": ["header", "items", "totals", "validity"]}', true),
('Modern Quote', 'quote', '{"layout": "modern", "colors": {"primary": "#10B981", "text": "#111827"}, "sections": ["header", "items", "totals", "validity"]}', false),
('Minimal Quote', 'quote', '{"layout": "minimal", "colors": {"primary": "#6B7280", "text": "#374151"}, "sections": ["header", "items", "totals"]}', false),
('Professional Quote', 'quote', '{"layout": "professional", "colors": {"primary": "#7C3AED", "text": "#1F2937"}, "sections": ["header", "company", "items", "totals", "validity"]}', false),
('Creative Quote', 'quote', '{"layout": "creative", "colors": {"primary": "#F59E0B", "text": "#1F2937"}, "sections": ["header", "items", "totals", "validity"]}', false),
('Simple Quote', 'quote', '{"layout": "simple", "colors": {"primary": "#EF4444", "text": "#374151"}, "sections": ["header", "items", "totals"]}', false);

-- Insert default role permissions
INSERT INTO role_permissions (role_name, permissions, is_default, description) VALUES
('super_admin', '{"all": true}', true, 'Full system access - can manage everything'),
('franchise_admin', '{"franchise": {"manage": true, "view": true}, "bookings": {"create": true, "view": true, "edit": true, "delete": true}, "customers": {"create": true, "view": true, "edit": true, "delete": true}, "inventory": {"create": true, "view": true, "edit": true, "delete": true}, "staff": {"create": true, "view": true, "edit": true, "delete": false}, "reports": {"view": true, "export": true}, "settings": {"view": true, "edit": true}}', true, 'Franchise management with most permissions'),
('staff', '{"bookings": {"create": true, "view": true, "edit": true, "delete": false}, "customers": {"create": true, "view": true, "edit": true, "delete": false}, "inventory": {"view": true}, "reports": {"view": true}}', true, 'Basic staff permissions for daily operations');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_settings_franchise_id ON company_settings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_branding_settings_franchise_id ON branding_settings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_document_settings_franchise_id ON document_settings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_banking_details_franchise_id ON banking_details(franchise_id);
CREATE INDEX IF NOT EXISTS idx_locale_settings_franchise_id ON locale_settings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_type ON invoice_templates(type);
CREATE INDEX IF NOT EXISTS idx_banking_details_primary ON banking_details(is_primary);

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
('settings-uploads', 'settings-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE banking_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE locale_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - adjust based on your auth system)
CREATE POLICY "Users can view their franchise settings" ON company_settings FOR SELECT USING (true);
CREATE POLICY "Users can update their franchise settings" ON company_settings FOR ALL USING (true);

CREATE POLICY "Users can view their branding settings" ON branding_settings FOR SELECT USING (true);
CREATE POLICY "Users can update their branding settings" ON branding_settings FOR ALL USING (true);

CREATE POLICY "Users can view their document settings" ON document_settings FOR SELECT USING (true);
CREATE POLICY "Users can update their document settings" ON document_settings FOR ALL USING (true);

CREATE POLICY "Users can view their banking details" ON banking_details FOR SELECT USING (true);
CREATE POLICY "Users can manage their banking details" ON banking_details FOR ALL USING (true);

CREATE POLICY "Users can view their locale settings" ON locale_settings FOR SELECT USING (true);
CREATE POLICY "Users can update their locale settings" ON locale_settings FOR ALL USING (true);

CREATE POLICY "Users can view their profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their profiles" ON user_profiles FOR ALL USING (true);

CREATE POLICY "Templates are public" ON invoice_templates FOR SELECT USING (true);
CREATE POLICY "Role permissions are public" ON role_permissions FOR SELECT USING (true);

-- Functions to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branding_settings_updated_at BEFORE UPDATE ON branding_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_settings_updated_at BEFORE UPDATE ON document_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_banking_details_updated_at BEFORE UPDATE ON banking_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locale_settings_updated_at BEFORE UPDATE ON locale_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();