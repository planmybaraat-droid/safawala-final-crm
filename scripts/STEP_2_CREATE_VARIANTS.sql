-- ============================================================================
-- STEP 2: Create ALL Variants for 21 Safas Category
-- ============================================================================
-- This creates all 10 variants for "21 Safas" category with pricing fields
-- ============================================================================

DO $$
DECLARE
  v_franchise_id UUID := '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
  v_cat_21 UUID;
BEGIN

RAISE NOTICE '🚀 Creating variants...';

-- First, add the missing columns if they don't exist
ALTER TABLE package_variants ADD COLUMN IF NOT EXISTS extra_safa_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE package_variants ADD COLUMN IF NOT EXISTS missing_safa_penalty NUMERIC(10,2) DEFAULT 0;
ALTER TABLE package_variants ADD COLUMN IF NOT EXISTS franchise_id UUID;

RAISE NOTICE '✅ Columns verified';

-- Get the 21 Safas category ID
SELECT id INTO v_cat_21 FROM packages_categories WHERE name = '21 Safas' AND franchise_id = v_franchise_id;

IF v_cat_21 IS NULL THEN
  RAISE EXCEPTION 'Category "21 Safas" not found. Please run STEP_1_CREATE_CATEGORIES.sql first!';
END IF;

RAISE NOTICE 'Found category: 21 Safas (ID: %)', v_cat_21;

-- Variant 1: Package 1: Classic Style
INSERT INTO package_variants (
  name, 
  description, 
  category_id, 
  package_id, 
  franchise_id,
  base_price, 
  extra_safa_price, 
  missing_safa_penalty, 
  inclusions, 
  is_active
)
VALUES (
  'Package 1: Classic Style',
  'Classic Style, 3 VIP Family Safas, Groom Safa not included',
  v_cat_21,
  v_cat_21,
  v_franchise_id,
  4000.00,
  100.00,
  450.00,
  ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included'],
  true
);

RAISE NOTICE '  ✅ Created: Classic Style (₹4,000)';

-- Variant 2: Package 2: Rajputana Rajwada Styles
INSERT INTO package_variants (
  name, 
  description, 
  category_id, 
  package_id, 
  franchise_id,
  base_price, 
  extra_safa_price, 
  missing_safa_penalty, 
  inclusions, 
  is_active
)
VALUES (
  'Package 2: Rajputana Rajwada Styles',
  'Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa',
  v_cat_21,
  v_cat_21,
  v_franchise_id,
  5000.00,
  120.00,
  500.00,
  ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas', '1 Groom Designer Safa'],
  true
);

RAISE NOTICE '  ✅ Created: Rajputana Rajwada Styles (₹5,000)';

-- Variant 3: Package 3: Floral Design
INSERT INTO package_variants (
  name, 
  description, 
  category_id, 
  package_id, 
  franchise_id,
  base_price, 
  extra_safa_price, 
  missing_safa_penalty, 
  inclusions, 
  is_active
)
VALUES (
  'Package 3: Floral Design',
  'Floral Design, 10 VIP + 1 Groom Safa with premium accessories',
  v_cat_21,
  v_cat_21,
  v_franchise_id,
  6000.00,
  150.00,
  550.00,
  ARRAY['Floral Design', '10 VIP Safas', '1 Groom Safa'],
  true
);

RAISE NOTICE '  ✅ Created: Floral Design (₹6,000)';

-- Variant 4: Package 4: Bollywood Styles
INSERT INTO package_variants (
  name, 
  description, 
  category_id, 
  package_id, 
  franchise_id,
  base_price, 
  extra_safa_price, 
  missing_safa_penalty, 
  inclusions, 
  is_active
)
VALUES (
  'Package 4: Bollywood Styles',
  'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery',
  v_cat_21,
  v_cat_21,
  v_franchise_id,
  7000.00,
  200.00,
  650.00,
  ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa', 'Premium brooches', 'Jewellery'],
  true
);

RAISE NOTICE '  ✅ Created: Bollywood Styles (₹7,000)';

-- Variant 5: Package 5: Adani's Wedding Safa
INSERT INTO package_variants (
  name, 
  description, 
  category_id, 
  package_id, 
  franchise_id,
  base_price, 
  extra_safa_price, 
  missing_safa_penalty, 
  inclusions, 
  is_active
)
VALUES (
  'Package 5: Adani''s Wedding Safa',
  'Adani''s Wedding Safa, 5 VVIP Family Safas, Premium Maharaja Groom Safa',
  v_cat_21,
  v_cat_21,
  v_franchise_id,
  8000.00,
  250.00,
  700.00,
  ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas'],
  true
);

