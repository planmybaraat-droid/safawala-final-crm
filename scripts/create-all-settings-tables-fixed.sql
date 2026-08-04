-- Complete settings tables setup for Safawala CRM
-- This script creates all necessary tables for the settings functionality
-- Handles existing tables properly

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Company Settings Table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'Safawala Laundry Services',
    business_type TEXT NOT NULL DEFAULT 'laundry',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    currency TEXT NOT NULL DEFAULT 'INR',
    language TEXT NOT NULL DEFAULT 'en',
    date_format TEXT NOT NULL DEFAULT 'dd-mm-yyyy',
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    gst_number TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    date_format TEXT DEFAULT 'dd-mm-yyyy',
    currency TEXT DEFAULT 'INR',
    items_per_page INTEGER DEFAULT 10,
    auto_logout_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Notification Settings Table
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 4. Business Hours Table (handle existing table properly)
DO $$
BEGIN
    -- Create table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.business_hours (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        franchise_id UUID,
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        is_open BOOLEAN DEFAULT true,
        open_time TIME,
        close_time TIME,
        break_start_time TIME,
        break_end_time TIME,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Add day_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'business_hours' AND column_name = 'day_name') THEN
        ALTER TABLE public.business_hours ADD COLUMN day_name TEXT;
    END IF;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE table_name = 'business_hours' AND constraint_name = 'business_hours_franchise_id_day_of_week_key') THEN
        ALTER TABLE public.business_hours ADD CONSTRAINT business_hours_franchise_id_day_of_week_key UNIQUE(franchise_id, day_of_week);
    END IF;
END $$;

