-- Insert distance pricing tiers from Alkapuri, Vadodara
INSERT INTO distance_pricing_tiers (id, tier_name, min_distance, max_distance, price_multiplier, base_location, is_active, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Local (Vadodara)', 0, 15, 1.0, 'Alkapuri, Vadodara', true, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'City Extended', 16, 30, 1.2, 'Alkapuri, Vadodara', true, NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'District', 31, 75, 1.5, 'Alkapuri, Vadodara', true, NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'State', 76, 150, 2.0, 'Alkapuri, Vadodara', true, NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'Outside State', 151, 500, 2.5, 'Alkapuri, Vadodara', true, NOW());

-- Insert demo packages for safa business
INSERT INTO packages (id, name, description, package_type, category, base_price, is_active, franchise_id, created_by, created_at, updated_at) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Royal Wedding Safa Collection', 'Premium collection of traditional wedding safas with intricate designs', 'safa', 'wedding', 15000, true, null, 'a871561e-39b3-4aec-aabf-d6d308709784', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440002', 'Engagement Special Turbans', 'Elegant turbans perfect for engagement ceremonies', 'turban', 'engagement', 8000, true, null, 'a871561e-39b3-4aec-aabf-d6d308709784', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440003', 'Festival Celebration Package', 'Colorful and vibrant safas for festival celebrations', 'safa', 'festival', 5000, true, null, 'a871561e-39b3-4aec-aabf-d6d308709784', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440004', 'Groom Accessories Complete Set', 'Complete accessories package for grooms', 'accessories', 'wedding', 12000, true, null, 'a871561e-39b3-4aec-aabf-d6d308709784', NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440005', 'Traditional Rajasthani Safas', 'Authentic Rajasthani style safas with mirror work', 'safa', 'special', 10000, true, null, 'a871561e-39b3-4aec-aabf-d6d308709784', NOW(), NOW());

-- Insert sub-packages (sub-categories)
INSERT INTO package_sub_packages (id, package_id, name, description, base_price, display_order, is_active, created_at, updated_at) VALUES
-- Royal Wedding Safa Collection sub-categories
('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'Maharaja Collection', 'Ultra-premium safas with gold work', 25000, 1, true, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', 'Royal Heritage', 'Traditional royal designs', 18000, 2, true, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440001', 'Classic Wedding', 'Standard wedding safas', 12000, 3, true, NOW(), NOW()),

-- Engagement Special Turbans sub-categories
('750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440002', 'Premium Engagement', 'Silk turbans with embroidery', 12000, 1, true, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440002', 'Standard Engagement', 'Cotton turbans with basic designs', 6000, 2, true, NOW(), NOW()),

-- Festival Celebration Package sub-categories
('750e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440003', 'Navratri Special', 'Colorful safas for Navratri', 4000, 1, true, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440003', 'Diwali Collection', 'Golden safas for Diwali', 6000, 2, true, NOW(), NOW()),

-- Groom Accessories Complete Set sub-categories
('750e8400-e29b-41d4-a716-446655440008', '650e8400-e29b-41d4-a716-446655440004', 'Complete Groom Kit', 'All accessories included', 15000, 1, true, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440009', '650e8400-e29b-41d4-a716-446655440004', 'Basic Accessories', 'Essential accessories only', 8000, 2, true, NOW(), NOW()),

-- Traditional Rajasthani Safas sub-categories
('750e8400-e29b-41d4-a716-446655440010', '650e8400-e29b-41d4-a716-446655440005', 'Mirror Work Special', 'Safas with intricate mirror work', 14000, 1, true, NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440011', '650e8400-e29b-41d4-a716-446655440005', 'Bandhani Print', 'Traditional bandhani printed safas', 8000, 2, true, NOW(), NOW());

-- Insert package variants with detailed pricing and inclusions
INSERT INTO package_variants (id, package_id, sub_package_id, variant_name, base_price, extra_cost_per_unit, included_items, notes, display_order, is_active, created_at, updated_at) VALUES
-- Maharaja Collection variants
('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'Gold Zardozi Safa', 30000, 2000, 'Safa, Kalgi, Necklace, Earrings, Kada', 'Hand-embroidered with real gold threads', 1, true, NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'Diamond Work Safa', 35000, 2500, 'Safa, Kalgi, Full Jewelry Set', 'With artificial diamonds and pearls', 2, true, NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'Royal Velvet Safa', 28000, 1800, 'Safa, Kalgi, Basic Jewelry', 'Premium velvet with gold embroidery', 3, true, NOW(), NOW()),

-- Royal Heritage variants
('850e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440002', 'Heritage Silk Safa', 20000, 1500, 'Safa, Kalgi, Necklace', 'Traditional silk with heritage patterns', 1, true, NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440002', 'Brocade Royal Safa', 22000, 1600, 'Safa, Kalgi, Earrings, Kada', 'Rich brocade with traditional motifs', 2, true, NOW(), NOW()),

-- Classic Wedding variants
('850e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440003', 'Standard Wedding Safa', 12000, 800, 'Safa, Basic Kalgi', 'Cotton silk with basic embroidery', 1, true, NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440003', 'Deluxe Wedding Safa', 15000, 1000, 'Safa, Kalgi, Necklace', 'Premium cotton silk with detailed work', 2, true, NOW(), NOW()),

-- Premium Engagement variants
('850e8400-e29b-41d4-a716-446655440008', '650e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440004', 'Silk Engagement Turban', 12000, 900, 'Turban, Kalgi, Brooch', 'Pure silk with embroidered patterns', 1, true, NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440009', '650e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440004', 'Designer Engagement Turban', 14000, 1100, 'Turban, Designer Kalgi, Jewelry Set', 'Designer patterns with modern touch', 2, true, NOW(), NOW()),

-- Standard Engagement variants
('850e8400-e29b-41d4-a716-446655440010', '650e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440005', 'Cotton Engagement Turban', 6000, 400, 'Turban, Simple Kalgi', 'Cotton with basic designs', 1, true, NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440011', '650e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440005', 'Printed Engagement Turban', 7000, 500, 'Turban, Kalgi, Pin', 'Printed cotton with decorative elements', 2, true, NOW(), NOW()),

-- Festival variants
('850e8400-e29b-41d4-a716-446655440012', '650e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440006', 'Navratri Colorful Safa', 4000, 200, 'Safa, Decorative Pin', 'Bright colors perfect for Navratri', 1, true, NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440013', '650e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440007', 'Diwali Golden Safa', 6000, 300, 'Safa, Golden Kalgi', 'Golden colors for Diwali celebrations', 1, true, NOW(), NOW()),

-- Accessories variants
('850e8400-e29b-41d4-a716-446655440014', '650e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440008', 'Complete Groom Package', 15000, 1200, 'Safa, Kalgi, Necklace, Earrings, Kada, Mojari, Dupatta', 'Everything needed for groom', 1, true, NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440015', '650e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440009', 'Basic Groom Kit', 8000, 600, 'Safa, Kalgi, Necklace', 'Essential accessories for groom', 1, true, NOW(), NOW()),

-- Rajasthani variants
('850e8400-e29b-41d4-a716-446655440016', '650e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440010', 'Mirror Work Rajasthani', 14000, 1000, 'Safa, Kalgi, Mirror Jewelry', 'Authentic Rajasthani mirror work', 1, true, NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440017', '650e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440011', 'Bandhani Print Safa', 8000, 600, 'Safa, Traditional Kalgi', 'Traditional bandhani printing', 1, true, NOW(), NOW());
