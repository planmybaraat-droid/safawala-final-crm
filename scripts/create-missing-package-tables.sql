-- Rewriting script to work with existing database schema and avoid conflicts
-- Create missing package management tables that work with existing schema

-- Create categories table for organizing packages (21 Safas, 31 Safas, etc.)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create package_variants table to extend existing package_sets
CREATE TABLE IF NOT EXISTS package_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES package_sets(id) ON DELETE CASCADE,
  variant_name VARCHAR(255) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  included_items TEXT[], -- Array of included items
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distance_pricing table for kilometer-based pricing from Alkapuri, Vadodara
CREATE TABLE IF NOT EXISTS distance_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES package_variants(id) ON DELETE CASCADE,
  distance_range VARCHAR(50) NOT NULL, -- e.g., "0-10 km", "11-25 km"
  min_km INTEGER NOT NULL,
  max_km INTEGER NOT NULL,
  base_price_addition DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category_id to existing package_sets table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='package_sets' AND column_name='category_id') THEN
        ALTER TABLE package_sets ADD COLUMN category_id UUID REFERENCES categories(id);
    END IF;
END $$;

-- Create indexes for better performance (with IF NOT EXISTS to avoid conflicts)
DO $$ 
BEGIN
    -- Check and create indexes only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_package_variants_package_id') THEN
        CREATE INDEX idx_package_variants_package_id ON package_variants(package_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_distance_pricing_variant_id') THEN
        CREATE INDEX idx_distance_pricing_variant_id ON distance_pricing(variant_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_categories_active') THEN
        CREATE INDEX idx_categories_active ON categories(is_active);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_package_sets_category_id') THEN
        CREATE INDEX idx_package_sets_category_id ON package_sets(category_id);
    END IF;
END $$;

-- Insert sample categories
INSERT INTO categories (name, description, display_order) VALUES
('21 Safas', 'Traditional 21 safa packages for smaller gatherings', 1),
('31 Safas', 'Standard 31 safa packages for medium gatherings', 2),
('51 Safas', 'Premium 51 safa packages for large gatherings', 3),
('71 Safas', 'Deluxe 71 safa packages for grand celebrations', 4),
('101 Safas', 'Royal 101 safa packages for magnificent events', 5)
ON CONFLICT (name) DO NOTHING;

-- Insert sample packages into existing package_sets table
DO $$
DECLARE
    cat_21_id UUID;
    cat_31_id UUID;
    cat_51_id UUID;
    pkg_id UUID;
    var_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO cat_21_id FROM categories WHERE name = '21 Safas' LIMIT 1;
    SELECT id INTO cat_31_id FROM categories WHERE name = '31 Safas' LIMIT 1;
    SELECT id INTO cat_51_id FROM categories WHERE name = '51 Safas' LIMIT 1;
    
    -- Insert sample packages for 21 Safas category
    IF cat_21_id IS NOT NULL THEN
        INSERT INTO package_sets (name, description, base_price, category, category_id, package_type, is_active, created_by, franchise_id) VALUES
        ('Basic 21 Safa Package', 'Traditional wedding safa package for 21 people', 8500.00, 'wedding', cat_21_id, 'safa', true, '00000000-0000-0000-0000-000000000001', NULL),
        ('Premium 21 Safa Package', 'Premium wedding safa package for 21 people', 12500.00, 'wedding', cat_21_id, 'safa', true, '00000000-0000-0000-0000-000000000001', NULL)
        ON CONFLICT DO NOTHING
        RETURNING id INTO pkg_id;
        
        -- Add variants for the first package
        SELECT id INTO pkg_id FROM package_sets WHERE name = 'Basic 21 Safa Package' AND category_id = cat_21_id LIMIT 1;
        IF pkg_id IS NOT NULL THEN
            INSERT INTO package_variants (package_id, variant_name, base_price, included_items, notes) VALUES
            (pkg_id, 'Cotton Basic', 8500.00, ARRAY['21 Cotton Safas', 'Basic Kalgis', 'Simple Brooches'], 'Basic cotton material with standard accessories'),
            (pkg_id, 'Silk Premium', 9500.00, ARRAY['21 Silk Safas', 'Premium Kalgis', 'Designer Brooches'], 'Silk material with premium accessories')
            ON CONFLICT DO NOTHING
            RETURNING id INTO var_id;
            
            -- Add distance pricing for the first variant
            SELECT id INTO var_id FROM package_variants WHERE package_id = pkg_id AND variant_name = 'Cotton Basic' LIMIT 1;
            IF var_id IS NOT NULL THEN
                INSERT INTO distance_pricing (variant_id, distance_range, min_km, max_km, base_price_addition) VALUES
                (var_id, '0-10 km', 0, 10, 0.00),
                (var_id, '11-25 km', 11, 25, 500.00),
                (var_id, '26-150 km', 26, 150, 1000.00),
                (var_id, '151-300 km', 151, 300, 2000.00),
                (var_id, '300-1500 km', 300, 1500, 3500.00)
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    END IF;
    
    -- Insert sample packages for 51 Safas category
    IF cat_51_id IS NOT NULL THEN
        INSERT INTO package_sets (name, description, base_price, category, category_id, package_type, is_active, created_by, franchise_id) VALUES
        ('Royal 51 Safa Package', 'Royal wedding safa package for 51 people', 25500.00, 'wedding', cat_51_id, 'safa', true, '00000000-0000-0000-0000-000000000001', NULL)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_categories_updated_at') THEN
        CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_package_variants_updated_at') THEN
        CREATE TRIGGER update_package_variants_updated_at BEFORE UPDATE ON package_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_distance_pricing_updated_at') THEN
        CREATE TRIGGER update_distance_pricing_updated_at BEFORE UPDATE ON distance_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMENT ON TABLE categories IS 'Package categories like 21 Safas, 31 Safas, 51 Safas, etc.';
COMMENT ON TABLE package_variants IS 'Variants for each package with different materials and pricing';
COMMENT ON TABLE distance_pricing IS 'Distance-based pricing from Alkapuri, Vadodara with 5 km ranges';
</sql>
