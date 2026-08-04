-- =====================================================
-- COMPLETE PACKAGE MANAGEMENT SYSTEM FOR SUPABASE
-- =====================================================
-- This script creates all tables needed for the package management system
-- Categories -> Packages -> Variants -> Distance Pricing

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS distance_pricing CASCADE;
DROP TABLE IF EXISTS package_variants CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- =====================================================
-- 1. CATEGORIES TABLE (21 Safas, 31 Safas, etc.)
-- =====================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. PACKAGES TABLE (within each category)
-- =====================================================
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. PACKAGE VARIANTS TABLE (within each package)
-- =====================================================
CREATE TABLE package_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    inclusions TEXT[], -- Array of inclusions
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. DISTANCE PRICING TABLE (within each variant)
-- =====================================================
CREATE TABLE distance_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES package_variants(id) ON DELETE CASCADE,
    distance_range VARCHAR(50) NOT NULL, -- e.g., "0-10 km", "11-25 km"
    min_km INTEGER NOT NULL,
    max_km INTEGER NOT NULL,
    base_price_addition DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_packages_category_id ON packages(category_id);
CREATE INDEX idx_package_variants_package_id ON package_variants(package_id);
CREATE INDEX idx_distance_pricing_variant_id ON distance_pricing(variant_id);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_packages_active ON packages(is_active);
CREATE INDEX idx_package_variants_active ON package_variants(is_active);
CREATE INDEX idx_distance_pricing_active ON distance_pricing(is_active);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_package_variants_updated_at BEFORE UPDATE ON package_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_distance_pricing_updated_at BEFORE UPDATE ON distance_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE distance_pricing ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON packages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON package_variants FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON distance_pricing FOR ALL TO authenticated USING (true);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert Categories
INSERT INTO categories (name, description, display_order) VALUES
('21 Safas', 'Traditional wedding package with 21 safas', 1),
('31 Safas', 'Premium wedding package with 31 safas', 2),
('51 Safas', 'Luxury wedding package with 51 safas', 3),
('101 Safas', 'Grand wedding package with 101 safas', 4);

-- Insert Packages for 21 Safas Category
INSERT INTO packages (category_id, name, description, base_price, display_order)
SELECT 
    c.id,
    'Basic 21 Safa Package',
    'Essential wedding package with 21 traditional safas',
    15000.00,
    1
FROM categories c WHERE c.name = '21 Safas';

INSERT INTO packages (category_id, name, description, base_price, display_order)
SELECT 
    c.id,
    'Premium 21 Safa Package',
    'Enhanced wedding package with 21 premium safas',
    25000.00,
    2
FROM categories c WHERE c.name = '21 Safas';

-- Insert Packages for 31 Safas Category
INSERT INTO packages (category_id, name, description, base_price, display_order)
SELECT 
    c.id,
    'Royal 31 Safa Collection',
    'Royal wedding package with 31 traditional safas',
    35000.00,
    1
FROM categories c WHERE c.name = '31 Safas';

INSERT INTO packages (category_id, name, description, base_price, display_order)
SELECT 
    c.id,
    'Heritage 31 Safa Set',
    'Heritage wedding package with 31 authentic safas',
    45000.00,
    2
FROM categories c WHERE c.name = '31 Safas';

-- Insert Package Variants for Basic 21 Safa Package
INSERT INTO package_variants (package_id, name, description, base_price, inclusions, display_order)
SELECT 
    p.id,
    'Standard Variant',
    'Standard 21 safa package with basic accessories',
    15000.00,
    ARRAY['21 Traditional Safas', 'Basic Accessories', 'Standard Packaging', 'Local Delivery'],
    1
FROM packages p WHERE p.name = 'Basic 21 Safa Package';

INSERT INTO package_variants (package_id, name, description, base_price, inclusions, display_order)
SELECT 
    p.id,
    'Deluxe Variant',
    'Deluxe 21 safa package with premium accessories',
    20000.00,
    ARRAY['21 Premium Safas', 'Premium Accessories', 'Gift Packaging', 'Express Delivery', 'Setup Service'],
    2
FROM packages p WHERE p.name = 'Basic 21 Safa Package';

-- Insert Package Variants for Royal 31 Safa Collection
INSERT INTO package_variants (package_id, name, description, base_price, inclusions, display_order)
SELECT 
    p.id,
    'Royal Standard',
    'Royal 31 safa collection with traditional accessories',
    35000.00,
    ARRAY['31 Royal Safas', 'Traditional Accessories', 'Royal Packaging', 'Premium Delivery'],
    1
FROM packages p WHERE p.name = 'Royal 31 Safa Collection';

INSERT INTO package_variants (package_id, name, description, base_price, inclusions, display_order)
SELECT 
    p.id,
    'Royal Premium',
    'Royal 31 safa collection with luxury accessories',
    50000.00,
    ARRAY['31 Royal Safas', 'Luxury Accessories', 'Royal Gift Box', 'White Glove Delivery', 'Professional Setup', 'Photography Service'],
    2
FROM packages p WHERE p.name = 'Royal 31 Safa Collection';

-- Insert Distance Pricing for all variants
-- Standard distance ranges from Alkapuri, Vadodara
INSERT INTO distance_pricing (variant_id, distance_range, min_km, max_km, base_price_addition, display_order)
SELECT 
    pv.id,
    '0-10 km',
    0,
    10,
    0.00,
    1
FROM package_variants pv;

INSERT INTO distance_pricing (variant_id, distance_range, min_km, max_km, base_price_addition, display_order)
SELECT 
    pv.id,
    '11-25 km',
    11,
    25,
    500.00,
    2
FROM package_variants pv;

INSERT INTO distance_pricing (variant_id, distance_range, min_km, max_km, base_price_addition, display_order)
SELECT 
    pv.id,
    '26-150 km',
    26,
    150,
    1500.00,
    3
FROM package_variants pv;

INSERT INTO distance_pricing (variant_id, distance_range, min_km, max_km, base_price_addition, display_order)
SELECT 
    pv.id,
    '151-300 km',
    151,
    300,
    3000.00,
    4
FROM package_variants pv;

INSERT INTO distance_pricing (variant_id, distance_range, min_km, max_km, base_price_addition, display_order)
SELECT 
    pv.id,
    '300-1500 km',
    300,
    1500,
    8000.00,
    5
FROM package_variants pv;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Uncomment these to verify the data after running the script

-- SELECT 'Categories' as table_name, count(*) as record_count FROM categories
-- UNION ALL
-- SELECT 'Packages' as table_name, count(*) as record_count FROM packages
-- UNION ALL
-- SELECT 'Package Variants' as table_name, count(*) as record_count FROM package_variants
-- UNION ALL
-- SELECT 'Distance Pricing' as table_name, count(*) as record_count FROM distance_pricing;

-- =====================================================
-- SCRIPT COMPLETED SUCCESSFULLY
-- =====================================================
-- This script has created:
-- - 4 Categories (21, 31, 51, 101 Safas)
-- - 4 Packages (2 for 21 Safas, 2 for 31 Safas)
-- - 4 Package Variants (2 for each package)
-- - 20 Distance Pricing entries (5 ranges for each variant)
-- 
-- Total: 32 records across 4 tables
-- All tables have proper relationships, indexes, and RLS policies
-- =====================================================
