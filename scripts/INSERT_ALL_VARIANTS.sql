-- ============================================
-- INSERT ALL 81 VARIANTS (9 categories × 9 packages each)
-- ============================================
-- Based on official pricing table
-- Franchise: Surat Branch (1a518dde-85b7-44ef-8bc4-092f53ddfd99)
-- ============================================

BEGIN;

-- First, delete any existing variants to avoid duplicates
DELETE FROM package_variants WHERE category_id IN (
  '364aa455-ed12-445f-bcd7-c5ab72bdccfa',
  '9317fd0c-1fde-4059-bddc-a1f521bcee7c',
  '129ab88b-e0b4-4888-8b86-eae5b50de6e4',
  '9afbe91c-bf12-40da-87e3-f8ed24d308ad',
  'e64fdad9-1533-4fe0-983c-fa54699ecb06',
  '4977b43d-0060-4ee6-b2c1-864efd75cc06',
  'fa925944-5990-4bd9-bd69-ed723635d776',
  'fd3e4497-8cdc-4453-8fe7-fbc1ab927292',
  'a9d6fab7-8044-4e84-802c-729fdf9890ab'
);

-- 21 Safas (364aa455-ed12-445f-bcd7-c5ab72bdccfa) - 9 packages
INSERT INTO package_variants (category_id, package_id, name, base_price, extra_safa_price, missing_safa_penalty, franchise_id, is_active, inclusions) VALUES
('364aa455-ed12-445f-bcd7-c5ab72bdccfa', '364aa455-ed12-445f-bcd7-c5ab72bdccfa', 'Package 1: Classic Style', 4000, 100, 450, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included']),
('364aa455-ed12-445f-bcd7-c5ab72bdccfa', '364aa455-ed12-445f-bcd7-c5ab72bdccfa', 'Package 2: Rajputana Rajwada Styles', 5000, 120, 500, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas + 1 Groom Designer Safa']),
('364aa455-ed12-445f-bcd7-c5ab72bdccfa', '364aa455-ed12-445f-bcd7-c5ab72bdccfa', 'Package 3: Floral Design', 6000, 150, 550, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Floral Design', '10 VIP + 1 Groom Safa with premium accessories']),
('364aa455-ed12-445f-bcd7-c5ab72bdccfa', '364aa455-ed12-445f-bcd7-c5ab72bdccfa', 'Package 4: Bollywood Styles', 7000, 200, 650, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa with premium brooches & jewellery']),
('364aa455-ed12-445f-bcd7-c5ab72bdccfa', '364aa455-ed12-445f-bcd7-c5ab72bdccfa', 'Package 5: Adani''s Wedding Safa', 8000, 250, 700, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('364aa455-ed12-445f-bcd7-c5ab72bdccfa', '364aa455-ed12-445f-bcd7-c5ab72bdccfa', 'Package 6: Ram–Sita Wedding Shades', 9000, 300, 750, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('364aa455-ed12-445f-bcd7-c5ab72bdccfa', '364aa455-ed12-445f-bcd7-c5ab72bdccfa', 'Package 7: JJ Valaya Premium Silk (Lightweight)', 10000, 350, 950, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['JJ Valaya Premium Silk (Lightweight)', 'All VIP + Brooch for all + Groom Safa']),
('364aa455-ed12-445f-bcd7-c5ab72bdccfa', '364aa455-ed12-445f-bcd7-c5ab72bdccfa', 'Package 8: Tissue Silk Premium (Lightweight)', 11000, 400, 1050, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Tissue Silk Premium (Lightweight)', 'All VIP + Brooch or Lace + Groom Safa']),
('364aa455-ed12-445f-bcd7-c5ab72bdccfa', '364aa455-ed12-445f-bcd7-c5ab72bdccfa', 'Package 9: Royal Heritage Special', 12000, 450, 1150, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Safa with premium jewellery']);

-- 31 Safas (9317fd0c-1fde-4059-bddc-a1f521bcee7c) - 9 packages
INSERT INTO package_variants (category_id, package_id, name, base_price, extra_safa_price, missing_safa_penalty, franchise_id, is_active, inclusions) VALUES
('9317fd0c-1fde-4059-bddc-a1f521bcee7c', '9317fd0c-1fde-4059-bddc-a1f521bcee7c', 'Package 1: Classic Style', 5000, 100, 450, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included']),
('9317fd0c-1fde-4059-bddc-a1f521bcee7c', '9317fd0c-1fde-4059-bddc-a1f521bcee7c', 'Package 2: Rajputana Rajwada Styles', 6200, 120, 500, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas + 1 Groom Designer Safa']),
('9317fd0c-1fde-4059-bddc-a1f521bcee7c', '9317fd0c-1fde-4059-bddc-a1f521bcee7c', 'Package 3: Floral Design', 7500, 150, 550, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Floral Design', '10 VIP + 1 Groom Safa with premium accessories']),
('9317fd0c-1fde-4059-bddc-a1f521bcee7c', '9317fd0c-1fde-4059-bddc-a1f521bcee7c', 'Package 4: Bollywood Styles', 9000, 200, 650, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa with premium brooches & jewellery']),
('9317fd0c-1fde-4059-bddc-a1f521bcee7c', '9317fd0c-1fde-4059-bddc-a1f521bcee7c', 'Package 5: Adani''s Wedding Safa', 10500, 250, 700, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('9317fd0c-1fde-4059-bddc-a1f521bcee7c', '9317fd0c-1fde-4059-bddc-a1f521bcee7c', 'Package 6: Ram–Sita Wedding Shades', 12000, 300, 750, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('9317fd0c-1fde-4059-bddc-a1f521bcee7c', '9317fd0c-1fde-4059-bddc-a1f521bcee7c', 'Package 7: JJ Valaya Premium Silk (Lightweight)', 13500, 350, 950, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['JJ Valaya Premium Silk (Lightweight)', 'All VIP + Brooch for all + Groom Safa']),
('9317fd0c-1fde-4059-bddc-a1f521bcee7c', '9317fd0c-1fde-4059-bddc-a1f521bcee7c', 'Package 8: Tissue Silk Premium (Lightweight)', 15000, 400, 1050, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Tissue Silk Premium (Lightweight)', 'All VIP + Brooch or Lace + Groom Safa']),
('9317fd0c-1fde-4059-bddc-a1f521bcee7c', '9317fd0c-1fde-4059-bddc-a1f521bcee7c', 'Package 9: Royal Heritage Special', 16500, 450, 1150, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Safa with premium jewellery']);

-- 41 Safas (129ab88b-e0b4-4888-8b86-eae5b50de6e4) - 9 packages
INSERT INTO package_variants (category_id, package_id, name, base_price, extra_safa_price, missing_safa_penalty, franchise_id, is_active, inclusions) VALUES
('129ab88b-e0b4-4888-8b86-eae5b50de6e4', '129ab88b-e0b4-4888-8b86-eae5b50de6e4', 'Package 1: Classic Style', 6000, 100, 450, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included']),
('129ab88b-e0b4-4888-8b86-eae5b50de6e4', '129ab88b-e0b4-4888-8b86-eae5b50de6e4', 'Package 2: Rajputana Rajwada Styles', 7400, 120, 500, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas + 1 Groom Designer Safa']),
('129ab88b-e0b4-4888-8b86-eae5b50de6e4', '129ab88b-e0b4-4888-8b86-eae5b50de6e4', 'Package 3: Floral Design', 9000, 150, 550, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Floral Design', '10 VIP + 1 Groom Safa with premium accessories']),
('129ab88b-e0b4-4888-8b86-eae5b50de6e4', '129ab88b-e0b4-4888-8b86-eae5b50de6e4', 'Package 4: Bollywood Styles', 11000, 200, 650, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa with premium brooches & jewellery']),
('129ab88b-e0b4-4888-8b86-eae5b50de6e4', '129ab88b-e0b4-4888-8b86-eae5b50de6e4', 'Package 5: Adani''s Wedding Safa', 13000, 250, 700, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('129ab88b-e0b4-4888-8b86-eae5b50de6e4', '129ab88b-e0b4-4888-8b86-eae5b50de6e4', 'Package 6: Ram–Sita Wedding Shades', 15000, 300, 750, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('129ab88b-e0b4-4888-8b86-eae5b50de6e4', '129ab88b-e0b4-4888-8b86-eae5b50de6e4', 'Package 7: JJ Valaya Premium Silk (Lightweight)', 17000, 350, 950, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['JJ Valaya Premium Silk (Lightweight)', 'All VIP + Brooch for all + Groom Safa']),
('129ab88b-e0b4-4888-8b86-eae5b50de6e4', '129ab88b-e0b4-4888-8b86-eae5b50de6e4', 'Package 8: Tissue Silk Premium (Lightweight)', 19000, 400, 1050, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Tissue Silk Premium (Lightweight)', 'All VIP + Brooch or Lace + Groom Safa']),
('129ab88b-e0b4-4888-8b86-eae5b50de6e4', '129ab88b-e0b4-4888-8b86-eae5b50de6e4', 'Package 9: Royal Heritage Special', 21000, 450, 1150, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Safa with premium jewellery']);

-- 51 Safas (9afbe91c-bf12-40da-87e3-f8ed24d308ad) - 9 packages
INSERT INTO package_variants (category_id, package_id, name, base_price, extra_safa_price, missing_safa_penalty, franchise_id, is_active, inclusions) VALUES
('9afbe91c-bf12-40da-87e3-f8ed24d308ad', '9afbe91c-bf12-40da-87e3-f8ed24d308ad', 'Package 1: Classic Style', 7000, 100, 450, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included']),
('9afbe91c-bf12-40da-87e3-f8ed24d308ad', '9afbe91c-bf12-40da-87e3-f8ed24d308ad', 'Package 2: Rajputana Rajwada Styles', 8600, 120, 500, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas + 1 Groom Designer Safa']),
('9afbe91c-bf12-40da-87e3-f8ed24d308ad', '9afbe91c-bf12-40da-87e3-f8ed24d308ad', 'Package 3: Floral Design', 10500, 150, 550, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Floral Design', '10 VIP + 1 Groom Safa with premium accessories']),
('9afbe91c-bf12-40da-87e3-f8ed24d308ad', '9afbe91c-bf12-40da-87e3-f8ed24d308ad', 'Package 4: Bollywood Styles', 13000, 200, 650, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa with premium brooches & jewellery']),
('9afbe91c-bf12-40da-87e3-f8ed24d308ad', '9afbe91c-bf12-40da-87e3-f8ed24d308ad', 'Package 5: Adani''s Wedding Safa', 15500, 250, 700, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('9afbe91c-bf12-40da-87e3-f8ed24d308ad', '9afbe91c-bf12-40da-87e3-f8ed24d308ad', 'Package 6: Ram–Sita Wedding Shades', 18000, 300, 750, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('9afbe91c-bf12-40da-87e3-f8ed24d308ad', '9afbe91c-bf12-40da-87e3-f8ed24d308ad', 'Package 7: JJ Valaya Premium Silk (Lightweight)', 20500, 350, 950, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['JJ Valaya Premium Silk (Lightweight)', 'All VIP + Brooch for all + Groom Safa']),
('9afbe91c-bf12-40da-87e3-f8ed24d308ad', '9afbe91c-bf12-40da-87e3-f8ed24d308ad', 'Package 8: Tissue Silk Premium (Lightweight)', 23000, 400, 1050, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Tissue Silk Premium (Lightweight)', 'All VIP + Brooch or Lace + Groom Safa']),
('9afbe91c-bf12-40da-87e3-f8ed24d308ad', '9afbe91c-bf12-40da-87e3-f8ed24d308ad', 'Package 9: Royal Heritage Special', 25500, 450, 1150, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Safa with premium jewellery']);

-- 61 Safas (e64fdad9-1533-4fe0-983c-fa54699ecb06) - 9 packages
INSERT INTO package_variants (category_id, package_id, name, base_price, extra_safa_price, missing_safa_penalty, franchise_id, is_active, inclusions) VALUES
('e64fdad9-1533-4fe0-983c-fa54699ecb06', 'e64fdad9-1533-4fe0-983c-fa54699ecb06', 'Package 1: Classic Style', 8000, 100, 450, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included']),
('e64fdad9-1533-4fe0-983c-fa54699ecb06', 'e64fdad9-1533-4fe0-983c-fa54699ecb06', 'Package 2: Rajputana Rajwada Styles', 9800, 120, 500, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas + 1 Groom Designer Safa']),
('e64fdad9-1533-4fe0-983c-fa54699ecb06', 'e64fdad9-1533-4fe0-983c-fa54699ecb06', 'Package 3: Floral Design', 12000, 150, 550, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Floral Design', '10 VIP + 1 Groom Safa with premium accessories']),
('e64fdad9-1533-4fe0-983c-fa54699ecb06', 'e64fdad9-1533-4fe0-983c-fa54699ecb06', 'Package 4: Bollywood Styles', 15000, 200, 650, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa with premium brooches & jewellery']),
('e64fdad9-1533-4fe0-983c-fa54699ecb06', 'e64fdad9-1533-4fe0-983c-fa54699ecb06', 'Package 5: Adani''s Wedding Safa', 18000, 250, 700, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('e64fdad9-1533-4fe0-983c-fa54699ecb06', 'e64fdad9-1533-4fe0-983c-fa54699ecb06', 'Package 6: Ram–Sita Wedding Shades', 21000, 300, 750, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('e64fdad9-1533-4fe0-983c-fa54699ecb06', 'e64fdad9-1533-4fe0-983c-fa54699ecb06', 'Package 7: JJ Valaya Premium Silk (Lightweight)', 24000, 350, 950, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['JJ Valaya Premium Silk (Lightweight)', 'All VIP + Brooch for all + Groom Safa']),
('e64fdad9-1533-4fe0-983c-fa54699ecb06', 'e64fdad9-1533-4fe0-983c-fa54699ecb06', 'Package 8: Tissue Silk Premium (Lightweight)', 27000, 400, 1050, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Tissue Silk Premium (Lightweight)', 'All VIP + Brooch or Lace + Groom Safa']),
('e64fdad9-1533-4fe0-983c-fa54699ecb06', 'e64fdad9-1533-4fe0-983c-fa54699ecb06', 'Package 9: Royal Heritage Special', 30000, 450, 1150, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Safa with premium jewellery']);

-- 71 Safas (4977b43d-0060-4ee6-b2c1-864efd75cc06) - 9 packages
INSERT INTO package_variants (category_id, package_id, name, base_price, extra_safa_price, missing_safa_penalty, franchise_id, is_active, inclusions) VALUES
('4977b43d-0060-4ee6-b2c1-864efd75cc06', '4977b43d-0060-4ee6-b2c1-864efd75cc06', 'Package 1: Classic Style', 9000, 100, 450, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included']),
('4977b43d-0060-4ee6-b2c1-864efd75cc06', '4977b43d-0060-4ee6-b2c1-864efd75cc06', 'Package 2: Rajputana Rajwada Styles', 11000, 120, 500, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas + 1 Groom Designer Safa']),
('4977b43d-0060-4ee6-b2c1-864efd75cc06', '4977b43d-0060-4ee6-b2c1-864efd75cc06', 'Package 3: Floral Design', 13500, 150, 550, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Floral Design', '10 VIP + 1 Groom Safa with premium accessories']),
('4977b43d-0060-4ee6-b2c1-864efd75cc06', '4977b43d-0060-4ee6-b2c1-864efd75cc06', 'Package 4: Bollywood Styles', 17000, 200, 650, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa with premium brooches & jewellery']),
('4977b43d-0060-4ee6-b2c1-864efd75cc06', '4977b43d-0060-4ee6-b2c1-864efd75cc06', 'Package 5: Adani''s Wedding Safa', 20500, 250, 700, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('4977b43d-0060-4ee6-b2c1-864efd75cc06', '4977b43d-0060-4ee6-b2c1-864efd75cc06', 'Package 6: Ram–Sita Wedding Shades', 24000, 300, 750, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('4977b43d-0060-4ee6-b2c1-864efd75cc06', '4977b43d-0060-4ee6-b2c1-864efd75cc06', 'Package 7: JJ Valaya Premium Silk (Lightweight)', 27500, 350, 950, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['JJ Valaya Premium Silk (Lightweight)', 'All VIP + Brooch for all + Groom Safa']),
('4977b43d-0060-4ee6-b2c1-864efd75cc06', '4977b43d-0060-4ee6-b2c1-864efd75cc06', 'Package 8: Tissue Silk Premium (Lightweight)', 31000, 400, 1050, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Tissue Silk Premium (Lightweight)', 'All VIP + Brooch or Lace + Groom Safa']),
('4977b43d-0060-4ee6-b2c1-864efd75cc06', '4977b43d-0060-4ee6-b2c1-864efd75cc06', 'Package 9: Royal Heritage Special', 34500, 450, 1150, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Safa with premium jewellery']);

-- 81 Safas (fa925944-5990-4bd9-bd69-ed723635d776) - 9 packages
INSERT INTO package_variants (category_id, package_id, name, base_price, extra_safa_price, missing_safa_penalty, franchise_id, is_active, inclusions) VALUES
('fa925944-5990-4bd9-bd69-ed723635d776', 'fa925944-5990-4bd9-bd69-ed723635d776', 'Package 1: Classic Style', 10000, 100, 450, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included']),
('fa925944-5990-4bd9-bd69-ed723635d776', 'fa925944-5990-4bd9-bd69-ed723635d776', 'Package 2: Rajputana Rajwada Styles', 12200, 120, 500, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas + 1 Groom Designer Safa']),
('fa925944-5990-4bd9-bd69-ed723635d776', 'fa925944-5990-4bd9-bd69-ed723635d776', 'Package 3: Floral Design', 15000, 150, 550, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Floral Design', '10 VIP + 1 Groom Safa with premium accessories']),
('fa925944-5990-4bd9-bd69-ed723635d776', 'fa925944-5990-4bd9-bd69-ed723635d776', 'Package 4: Bollywood Styles', 19000, 200, 650, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa with premium brooches & jewellery']),
('fa925944-5990-4bd9-bd69-ed723635d776', 'fa925944-5990-4bd9-bd69-ed723635d776', 'Package 5: Adani''s Wedding Safa', 23000, 250, 700, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('fa925944-5990-4bd9-bd69-ed723635d776', 'fa925944-5990-4bd9-bd69-ed723635d776', 'Package 6: Ram–Sita Wedding Shades', 27000, 300, 750, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('fa925944-5990-4bd9-bd69-ed723635d776', 'fa925944-5990-4bd9-bd69-ed723635d776', 'Package 7: JJ Valaya Premium Silk (Lightweight)', 31000, 350, 950, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['JJ Valaya Premium Silk (Lightweight)', 'All VIP + Brooch for all + Groom Safa']),
('fa925944-5990-4bd9-bd69-ed723635d776', 'fa925944-5990-4bd9-bd69-ed723635d776', 'Package 8: Tissue Silk Premium (Lightweight)', 35000, 400, 1050, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Tissue Silk Premium (Lightweight)', 'All VIP + Brooch or Lace + Groom Safa']),
('fa925944-5990-4bd9-bd69-ed723635d776', 'fa925944-5990-4bd9-bd69-ed723635d776', 'Package 9: Royal Heritage Special', 39000, 450, 1150, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Safa with premium jewellery']);

-- 91 Safas (fd3e4497-8cdc-4453-8fe7-fbc1ab927292) - 9 packages
INSERT INTO package_variants (category_id, package_id, name, base_price, extra_safa_price, missing_safa_penalty, franchise_id, is_active, inclusions) VALUES
('fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'Package 1: Classic Style', 11000, 100, 450, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included']),
('fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'Package 2: Rajputana Rajwada Styles', 13400, 120, 500, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas + 1 Groom Designer Safa']),
('fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'Package 3: Floral Design', 16500, 150, 550, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Floral Design', '10 VIP + 1 Groom Safa with premium accessories']),
('fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'Package 4: Bollywood Styles', 21000, 200, 650, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa with premium brooches & jewellery']),
('fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'Package 5: Adani''s Wedding Safa', 25500, 250, 700, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'Package 6: Ram–Sita Wedding Shades', 30000, 300, 750, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'Package 7: JJ Valaya Premium Silk (Lightweight)', 34500, 350, 950, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['JJ Valaya Premium Silk (Lightweight)', 'All VIP + Brooch for all + Groom Safa']),
('fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'Package 8: Tissue Silk Premium (Lightweight)', 39000, 400, 1050, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Tissue Silk Premium (Lightweight)', 'All VIP + Brooch or Lace + Groom Safa']),
('fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'fd3e4497-8cdc-4453-8fe7-fbc1ab927292', 'Package 9: Royal Heritage Special', 43500, 450, 1150, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Safa with premium jewellery']);

-- 101 Safas (a9d6fab7-8044-4e84-802c-729fdf9890ab) - 9 packages
INSERT INTO package_variants (category_id, package_id, name, base_price, extra_safa_price, missing_safa_penalty, franchise_id, is_active, inclusions) VALUES
('a9d6fab7-8044-4e84-802c-729fdf9890ab', 'a9d6fab7-8044-4e84-802c-729fdf9890ab', 'Package 1: Classic Style', 12000, 100, 450, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Classic Style', '3 VIP Family Safas', 'Groom Safa not included']),
('a9d6fab7-8044-4e84-802c-729fdf9890ab', 'a9d6fab7-8044-4e84-802c-729fdf9890ab', 'Package 2: Rajputana Rajwada Styles', 14600, 120, 500, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Rajputana Rajwada Styles', '6 VIP Family Safas + 1 Groom Designer Safa']),
('a9d6fab7-8044-4e84-802c-729fdf9890ab', 'a9d6fab7-8044-4e84-802c-729fdf9890ab', 'Package 3: Floral Design', 18000, 150, 550, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Floral Design', '10 VIP + 1 Groom Safa with premium accessories']),
('a9d6fab7-8044-4e84-802c-729fdf9890ab', 'a9d6fab7-8044-4e84-802c-729fdf9890ab', 'Package 4: Bollywood Styles', 23000, 200, 650, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Bollywood Styles', 'All VIP Safas', 'Groom Maharaja Safa with premium brooches & jewellery']),
('a9d6fab7-8044-4e84-802c-729fdf9890ab', 'a9d6fab7-8044-4e84-802c-729fdf9890ab', 'Package 5: Adani''s Wedding Safa', 28000, 250, 700, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Adani''s Wedding Safa', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('a9d6fab7-8044-4e84-802c-729fdf9890ab', 'a9d6fab7-8044-4e84-802c-729fdf9890ab', 'Package 6: Ram–Sita Wedding Shades', 33000, 300, 750, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Ram–Sita Wedding Shades', '5 VVIP Family Safas', 'Premium Groom Safa with exclusive jewellery']),
('a9d6fab7-8044-4e84-802c-729fdf9890ab', 'a9d6fab7-8044-4e84-802c-729fdf9890ab', 'Package 7: JJ Valaya Premium Silk (Lightweight)', 36500, 350, 950, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['JJ Valaya Premium Silk (Lightweight)', 'All VIP + Brooch for all + Groom Safa']),
('a9d6fab7-8044-4e84-802c-729fdf9890ab', 'a9d6fab7-8044-4e84-802c-729fdf9890ab', 'Package 8: Tissue Silk Premium (Lightweight)', 40000, 400, 1050, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Tissue Silk Premium (Lightweight)', 'All VIP + Brooch or Lace + Groom Safa']),
('a9d6fab7-8044-4e84-802c-729fdf9890ab', 'a9d6fab7-8044-4e84-802c-729fdf9890ab', 'Package 9: Royal Heritage Special', 43500, 450, 1150, '1a518dde-85b7-44ef-8bc4-092f53ddfd99', true, ARRAY['Royal Heritage Special', 'All VVIP Theme Safas', 'Groom Safa with premium jewellery']);

COMMIT;

-- Verify the inserts
SELECT 
    pc.name as category,
    COUNT(pv.id) as variant_count,
    MIN(pv.base_price) as min_price,
    MAX(pv.base_price) as max_price
FROM packages_categories pc
LEFT JOIN package_variants pv ON pc.id = pv.category_id AND pv.is_active = true
WHERE pc.name = '21 Safas'
AND pc.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pc.is_active = true
GROUP BY pc.name, pc.display_order
ORDER BY pc.display_order;

-- Show all variants for 21 Safas
SELECT 
    pv.name,
    pv.base_price,
    pv.extra_safa_price,
    pv.missing_safa_penalty,
    pv.inclusions
FROM package_variants pv
JOIN packages_categories pc ON pv.category_id = pc.id
WHERE pc.name = '21 Safas'
AND pc.franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
AND pv.is_active = true
ORDER BY pv.base_price;
