-- Demo data script for packages system with all required fields

-- Insert demo packages (9 safa packages: 21, 31, 41, 51, 61, 71, 81, 91, 101)
INSERT INTO packages (id, name, description, package_type, category, base_price, is_active, franchise_id, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440001', '21 Safas Package', 'Traditional wedding safa package for 21 people', 'wedding_safa', 'safa_packages', 15000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440002', '31 Safas Package', 'Traditional wedding safa package for 31 people', 'wedding_safa', 'safa_packages', 22000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440003', '41 Safas Package', 'Traditional wedding safa package for 41 people', 'wedding_safa', 'safa_packages', 28000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440004', '51 Safas Package', 'Traditional wedding safa package for 51 people', 'wedding_safa', 'safa_packages', 35000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440005', '61 Safas Package', 'Traditional wedding safa package for 61 people', 'wedding_safa', 'safa_packages', 42000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440006', '71 Safas Package', 'Traditional wedding safa package for 71 people', 'wedding_safa', 'safa_packages', 48000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440007', '81 Safas Package', 'Traditional wedding safa package for 81 people', 'wedding_safa', 'safa_packages', 55000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440008', '91 Safas Package', 'Traditional wedding safa package for 91 people', 'wedding_safa', 'safa_packages', 62000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440009', '101 Safas Package', 'Traditional wedding safa package for 101 people', 'wedding_safa', 'safa_packages', 68000.00, true, null, '550e8400-e29b-41d4-a716-446655440000');

-- Insert sub-packages (3 for each package: Handmade, Live, Premium)
INSERT INTO package_sub_packages (id, package_id, name, description, base_price, display_order, is_active) VALUES
-- 21 Safas Package Sub-packages
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Handmade', 'Traditional handmade safas with intricate embroidery', 18000.00, 1, true),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Live', 'Live safa tying service with professional artists', 20000.00, 2, true),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Premium', 'Premium quality safas with gold thread work', 25000.00, 3, true),

-- 31 Safas Package Sub-packages
('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Handmade', 'Traditional handmade safas with intricate embroidery', 25000.00, 1, true),
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'Live', 'Live safa tying service with professional artists', 28000.00, 2, true),
('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Premium', 'Premium quality safas with gold thread work', 32000.00, 3, true),

-- 41 Safas Package Sub-packages
('650e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003', 'Handmade', 'Traditional handmade safas with intricate embroidery', 32000.00, 1, true),
('650e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003', 'Live', 'Live safa tying service with professional artists', 35000.00, 2, true),
('650e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440003', 'Premium', 'Premium quality safas with gold thread work', 40000.00, 3, true),

-- Continue for remaining packages...
-- 51 Safas Package Sub-packages
('650e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440004', 'Handmade', 'Traditional handmade safas with intricate embroidery', 38000.00, 1, true),
('650e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440004', 'Live', 'Live safa tying service with professional artists', 42000.00, 2, true),
('650e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440004', 'Premium', 'Premium quality safas with gold thread work', 48000.00, 3, true),

-- 61 Safas Package Sub-packages
('650e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440005', 'Handmade', 'Traditional handmade safas with intricate embroidery', 45000.00, 1, true),
('650e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440005', 'Live', 'Live safa tying service with professional artists', 50000.00, 2, true),
('650e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440005', 'Premium', 'Premium quality safas with gold thread work', 55000.00, 3, true),

-- 71 Safas Package Sub-packages
('650e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440006', 'Handmade', 'Traditional handmade safas with intricate embroidery', 52000.00, 1, true),
('650e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440006', 'Live', 'Live safa tying service with professional artists', 58000.00, 2, true),
('650e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440006', 'Premium', 'Premium quality safas with gold thread work', 65000.00, 3, true),

-- 81 Safas Package Sub-packages
('650e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440007', 'Handmade', 'Traditional handmade safas with intricate embroidery', 58000.00, 1, true),
('650e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440007', 'Live', 'Live safa tying service with professional artists', 65000.00, 2, true),
('650e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440007', 'Premium', 'Premium quality safas with gold thread work', 72000.00, 3, true),

