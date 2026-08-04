-- Package Management Tables Creation Script
-- This script creates only the missing tables needed for the package management UI
-- Works with existing package_sets and distance_pricing_tiers tables

-- Create categories table (21 Safas, 31 Safas, etc.)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create package_variants table (variants within each package)
CREATE TABLE IF NOT EXISTS package_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES package_sets(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    inclusions TEXT[], -- Array of inclusions
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distance_pricing table (distance-based pricing for variants)
CREATE TABLE IF NOT EXISTS distance_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES package_variants(id) ON DELETE CASCADE,
    distance_range VARCHAR(50) NOT NULL, -- e.g., "0-10 km", "11-25 km"
    min_km INTEGER NOT NULL,
    max_km INTEGER NOT NULL,
    base_price_addition NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category_id to package_sets table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'package_sets' AND column_name = 'category_id') THEN
        ALTER TABLE package_sets ADD COLUMN category_id UUID REFERENCES categories(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);
CREATE INDEX IF NOT EXISTS idx_package_variants_package_id ON package_variants(package_id);
CREATE INDEX IF NOT EXISTS idx_package_variants_active ON package_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_distance_pricing_variant_id ON distance_pricing(variant_id);
CREATE INDEX IF NOT EXISTS idx_distance_pricing_range ON distance_pricing(min_km, max_km);
CREATE INDEX IF NOT EXISTS idx_package_sets_category_id ON package_sets(category_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_package_variants_updated_at ON package_variants;
CREATE TRIGGER update_package_variants_updated_at BEFORE UPDATE ON package_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_distance_pricing_updated_at ON distance_pricing;
CREATE TRIGGER update_distance_pricing_updated_at BEFORE UPDATE ON distance_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample categories
INSERT INTO categories (name, description, display_order) VALUES
('21 Safas', 'Traditional wedding safa collection for 21 people', 1),
('31 Safas', 'Premium wedding safa collection for 31 people', 2),
('51 Safas', 'Grand wedding safa collection for 51 people', 3),
('101 Safas', 'Royal wedding safa collection for 101 people', 4)
ON CONFLICT (name) DO NOTHING;

-- Get category IDs for sample data
DO $$
DECLARE
    cat_21_id UUID;
    cat_31_id UUID;
    pkg_id UUID;
    var_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO cat_21_id FROM categories WHERE name = '21 Safas';
    SELECT id INTO cat_31_id FROM categories WHERE name = '31 Safas';
    
    -- Insert sample packages and link to categories
    INSERT INTO package_sets (name, description, base_price, category, category_id, package_type, is_active, created_by, franchise_id) VALUES
    ('Royal Wedding Package', 'Premium wedding safa package with traditional designs', 15000.00, 'wedding', cat_21_id, 'safa', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    ('Heritage Collection', 'Traditional heritage safa collection', 12000.00, 'wedding', cat_21_id, 'safa', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    ('Grand Celebration Package', 'Grand wedding safa package for larger gatherings', 25000.00, 'wedding', cat_31_id, 'safa', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    ('Premium Heritage Set', 'Premium heritage collection for special occasions', 22000.00, 'wedding', cat_31_id, 'safa', true, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT DO NOTHING;
    
    -- Insert sample variants for each package
    FOR pkg_id IN SELECT id FROM package_sets LIMIT 4 LOOP
        INSERT INTO package_variants (package_id, name, description, base_price, inclusions) VALUES
        (pkg_id, 'Standard Variant', 'Standard package with basic inclusions', 0, ARRAY['Traditional Safas', 'Basic Accessories', 'Delivery & Pickup']),
        (pkg_id, 'Premium Variant', 'Premium package with additional accessories', 2000, ARRAY['Premium Safas', 'Gold Accessories', 'Decorative Items', 'Professional Setup', 'Delivery & Pickup'])
        ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- Insert distance pricing for each variant
    FOR var_id IN SELECT id FROM package_variants LOOP
        INSERT INTO distance_pricing (variant_id, distance_range, min_km, max_km, base_price_addition) VALUES
        (var_id, '0-10 km', 0, 10, 0),
        (var_id, '11-25 km', 11, 25, 500),
        (var_id, '26-150 km', 26, 150, 1500),
        (var_id, '151-300 km', 151, 300, 3000),
        (var_id, '300-1500 km', 300, 1500, 5000)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Enable RLS (Row Level Security) for all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE distance_pricing ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now, can be restricted later)
CREATE POLICY "Allow all operations on categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on package_variants" ON package_variants FOR ALL USING (true);
CREATE POLICY "Allow all operations on distance_pricing" ON distance_pricing FOR ALL USING (true);

-- Summary
SELECT 
    'Script execution completed successfully!' as status,
    (SELECT COUNT(*) FROM categories) as categories_count,
    (SELECT COUNT(*) FROM package_sets) as packages_count,
    (SELECT COUNT(*) FROM package_variants) as variants_count,
    (SELECT COUNT(*) FROM distance_pricing) as distance_pricing_count;
