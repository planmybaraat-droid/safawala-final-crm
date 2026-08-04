-- ============================================================================
-- MASTER PRICING IMPORT SCRIPT - SIMPLIFIED
-- ============================================================================
-- This imports ONE SAMPLE of each type to verify everything works
-- Once verified, you can run the complete scripts
-- ============================================================================

DO $$
DECLARE
  v_franchise_id UUID := '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
  v_cat_21 UUID; v_cat_31 UUID; v_cat_41 UUID;
  v_var_id UUID; v_lvl_id UUID;
BEGIN

RAISE NOTICE '🚀 Starting pricing import...';

-- ============================================================================
-- STEP 1: Add missing columns (if not already added)
-- ============================================================================

ALTER TABLE package_variants ADD COLUMN IF NOT EXISTS extra_safa_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE package_variants ADD COLUMN IF NOT EXISTS missing_safa_penalty NUMERIC(10,2) DEFAULT 0;

RAISE NOTICE '✅ Columns verified/added';

-- ============================================================================
-- STEP 2: Create all 9 categories
-- ============================================================================

INSERT INTO packages_categories (name, description, franchise_id, is_active) VALUES
  ('21 Safas', 'Premium wedding safa collection for 21 people', v_franchise_id, true),
  ('31 Safas', 'Premium wedding safa collection for 31 people', v_franchise_id, true),
  ('41 Safas', 'Premium wedding safa collection for 41 people', v_franchise_id, true),
  ('51 Safas', 'Premium wedding safa collection for 51 people', v_franchise_id, true),
  ('61 Safas', 'Premium wedding safa collection for 61 people', v_franchise_id, true),
  ('71 Safas', 'Premium wedding safa collection for 71 people', v_franchise_id, true),
  ('81 Safas', 'Premium wedding safa collection for 81 people', v_franchise_id, true),
  ('91 Safas', 'Premium wedding safa collection for 91 people', v_franchise_id, true),
  ('101 Safas', 'Premium wedding safa collection for 101 people', v_franchise_id, true)
ON CONFLICT (name, franchise_id) DO UPDATE SET description = EXCLUDED.description;

RAISE NOTICE '✅ Created 9 categories';

-- ============================================================================
-- STEP 3: Get category IDs
-- ============================================================================

SELECT id INTO v_cat_21 FROM packages_categories WHERE name = '21 Safas' AND franchise_id = v_franchise_id;
SELECT id INTO v_cat_31 FROM packages_categories WHERE name = '31 Safas' AND franchise_id = v_franchise_id;
SELECT id INTO v_cat_41 FROM packages_categories WHERE name = '41 Safas' AND franchise_id = v_franchise_id;

-- ============================================================================
-- STEP 4: Import SAMPLE variants for 21 Safas (3 samples)
-- ============================================================================

-- Sample 1: Classic Style (Budget)
INSERT INTO package_variants (name, description, category_id, package_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_21, v_cat_21, 4000, 100, 450,
  ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included'], true)
RETURNING id INTO v_var_id;

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'Premium', 4000, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'VIP', 4500, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'VVIP', 5000, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

RAISE NOTICE '  ✅ Classic Style: ₹4,000-5,000 (Extra: ₹100, Missing: ₹450)';

-- Sample 2: Bollywood Styles (Mid-Range)
INSERT INTO package_variants (name, description, category_id, package_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Bollywood Styles', 'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery', v_cat_21, v_cat_21, 7000, 200, 650,
  ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa', 'Premium brooches', 'Jewellery'], true)
RETURNING id INTO v_var_id;

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'Premium', 7000, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'VIP', 7500, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'VVIP', 8000, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

RAISE NOTICE '  ✅ Bollywood Styles: ₹7,000-8,000 (Extra: ₹200, Missing: ₹650)';

-- Sample 3: Royal Heritage Special (Premium)
INSERT INTO package_variants (name, description, category_id, package_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Royal Heritage Special', 'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery', v_cat_21, v_cat_21, 12000, 450, 1150,
  ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Maharaja Safa', 'Premium jewellery'], true)
RETURNING id INTO v_var_id;

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'Premium', 12000, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'VIP', 12500, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'VVIP', 13000, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

RAISE NOTICE '  ✅ Royal Heritage Special: ₹12,000-13,000 (Extra: ₹450, Missing: ₹1,150)';

-- ============================================================================
-- STEP 5: Add samples for 31 Safas (showing price increase pattern)
-- ============================================================================

INSERT INTO package_variants (name, description, category_id, package_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_31, v_cat_31, 5000, 100, 450,
  ARRAY['Classic Style', '3 VIP Family Safas'], true)
RETURNING id INTO v_var_id;

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'Premium', 5000, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'VIP', 5500, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'VVIP', 6000, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

RAISE NOTICE '  ✅ 31 Safas - Classic Style: ₹5,000-6,000';

-- ============================================================================
-- STEP 6: Add sample for 41 Safas
-- ============================================================================

INSERT INTO package_variants (name, description, category_id, package_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_41, v_cat_41, 6000, 100, 450,
  ARRAY['Classic Style', '3 VIP Family Safas'], true)
RETURNING id INTO v_var_id;

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'Premium', 6000, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'VIP', 6500, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

INSERT INTO package_levels (variant_id, name, base_price, is_active) VALUES 
  (v_var_id, 'VVIP', 7000, true) RETURNING id INTO v_lvl_id;
INSERT INTO distance_pricing (package_level_id, min_distance_km, max_distance_km, additional_price, is_active) VALUES
  (v_lvl_id, 0, 10, 500, true), (v_lvl_id, 11, 50, 1000, true), (v_lvl_id, 51, 250, 2000, true),
  (v_lvl_id, 251, 500, 3000, true), (v_lvl_id, 501, 2000, 5000, true);

RAISE NOTICE '  ✅ 41 Safas - Classic Style: ₹6,000-7,000';

RAISE NOTICE '✅ IMPORT COMPLETE!';
RAISE NOTICE '📊 Created:';
RAISE NOTICE '   - 9 Categories (21, 31, 41, 51, 61, 71, 81, 91, 101 Safas)';
RAISE NOTICE '   - 5 Sample Variants (3 in 21 Safas, 1 in 31 Safas, 1 in 41 Safas)';
RAISE NOTICE '   - 15 Levels (3 per variant)';
RAISE NOTICE '   - 75 Distance Pricing Tiers (5 per level)';

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  c.name as category,
  v.name as variant,
  v.base_price as "Base Price",
  v.extra_safa_price as "Extra Safa (₹)",
  v.missing_safa_penalty as "Missing Penalty (₹)",
  l.name as level,
  l.base_price as "Level Price",
  COUNT(d.id) as "Distance Tiers"
FROM packages_categories c
JOIN package_variants v ON c.id = v.category_id
JOIN package_levels l ON v.id = l.variant_id
LEFT JOIN distance_pricing d ON l.id = d.package_level_id
WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
GROUP BY c.name, v.name, v.base_price, v.extra_safa_price, v.missing_safa_penalty, l.name, l.base_price
ORDER BY c.name, v.base_price, l.base_price;
