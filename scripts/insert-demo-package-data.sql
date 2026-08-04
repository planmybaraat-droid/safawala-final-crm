-- Insert demo data for package management system
-- This script adds 10+ demo records across all package management tables

-- First, insert categories (21 Safas, 31 Safas, etc.)
INSERT INTO packages_categories (id, name, description, display_order, is_active, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', '21 Safas', 'Traditional wedding safa collection for 21 people', 1, true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', '31 Safas', 'Premium wedding safa collection for 31 people', 2, true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', '51 Safas', 'Grand wedding safa collection for 51 people', 3, true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', '101 Safas', 'Royal wedding safa collection for 101 people', 4, true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', '151 Safas', 'Maharaja wedding safa collection for 151 people', 5, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
description = EXCLUDED.description,
display_order = EXCLUDED.display_order,
updated_at = NOW();

-- Insert packages within categories
INSERT INTO package_sets (id, name, description, base_price, package_type, category, category_id, is_active, created_by, franchise_id, created_at, updated_at) VALUES
-- 21 Safas packages
('660e8400-e29b-41d4-a716-446655440001', 'Classic 21 Safa Package', 'Traditional wedding safa package with classic designs', 15000.00, 'safa', 'wedding', '550e8400-e29b-41d4-a716-446655440001', true, '00000000-0000-0000-0000-000000000001', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440002', 'Premium 21 Safa Package', 'Premium wedding safa package with silk materials', 22000.00, 'safa', 'wedding', '550e8400-e29b-41d4-a716-446655440001', true, '00000000-0000-0000-0000-000000000001', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', NOW(), NOW()),
-- 31 Safas packages
('660e8400-e29b-41d4-a716-446655440003', 'Classic 31 Safa Package', 'Traditional wedding safa package for medium gatherings', 28000.00, 'safa', 'wedding', '550e8400-e29b-41d4-a716-446655440002', true, '00000000-0000-0000-0000-000000000001', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440004', 'Royal 31 Safa Package', 'Royal wedding safa package with gold thread work', 35000.00, 'safa', 'wedding', '550e8400-e29b-41d4-a716-446655440002', true, '00000000-0000-0000-0000-000000000001', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', NOW(), NOW()),
-- 51 Safas packages
('660e8400-e29b-41d4-a716-446655440005', 'Grand 51 Safa Package', 'Grand wedding safa package for large celebrations', 45000.00, 'safa', 'wedding', '550e8400-e29b-41d4-a716-446655440003', true, '00000000-0000-0000-0000-000000000001', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440006', 'Heritage 51 Safa Package', 'Heritage wedding safa package with traditional patterns', 52000.00, 'safa', 'wedding', '550e8400-e29b-41d4-a716-446655440003', true, '00000000-0000-0000-0000-000000000001', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', NOW(), NOW()),
-- 101 Safas packages
('660e8400-e29b-41d4-a716-446655440007', 'Royal 101 Safa Package', 'Royal wedding safa package for grand celebrations', 85000.00, 'safa', 'wedding', '550e8400-e29b-41d4-a716-446655440004', true, '00000000-0000-0000-0000-000000000001', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440008', 'Maharaja 101 Safa Package', 'Maharaja wedding safa package with premium materials', 95000.00, 'safa', 'wedding', '550e8400-e29b-41d4-a716-446655440004', true, '00000000-0000-0000-0000-000000000001', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', NOW(), NOW()),
-- 151 Safas packages
('660e8400-e29b-41d4-a716-446655440009', 'Imperial 151 Safa Package', 'Imperial wedding safa package for massive celebrations', 125000.00, 'safa', 'wedding', '550e8400-e29b-41d4-a716-446655440005', true, '00000000-0000-0000-0000-000000000001', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440010', 'Destination 151 Safa Package', 'Destination wedding safa package with travel arrangements', 135000.00, 'safa', 'wedding', '550e8400-e29b-41d4-a716-446655440005', true, '00000000-0000-0000-0000-000000000001', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
description = EXCLUDED.description,
base_price = EXCLUDED.base_price,
updated_at = NOW();

-- Insert package variants (2-3 variants per package)
INSERT INTO package_variants (id, package_id, name, description, base_price, inclusions, display_order, is_active, created_at, updated_at) VALUES
-- Classic 21 Safa Package variants
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'Basic Variant', 'Basic safa package with standard materials', 15000.00, ARRAY['21 Traditional Safas', 'Basic Kalgi', 'Standard Packaging', 'Local Delivery'], 1, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'Deluxe Variant', 'Deluxe safa package with premium accessories', 18000.00, ARRAY['21 Premium Safas', 'Designer Kalgi', 'Gift Packaging', 'Express Delivery', 'Backup Safas'], 2, true, NOW(), NOW()),
-- Premium 21 Safa Package variants
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', 'Silk Variant', 'Premium silk safa package', 22000.00, ARRAY['21 Silk Safas', 'Gold Kalgi', 'Luxury Packaging', 'White Glove Delivery'], 1, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 'Royal Variant', 'Royal silk safa package with gold work', 25000.00, ARRAY['21 Royal Silk Safas', 'Diamond Kalgi', 'Royal Packaging', 'VIP Delivery', 'Personal Stylist'], 2, true, NOW(), NOW()),
-- Classic 31 Safa Package variants
('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440003', 'Standard Variant', 'Standard 31 safa package', 28000.00, ARRAY['31 Traditional Safas', 'Standard Kalgi', 'Basic Packaging', 'Local Delivery'], 1, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440003', 'Premium Variant', 'Premium 31 safa package with extras', 32000.00, ARRAY['31 Premium Safas', 'Designer Kalgi', 'Premium Packaging', 'Express Delivery', 'Setup Service'], 2, true, NOW(), NOW()),
-- Royal 31 Safa Package variants
('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440004', 'Gold Variant', 'Royal package with gold thread work', 35000.00, ARRAY['31 Gold Work Safas', 'Gold Kalgi', 'Royal Packaging', 'VIP Delivery'], 1, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440004', 'Diamond Variant', 'Royal package with diamond accessories', 42000.00, ARRAY['31 Diamond Safas', 'Diamond Kalgi', 'Luxury Packaging', 'Royal Delivery', 'Personal Attendant'], 2, true, NOW(), NOW()),
-- Grand 51 Safa Package variants
('770e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440005', 'Classic Variant', 'Grand classic safa package', 45000.00, ARRAY['51 Grand Safas', 'Classic Kalgi', 'Grand Packaging', 'Professional Delivery'], 1, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440005', 'Luxury Variant', 'Grand luxury safa package', 52000.00, ARRAY['51 Luxury Safas', 'Luxury Kalgi', 'Designer Packaging', 'VIP Delivery', 'Setup Team'], 2, true, NOW(), NOW()),
-- Heritage 51 Safa Package variants
('770e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440006', 'Traditional Variant', 'Heritage traditional safa package', 52000.00, ARRAY['51 Heritage Safas', 'Traditional Kalgi', 'Heritage Packaging', 'Cultural Delivery'], 1, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440006', 'Royal Heritage Variant', 'Royal heritage safa package', 58000.00, ARRAY['51 Royal Heritage Safas', 'Royal Kalgi', 'Royal Packaging', 'Royal Delivery', 'Heritage Consultant'], 2, true, NOW(), NOW()),
-- Royal 101 Safa Package variants
('770e8400-e29b-41d4-a716-446655440013', '660e8400-e29b-41d4-a716-446655440007', 'Royal Standard', 'Royal standard safa package', 85000.00, ARRAY['101 Royal Safas', 'Royal Kalgi', 'Royal Packaging', 'Royal Delivery'], 1, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440014', '660e8400-e29b-41d4-a716-446655440007', 'Royal Premium', 'Royal premium safa package', 95000.00, ARRAY['101 Premium Royal Safas', 'Diamond Royal Kalgi', 'Luxury Royal Packaging', 'VIP Royal Delivery', 'Royal Attendant'], 2, true, NOW(), NOW()),
-- Maharaja 101 Safa Package variants
('770e8400-e29b-41d4-a716-446655440015', '660e8400-e29b-41d4-a716-446655440008', 'Maharaja Classic', 'Maharaja classic safa package', 95000.00, ARRAY['101 Maharaja Safas', 'Maharaja Kalgi', 'Maharaja Packaging', 'Maharaja Delivery'], 1, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440016', '660e8400-e29b-41d4-a716-446655440008', 'Maharaja Supreme', 'Maharaja supreme safa package', 110000.00, ARRAY['101 Supreme Maharaja Safas', 'Supreme Kalgi', 'Supreme Packaging', 'Supreme Delivery', 'Maharaja Service'], 2, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
description = EXCLUDED.description,
base_price = EXCLUDED.base_price,
inclusions = EXCLUDED.inclusions,
updated_at = NOW();

-- Insert distance pricing for each variant (5 distance ranges from Alkapuri, Vadodara)
INSERT INTO distance_pricing (id, variant_id, distance_range, min_km, max_km, base_price_addition, is_active, created_at, updated_at) VALUES
-- Distance pricing for Basic Variant (770e8400-e29b-41d4-a716-446655440001)
('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '0-10 km', 0, 10, 0.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '11-25 km', 11, 25, 500.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001', '26-150 km', 26, 150, 1500.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001', '151-300 km', 151, 300, 3000.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001', '300-1500 km', 300, 1500, 8000.00, true, NOW(), NOW()),
-- Distance pricing for Deluxe Variant (770e8400-e29b-41d4-a716-446655440002)
('880e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440002', '0-10 km', 0, 10, 0.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440002', '11-25 km', 11, 25, 800.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440002', '26-150 km', 26, 150, 2000.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440009', '770e8400-e29b-41d4-a716-446655440002', '151-300 km', 151, 300, 4000.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440010', '770e8400-e29b-41d4-a716-446655440002', '300-1500 km', 300, 1500, 10000.00, true, NOW(), NOW()),
-- Distance pricing for Silk Variant (770e8400-e29b-41d4-a716-446655440003)
('880e8400-e29b-41d4-a716-446655440011', '770e8400-e29b-41d4-a716-446655440003', '0-10 km', 0, 10, 0.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440012', '770e8400-e29b-41d4-a716-446655440003', '11-25 km', 11, 25, 1000.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440013', '770e8400-e29b-41d4-a716-446655440003', '26-150 km', 26, 150, 2500.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440014', '770e8400-e29b-41d4-a716-446655440003', '151-300 km', 151, 300, 5000.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440015', '770e8400-e29b-41d4-a716-446655440003', '300-1500 km', 300, 1500, 12000.00, true, NOW(), NOW()),
-- Distance pricing for Royal Variant (770e8400-e29b-41d4-a716-446655440004)
('880e8400-e29b-41d4-a716-446655440016', '770e8400-e29b-41d4-a716-446655440004', '0-10 km', 0, 10, 0.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440017', '770e8400-e29b-41d4-a716-446655440004', '11-25 km', 11, 25, 1200.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440018', '770e8400-e29b-41d4-a716-446655440004', '26-150 km', 26, 150, 3000.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440019', '770e8400-e29b-41d4-a716-446655440004', '151-300 km', 151, 300, 6000.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440020', '770e8400-e29b-41d4-a716-446655440004', '300-1500 km', 300, 1500, 15000.00, true, NOW(), NOW()),
-- Distance pricing for Standard Variant (770e8400-e29b-41d4-a716-446655440005)
('880e8400-e29b-41d4-a716-446655440021', '770e8400-e29b-41d4-a716-446655440005', '0-10 km', 0, 10, 0.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440022', '770e8400-e29b-41d4-a716-446655440005', '11-25 km', 11, 25, 800.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440023', '770e8400-e29b-41d4-a716-446655440005', '26-150 km', 26, 150, 2200.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440024', '770e8400-e29b-41d4-a716-446655440005', '151-300 km', 151, 300, 4500.00, true, NOW(), NOW()),
('880e8400-e29b-41d4-a716-446655440025', '770e8400-e29b-41d4-a716-446655440005', '300-1500 km', 300, 1500, 11000.00, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
distance_range = EXCLUDED.distance_range,
min_km = EXCLUDED.min_km,
max_km = EXCLUDED.max_km,
base_price_addition = EXCLUDED.base_price_addition,
updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_sets_category_id ON package_sets(category_id);
CREATE INDEX IF NOT EXISTS idx_package_variants_package_id ON package_variants(package_id);
CREATE INDEX IF NOT EXISTS idx_distance_pricing_variant_id ON distance_pricing(variant_id);

-- Verify the data was inserted
SELECT 
    'Categories' as table_name, 
    COUNT(*) as record_count 
FROM packages_categories
UNION ALL
SELECT 
    'Packages' as table_name, 
    COUNT(*) as record_count 
FROM package_sets
UNION ALL
SELECT 
    'Variants' as table_name, 
    COUNT(*) as record_count 
FROM package_variants
UNION ALL
SELECT 
    'Distance Pricing' as table_name, 
    COUNT(*) as record_count 
FROM distance_pricing;
