-- Create complex safa package system with sub-packages, variants, and distance-based pricing
-- Structure: Packages -> Sub-packages (Handmade/Live/Premium) -> Variants (9 each)

-- Drop existing tables if they exist to recreate with new structure
DROP TABLE IF EXISTS package_distance_pricing CASCADE;
DROP TABLE IF EXISTS package_sub_variants CASCADE;
DROP TABLE IF EXISTS package_sub_packages CASCADE;

-- Update packages table to include safa count
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS safa_count INTEGER,
ADD COLUMN IF NOT EXISTS package_category VARCHAR(50) DEFAULT 'safa';

-- Create sub-packages table (Handmade, Live, Premium)
CREATE TABLE package_sub_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
    sub_package_name VARCHAR(100) NOT NULL, -- 'Handmade', 'Live', 'Premium'
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    UNIQUE(package_id, sub_package_name)
);

-- Create sub-package variants table (9 variants per sub-package)
CREATE TABLE package_sub_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_package_id UUID REFERENCES package_sub_packages(id) ON DELETE CASCADE,
    variant_name VARCHAR(200) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    extra_cost_per_safa DECIMAL(10,2) DEFAULT 0,
    included_items TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distance-based pricing table
CREATE TABLE package_distance_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distance_range_start INTEGER NOT NULL, -- 0, 12, 26, 151
    distance_range_end INTEGER NOT NULL,   -- 11, 25, 150, 300
    price_multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.000, -- 1.0, 1.5, 2.0, etc.
    location_base VARCHAR(100) DEFAULT 'Alkapuri, Vadodara',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert distance pricing ranges
INSERT INTO package_distance_pricing (distance_range_start, distance_range_end, price_multiplier, location_base) VALUES
(0, 11, 1.000, 'Alkapuri, Vadodara'),    -- Base price
(12, 25, 1.500, 'Alkapuri, Vadodara'),   -- 50% increase
(26, 150, 2.000, 'Alkapuri, Vadodara'),  -- 100% increase
(151, 300, 2.500, 'Alkapuri, Vadodara'), -- 150% increase
(301, 9999, 2.500, 'Outside State');     -- Same as 151-300 km

-- Insert the 9 main safa packages
INSERT INTO packages (name, description, package_type, category, safa_count, base_price, is_active) VALUES
('21 Safa Package', 'Wedding safa package for 21 people', 'safa', 'wedding', 21, 0, true),
('31 Safa Package', 'Wedding safa package for 31 people', 'safa', 'wedding', 31, 0, true),
('41 Safa Package', 'Wedding safa package for 41 people', 'safa', 'wedding', 41, 0, true),
('51 Safa Package', 'Wedding safa package for 51 people', 'safa', 'wedding', 51, 0, true),
('61 Safa Package', 'Wedding safa package for 61 people', 'safa', 'wedding', 61, 0, true),
('71 Safa Package', 'Wedding safa package for 71 people', 'safa', 'wedding', 71, 0, true),
('81 Safa Package', 'Wedding safa package for 81 people', 'safa', 'wedding', 81, 0, true),
('91 Safa Package', 'Wedding safa package for 91 people', 'safa', 'wedding', 91, 0, true),
('101 Safa Package', 'Wedding safa package for 101 people', 'safa', 'wedding', 101, 0, true);

-- Insert sub-packages for each main package (Handmade, Live, Premium)
DO $$
DECLARE
    pkg_record RECORD;
BEGIN
    FOR pkg_record IN SELECT id, safa_count FROM packages WHERE package_type = 'safa' LOOP
        -- Handmade sub-package
        INSERT INTO package_sub_packages (package_id, sub_package_name, base_price, description, display_order)
        VALUES (pkg_record.id, 'Handmade', pkg_record.safa_count * 100, 'Traditional handmade safa collection', 1);
        
        -- Live sub-package  
        INSERT INTO package_sub_packages (package_id, sub_package_name, base_price, description, display_order)
        VALUES (pkg_record.id, 'Live', pkg_record.safa_count * 150, 'Live crafted premium safa collection', 2);
        
        -- Premium sub-package
        INSERT INTO package_sub_packages (package_id, sub_package_name, base_price, description, display_order)
        VALUES (pkg_record.id, 'Premium', pkg_record.safa_count * 200, 'Premium luxury safa collection', 3);
    END LOOP;
END $$;

-- Create indexes for better performance
CREATE INDEX idx_package_sub_packages_package_id ON package_sub_packages(package_id);
CREATE INDEX idx_package_sub_variants_sub_package_id ON package_sub_variants(sub_package_id);
CREATE INDEX idx_distance_pricing_range ON package_distance_pricing(distance_range_start, distance_range_end);

-- Create RLS policies
ALTER TABLE package_sub_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_sub_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_distance_pricing ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (can be refined later)
CREATE POLICY "Allow all operations for authenticated users" ON package_sub_packages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON package_sub_variants FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON package_distance_pricing FOR ALL TO authenticated USING (true);

-- Insert sample variants for demonstration (can be customized later)
DO $$
DECLARE
    sub_pkg_record RECORD;
    variant_names TEXT[] := ARRAY[
        'Basic Design', 'Classic Pattern', 'Royal Style', 'Designer Collection',
        'Luxury Edition', 'Premium Craft', 'Elite Series', 'Signature Style', 'Masterpiece'
    ];
    i INTEGER;
BEGIN
    FOR sub_pkg_record IN SELECT id, base_price FROM package_sub_packages LOOP
        FOR i IN 1..9 LOOP
            INSERT INTO package_sub_variants (
                sub_package_id, 
                variant_name, 
                base_price, 
                extra_cost_per_safa,
                included_items,
                display_order
            ) VALUES (
                sub_pkg_record.id,
                variant_names[i],
                sub_pkg_record.base_price + (i * 500), -- Incremental pricing
                i * 10, -- Extra cost per safa
                'Standard accessories, Premium fabric, Custom embroidery',
                i
            );
        END LOOP;
    END LOOP;
END $$;

COMMENT ON TABLE package_sub_packages IS 'Sub-packages within main safa packages (Handmade, Live, Premium)';
COMMENT ON TABLE package_sub_variants IS 'Variants within each sub-package (9 variants per sub-package)';
COMMENT ON TABLE package_distance_pricing IS 'Distance-based pricing from Alkapuri, Vadodara';