RAISE NOTICE '  ✅ Created: Adani''s Wedding Safa (₹8,000)';

-- Variant 6: Package 6: Ram–Sita Wedding Shades
INSERT INTO package_variants (
  name, 
  description, 
  category_id, 
  package_id, 
  franchise_id,
  base_price, 
  extra_safa_price, 
  missing_safa_penalty, 
  inclusions, 
  is_active
)
VALUES (
  'Package 6: Ram–Sita Wedding Shades',
  'Ram–Sita Wedding Shades, 5 VVIP Family Safas, Premium Maharaja Groom Safa',
  v_cat_21,
  v_cat_21,
  v_franchise_id,
  9000.00,
  300.00,
  750.00,
  ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas'],
  true
);

RAISE NOTICE '  ✅ Created: Ram–Sita Wedding Shades (₹9,000)';

-- Variant 7: Package 7: JJ Valaya Premium Silk
INSERT INTO package_variants (
  name, 
  description, 
  category_id, 
  package_id, 
  franchise_id,
  base_price, 
  extra_safa_price, 
  missing_safa_penalty, 
  inclusions, 
  is_active
)
VALUES (
  'Package 7: JJ Valaya Premium Silk',
  'JJ Valaya Premium Silk (Lightweight), All VIP Safas, Brooch for all + Groom Maharaja Safa',
  v_cat_21,
  v_cat_21,
  v_franchise_id,
  10000.00,
  350.00,
  950.00,
  ARRAY['JJ Valaya Premium Silk', 'All VIP Safas', 'Brooch for all'],
  true
);

RAISE NOTICE '  ✅ Created: JJ Valaya Premium Silk (₹10,000)';

-- Variant 8: Package 8: Tissue Silk Premium
INSERT INTO package_variants (
  name, 
  description, 
  category_id, 
  package_id, 
  franchise_id,
  base_price, 
  extra_safa_price, 
  missing_safa_penalty, 
  inclusions, 
  is_active
)
VALUES (
  'Package 8: Tissue Silk Premium',
  'Tissue Silk Premium (Lightweight), All VIP Safas, Brooch or Designer Lace for all',
  v_cat_21,
  v_cat_21,
  v_franchise_id,
  11000.00,
  400.00,
  1050.00,
  ARRAY['Tissue Silk Premium', 'All VIP Safas', 'Designer accessories'],
  true
);

RAISE NOTICE '  ✅ Created: Tissue Silk Premium (₹11,000)';

-- Variant 9: Package 9: Royal Heritage Special
INSERT INTO package_variants (
  name, 
  description, 
  category_id, 
  package_id, 
  franchise_id,
  base_price, 
  extra_safa_price, 
  missing_safa_penalty, 
  inclusions, 
  is_active
)
VALUES (
  'Package 9: Royal Heritage Special',
  'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery',
  v_cat_21,
  v_cat_21,
  v_franchise_id,
  12000.00,
  450.00,
  1150.00,
  ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Maharaja Safa', 'Premium jewellery'],
  true
);

RAISE NOTICE '  ✅ Created: Royal Heritage Special (₹12,000)';

-- Variant 10: Package 10: Groom Maharaja Safa
INSERT INTO package_variants (
  name, 
  description, 
  category_id, 
  package_id, 
  franchise_id,
  base_price, 
  extra_safa_price, 
  missing_safa_penalty, 
  inclusions, 
  is_active
)
VALUES (
  'Package 10: Groom Maharaja Safa',
  'Exclusive Groom Maharaja Safa with premium accessories and jewellery',
  v_cat_21,
  v_cat_21,
  v_franchise_id,
  13000.00,
  500.00,
  1200.00,
  ARRAY['Groom Maharaja Safa', 'Premium accessories'],
  true
);

RAISE NOTICE '  ✅ Created: Groom Maharaja Safa (₹13,000)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

RAISE NOTICE '🎉 SUCCESS: Created 10 variants for "21 Safas" category';
RAISE NOTICE 'Next step: Run STEP_3_CREATE_LEVELS.sql';

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this separately to verify the data

SELECT 
  v.id,
  v.name,
  v.base_price,
  v.extra_safa_price,
  v.missing_safa_penalty,
  c.name as category
FROM package_variants v
JOIN packages_categories c ON v.category_id = c.id
WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
ORDER BY v.base_price;
