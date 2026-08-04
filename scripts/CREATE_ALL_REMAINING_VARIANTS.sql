-- ============================================================================
-- CREATE ALL VARIANTS FOR REMAINING CATEGORIES (31-101 Safas)
-- ============================================================================
-- This creates 10 variants each for 8 categories = 80 variants total
-- Run this AFTER STEP_2_CREATE_VARIANTS.sql (21 Safas variants)
-- ============================================================================

DO $$
DECLARE
  v_franchise_id UUID := '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
  v_cat_id UUID;
  v_variant_count INT := 0;
BEGIN

RAISE NOTICE '🚀 Creating variants for categories 31-101 Safas...';

-- First, add the missing columns if they don't exist
ALTER TABLE package_variants ADD COLUMN IF NOT EXISTS extra_safa_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE package_variants ADD COLUMN IF NOT EXISTS missing_safa_penalty NUMERIC(10,2) DEFAULT 0;
ALTER TABLE package_variants ADD COLUMN IF NOT EXISTS franchise_id UUID;

-- ============================================================================
-- CATEGORY: 31 Safas (Base prices: +₹1,000 from 21 Safas)
-- ============================================================================

SELECT id INTO v_cat_id FROM packages_categories WHERE name = '31 Safas' AND franchise_id = v_franchise_id;

IF v_cat_id IS NULL THEN
  RAISE EXCEPTION 'Category "31 Safas" not found. Please run STEP_1_CREATE_CATEGORIES.sql first!';
END IF;

RAISE NOTICE '📦 Creating variants for: 31 Safas';