-- 91 Safas Package Sub-packages
('650e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440008', 'Handmade', 'Traditional handmade safas with intricate embroidery', 65000.00, 1, true),
('650e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440008', 'Live', 'Live safa tying service with professional artists', 72000.00, 2, true),
('650e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440008', 'Premium', 'Premium quality safas with gold thread work', 80000.00, 3, true),

-- 101 Safas Package Sub-packages
('650e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440009', 'Handmade', 'Traditional handmade safas with intricate embroidery', 72000.00, 1, true),
('650e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440009', 'Live', 'Live safa tying service with professional artists', 80000.00, 2, true),
('650e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440009', 'Premium', 'Premium quality safas with gold thread work', 88000.00, 3, true);

-- Insert package variants (9 variants for each sub-package)
INSERT INTO package_variants (id, sub_package_id, variant_name, base_price, extra_cost_per_unit, included_items, notes, display_order, is_active) VALUES
-- Handmade 21 Safas variants
('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'Basic Cotton', 18000.00, 200.00, 'Cotton safas, basic embroidery, storage box', 'Standard quality cotton material', 1, true),
('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', 'Silk Blend', 20000.00, 250.00, 'Silk blend safas, decorative embroidery, premium box', 'Silk blend with enhanced durability', 2, true),
('750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440001', 'Pure Silk', 22000.00, 300.00, 'Pure silk safas, intricate embroidery, luxury box', 'Premium pure silk material', 3, true),
('750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440001', 'Banarasi Silk', 25000.00, 350.00, 'Banarasi silk safas, gold thread work, wooden box', 'Traditional Banarasi silk with gold threads', 4, true),
('750e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440001', 'Kanchipuram Silk', 28000.00, 400.00, 'Kanchipuram silk safas, temple border, carved box', 'South Indian Kanchipuram silk', 5, true),
('750e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440001', 'Jamawar', 30000.00, 450.00, 'Jamawar safas, paisley patterns, antique box', 'Traditional Jamawar with paisley designs', 6, true),
('750e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440001', 'Brocade', 32000.00, 500.00, 'Brocade safas, metallic threads, royal box', 'Heavy brocade with metallic thread work', 7, true),
('750e8400-e29b-41d4-a716-446655440008', '650e8400-e29b-41d4-a716-446655440001', 'Velvet', 35000.00, 550.00, 'Velvet safas, zardozi work, velvet-lined box', 'Luxurious velvet with zardozi embroidery', 8, true),
('750e8400-e29b-41d4-a716-446655440009', '650e8400-e29b-41d4-a716-446655440001', 'Royal Collection', 40000.00, 600.00, 'Premium materials, hand-crafted, royal presentation', 'Ultimate luxury collection with finest materials', 9, true);

-- Note: This is a sample of variants for the first sub-package. 
-- In a complete implementation, you would add 9 variants for each of the 27 sub-packages (243 total variants)
-- For brevity, showing pattern for first sub-package only.

-- Insert distance pricing tiers
INSERT INTO distance_pricing_tiers (id, tier_name, min_distance, max_distance, price_multiplier, base_location, is_active) VALUES
('850e8400-e29b-41d4-a716-446655440001', 'Local (0-11 km)', 0, 11, 1.0, 'Alkapuri, Vadodara', true),
('850e8400-e29b-41d4-a716-446655440002', 'City (12-25 km)', 12, 25, 1.15, 'Alkapuri, Vadodara', true),
('850e8400-e29b-41d4-a716-446655440003', 'Regional (26-150 km)', 26, 150, 1.35, 'Alkapuri, Vadodara', true),
('850e8400-e29b-41d4-a716-446655440004', 'State (151-300 km)', 151, 300, 1.55, 'Alkapuri, Vadodara', true),
('850e8400-e29b-41d4-a716-446655440005', 'Outside State (All India)', 301, 9999, 1.75, 'Alkapuri, Vadodara', true);
