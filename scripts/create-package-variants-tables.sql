-- Create package variants tables for managing safa packages and their variants
-- Each package (21 safa, 31 safa, etc.) can have multiple variants (9 variants each)

-- First, ensure the packages table exists with proper structure
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_quantity INTEGER NOT NULL DEFAULT 51, -- Base number of safas
    category VARCHAR(100) DEFAULT 'wedding_safa',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    franchise_id UUID REFERENCES franchises(id)
);

-- Create package variants table
CREATE TABLE IF NOT EXISTS package_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    variant_name VARCHAR(255) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    extra_cost_per_safa DECIMAL(10,2) NOT NULL DEFAULT 0,
    including_items TEXT[], -- Array of included items
    notes TEXT,
    variant_order INTEGER DEFAULT 1, -- Order of variant (1-9)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create package features table (for backward compatibility)
CREATE TABLE IF NOT EXISTS package_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    feature_name VARCHAR(255) NOT NULL,
    feature_description TEXT,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_variants_package_id ON package_variants(package_id);
CREATE INDEX IF NOT EXISTS idx_package_variants_active ON package_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_package_variants_order ON package_variants(variant_order);
CREATE INDEX IF NOT EXISTS idx_package_features_package_id ON package_features(package_id);

-- Insert sample packages (21 safa, 31 safa, etc.)
INSERT INTO packages (name, description, base_quantity, category) VALUES
('21 Safa Package', 'Wedding safa package for 21 people', 21, 'wedding_safa'),
('31 Safa Package', 'Wedding safa package for 31 people', 31, 'wedding_safa'),
('41 Safa Package', 'Wedding safa package for 41 people', 41, 'wedding_safa'),
('51 Safa Package', 'Wedding safa package for 51 people', 51, 'wedding_safa'),
('61 Safa Package', 'Wedding safa package for 61 people', 61, 'wedding_safa')
ON CONFLICT DO NOTHING;

-- Insert sample variants for the first package (21 Safa Package)
DO $$
DECLARE
    package_21_id UUID;
BEGIN
    SELECT id INTO package_21_id FROM packages WHERE name = '21 Safa Package' LIMIT 1;
    
    IF package_21_id IS NOT NULL THEN
        INSERT INTO package_variants (package_id, variant_name, base_price, extra_cost_per_safa, including_items, notes, variant_order) VALUES
        (package_21_id, 'Basic Package', 5250.00, 100.00, ARRAY['Basic safas', 'Standard tying'], 'Entry level package for 21 safas', 1),
        (package_21_id, 'Standard Package', 5670.00, 120.00, ARRAY['Quality safas', 'Professional tying', '3 VIP family safas'], 'Standard quality with some VIP options', 2),
        (package_21_id, 'Premium Package', 6930.00, 150.00, ARRAY['Premium safas', 'Expert tying', '6 VIP family safas', '1 groom designer safa'], 'Premium quality with designer options', 3),
        (package_21_id, 'Deluxe Package', 9030.00, 200.00, ARRAY['Deluxe safas', 'Master tying', '10 VIP safas', '1 expensive groom safa'], 'High-end package with luxury options', 4),
        (package_21_id, 'Royal Package', 11130.00, 250.00, ARRAY['Royal safas', 'Expert styling', 'All VIP safas', 'Family VVIP', 'Groom MAHARAJA'], 'Royal treatment for all guests', 5),
        (package_21_id, 'Imperial Package', 11970.00, 300.00, ARRAY['Imperial safas', 'Master styling', 'All VVIP safas', 'Family themed', 'Groom MAHARAJA'], 'Imperial luxury experience', 6),
        (package_21_id, 'Maharaja Package', 12810.00, 350.00, ARRAY['Maharaja safas', 'Royal styling', 'All VVIP safas', 'Family themed', 'Groom MAHARAJA'], 'Ultimate maharaja experience', 7),
        (package_21_id, 'Supreme Package', 13650.00, 400.00, ARRAY['Supreme safas', 'Supreme styling', 'All VVIP safas', 'Family themed', 'Groom MAHARAJA'], 'Supreme luxury package', 8),
        (package_21_id, 'Tissue Silk Special', 14910.00, 450.00, ARRAY['Tissue silk safas', 'Premium styling', 'Darshan ravals wedding style'], 'Special tissue silk collection', 9)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_features ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view packages" ON packages FOR SELECT USING (true);
CREATE POLICY "Users can manage packages" ON packages FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view package variants" ON package_variants FOR SELECT USING (true);
CREATE POLICY "Users can manage package variants" ON package_variants FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view package features" ON package_features FOR SELECT USING (true);
CREATE POLICY "Users can manage package features" ON package_features FOR ALL USING (auth.uid() IS NOT NULL);
