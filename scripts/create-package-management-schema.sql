-- Creating comprehensive database schema for package management system
-- Drop existing tables if they exist (in reverse order due to foreign key constraints)
DROP TABLE IF EXISTS distance_pricing CASCADE;
DROP TABLE IF EXISTS package_variant_inclusions CASCADE;
DROP TABLE IF EXISTS package_variants CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Create Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    safa_count INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Packages table
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Package Variants table
CREATE TABLE package_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Package Variant Inclusions table (for storing array of inclusions)
CREATE TABLE package_variant_inclusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES package_variants(id) ON DELETE CASCADE,
    inclusion_text VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Distance Pricing table
CREATE TABLE distance_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES package_variants(id) ON DELETE CASCADE,
    range_name VARCHAR(50) NOT NULL,
    min_km INTEGER NOT NULL,
    max_km INTEGER NOT NULL,
    base_price_addition DECIMAL(10,2) NOT NULL DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_packages_category_id ON packages(category_id);
CREATE INDEX idx_package_variants_package_id ON package_variants(package_id);
CREATE INDEX idx_package_variant_inclusions_variant_id ON package_variant_inclusions(variant_id);
CREATE INDEX idx_distance_pricing_variant_id ON distance_pricing(variant_id);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_packages_active ON packages(is_active);
CREATE INDEX idx_package_variants_active ON package_variants(is_active);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_package_variants_updated_at BEFORE UPDATE ON package_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_distance_pricing_updated_at BEFORE UPDATE ON distance_pricing FOR EACH ROW EXECUTE FUNCTION update_distance_pricing_updated_at_column();

