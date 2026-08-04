-- ============================================================================
-- STEP 1: Create Categories Only
-- ============================================================================
-- Run this FIRST to create all 9 categories
-- ============================================================================

DO $$
DECLARE
  v_franchise_id UUID := '1a518dde-85b7-44ef-8bc4-092f53ddfd99';
BEGIN

RAISE NOTICE '🚀 Creating categories...';

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

RAISE NOTICE '✅ Created 9 categories successfully!';

END $$;

-- Verify
SELECT id, name, description, is_active 
FROM packages_categories 
WHERE franchise_id = '1a518dde-85b7-44ef-8bc4-092f53ddfd99'
ORDER BY name;
