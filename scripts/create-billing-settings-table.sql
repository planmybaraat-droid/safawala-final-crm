-- Create billing settings table for subscription management
CREATE TABLE IF NOT EXISTS billing_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    subscription_plan VARCHAR(50) DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'professional', 'enterprise')),
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
    payment_method VARCHAR(20) DEFAULT 'card' CHECK (payment_method IN ('card', 'upi', 'bank_transfer')),
    auto_renewal BOOLEAN DEFAULT true,
    billing_email VARCHAR(255),
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(franchise_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_billing_settings_franchise_id ON billing_settings(franchise_id);

-- Insert sample billing settings
INSERT INTO billing_settings (franchise_id, subscription_plan, billing_cycle, payment_method, billing_email, tax_rate) VALUES
('00000000-0000-0000-0000-000000000001', 'professional', 'yearly', 'card', 'billing@safawala.com', 18.00),
('95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 'basic', 'monthly', 'upi', 'mysafawale@gmail.com', 18.00)
ON CONFLICT (franchise_id) DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_billing_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_billing_settings_updated_at
    BEFORE UPDATE ON billing_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_settings_updated_at();
