-- Complete Safawala CRM Database Schema
-- This script creates all required tables with proper relationships and disables RLS for development

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS distance_pricing CASCADE;
DROP TABLE IF EXISTS package_variants CASCADE;
DROP TABLE IF EXISTS package_sets CASCADE;
DROP TABLE IF EXISTS packages_categories CASCADE;

-- Disable RLS on all tables for easier development
ALTER TABLE IF EXISTS distance_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS package_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS package_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS packages_categories DISABLE ROW LEVEL SECURITY;

-- 1. Categories Table
CREATE TABLE packages_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Packages Table
CREATE TABLE package_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    package_type VARCHAR(50) DEFAULT 'traditional',
    category_id UUID REFERENCES packages_categories(id) ON DELETE CASCADE,
    franchise_id UUID,
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Package Variants Table
CREATE TABLE package_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    package_id UUID REFERENCES package_sets(id) ON DELETE CASCADE,
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Distance Pricing Table
CREATE TABLE distance_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES package_variants(id) ON DELETE CASCADE,
    distance_range VARCHAR(50) NOT NULL, -- e.g., "0-5km", "5-10km", "10-20km", "20km+"
    price_multiplier NUMERIC(4,2) DEFAULT 1.0,
    extra_price NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS on all tables
ALTER TABLE packages_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE package_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE package_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE distance_pricing DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_package_sets_category_id ON package_sets(category_id);
CREATE INDEX idx_package_variants_package_id ON package_variants(package_id);
CREATE INDEX idx_distance_pricing_variant_id ON distance_pricing(variant_id);
CREATE INDEX idx_packages_categories_active ON packages_categories(is_active);
CREATE INDEX idx_package_sets_active ON package_sets(is_active);

-- Insert sample categories
INSERT INTO packages_categories (id, name, description, display_order) VALUES
('b36ff323-9a41-42ab-b342-cd85dedba0e4', '30 Safas', 'Premium wedding safa collection for 30 people', 1),
('f7bf6f64-ebcf-4903-bf96-cc61ad2f73f2', '51 Safas', 'Grand wedding safa collection for 51 people', 2),
('5a5246d1-0f37-44dd-a844-38e3e44a9e80', '101 Safas', 'Royal wedding safa collection for 101 people', 3),
('e01b94e2-c4fe-4636-ba5c-7d67ba5668d9', '111 Safas', 'Imperial wedding safa collection for 111 people', 4);

-- Insert sample packages
INSERT INTO package_sets (id, name, description, base_price, package_type, category_id, franchise_id, display_order) VALUES
-- 30 Safas packages
('pkg-30-standard', 'Standard Package', 'Standard safa collection for 30 people', 10000, 'wedding', 'b36ff323-9a41-42ab-b342-cd85dedba0e4', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 1),
('pkg-30-basic', 'Basic Package', 'Basic safa collection for 30 people', 8000, 'traditional', 'b36ff323-9a41-42ab-b342-cd85dedba0e4', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 2),

-- 51 Safas packages
('pkg-51-grand', 'Grand Wedding Package', 'Grand wedding safa collection for 51 people', 15000, 'wedding', 'f7bf6f64-ebcf-4903-bf96-cc61ad2f73f2', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 1),
('pkg-51-deluxe', 'Deluxe Wedding Package', 'Deluxe wedding safa collection for 51 people', 12000, 'premium', 'f7bf6f64-ebcf-4903-bf96-cc61ad2f73f2', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 2),

-- 101 Safas packages
('pkg-101-luxury', 'Luxury Wedding Package', 'Luxury wedding safa collection for 101 people', 25000, 'premium', '5a5246d1-0f37-44dd-a844-38e3e44a9e80', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 1),
('pkg-101-imperial', 'Imperial Wedding Package', 'Imperial wedding safa collection for 101 people', 30000, 'wedding', '5a5246d1-0f37-44dd-a844-38e3e44a9e80', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 2),

