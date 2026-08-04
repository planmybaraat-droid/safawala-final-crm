-- Create the 9 predefined safa packages
-- Each package represents a different quantity of safas (21, 31, 41, 51, 61, 71, 81, 91, 101)

INSERT INTO packages (id, name, description, package_type, category, base_price, franchise_id, created_by, is_active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '21 Safas Package', 'Wedding safa package for 21 people', 'safa', 'wedding', 2100.00, NULL, NULL, true, NOW(), NOW()),
  (gen_random_uuid(), '31 Safas Package', 'Wedding safa package for 31 people', 'safa', 'wedding', 3100.00, NULL, NULL, true, NOW(), NOW()),
  (gen_random_uuid(), '41 Safas Package', 'Wedding safa package for 41 people', 'safa', 'wedding', 4100.00, NULL, NULL, true, NOW(), NOW()),
  (gen_random_uuid(), '51 Safas Package', 'Wedding safa package for 51 people', 'safa', 'wedding', 5100.00, NULL, NULL, true, NOW(), NOW()),
  (gen_random_uuid(), '61 Safas Package', 'Wedding safa package for 61 people', 'safa', 'wedding', 6100.00, NULL, NULL, true, NOW(), NOW()),
  (gen_random_uuid(), '71 Safas Package', 'Wedding safa package for 71 people', 'safa', 'wedding', 7100.00, NULL, NULL, true, NOW(), NOW()),
  (gen_random_uuid(), '81 Safas Package', 'Wedding safa package for 81 people', 'safa', 'wedding', 8100.00, NULL, NULL, true, NOW(), NOW()),
  (gen_random_uuid(), '91 Safas Package', 'Wedding safa package for 91 people', 'safa', 'wedding', 9100.00, NULL, NULL, true, NOW(), NOW()),
  (gen_random_uuid(), '101 Safas Package', 'Wedding safa package for 101 people', 'safa', 'wedding', 10100.00, NULL, NULL, true, NOW(), NOW());

-- Create sample variants for each package (9 variants per package)
-- This creates a template structure that can be customized

DO $$
DECLARE
    package_record RECORD;
    variant_names TEXT[] := ARRAY[
        'Basic Variant', 'Standard Variant', 'Premium Variant', 
        'Deluxe Variant', 'Royal Variant', 'VIP Variant', 
        'VVIP Variant', 'Maharaja Variant', 'Designer Variant'
    ];
    variant_name TEXT;
    i INTEGER;
BEGIN
    -- Loop through each package
    FOR package_record IN 
        SELECT id, name FROM packages WHERE package_type = 'safa'
    LOOP
        -- Create 9 variants for each package
        FOR i IN 1..9 LOOP
            variant_name := variant_names[i];
            
            INSERT INTO package_variants (
                id, package_id, variant_name, base_price, extra_cost_per_unit, 
                included_items, notes, display_order, is_active, created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                package_record.id,
                variant_name,
                1000.00 + (i * 500), -- Base price increases with variant level
                50.00 + (i * 25),    -- Extra cost per safa increases with variant level
                'Standard items included for ' || variant_name,
                'Notes for ' || variant_name || ' of ' || package_record.name,
                i,
                true,
                NOW(),
                NOW()
            );
        END LOOP;
    END LOOP;
END $$;

-- Create some sample package features for the safa packages
INSERT INTO package_features (id, package_id, feature_name, feature_description, is_included, additional_cost, display_order, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    'Premium Fabric',
    'High-quality silk and cotton blend fabric',
    true,
    0.00,
    1,
    NOW(),
    NOW()
FROM packages p WHERE p.package_type = 'safa'

UNION ALL

SELECT 
    gen_random_uuid(),
    p.id,
    'Custom Embroidery',
    'Personalized embroidery with family name or initials',
    false,
    500.00,
    2,
    NOW(),
    NOW()
FROM packages p WHERE p.package_type = 'safa'

UNION ALL

SELECT 
    gen_random_uuid(),
    p.id,
    'Matching Accessories',
    'Coordinated kalgi, necklace, and other accessories',
    true,
    0.00,
    3,
    NOW(),
    NOW()
FROM packages p WHERE p.package_type = 'safa';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_packages_type_category ON packages(package_type, category);
CREATE INDEX IF NOT EXISTS idx_package_variants_package_id ON package_variants(package_id);
CREATE INDEX IF NOT EXISTS idx_package_variants_display_order ON package_variants(display_order);
CREATE INDEX IF NOT EXISTS idx_package_features_package_id ON package_features(package_id);
