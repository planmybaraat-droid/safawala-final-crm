-- Create a new package_sets table without RLS restrictions
-- This allows anyone with database access to create, manage, and delete packages

-- Drop table if exists
DROP TABLE IF EXISTS package_sets CASCADE;

-- Create package_sets table
CREATE TABLE package_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    package_type VARCHAR(100) DEFAULT 'safa',
    category VARCHAR(100) DEFAULT 'wedding',
    -- Added category_id to properly link to packages_categories table
    category_id UUID REFERENCES packages_categories(id),
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    franchise_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_package_sets_franchise_id ON package_sets(franchise_id);
CREATE INDEX idx_package_sets_created_by ON package_sets(created_by);
CREATE INDEX idx_package_sets_is_active ON package_sets(is_active);
CREATE INDEX idx_package_sets_created_at ON package_sets(created_at);
-- Added index for category_id foreign key
CREATE INDEX idx_package_sets_category_id ON package_sets(category_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_package_sets_updated_at 
    BEFORE UPDATE ON package_sets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some demo data
DO $$
DECLARE
    cat_21_id UUID;
    cat_31_id UUID;
    cat_51_id UUID;
    cat_101_id UUID;
BEGIN
    -- Get category IDs (assuming they exist from previous setup)
    SELECT id INTO cat_21_id FROM packages_categories WHERE name = '21 Safas' LIMIT 1;
    SELECT id INTO cat_31_id FROM packages_categories WHERE name = '31 Safas' LIMIT 1;
    SELECT id INTO cat_51_id FROM packages_categories WHERE name = '51 Safas' LIMIT 1;
    SELECT id INTO cat_101_id FROM packages_categories WHERE name = '101 Safas' LIMIT 1;
    
    -- Insert packages for 21 Safas category
    IF cat_21_id IS NOT NULL THEN
        INSERT INTO package_sets (name, description, package_type, category, category_id, base_price, franchise_id, created_by) VALUES
        ('Royal Gold 21 Set', 'Premium gold embroidered safa set for 21 people', 'safa', 'wedding', cat_21_id, 15000.00, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', '00000000-0000-0000-0000-000000000001'),
        ('Traditional Red 21 Set', 'Classic red turban set for 21 people', 'turban', 'wedding', cat_21_id, 12000.00, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', '00000000-0000-0000-0000-000000000001');
    END IF;
    
    -- Insert packages for 31 Safas category
    IF cat_31_id IS NOT NULL THEN
        INSERT INTO package_sets (name, description, package_type, category, category_id, base_price, franchise_id, created_by) VALUES
        ('Designer Cream 31 Set', 'Elegant cream colored safa set for 31 people', 'safa', 'wedding', cat_31_id, 18000.00, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', '00000000-0000-0000-0000-000000000001'),
        ('Heritage Maroon 31 Set', 'Traditional maroon turban set for 31 people', 'turban', 'traditional', cat_31_id, 16000.00, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', '00000000-0000-0000-0000-000000000001');
    END IF;
    
    -- Insert packages for 51 Safas category
    IF cat_51_id IS NOT NULL THEN
        INSERT INTO package_sets (name, description, package_type, category, category_id, base_price, franchise_id, created_by) VALUES
        ('Silver Embroidered 51 Set', 'Luxurious silver embroidered safa set for 51 people', 'safa', 'wedding', cat_51_id, 25000.00, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', '00000000-0000-0000-0000-000000000001'),
        ('Groom Special 51 Deluxe', 'Premium groom package for 51 people with complete accessories', 'complete_set', 'wedding', cat_51_id, 30000.00, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', '00000000-0000-0000-0000-000000000001');
    END IF;
    
    -- Insert packages for 101 Safas category
    IF cat_101_id IS NOT NULL THEN
        INSERT INTO package_sets (name, description, package_type, category, category_id, base_price, franchise_id, created_by) VALUES
        ('Grand Wedding 101 Set', 'Grand wedding safa collection for 101 people', 'safa', 'wedding', cat_101_id, 45000.00, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', '00000000-0000-0000-0000-000000000001'),
        ('Royal Collection 101 Set', 'Royal wedding safa collection for 101 people', 'complete_set', 'wedding', cat_101_id, 55000.00, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', '00000000-0000-0000-0000-000000000001');
    END IF;
END $$;

-- Grant permissions (no RLS needed)
-- Anyone with database access can perform CRUD operations
COMMENT ON TABLE package_sets IS 'Package sets table without RLS - allows any authenticated user to create, manage, and delete packages';
