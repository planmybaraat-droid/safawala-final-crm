-- Create packages_categories table for Safawala CRM
-- This table stores the main categories like 21 Safas, 31 Safas, etc.

-- Drop table if exists (for clean recreation)
DROP TABLE IF EXISTS packages_categories CASCADE;

-- Create packages_categories table
CREATE TABLE packages_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_packages_categories_active ON packages_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_packages_categories_order ON packages_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_packages_categories_name ON packages_categories(name);

-- Insert sample categories data
INSERT INTO packages_categories (name, description, display_order, is_active) VALUES
('21 Safas', 'Traditional wedding safa collection for 21 people', 1, true),
('31 Safas', 'Premium wedding safa collection for 31 people', 2, true),
('51 Safas', 'Grand wedding safa collection for 51 people', 3, true),
('101 Safas', 'Royal wedding safa collection for 101 people', 4, true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_packages_categories_updated_at 
    BEFORE UPDATE ON packages_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE packages_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to all users" ON packages_categories
    FOR SELECT USING (true);

CREATE POLICY "Allow insert for authenticated users" ON packages_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON packages_categories
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON packages_categories
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON packages_categories TO authenticated;
GRANT SELECT ON packages_categories TO anon;

-- Success message
SELECT 'packages_categories table created successfully with ' || COUNT(*) || ' sample records' as result
FROM packages_categories;
