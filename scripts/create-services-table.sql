-- Create services table for managing individual services offered by vendors
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    service_category VARCHAR(100),
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_vendor_id ON services(vendor_id);
CREATE INDEX IF NOT EXISTS idx_services_franchise_id ON services(franchise_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(service_category);

-- Add RLS (Row Level Security) policies
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Policy to allow franchise users to see only their services
CREATE POLICY "Users can view services from their franchise" ON services
    FOR SELECT USING (franchise_id IN (
        SELECT franchise_id FROM users WHERE id = auth.uid()
    ));

-- Policy to allow franchise users to insert services for their franchise
CREATE POLICY "Users can insert services for their franchise" ON services
    FOR INSERT WITH CHECK (franchise_id IN (
        SELECT franchise_id FROM users WHERE id = auth.uid()
    ));

-- Policy to allow franchise users to update services from their franchise
CREATE POLICY "Users can update services from their franchise" ON services
    FOR UPDATE USING (franchise_id IN (
        SELECT franchise_id FROM users WHERE id = auth.uid()
    ));

-- Policy to allow franchise users to delete services from their franchise
CREATE POLICY "Users can delete services from their franchise" ON services
    FOR DELETE USING (franchise_id IN (
        SELECT franchise_id FROM users WHERE id = auth.uid()
    ));

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_services_updated_at();

-- Insert some sample services for testing
INSERT INTO services (name, description, base_price, franchise_id, service_category, duration_minutes) VALUES
('Wedding Decoration Package', 'Complete wedding decoration with flowers and lighting', 25000.00, '00000000-0000-0000-0000-000000000001', 'decoration', 480),
('Bridal Makeup', 'Professional bridal makeup service', 8000.00, '00000000-0000-0000-0000-000000000001', 'beauty', 120),
('Photography Package', 'Wedding photography with 500+ edited photos', 15000.00, '00000000-0000-0000-0000-000000000001', 'photography', 600),
('Catering Service', 'Full meal catering for 100 guests', 30000.00, '00000000-0000-0000-0000-000000000001', 'catering', 300),
('Transportation Service', 'Decorated car for wedding ceremony', 5000.00, '00000000-0000-0000-0000-000000000001', 'transportation', 240);