-- Variant 1: Classic Style
INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 1: Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_id, v_cat_id, v_franchise_id, 5000.00, 110.00, 470.00, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 2: Rajputana Rajwada Styles', 'Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa', v_cat_id, v_cat_id, v_franchise_id, 6000.00, 130.00, 520.00, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas', '1 Groom Designer Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 3: Floral Design', 'Floral Design, 10 VIP + 1 Groom Safa with premium accessories', v_cat_id, v_cat_id, v_franchise_id, 7000.00, 160.00, 570.00, ARRAY['Floral Design', '10 VIP Safas', '1 Groom Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 4: Bollywood Styles', 'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery', v_cat_id, v_cat_id, v_franchise_id, 8000.00, 210.00, 670.00, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa', 'Premium brooches', 'Jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 5: Adani''s Wedding Safa', 'Adani''s Wedding Safa, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 9000.00, 260.00, 720.00, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 6: Ram–Sita Wedding Shades', 'Ram–Sita Wedding Shades, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 10000.00, 310.00, 770.00, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 7: JJ Valaya Premium Silk', 'JJ Valaya Premium Silk (Lightweight), All VIP Safas, Brooch for all + Groom Maharaja Safa', v_cat_id, v_cat_id, v_franchise_id, 11000.00, 360.00, 970.00, ARRAY['JJ Valaya Premium Silk', 'All VIP Safas', 'Brooch for all'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 8: Tissue Silk Premium', 'Tissue Silk Premium (Lightweight), All VIP Safas, Brooch or Designer Lace for all', v_cat_id, v_cat_id, v_franchise_id, 12000.00, 410.00, 1070.00, ARRAY['Tissue Silk Premium', 'All VIP Safas', 'Designer accessories'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 9: Royal Heritage Special', 'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery', v_cat_id, v_cat_id, v_franchise_id, 13000.00, 460.00, 1170.00, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Maharaja Safa', 'Premium jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 10: Groom Maharaja Safa', 'Exclusive Groom Maharaja Safa with premium accessories and jewellery', v_cat_id, v_cat_id, v_franchise_id, 14000.00, 510.00, 1220.00, ARRAY['Groom Maharaja Safa', 'Premium accessories'], true);

v_variant_count := v_variant_count + 10;
RAISE NOTICE '  ✅ Created 10 variants for 31 Safas';

-- ============================================================================
-- CATEGORY: 41 Safas (Base prices: +₹2,000 from 21 Safas)
-- ============================================================================

SELECT id INTO v_cat_id FROM packages_categories WHERE name = '41 Safas' AND franchise_id = v_franchise_id;

RAISE NOTICE '📦 Creating variants for: 41 Safas';

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 1: Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_id, v_cat_id, v_franchise_id, 6000.00, 120.00, 490.00, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 2: Rajputana Rajwada Styles', 'Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa', v_cat_id, v_cat_id, v_franchise_id, 7000.00, 140.00, 540.00, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas', '1 Groom Designer Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 3: Floral Design', 'Floral Design, 10 VIP + 1 Groom Safa with premium accessories', v_cat_id, v_cat_id, v_franchise_id, 8000.00, 170.00, 590.00, ARRAY['Floral Design', '10 VIP Safas', '1 Groom Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 4: Bollywood Styles', 'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery', v_cat_id, v_cat_id, v_franchise_id, 9000.00, 220.00, 690.00, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa', 'Premium brooches', 'Jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 5: Adani''s Wedding Safa', 'Adani''s Wedding Safa, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 10000.00, 270.00, 740.00, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 6: Ram–Sita Wedding Shades', 'Ram–Sita Wedding Shades, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 11000.00, 320.00, 790.00, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 7: JJ Valaya Premium Silk', 'JJ Valaya Premium Silk (Lightweight), All VIP Safas, Brooch for all + Groom Maharaja Safa', v_cat_id, v_cat_id, v_franchise_id, 12000.00, 370.00, 990.00, ARRAY['JJ Valaya Premium Silk', 'All VIP Safas', 'Brooch for all'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 8: Tissue Silk Premium', 'Tissue Silk Premium (Lightweight), All VIP Safas, Brooch or Designer Lace for all', v_cat_id, v_cat_id, v_franchise_id, 13000.00, 420.00, 1090.00, ARRAY['Tissue Silk Premium', 'All VIP Safas', 'Designer accessories'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 9: Royal Heritage Special', 'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery', v_cat_id, v_cat_id, v_franchise_id, 14000.00, 470.00, 1190.00, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Maharaja Safa', 'Premium jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 10: Groom Maharaja Safa', 'Exclusive Groom Maharaja Safa with premium accessories and jewellery', v_cat_id, v_cat_id, v_franchise_id, 15000.00, 520.00, 1240.00, ARRAY['Groom Maharaja Safa', 'Premium accessories'], true);

v_variant_count := v_variant_count + 10;
RAISE NOTICE '  ✅ Created 10 variants for 41 Safas';

-- ============================================================================
-- CATEGORY: 51 Safas (Base prices: +₹3,000 from 21 Safas)
-- ============================================================================

SELECT id INTO v_cat_id FROM packages_categories WHERE name = '51 Safas' AND franchise_id = v_franchise_id;

RAISE NOTICE '📦 Creating variants for: 51 Safas';

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 1: Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_id, v_cat_id, v_franchise_id, 7000.00, 130.00, 510.00, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 2: Rajputana Rajwada Styles', 'Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa', v_cat_id, v_cat_id, v_franchise_id, 8000.00, 150.00, 560.00, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas', '1 Groom Designer Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 3: Floral Design', 'Floral Design, 10 VIP + 1 Groom Safa with premium accessories', v_cat_id, v_cat_id, v_franchise_id, 9000.00, 180.00, 610.00, ARRAY['Floral Design', '10 VIP Safas', '1 Groom Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 4: Bollywood Styles', 'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery', v_cat_id, v_cat_id, v_franchise_id, 10000.00, 230.00, 710.00, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa', 'Premium brooches', 'Jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 5: Adani''s Wedding Safa', 'Adani''s Wedding Safa, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 11000.00, 280.00, 760.00, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 6: Ram–Sita Wedding Shades', 'Ram–Sita Wedding Shades, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 12000.00, 330.00, 810.00, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 7: JJ Valaya Premium Silk', 'JJ Valaya Premium Silk (Lightweight), All VIP Safas, Brooch for all + Groom Maharaja Safa', v_cat_id, v_cat_id, v_franchise_id, 13000.00, 380.00, 1010.00, ARRAY['JJ Valaya Premium Silk', 'All VIP Safas', 'Brooch for all'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 8: Tissue Silk Premium', 'Tissue Silk Premium (Lightweight), All VIP Safas, Brooch or Designer Lace for all', v_cat_id, v_cat_id, v_franchise_id, 14000.00, 430.00, 1110.00, ARRAY['Tissue Silk Premium', 'All VIP Safas', 'Designer accessories'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 9: Royal Heritage Special', 'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery', v_cat_id, v_cat_id, v_franchise_id, 15000.00, 480.00, 1210.00, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Maharaja Safa', 'Premium jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 10: Groom Maharaja Safa', 'Exclusive Groom Maharaja Safa with premium accessories and jewellery', v_cat_id, v_cat_id, v_franchise_id, 16000.00, 530.00, 1260.00, ARRAY['Groom Maharaja Safa', 'Premium accessories'], true);

v_variant_count := v_variant_count + 10;
RAISE NOTICE '  ✅ Created 10 variants for 51 Safas';

-- ============================================================================
-- CATEGORY: 61 Safas (Base prices: +₹4,000 from 21 Safas)
-- ============================================================================

SELECT id INTO v_cat_id FROM packages_categories WHERE name = '61 Safas' AND franchise_id = v_franchise_id;

RAISE NOTICE '📦 Creating variants for: 61 Safas';

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 1: Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_id, v_cat_id, v_franchise_id, 8000.00, 140.00, 530.00, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 2: Rajputana Rajwada Styles', 'Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa', v_cat_id, v_cat_id, v_franchise_id, 9000.00, 160.00, 580.00, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas', '1 Groom Designer Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 3: Floral Design', 'Floral Design, 10 VIP + 1 Groom Safa with premium accessories', v_cat_id, v_cat_id, v_franchise_id, 10000.00, 190.00, 630.00, ARRAY['Floral Design', '10 VIP Safas', '1 Groom Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 4: Bollywood Styles', 'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery', v_cat_id, v_cat_id, v_franchise_id, 11000.00, 240.00, 730.00, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa', 'Premium brooches', 'Jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 5: Adani''s Wedding Safa', 'Adani''s Wedding Safa, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 12000.00, 290.00, 780.00, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 6: Ram–Sita Wedding Shades', 'Ram–Sita Wedding Shades, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 13000.00, 340.00, 830.00, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 7: JJ Valaya Premium Silk', 'JJ Valaya Premium Silk (Lightweight), All VIP Safas, Brooch for all + Groom Maharaja Safa', v_cat_id, v_cat_id, v_franchise_id, 14000.00, 390.00, 1030.00, ARRAY['JJ Valaya Premium Silk', 'All VIP Safas', 'Brooch for all'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 8: Tissue Silk Premium', 'Tissue Silk Premium (Lightweight), All VIP Safas, Brooch or Designer Lace for all', v_cat_id, v_cat_id, v_franchise_id, 15000.00, 440.00, 1130.00, ARRAY['Tissue Silk Premium', 'All VIP Safas', 'Designer accessories'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 9: Royal Heritage Special', 'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery', v_cat_id, v_cat_id, v_franchise_id, 16000.00, 490.00, 1230.00, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Maharaja Safa', 'Premium jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 10: Groom Maharaja Safa', 'Exclusive Groom Maharaja Safa with premium accessories and jewellery', v_cat_id, v_cat_id, v_franchise_id, 17000.00, 540.00, 1280.00, ARRAY['Groom Maharaja Safa', 'Premium accessories'], true);

v_variant_count := v_variant_count + 10;
RAISE NOTICE '  ✅ Created 10 variants for 61 Safas';

-- ============================================================================
-- CATEGORY: 71 Safas (Base prices: +₹5,000 from 21 Safas)
-- ============================================================================

SELECT id INTO v_cat_id FROM packages_categories WHERE name = '71 Safas' AND franchise_id = v_franchise_id;

RAISE NOTICE '📦 Creating variants for: 71 Safas';

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 1: Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_id, v_cat_id, v_franchise_id, 9000.00, 150.00, 550.00, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 2: Rajputana Rajwada Styles', 'Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa', v_cat_id, v_cat_id, v_franchise_id, 10000.00, 170.00, 600.00, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas', '1 Groom Designer Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 3: Floral Design', 'Floral Design, 10 VIP + 1 Groom Safa with premium accessories', v_cat_id, v_cat_id, v_franchise_id, 11000.00, 200.00, 650.00, ARRAY['Floral Design', '10 VIP Safas', '1 Groom Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 4: Bollywood Styles', 'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery', v_cat_id, v_cat_id, v_franchise_id, 12000.00, 250.00, 750.00, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa', 'Premium brooches', 'Jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 5: Adani''s Wedding Safa', 'Adani''s Wedding Safa, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 13000.00, 300.00, 800.00, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 6: Ram–Sita Wedding Shades', 'Ram–Sita Wedding Shades, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 14000.00, 350.00, 850.00, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 7: JJ Valaya Premium Silk', 'JJ Valaya Premium Silk (Lightweight), All VIP Safas, Brooch for all + Groom Maharaja Safa', v_cat_id, v_cat_id, v_franchise_id, 15000.00, 400.00, 1050.00, ARRAY['JJ Valaya Premium Silk', 'All VIP Safas', 'Brooch for all'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 8: Tissue Silk Premium', 'Tissue Silk Premium (Lightweight), All VIP Safas, Brooch or Designer Lace for all', v_cat_id, v_cat_id, v_franchise_id, 16000.00, 450.00, 1150.00, ARRAY['Tissue Silk Premium', 'All VIP Safas', 'Designer accessories'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 9: Royal Heritage Special', 'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery', v_cat_id, v_cat_id, v_franchise_id, 17000.00, 500.00, 1250.00, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Maharaja Safa', 'Premium jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 10: Groom Maharaja Safa', 'Exclusive Groom Maharaja Safa with premium accessories and jewellery', v_cat_id, v_cat_id, v_franchise_id, 18000.00, 550.00, 1300.00, ARRAY['Groom Maharaja Safa', 'Premium accessories'], true);

v_variant_count := v_variant_count + 10;
RAISE NOTICE '  ✅ Created 10 variants for 71 Safas';

-- ============================================================================
-- CATEGORY: 81 Safas (Base prices: +₹6,000 from 21 Safas)
-- ============================================================================

SELECT id INTO v_cat_id FROM packages_categories WHERE name = '81 Safas' AND franchise_id = v_franchise_id;

RAISE NOTICE '📦 Creating variants for: 81 Safas';

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 1: Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_id, v_cat_id, v_franchise_id, 10000.00, 160.00, 570.00, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 2: Rajputana Rajwada Styles', 'Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa', v_cat_id, v_cat_id, v_franchise_id, 11000.00, 180.00, 620.00, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas', '1 Groom Designer Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 3: Floral Design', 'Floral Design, 10 VIP + 1 Groom Safa with premium accessories', v_cat_id, v_cat_id, v_franchise_id, 12000.00, 210.00, 670.00, ARRAY['Floral Design', '10 VIP Safas', '1 Groom Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 4: Bollywood Styles', 'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery', v_cat_id, v_cat_id, v_franchise_id, 13000.00, 260.00, 770.00, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa', 'Premium brooches', 'Jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 5: Adani''s Wedding Safa', 'Adani''s Wedding Safa, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 14000.00, 310.00, 820.00, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 6: Ram–Sita Wedding Shades', 'Ram–Sita Wedding Shades, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 15000.00, 360.00, 870.00, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 7: JJ Valaya Premium Silk', 'JJ Valaya Premium Silk (Lightweight), All VIP Safas, Brooch for all + Groom Maharaja Safa', v_cat_id, v_cat_id, v_franchise_id, 16000.00, 410.00, 1070.00, ARRAY['JJ Valaya Premium Silk', 'All VIP Safas', 'Brooch for all'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 8: Tissue Silk Premium', 'Tissue Silk Premium (Lightweight), All VIP Safas, Brooch or Designer Lace for all', v_cat_id, v_cat_id, v_franchise_id, 17000.00, 460.00, 1170.00, ARRAY['Tissue Silk Premium', 'All VIP Safas', 'Designer accessories'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 9: Royal Heritage Special', 'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery', v_cat_id, v_cat_id, v_franchise_id, 18000.00, 510.00, 1270.00, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Maharaja Safa', 'Premium jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 10: Groom Maharaja Safa', 'Exclusive Groom Maharaja Safa with premium accessories and jewellery', v_cat_id, v_cat_id, v_franchise_id, 19000.00, 560.00, 1320.00, ARRAY['Groom Maharaja Safa', 'Premium accessories'], true);

v_variant_count := v_variant_count + 10;
RAISE NOTICE '  ✅ Created 10 variants for 81 Safas';

-- ============================================================================
-- CATEGORY: 91 Safas (Base prices: +₹7,000 from 21 Safas)
-- ============================================================================

SELECT id INTO v_cat_id FROM packages_categories WHERE name = '91 Safas' AND franchise_id = v_franchise_id;

RAISE NOTICE '📦 Creating variants for: 91 Safas';

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 1: Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_id, v_cat_id, v_franchise_id, 11000.00, 170.00, 590.00, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 2: Rajputana Rajwada Styles', 'Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa', v_cat_id, v_cat_id, v_franchise_id, 12000.00, 190.00, 640.00, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas', '1 Groom Designer Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 3: Floral Design', 'Floral Design, 10 VIP + 1 Groom Safa with premium accessories', v_cat_id, v_cat_id, v_franchise_id, 13000.00, 220.00, 690.00, ARRAY['Floral Design', '10 VIP Safas', '1 Groom Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 4: Bollywood Styles', 'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery', v_cat_id, v_cat_id, v_franchise_id, 14000.00, 270.00, 790.00, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa', 'Premium brooches', 'Jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 5: Adani''s Wedding Safa', 'Adani''s Wedding Safa, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 15000.00, 320.00, 840.00, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 6: Ram–Sita Wedding Shades', 'Ram–Sita Wedding Shades, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 16000.00, 370.00, 890.00, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 7: JJ Valaya Premium Silk', 'JJ Valaya Premium Silk (Lightweight), All VIP Safas, Brooch for all + Groom Maharaja Safa', v_cat_id, v_cat_id, v_franchise_id, 17000.00, 420.00, 1090.00, ARRAY['JJ Valaya Premium Silk', 'All VIP Safas', 'Brooch for all'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 8: Tissue Silk Premium', 'Tissue Silk Premium (Lightweight), All VIP Safas, Brooch or Designer Lace for all', v_cat_id, v_cat_id, v_franchise_id, 18000.00, 470.00, 1190.00, ARRAY['Tissue Silk Premium', 'All VIP Safas', 'Designer accessories'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 9: Royal Heritage Special', 'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery', v_cat_id, v_cat_id, v_franchise_id, 19000.00, 520.00, 1290.00, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Maharaja Safa', 'Premium jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 10: Groom Maharaja Safa', 'Exclusive Groom Maharaja Safa with premium accessories and jewellery', v_cat_id, v_cat_id, v_franchise_id, 20000.00, 570.00, 1340.00, ARRAY['Groom Maharaja Safa', 'Premium accessories'], true);

v_variant_count := v_variant_count + 10;
RAISE NOTICE '  ✅ Created 10 variants for 91 Safas';

-- ============================================================================
-- CATEGORY: 101 Safas (Base prices: +₹8,000 from 21 Safas)
-- ============================================================================

SELECT id INTO v_cat_id FROM packages_categories WHERE name = '101 Safas' AND franchise_id = v_franchise_id;

RAISE NOTICE '📦 Creating variants for: 101 Safas';

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 1: Classic Style', 'Classic Style, 3 VIP Family Safas, Groom Safa not included', v_cat_id, v_cat_id, v_franchise_id, 12000.00, 180.00, 610.00, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 2: Rajputana Rajwada Styles', 'Rajputana Rajwada Styles, 6 VIP Family Safas + 1 Groom Designer Safa', v_cat_id, v_cat_id, v_franchise_id, 13000.00, 200.00, 660.00, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas', '1 Groom Designer Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 3: Floral Design', 'Floral Design, 10 VIP + 1 Groom Safa with premium accessories', v_cat_id, v_cat_id, v_franchise_id, 14000.00, 230.00, 710.00, ARRAY['Floral Design', '10 VIP Safas', '1 Groom Safa'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 4: Bollywood Styles', 'Bollywood Styles, All VIP Safas, Groom Maharaja Safa with premium brooches & jewellery', v_cat_id, v_cat_id, v_franchise_id, 15000.00, 280.00, 810.00, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa', 'Premium brooches', 'Jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 5: Adani''s Wedding Safa', 'Adani''s Wedding Safa, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 16000.00, 330.00, 860.00, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 6: Ram–Sita Wedding Shades', 'Ram–Sita Wedding Shades, 5 VVIP Family Safas, Premium Maharaja Groom Safa', v_cat_id, v_cat_id, v_franchise_id, 17000.00, 380.00, 910.00, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 7: JJ Valaya Premium Silk', 'JJ Valaya Premium Silk (Lightweight), All VIP Safas, Brooch for all + Groom Maharaja Safa', v_cat_id, v_cat_id, v_franchise_id, 18000.00, 430.00, 1110.00, ARRAY['JJ Valaya Premium Silk', 'All VIP Safas', 'Brooch for all'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 8: Tissue Silk Premium', 'Tissue Silk Premium (Lightweight), All VIP Safas, Brooch or Designer Lace for all', v_cat_id, v_cat_id, v_franchise_id, 19000.00, 480.00, 1210.00, ARRAY['Tissue Silk Premium', 'All VIP Safas', 'Designer accessories'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 9: Royal Heritage Special', 'Royal Heritage Special, All VVIP Theme Safas, Groom Maharaja Safa with premium jewellery', v_cat_id, v_cat_id, v_franchise_id, 20000.00, 530.00, 1310.00, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Maharaja Safa', 'Premium jewellery'], true);

INSERT INTO package_variants (name, description, category_id, package_id, franchise_id, base_price, extra_safa_price, missing_safa_penalty, inclusions, is_active)
VALUES ('Package 10: Groom Maharaja Safa', 'Exclusive Groom Maharaja Safa with premium accessories and jewellery', v_cat_id, v_cat_id, v_franchise_id, 21000.00, 580.00, 1360.00, ARRAY['Groom Maharaja Safa', 'Premium accessories'], true);

v_variant_count := v_variant_count + 10;
RAISE NOTICE '  ✅ Created 10 variants for 101 Safas';

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

RAISE NOTICE '🎉 SUCCESS: Created % variants across 8 categories (31-101 Safas)', v_variant_count;
RAISE NOTICE 'Total variants now: % (10 from 21 Safas + % from remaining categories)', v_variant_count + 10, v_variant_count;
RAISE NOTICE 'Next step: Run STEP_3_CREATE_LEVELS.sql to create levels for all variants';

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this separately to verify the data

SELECT 
  c.name as category,
  COUNT(v.id) as variant_count,
  MIN(v.base_price) as min_price,
  MAX(v.base_price) as max_price
FROM packages_categories c
LEFT JOIN package_variants v ON c.id = v.category_id
WHERE c.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
GROUP BY c.name
ORDER BY c.name;
