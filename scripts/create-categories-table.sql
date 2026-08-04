-- Replacing product categories with package categories for safa management
-- Create categories table for package management (21 Safas, 31 Safas, etc.)
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create package_variants table
CREATE TABLE IF NOT EXISTS package_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    inclusions TEXT[],
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distance_pricing table
CREATE TABLE IF NOT EXISTS distance_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES package_variants(id) ON DELETE CASCADE,
    distance_range VARCHAR(50) NOT NULL,
    min_km INTEGER NOT NULL,
    max_km INTEGER,
    base_price_addition DECIMAL(10,2) NOT NULL DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

CREATE INDEX IF NOT EXISTS idx_packages_category_id ON packages(category_id);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON packages(is_active);
CREATE INDEX IF NOT EXISTS idx_packages_display_order ON packages(display_order);

CREATE INDEX IF NOT EXISTS idx_package_variants_package_id ON package_variants(package_id);
CREATE INDEX IF NOT EXISTS idx_package_variants_is_active ON package_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_package_variants_display_order ON package_variants(display_order);

CREATE INDEX IF NOT EXISTS idx_distance_pricing_variant_id ON distance_pricing(variant_id);
CREATE INDEX IF NOT EXISTS idx_distance_pricing_is_active ON distance_pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_distance_pricing_display_order ON distance_pricing(display_order);

-- Insert safa categories (21, 31, 51, etc.)
INSERT INTO categories (name, description, display_order, is_active) VALUES
('21 Safas', 'Traditional wedding package with 21 safas', 1, true),
('31 Safas', 'Premium wedding package with 31 safas', 2, true),
('51 Safas', 'Deluxe wedding package with 51 safas', 3, true),
('71 Safas', 'Royal wedding package with 71 safas', 4, true),
('101 Safas', 'Grand wedding package with 101 safas', 5, true)
ON CONFLICT (name) DO NOTHING;

-- Insert sample packages for each category
INSERT INTO packages (category_id, name, description, base_price, display_order, is_active)
SELECT 
    c.id,
    c.name || ' - ' || pkg.name,
    pkg.description,
    pkg.base_price,
    pkg.display_order,
    true
FROM categories c
CROSS JOIN (
    VALUES 
        ('Basic Package', 'Standard wedding package with essential items', 15000.00, 1),
        ('Premium Package', 'Enhanced wedding package with premium items', 25000.00, 2),
        ('Royal Package', 'Luxury wedding package with royal treatment', 35000.00, 3)
) AS pkg(name, description, base_price, display_order)
WHERE c.is_active = true
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_packages_updated_at ON packages;
CREATE TRIGGER update_packages_updated_at
    BEFORE UPDATE ON packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_package_variants_updated_at ON package_variants;
CREATE TRIGGER update_package_variants_updated_at
    BEFORE UPDATE ON package_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_distance_pricing_updated_at ON distance_pricing;
CREATE TRIGGER update_distance_pricing_updated_at
    BEFORE UPDATE ON distance_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_distance_pricing_updated_at_column();