-- 5. Tax Settings Table
CREATE TABLE IF NOT EXISTS public.tax_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID,
    tax_name TEXT NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    tax_type TEXT NOT NULL DEFAULT 'percentage',
    is_active BOOLEAN DEFAULT true,
    applies_to TEXT NOT NULL DEFAULT 'all',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Payment Gateway Settings Table
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID,
    gateway_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    is_test_mode BOOLEAN DEFAULT true,
    supported_methods TEXT[] DEFAULT '{}',
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    webhook_url TEXT,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Integration Settings Table
CREATE TABLE IF NOT EXISTS public.integration_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    configuration JSONB DEFAULT '{}',
    api_credentials JSONB DEFAULT '{}',
    webhook_url TEXT,
    status TEXT DEFAULT 'disconnected',
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(integration_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_franchise_id ON public.business_hours(franchise_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_franchise_id ON public.tax_settings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_settings_franchise_id ON public.payment_gateway_settings(franchise_id);

-- Disable RLS for demo purposes (enable and create policies as needed)
ALTER TABLE public.company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_settings DISABLE ROW LEVEL SECURITY;

-- Insert default company settings (only if no records exist)
INSERT INTO public.company_settings (
    company_name, business_type, timezone, currency, language, 
    address, phone, email, website, gst_number
) 
SELECT 
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
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- Insert default business hours (handle existing records)
DO $$
BEGIN
    -- Monday
    IF NOT EXISTS (SELECT 1 FROM public.business_hours WHERE day_of_week = 0) THEN
        INSERT INTO public.business_hours (day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
        VALUES (0, 'Monday', true, '09:00'::TIME, '18:00'::TIME, '13:00'::TIME, '14:00'::TIME);
    ELSE
        UPDATE public.business_hours SET day_name = 'Monday' WHERE day_of_week = 0 AND day_name IS NULL;
    END IF;
    
    -- Tuesday
    IF NOT EXISTS (SELECT 1 FROM public.business_hours WHERE day_of_week = 1) THEN
        INSERT INTO public.business_hours (day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
        VALUES (1, 'Tuesday', true, '09:00'::TIME, '18:00'::TIME, '13:00'::TIME, '14:00'::TIME);
    ELSE
        UPDATE public.business_hours SET day_name = 'Tuesday' WHERE day_of_week = 1 AND day_name IS NULL;
    END IF;
    
    -- Wednesday
    IF NOT EXISTS (SELECT 1 FROM public.business_hours WHERE day_of_week = 2) THEN
        INSERT INTO public.business_hours (day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
        VALUES (2, 'Wednesday', true, '09:00'::TIME, '18:00'::TIME, '13:00'::TIME, '14:00'::TIME);
    ELSE
        UPDATE public.business_hours SET day_name = 'Wednesday' WHERE day_of_week = 2 AND day_name IS NULL;
    END IF;
    
    -- Thursday
    IF NOT EXISTS (SELECT 1 FROM public.business_hours WHERE day_of_week = 3) THEN
        INSERT INTO public.business_hours (day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
        VALUES (3, 'Thursday', true, '09:00'::TIME, '18:00'::TIME, '13:00'::TIME, '14:00'::TIME);
    ELSE
        UPDATE public.business_hours SET day_name = 'Thursday' WHERE day_of_week = 3 AND day_name IS NULL;
    END IF;
    
    -- Friday
    IF NOT EXISTS (SELECT 1 FROM public.business_hours WHERE day_of_week = 4) THEN
        INSERT INTO public.business_hours (day_of_week, day_name, is_open, open_time, close_time, break_start_time, break_end_time)
        VALUES (4, 'Friday', true, '09:00'::TIME, '18:00'::TIME, '13:00'::TIME, '14:00'::TIME);
    ELSE
        UPDATE public.business_hours SET day_name = 'Friday' WHERE day_of_week = 4 AND day_name IS NULL;
    END IF;
    
    -- Saturday
    IF NOT EXISTS (SELECT 1 FROM public.business_hours WHERE day_of_week = 5) THEN
        INSERT INTO public.business_hours (day_of_week, day_name, is_open, open_time, close_time)
        VALUES (5, 'Saturday', true, '09:00'::TIME, '16:00'::TIME);
    ELSE
        UPDATE public.business_hours SET day_name = 'Saturday' WHERE day_of_week = 5 AND day_name IS NULL;
    END IF;
    
    -- Sunday
    IF NOT EXISTS (SELECT 1 FROM public.business_hours WHERE day_of_week = 6) THEN
        INSERT INTO public.business_hours (day_of_week, day_name, is_open)
        VALUES (6, 'Sunday', false);
    ELSE
        UPDATE public.business_hours SET day_name = 'Sunday' WHERE day_of_week = 6 AND day_name IS NULL;
    END IF;
END $$;

-- Insert default tax settings
INSERT INTO public.tax_settings (tax_name, tax_rate, tax_type, is_active, applies_to)
SELECT 'GST', 18.00, 'percentage', true, 'all'
WHERE NOT EXISTS (SELECT 1 FROM public.tax_settings WHERE tax_name = 'GST');

INSERT INTO public.tax_settings (tax_name, tax_rate, tax_type, is_active, applies_to)
SELECT 'Service Tax', 5.00, 'percentage', false, 'services'
WHERE NOT EXISTS (SELECT 1 FROM public.tax_settings WHERE tax_name = 'Service Tax');

-- Insert default payment gateways
INSERT INTO public.payment_gateway_settings (gateway_name, is_enabled, is_test_mode, supported_methods)
SELECT 'Razorpay', true, true, ARRAY['card', 'upi', 'netbanking']
WHERE NOT EXISTS (SELECT 1 FROM public.payment_gateway_settings WHERE gateway_name = 'Razorpay');

INSERT INTO public.payment_gateway_settings (gateway_name, is_enabled, is_test_mode, supported_methods)
SELECT 'PayU', false, true, ARRAY['card', 'wallet']
WHERE NOT EXISTS (SELECT 1 FROM public.payment_gateway_settings WHERE gateway_name = 'PayU');

INSERT INTO public.payment_gateway_settings (gateway_name, is_enabled, is_test_mode, supported_methods)
SELECT 'Paytm', false, true, ARRAY['wallet', 'upi']
WHERE NOT EXISTS (SELECT 1 FROM public.payment_gateway_settings WHERE gateway_name = 'Paytm');

-- Insert default integrations
INSERT INTO public.integration_settings (integration_name, is_enabled, status)
SELECT 'WhatsApp Business API', true, 'connected'
WHERE NOT EXISTS (SELECT 1 FROM public.integration_settings WHERE integration_name = 'WhatsApp Business API');

INSERT INTO public.integration_settings (integration_name, is_enabled, status)
SELECT 'SMS Gateway', false, 'disconnected'
WHERE NOT EXISTS (SELECT 1 FROM public.integration_settings WHERE integration_name = 'SMS Gateway');

INSERT INTO public.integration_settings (integration_name, is_enabled, status)
SELECT 'Email Service', true, 'connected'
WHERE NOT EXISTS (SELECT 1 FROM public.integration_settings WHERE integration_name = 'Email Service');

INSERT INTO public.integration_settings (integration_name, is_enabled, status)
SELECT 'Google Maps', true, 'connected'
WHERE NOT EXISTS (SELECT 1 FROM public.integration_settings WHERE integration_name = 'Google Maps');

INSERT INTO public.integration_settings (integration_name, is_enabled, status)
SELECT 'Backup Service', false, 'disconnected'
WHERE NOT EXISTS (SELECT 1 FROM public.integration_settings WHERE integration_name = 'Backup Service');

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
SELECT 'app_version', '1.0.0', 'string', 'Application version', true
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'app_version');

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
SELECT 'maintenance_mode', 'false', 'boolean', 'Maintenance mode status', false
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'maintenance_mode');

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
SELECT 'max_file_upload_size', '10485760', 'number', 'Max file upload size in bytes', false
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'max_file_upload_size');

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
SELECT 'session_timeout', '3600', 'number', 'Session timeout in seconds', false
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'session_timeout');

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
SELECT 'backup_frequency', 'daily', 'string', 'Backup frequency', false
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'backup_frequency');
