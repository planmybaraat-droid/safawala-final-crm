-- Create wedding safa packages based on provided specifications
-- Adding comprehensive wedding safa packages with detailed descriptions and pricing

INSERT INTO packages (
  name, 
  description, 
  base_price, 
  base_quantity, 
  extra_per_unit_price, 
  category, 
  is_active, 
  created_at, 
  updated_at
) VALUES 
-- Package 1: Basic VIP Family Package
(
  'Basic VIP Family Package',
  '51 safas including 3 VIP family safas (no groom safa included). Perfect for traditional wedding ceremonies with essential VIP treatment for family members.',
  12500.00,
  51,
  100.00,
  'wedding_safa',
  true,
  NOW(),
  NOW()
),

-- Package 2: Designer Groom Package
(
  'Designer Groom Package',
  '51 safas including 6 VIP family safas + 1 Groom designer safa. Enhanced package with designer groom safa and extended VIP family coverage.',
  13500.00,
  51,
  120.00,
  'wedding_safa',
  true,
  NOW(),
  NOW()
),

-- Package 3: Premium VIP Package
(
  'Premium VIP Package',
  '51 safas including 10 VIP + 1 expensive Groom safa with premium accessories. One of our most expensive branch offerings with luxury groom accessories.',
  16500.00,
  51,
  150.00,
  'wedding_safa',
  true,
  NOW(),
  NOW()
),

-- Package 4: Maharaja Elite Package
(
  'Maharaja Elite Package',
  '51 safas - All safas are VIP quality, family members receive VVIP safas, Groom gets MAHARAJA safa with expensive brooches and jewelry.',
  21500.00,
  51,
  200.00,
  'wedding_safa',
  true,
  NOW(),
  NOW()
),

-- Package 5: VVIP Themed Package
(
  'VVIP Themed Package',
  '51 safas - All safas are VVIP quality, family members receive themed safas, Groom gets MAHARAJA safa with expensive brooches and jewelry.',
  26500.00,
  51,
  250.00,
  'wedding_safa',
  true,
  NOW(),
  NOW()
),

-- Package 6: Premium VVIP Package
(
  'Premium VVIP Package',
  '51 safas - All safas are VVIP quality, family members receive themed safas, Groom gets MAHARAJA safa with expensive brooches and jewelry.',
  28500.00,
  51,
  300.00,
  'wedding_safa',
  true,
  NOW(),
  NOW()
),

-- Package 7: Luxury VVIP Package
(
  'Luxury VVIP Package',
  '51 safas - All safas are VVIP quality, family members receive themed safas, Groom gets MAHARAJA safa with expensive brooches and jewelry.',
  30500.00,
  51,
  350.00,
  'wedding_safa',
  true,
  NOW(),
  NOW()
),

-- Package 8: Ultimate VVIP Package
(
  'Ultimate VVIP Package',
  '51 safas - All safas are VVIP quality, family members receive themed safas, Groom gets MAHARAJA safa with expensive brooches and jewelry.',
  32500.00,
  51,
  400.00,
  'wedding_safa',
  true,
  NOW(),
  NOW()
),

-- Package 9: Tissue Silk Premium
(
  'Tissue Silk Premium (Darshan Ravals)',
  'Premium tissue silk wedding safa collection inspired by Darshan Ravals wedding style. Exclusive luxury offering for discerning clients.',
  35500.00,
  51,
  0.00,
  'wedding_safa',
  true,
  NOW(),
  NOW()
);

-- Create package features table to store detailed features for each package
CREATE TABLE IF NOT EXISTS package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  feature_name VARCHAR(255) NOT NULL,
  feature_description TEXT,
  is_highlighted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add features for each package
INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'VIP Family Safas', '3 VIP quality safas for family members', true
FROM packages p WHERE p.name = 'Basic VIP Family Package';

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'No Groom Safa', 'Groom safa not included in base package', false
FROM packages p WHERE p.name = 'Basic VIP Family Package';

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'VIP Family Safas', '6 VIP quality safas for family members', true
FROM packages p WHERE p.name = 'Designer Groom Package';

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'Designer Groom Safa', '1 Designer quality groom safa included', true
FROM packages p WHERE p.name = 'Designer Groom Package';

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'Premium VIP Safas', '10 VIP quality safas', true
FROM packages p WHERE p.name = 'Premium VIP Package';

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'Expensive Groom Safa', 'One of our most expensive groom safas with premium accessories', true
FROM packages p WHERE p.name = 'Premium VIP Package';

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'All VIP Quality', 'All 51 safas are VIP quality', true
FROM packages p WHERE p.name = 'Maharaja Elite Package';

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'VVIP Family Safas', 'Family members receive VVIP quality safas', true
FROM packages p WHERE p.name = 'Maharaja Elite Package';

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'Maharaja Groom Safa', 'Groom receives MAHARAJA safa with expensive brooches and jewelry', true
FROM packages p WHERE p.name = 'Maharaja Elite Package';

-- Add similar features for remaining packages
INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'All VVIP Quality', 'All 51 safas are VVIP quality', true
FROM packages p WHERE p.name IN ('VVIP Themed Package', 'Premium VVIP Package', 'Luxury VVIP Package', 'Ultimate VVIP Package');

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'Themed Family Safas', 'Family members receive themed safas', true
FROM packages p WHERE p.name IN ('VVIP Themed Package', 'Premium VVIP Package', 'Luxury VVIP Package', 'Ultimate VVIP Package');

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'Maharaja Groom Collection', 'Groom receives MAHARAJA safa with expensive brooches and jewelry', true
FROM packages p WHERE p.name IN ('VVIP Themed Package', 'Premium VVIP Package', 'Luxury VVIP Package', 'Ultimate VVIP Package');

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'Tissue Silk Premium', 'Exclusive tissue silk collection', true
FROM packages p WHERE p.name = 'Tissue Silk Premium (Darshan Ravals)';

INSERT INTO package_features (package_id, feature_name, feature_description, is_highlighted) 
SELECT p.id, 'Darshan Ravals Style', 'Inspired by celebrity wedding style', true
FROM packages p WHERE p.name = 'Tissue Silk Premium (Darshan Ravals)';