-- Insert sample data based on the UI mock data
INSERT INTO categories (id, name, description, safa_count, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', '21 Safas Collection', 'Premium collection with 21 traditional safas for grand celebrations', 21, true),
('550e8400-e29b-41d4-a716-446655440002', '31 Safas Collection', 'Grand collection with 31 safas for large family celebrations', 31, true),
('550e8400-e29b-41d4-a716-446655440003', '51 Safas Collection', 'Ultimate collection with 51 safas for royal celebrations', 51, true);

INSERT INTO packages (id, category_id, name, description, base_price, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Royal Wedding 21 Set', 'Complete 21 safa set for royal wedding ceremonies', 25000.00, true),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'Heritage 21 Collection', 'Traditional heritage designs for cultural ceremonies', 22000.00, true),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 'Grand Family 31 Set', 'Complete 31 safa set for extended family celebrations', 35000.00, true),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440003', 'Royal Maharaja 51 Set', 'Ultimate 51 safa collection for royal celebrations', 65000.00, true);

INSERT INTO package_variants (id, package_id, name, description, base_price, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440111', '550e8400-e29b-41d4-a716-446655440011', 'Silk Banarasi Premium', 'Premium silk banarasi safas with gold thread work', 35000.00, true),
('550e8400-e29b-41d4-a716-446655440112', '550e8400-e29b-41d4-a716-446655440011', 'Cotton Royal Standard', 'High-quality cotton safas with traditional patterns', 18000.00, true),
('550e8400-e29b-41d4-a716-446655440121', '550e8400-e29b-41d4-a716-446655440012', 'Rajasthani Heritage', 'Authentic Rajasthani style safas with mirror work', 28000.00, true),
('550e8400-e29b-41d4-a716-446655440211', '550e8400-e29b-41d4-a716-446655440021', 'Luxury Silk Collection', 'Premium silk safas for grand family events', 48000.00, true),
('550e8400-e29b-41d4-a716-446655440311', '550e8400-e29b-41d4-a716-446655440031', 'Maharaja Premium', 'Royal quality safas with gold embroidery', 85000.00, true);

-- Insert inclusions for variants
INSERT INTO package_variant_inclusions (variant_id, inclusion_text, display_order) VALUES
-- Silk Banarasi Premium inclusions
('550e8400-e29b-41d4-a716-446655440111', '21 Silk Safas', 1),
('550e8400-e29b-41d4-a716-446655440111', 'Gold Kalgis', 2),
('550e8400-e29b-41d4-a716-446655440111', 'Premium Jewelry Set', 3),
('550e8400-e29b-41d4-a716-446655440111', 'Storage Box', 4),
('550e8400-e29b-41d4-a716-446655440111', 'Setup Service', 5),
-- Cotton Royal Standard inclusions
('550e8400-e29b-41d4-a716-446655440112', '21 Cotton Safas', 1),
('550e8400-e29b-41d4-a716-446655440112', 'Standard Kalgis', 2),
('550e8400-e29b-41d4-a716-446655440112', 'Basic Jewelry', 3),
('550e8400-e29b-41d4-a716-446655440112', 'Cloth Bag', 4),
('550e8400-e29b-41d4-a716-446655440112', 'Basic Setup', 5),
-- Rajasthani Heritage inclusions
('550e8400-e29b-41d4-a716-446655440121', '21 Heritage Safas', 1),
('550e8400-e29b-41d4-a716-446655440121', 'Mirror Work Kalgis', 2),
('550e8400-e29b-41d4-a716-446655440121', 'Traditional Jewelry', 3),
('550e8400-e29b-41d4-a716-446655440121', 'Heritage Box', 4),
('550e8400-e29b-41d4-a716-446655440121', 'Cultural Setup', 5),
-- Luxury Silk Collection inclusions
('550e8400-e29b-41d4-a716-446655440211', '31 Silk Safas', 1),
('550e8400-e29b-41d4-a716-446655440211', 'Premium Kalgis', 2),
('550e8400-e29b-41d4-a716-446655440211', 'Complete Jewelry Set', 3),
('550e8400-e29b-41d4-a716-446655440211', 'Luxury Storage', 4),
('550e8400-e29b-41d4-a716-446655440211', 'Full Setup Service', 5),
-- Maharaja Premium inclusions
('550e8400-e29b-41d4-a716-446655440311', '51 Royal Safas', 1),
('550e8400-e29b-41d4-a716-446655440311', 'Gold Kalgis', 2),
('550e8400-e29b-41d4-a716-446655440311', 'Royal Jewelry Collection', 3),
('550e8400-e29b-41d4-a716-446655440311', 'Royal Storage Chest', 4),
('550e8400-e29b-41d4-a716-446655440311', 'Royal Setup Service', 5);

-- Insert distance pricing for all variants (5 distance ranges each)
-- Silk Banarasi Premium distance pricing
INSERT INTO distance_pricing (variant_id, range_name, min_km, max_km, base_price_addition, display_order) VALUES
('550e8400-e29b-41d4-a716-446655440111', '0-10 km', 0, 10, 0.00, 1),
('550e8400-e29b-41d4-a716-446655440111', '11-25 km', 11, 25, 2000.00, 2),
('550e8400-e29b-41d4-a716-446655440111', '26-150 km', 26, 150, 5000.00, 3),
('550e8400-e29b-41d4-a716-446655440111', '151-300 km', 151, 300, 8000.00, 4),
('550e8400-e29b-41d4-a716-446655440111', '300-1500 km', 301, 1500, 15000.00, 5),
-- Cotton Royal Standard distance pricing
('550e8400-e29b-41d4-a716-446655440112', '0-10 km', 0, 10, 0.00, 1),
('550e8400-e29b-41d4-a716-446655440112', '11-25 km', 11, 25, 1500.00, 2),
('550e8400-e29b-41d4-a716-446655440112', '26-150 km', 26, 150, 3000.00, 3),
('550e8400-e29b-41d4-a716-446655440112', '151-300 km', 151, 300, 5000.00, 4),
('550e8400-e29b-41d4-a716-446655440112', '300-1500 km', 301, 1500, 8000.00, 5),
-- Rajasthani Heritage distance pricing
('550e8400-e29b-41d4-a716-446655440121', '0-10 km', 0, 10, 0.00, 1),
('550e8400-e29b-41d4-a716-446655440121', '11-25 km', 11, 25, 1800.00, 2),
('550e8400-e29b-41d4-a716-446655440121', '26-150 km', 26, 150, 4000.00, 3),
('550e8400-e29b-41d4-a716-446655440121', '151-300 km', 151, 300, 6500.00, 4),
('550e8400-e29b-41d4-a716-446655440121', '300-1500 km', 301, 1500, 12000.00, 5),
-- Luxury Silk Collection distance pricing
('550e8400-e29b-41d4-a716-446655440211', '0-10 km', 0, 10, 0.00, 1),
('550e8400-e29b-41d4-a716-446655440211', '11-25 km', 11, 25, 3000.00, 2),
('550e8400-e29b-41d4-a716-446655440211', '26-150 km', 26, 150, 7000.00, 3),
('550e8400-e29b-41d4-a716-446655440211', '151-300 km', 151, 300, 12000.00, 4),
('550e8400-e29b-41d4-a716-446655440211', '300-1500 km', 301, 1500, 20000.00, 5),
-- Maharaja Premium distance pricing
('550e8400-e29b-41d4-a716-446655440311', '0-10 km', 0, 10, 0.00, 1),
('550e8400-e29b-41d4-a716-446655440311', '11-25 km', 11, 25, 5000.00, 2),
('550e8400-e29b-41d4-a716-446655440311', '26-150 km', 26, 150, 12000.00, 3),
('550e8400-e29b-41d4-a716-446655440311', '151-300 km', 151, 300, 20000.00, 4),
('550e8400-e29b-41d4-a716-446655440311', '300-1500 km', 301, 1500, 35000.00, 5);

-- Create RLS policies for security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_variant_inclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE distance_pricing ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (you can customize these policies as needed)
CREATE POLICY "Allow all operations for authenticated users" ON categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON packages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON package_variants FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON package_variant_inclusions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON distance_pricing FOR ALL TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON categories TO authenticated;
GRANT ALL ON packages TO authenticated;
GRANT ALL ON package_variants TO authenticated;
GRANT ALL ON package_variant_inclusions TO authenticated;
GRANT ALL ON distance_pricing TO authenticated;

-- Display summary
SELECT 'Database schema created successfully!' as status;
SELECT 'Categories: ' || COUNT(*) as categories_count FROM categories;
SELECT 'Packages: ' || COUNT(*) as packages_count FROM packages;
SELECT 'Variants: ' || COUNT(*) as variants_count FROM package_variants;
SELECT 'Inclusions: ' || COUNT(*) as inclusions_count FROM package_variant_inclusions;
SELECT 'Distance Pricing: ' || COUNT(*) as distance_pricing_count FROM distance_pricing;
