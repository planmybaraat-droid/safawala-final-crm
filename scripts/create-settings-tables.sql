-- Create settings tables for the application

-- Company/System settings table
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL DEFAULT 'Safawala Laundry Services',
    business_type VARCHAR(50) NOT NULL DEFAULT 'laundry',
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    date_format VARCHAR(20) NOT NULL DEFAULT 'dd-mm-yyyy',
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    gst_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    marketing_notifications BOOLEAN DEFAULT false,
    booking_reminders BOOLEAN DEFAULT true,
    payment_reminders BOOLEAN DEFAULT true,
    inventory_alerts BOOLEAN DEFAULT true,
    system_updates BOOLEAN DEFAULT true,
    low_stock_alerts BOOLEAN DEFAULT true,
    customer_updates BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Business hours table
CREATE TABLE IF NOT EXISTS business_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    day_name VARCHAR(20) NOT NULL,
    is_open BOOLEAN DEFAULT true,
    open_time TIME,
    close_time TIME,
    break_start_time TIME,
    break_end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(franchise_id, day_of_week)
);

-- Tax settings table
CREATE TABLE IF NOT EXISTS tax_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    tax_name VARCHAR(100) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    tax_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
    is_active BOOLEAN DEFAULT true,
    applies_to VARCHAR(50) NOT NULL DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment gateway settings table
CREATE TABLE IF NOT EXISTS payment_gateway_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    gateway_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    is_test_mode BOOLEAN DEFAULT true,
    supported_methods TEXT[] DEFAULT '{}',
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    webhook_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default company settings
INSERT INTO company_settings (
    company_name, business_type, timezone, currency, language, 
    address, phone, email, website, gst_number
) VALUES (
    'Safawala Laundry Services',
    'laundry',
    'Asia/Kolkata',
    'INR',
    'en',
    '123 Main Street, Downtown, City - 400001',
    '+91 9876543210',
    'info@safawala.com',
    'www.safawala.com',
    '27AAAAA0000A1Z5'
) ON CONFLICT DO NOTHING;

-- Insert default tax settings for the first franchise
INSERT INTO tax_settings (franchise_id, tax_name, tax_rate, tax_type, is_active, applies_to)
SELECT 
    f.id,
    'GST',
    18.00,
    'percentage',
    true,
    'all'
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO tax_settings (franchise_id, tax_name, tax_rate, tax_type, is_active, applies_to)
SELECT 
    f.id,
    'Service Tax',
    5.00,
    'percentage',
    false,
    'services'
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert default payment gateway settings for the first franchise
INSERT INTO payment_gateway_settings (franchise_id, gateway_name, is_enabled, is_test_mode, supported_methods)
SELECT 
    f.id,
    'Razorpay',
    true,
    true,
    ARRAY['card', 'upi', 'netbanking']
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO payment_gateway_settings (franchise_id, gateway_name, is_enabled, is_test_mode, supported_methods)
SELECT 
    f.id,
    'PayU',
    false,
    true,
    ARRAY['card', 'wallet']
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO payment_gateway_settings (franchise_id, gateway_name, is_enabled, is_test_mode, supported_methods)
SELECT 
    f.id,
    'Paytm',
    false,
    true,
    ARRAY['wallet', 'upi']
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert default business hours for the first franchise
INSERT INTO business_hours (franchise_id, day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
SELECT 
    f.id,
    0,
    'Monday',
    true,
    '09:00'::TIME,
    '18:00'::TIME,
    '13:00'::TIME,
    '14:00'::TIME
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO business_hours (franchise_id, day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
SELECT 
    f.id,
    1,
    'Tuesday',
    true,
    '09:00'::TIME,
    '18:00'::TIME,
    '13:00'::TIME,
    '14:00'::TIME
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO business_hours (franchise_id, day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
SELECT 
    f.id,
    2,
    'Wednesday',
    true,
    '09:00'::TIME,
    '18:00'::TIME,
    '13:00'::TIME,
    '14:00'::TIME
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO business_hours (franchise_id, day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
SELECT 
    f.id,
    3,
    'Thursday',
    true,
    '09:00'::TIME,
    '18:00'::TIME,
    '13:00'::TIME,
    '14:00'::TIME
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO business_hours (franchise_id, day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
SELECT 
    f.id,
    4,
    'Friday',
    true,
    '09:00'::TIME,
    '18:00'::TIME,
    '13:00'::TIME,
    '14:00'::TIME
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO business_hours (franchise_id, day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
SELECT 
    f.id,
    5,
    'Saturday',
    true,
    '09:00'::TIME,
    '16:00'::TIME,
    NULL,
    NULL
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO business_hours (franchise_id, day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
SELECT 
    f.id,
    6,
    'Sunday',
    false,
    NULL,
    NULL,
    NULL,
    NULL
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_franchise_id ON business_hours(franchise_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_franchise_id ON tax_settings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_settings_franchise_id ON payment_gateway_settings(franchise_id);

-- Enable RLS on new tables
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateway_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (for now, allow all operations for demo)
CREATE POLICY "Allow all operations on company_settings" ON company_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on notification_settings" ON notification_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on business_hours" ON business_hours FOR ALL USING (true);
CREATE POLICY "Allow all operations on tax_settings" ON tax_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on payment_gateway_settings" ON payment_gateway_settings FOR ALL USING (true);