-- 111 Safas packages
('pkg-111-royal', 'Royal Package', 'Royal safa collection for 111 people', 35000, 'premium', 'e01b94e2-c4fe-4636-ba5c-7d67ba5668d9', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 1),
('pkg-111-supreme', 'Supreme Package', 'Supreme safa collection for 111 people', 40000, 'wedding', 'e01b94e2-c4fe-4636-ba5c-7d67ba5668d9', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 2);

-- Insert sample variants
INSERT INTO package_variants (id, name, description, package_id, base_price, display_order) VALUES
-- Standard Package variants
('var-std-1', 'Standard Red', 'Red colored safas with gold border', 'pkg-30-standard', 10000, 1),
('var-std-2', 'Standard Pink', 'Pink colored safas with silver border', 'pkg-30-standard', 10500, 2),

-- Basic Package variants
('var-basic-1', 'Basic Red', 'Basic red colored safas', 'pkg-30-basic', 8000, 1),
('var-basic-2', 'Basic Yellow', 'Basic yellow colored safas', 'pkg-30-basic', 8200, 2),

-- Grand Wedding variants
('var-grand-1', 'Grand Red Gold', 'Grand red safas with gold embroidery', 'pkg-51-grand', 15000, 1),
('var-grand-2', 'Grand Pink Silver', 'Grand pink safas with silver embroidery', 'pkg-51-grand', 15500, 2),

-- Deluxe Wedding variants
('var-deluxe-1', 'Deluxe Maroon', 'Deluxe maroon safas with gold work', 'pkg-51-deluxe', 12000, 1),
('var-deluxe-2', 'Deluxe Orange', 'Deluxe orange safas with silver work', 'pkg-51-deluxe', 12300, 2);

-- Insert sample distance pricing
INSERT INTO distance_pricing (variant_id, distance_range, price_multiplier, extra_price) VALUES
-- Standard Red variant pricing
('var-std-1', '0-5km', 1.0, 0),
('var-std-1', '5-10km', 1.1, 500),
('var-std-1', '10-20km', 1.2, 1000),
('var-std-1', '20km+', 1.3, 1500),

-- Standard Pink variant pricing
('var-std-2', '0-5km', 1.0, 0),
('var-std-2', '5-10km', 1.1, 500),
('var-std-2', '10-20km', 1.2, 1000),
('var-std-2', '20km+', 1.3, 1500),

-- Basic Red variant pricing
('var-basic-1', '0-5km', 1.0, 0),
('var-basic-1', '5-10km', 1.05, 300),
('var-basic-1', '10-20km', 1.1, 600),
('var-basic-1', '20km+', 1.15, 900),

-- Basic Yellow variant pricing
('var-basic-2', '0-5km', 1.0, 0),
('var-basic-2', '5-10km', 1.05, 300),
('var-basic-2', '10-20km', 1.1, 600),
('var-basic-2', '20km+', 1.15, 900),

-- Grand Red Gold variant pricing
('var-grand-1', '0-5km', 1.0, 0),
('var-grand-1', '5-10km', 1.15, 800),
('var-grand-1', '10-20km', 1.25, 1500),
('var-grand-1', '20km+', 1.35, 2000),

-- Grand Pink Silver variant pricing
('var-grand-2', '0-5km', 1.0, 0),
('var-grand-2', '5-10km', 1.15, 800),
('var-grand-2', '10-20km', 1.25, 1500),
('var-grand-2', '20km+', 1.35, 2000),

-- Deluxe Maroon variant pricing
('var-deluxe-1', '0-5km', 1.0, 0),
('var-deluxe-1', '5-10km', 1.12, 700),
('var-deluxe-1', '10-20km', 1.22, 1200),
('var-deluxe-1', '20km+', 1.32, 1800),

-- Deluxe Orange variant pricing
('var-deluxe-2', '0-5km', 1.0, 0),
('var-deluxe-2', '5-10km', 1.12, 700),
('var-deluxe-2', '10-20km', 1.22, 1200),
('var-deluxe-2', '20km+', 1.32, 1800);

-- Create update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_packages_categories_updated_at BEFORE UPDATE ON packages_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_package_sets_updated_at BEFORE UPDATE ON package_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_package_variants_updated_at BEFORE UPDATE ON package_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_distance_pricing_updated_at BEFORE UPDATE ON distance_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
