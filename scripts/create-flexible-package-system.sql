-- Create comprehensive package system with hierarchy and configurable pricing
-- Main packages -> Sub-packages -> Variants with distance-based pricing

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS package_variant_items CASCADE;
DROP TABLE IF EXISTS package_variants CASCADE;
DROP TABLE IF EXISTS package_sub_packages CASCADE;
DROP TABLE IF EXISTS distance_pricing_tiers CASCADE;
DROP TABLE IF EXISTS package_pricing_settings CASCADE;

-- Create pricing settings table for configurable distance and pricing rules
CREATE TABLE package_pricing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_name VARCHAR(100) NOT NULL UNIQUE,
    base_location VARCHAR(200) DEFAULT 'Alkapuri, Vadodara',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distance pricing tiers table
CREATE TABLE distance_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricing_setting_id UUID REFERENCES package_pricing_settings(id) ON DELETE CASCADE,
    tier_name VARCHAR(100) NOT NULL,
    min_distance_km INTEGER NOT NULL,
    max_distance_km INTEGER, -- NULL means unlimited
    price_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    is_outside_state BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sub-packages table (e.g., Handmade, Live, Premium within 21 Safas package)
CREATE TABLE package_sub_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
    sub_package_name VARCHAR(200) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update package_variants to reference sub_packages instead of packages directly
ALTER TABLE package_variants DROP CONSTRAINT IF EXISTS package_variants_package_id_fkey;
ALTER TABLE package_variants ADD COLUMN sub_package_id UUID;
ALTER TABLE package_variants ADD CONSTRAINT package_variants_sub_package_id_fkey 
    FOREIGN KEY (sub_package_id) REFERENCES package_sub_packages(id) ON DELETE CASCADE;

-- Create package variant items table for detailed inclusions
CREATE TABLE package_variant_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES package_variants(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    item_description TEXT,
    quantity INTEGER DEFAULT 1,
    is_included BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pricing settings
INSERT INTO package_pricing_settings (setting_name, base_location) VALUES 
('Default Vadodara Pricing', 'Alkapuri, Vadodara');

-- Get the pricing setting ID for default tiers
DO $$
DECLARE
    default_pricing_id UUID;
BEGIN
    SELECT id INTO default_pricing_id FROM package_pricing_settings WHERE setting_name = 'Default Vadodara Pricing';
    
    -- Insert default distance pricing tiers
    INSERT INTO distance_pricing_tiers (pricing_setting_id, tier_name, min_distance_km, max_distance_km, price_multiplier, display_order) VALUES
    (default_pricing_id, 'Local (0-11 km)', 0, 11, 1.00, 1),
    (default_pricing_id, 'Near (12-25 km)', 12, 25, 1.79, 2),
    (default_pricing_id, 'Medium (26-150 km)', 26, 150, 1.79, 3),
    (default_pricing_id, 'Far (151-300 km)', 151, 300, 1.79, 4),
    (default_pricing_id, 'Outside State (All India)', 301, NULL, 2.50, 5);
    
    -- Update the outside state tier
    UPDATE distance_pricing_tiers 
    SET is_outside_state = TRUE 
    WHERE pricing_setting_id = default_pricing_id AND tier_name = 'Outside State (All India)';
END $$;

-- Create indexes for better performance
CREATE INDEX idx_package_sub_packages_package_id ON package_sub_packages(package_id);
CREATE INDEX idx_package_variants_sub_package_id ON package_variants(sub_package_id);
CREATE INDEX idx_package_variant_items_variant_id ON package_variant_items(variant_id);
CREATE INDEX idx_distance_pricing_tiers_setting_id ON distance_pricing_tiers(pricing_setting_id);

-- Create sample data for 21 Safas package
DO $$
DECLARE
    safas_21_package_id UUID;
    handmade_sub_id UUID;
    live_sub_id UUID;
    premium_sub_id UUID;
    variant_id UUID;
BEGIN
    -- Create 21 Safas main package
    INSERT INTO packages (name, description, package_type, category, base_price, is_active)
    VALUES ('21 Safas Package', 'Wedding safa package for 21 people', 'wedding_safa', 'wedding', 5000.00, TRUE)
    RETURNING id INTO safas_21_package_id;
    
    -- Create sub-packages
    INSERT INTO package_sub_packages (package_id, sub_package_name, description, display_order)
    VALUES 
    (safas_21_package_id, 'Handmade', 'Traditional handmade safas with intricate designs', 1),
    (safas_21_package_id, 'Live', 'Live tying service with professional staff', 2),
    (safas_21_package_id, 'Premium', 'Premium quality safas with luxury materials', 3)
    RETURNING id INTO handmade_sub_id;
    
    SELECT id INTO live_sub_id FROM package_sub_packages WHERE package_id = safas_21_package_id AND sub_package_name = 'Live';
    SELECT id INTO premium_sub_id FROM package_sub_packages WHERE package_id = safas_21_package_id AND sub_package_name = 'Premium';
    
    -- Create sample variants for Handmade sub-package
    INSERT INTO package_variants (sub_package_id, variant_name, base_price, extra_cost_per_unit, included_items, notes, display_order)
    VALUES 
    (handmade_sub_id, 'Basic Handmade', 3500.00, 150.00, 'Basic handmade safas, simple designs', 'Entry level handmade option', 1),
    (handmade_sub_id, 'Designer Handmade', 4500.00, 200.00, 'Designer handmade safas, intricate patterns', 'Mid-range designer option', 2),
    (handmade_sub_id, 'Royal Handmade', 6500.00, 300.00, 'Royal handmade safas, premium materials', 'Luxury handmade option', 3);
    
    -- Create sample variants for Live sub-package
    INSERT INTO package_variants (sub_package_id, variant_name, base_price, extra_cost_per_unit, included_items, notes, display_order)
    VALUES 
    (live_sub_id, 'Basic Live Service', 4000.00, 180.00, 'Live tying service, basic safas', 'Professional live tying', 1),
    (live_sub_id, 'Premium Live Service', 5500.00, 250.00, 'Live tying service, premium safas', 'Premium live tying experience', 2),
    (live_sub_id, 'VIP Live Service', 7500.00, 350.00, 'VIP live tying service, luxury safas', 'VIP treatment with luxury safas', 3);
    
    -- Create sample variants for Premium sub-package
    INSERT INTO package_variants (sub_package_id, variant_name, base_price, extra_cost_per_unit, included_items, notes, display_order)
    VALUES 
    (premium_sub_id, 'Premium Classic', 5000.00, 220.00, 'Premium quality safas, classic designs', 'High-quality classic option', 1),
    (premium_sub_id, 'Premium Designer', 6500.00, 280.00, 'Premium designer safas, modern patterns', 'Designer premium option', 2),
    (premium_sub_id, 'Premium Royal', 8500.00, 400.00, 'Premium royal safas, luxury materials', 'Ultimate premium experience', 3);
END $$;

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_package_pricing_settings_updated_at BEFORE UPDATE ON package_pricing_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_distance_pricing_tiers_updated_at BEFORE UPDATE ON distance_pricing_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_package_sub_packages_updated_at BEFORE UPDATE ON package_sub_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
