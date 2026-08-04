-- Create 10 demo packages for wedding turban & accessories CRM
-- Adding 10 demo packages with wedding-related names and categories

INSERT INTO packages (
  id,
  name,
  description,
  package_type,
  category,
  base_price,
  is_active,
  franchise_id,
  created_by,
  created_at,
  updated_at
) VALUES
-- Royal Wedding Collection
(
  gen_random_uuid(),
  'Royal Maharaja Set',
  'Premium wedding turban set with golden embroidery and matching accessories',
  'premium',
  'Royal Collection',
  15000.00,
  true,
  null,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  NOW()
),
-- Traditional Sets
(
  gen_random_uuid(),
  'Classic Rajasthani Set',
  'Traditional Rajasthani style turban with colorful bandhani patterns',
  'standard',
  'Traditional',
  8500.00,
  true,
  null,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Punjabi Pagri Collection',
  'Authentic Punjabi pagri with matching kalgi and accessories',
  'standard',
  'Traditional',
  7200.00,
  true,
  null,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  NOW()
),
-- Designer Collections
(
  gen_random_uuid(),
  'Designer Silk Turban',
  'Contemporary silk turban with modern embellishments and crystals',
  'premium',
  'Designer',
  12000.00,
  true,
  null,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Velvet Royal Set',
  'Luxurious velvet turban with gold thread work and pearl details',
  'premium',
  'Royal Collection',
  18000.00,
  true,
  null,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  NOW()
),
-- Budget-Friendly Options
(
  gen_random_uuid(),
  'Simple Elegance Set',
  'Elegant yet affordable turban set perfect for intimate ceremonies',
  'basic',
  'Budget',
  4500.00,
  true,
  null,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Cotton Comfort Set',
  'Comfortable cotton turban ideal for long ceremonies and summer weddings',
  'basic',
  'Budget',
  3200.00,
  true,
  null,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  NOW()
),
-- Specialty Sets
(
  gen_random_uuid(),
  'Groom Special Deluxe',
  'Complete groom package with turban, sehra, kalgi, and matching accessories',
  'premium',
  'Groom Special',
  22000.00,
  true,
  null,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Destination Wedding Set',
  'Lightweight travel-friendly turban set perfect for destination weddings',
  'standard',
  'Travel',
  9500.00,
  true,
  null,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Heritage Banarasi Set',
  'Traditional Banarasi silk turban with intricate weaving and gold borders',
  'premium',
  'Heritage',
  16500.00,
  true,
  null,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NOW(),
  NOW()
);

-- Verify the insertion
SELECT COUNT(*) as total_packages FROM packages;
SELECT name, category, base_price FROM packages ORDER BY base_price DESC;
