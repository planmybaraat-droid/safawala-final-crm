-- Updated script name and comments from packages to sets
-- Demo data for Sets Management Module
-- This script creates sample sets, sub-categories, and variants with distance-based pricing from Alkapuri, Vadodara

-- Insert sample sets (main categories)
INSERT INTO packages (id, name, description, package_type, category, base_price, is_active, franchise_id, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Premium Wedding Set', 'Complete premium wedding turban and accessories collection', 'wedding_set', 'premium', 15000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440002', 'Classic Groom Set', 'Traditional groom turban with matching accessories', 'wedding_set', 'classic', 8000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440003', 'Royal Maharaja Set', 'Luxurious royal style turban collection', 'wedding_set', 'royal', 25000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440004', 'Designer Fusion Set', 'Modern fusion style wedding accessories', 'wedding_set', 'designer', 12000.00, true, null, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440005', 'Traditional Safa Set', 'Authentic traditional safa collection', 'wedding_set', 'traditional', 6000.00, true, null, '550e8400-e29b-41d4-a716-446655440000');

-- Insert sub-categories for each set
INSERT INTO package_sub_packages (package_id, name, description, base_price, display_order, is_active) VALUES
-- Premium Wedding Set sub-categories
('550e8400-e29b-41d4-a716-446655440001', 'Premium Turban Collection', 'High-quality silk and brocade turbans', 8000.00, 1, true),
('550e8400-e29b-41d4-a716-446655440001', 'Premium Accessories', 'Matching jewelry and decorative items', 4000.00, 2, true),
('550e8400-e29b-41d4-a716-446655440001', 'Premium Footwear', 'Designer wedding shoes and sandals', 3000.00, 3, true),

-- Classic Groom Set sub-categories  
('550e8400-e29b-41d4-a716-446655440002', 'Classic Turban Styles', 'Traditional turban designs', 4000.00, 1, true),
('550e8400-e29b-41d4-a716-446655440002', 'Classic Accessories', 'Traditional jewelry and ornaments', 2500.00, 2, true),
('550e8400-e29b-41d4-a716-446655440002', 'Classic Footwear', 'Traditional wedding footwear', 1500.00, 3, true),

-- Royal Maharaja Set sub-categories
('550e8400-e29b-41d4-a716-446655440003', 'Royal Turban Collection', 'Maharaja style luxury turbans', 15000.00, 1, true),
('550e8400-e29b-41d4-a716-446655440003', 'Royal Jewelry Set', 'Premium gold-plated accessories', 8000.00, 2, true),
('550e8400-e29b-41d4-a716-446655440003', 'Royal Footwear', 'Luxury designer wedding shoes', 2000.00, 3, true),

-- Designer Fusion Set sub-categories
('550e8400-e29b-41d4-a716-446655440004', 'Fusion Turban Styles', 'Modern contemporary designs', 6000.00, 1, true),
('550e8400-e29b-41d4-a716-446655440004', 'Designer Accessories', 'Contemporary jewelry pieces', 4000.00, 2, true),

-- Traditional Safa Set sub-categories
('550e8400-e29b-41d4-a716-446655440005', 'Traditional Safa Collection', 'Authentic regional safa styles', 3500.00, 1, true),
('550e8400-e29b-41d4-a716-446655440005', 'Traditional Ornaments', 'Classic decorative accessories', 2500.00, 2, true);

-- Distance-based pricing tiers from Alkapuri, Vadodara
INSERT INTO distance_pricing_tiers (tier_name, min_distance, max_distance, price_multiplier, base_location, is_active) VALUES
('Local Vadodara', 0, 15, 1.0, 'Alkapuri, Vadodara', true),
('Vadodara District', 16, 50, 1.15, 'Alkapuri, Vadodara', true),
('Gujarat State', 51, 150, 1.25, 'Alkapuri, Vadodara', true),
('Nearby States', 151, 300, 1.40, 'Alkapuri, Vadodara', true),
('Outside State', 301, 999999, 1.60, 'Alkapuri, Vadodara', true);
