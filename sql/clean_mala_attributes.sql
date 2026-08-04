-- =====================================================================
-- SQL Script to clean Mala Attributes to strictly single-word values
-- Category: MALA (c2788e4d-1195-403b-a87b-c98c8974b88c)
-- =====================================================================

-- ── 1. CLEAN COLORS FOR PRODUCTS ─────────────────────────────────────
UPDATE products
SET color = CASE
  WHEN color ILIKE '%maroon%' THEN 'Maroon'
  WHEN color ILIKE '%crimson%' THEN 'Crimson'
  WHEN color ILIKE '%ruby%' THEN 'Ruby'
  WHEN color ILIKE '%red%' THEN 'Red'
  WHEN color ILIKE '%pink%' THEN 'Pink'
  WHEN color ILIKE '%blush%' THEN 'Pink'
  WHEN color ILIKE '%peach%' THEN 'Peach'
  WHEN color ILIKE '%emerald%' THEN 'Green'
  WHEN color ILIKE '%green%' THEN 'Green'
  WHEN color ILIKE '%turquoise%' THEN 'Turquoise'
  WHEN color ILIKE '%silver%' THEN 'Silver'
  WHEN color ILIKE '%gold%' THEN 'Gold'
  WHEN color ILIKE '%champagne%' THEN 'Gold'
  WHEN color ILIKE '%white%' THEN 'White'
  WHEN color ILIKE '%ivory%' THEN 'White'
  WHEN color ILIKE '%cream%' THEN 'White'
  WHEN color ILIKE '%mixed%' THEN 'Mixed'
  ELSE INITCAP(SPLIT_PART(TRIM(color), ' ', 1))
END
WHERE category_id = 'c2788e4d-1195-403b-a87b-c98c8974b88c' 
  AND color IS NOT NULL;

-- ── 2. CLEAN COLORS FOR PRODUCT VARIATIONS ───────────────────────────
UPDATE product_variations pv
SET color = CASE
  WHEN pv.color ILIKE '%maroon%' THEN 'Maroon'
  WHEN pv.color ILIKE '%crimson%' THEN 'Crimson'
  WHEN pv.color ILIKE '%ruby%' THEN 'Ruby'
  WHEN pv.color ILIKE '%red%' THEN 'Red'
  WHEN pv.color ILIKE '%pink%' THEN 'Pink'
  WHEN pv.color ILIKE '%blush%' THEN 'Pink'
  WHEN pv.color ILIKE '%peach%' THEN 'Peach'
  WHEN pv.color ILIKE '%emerald%' THEN 'Green'
  WHEN pv.color ILIKE '%green%' THEN 'Green'
  WHEN pv.color ILIKE '%turquoise%' THEN 'Turquoise'
  WHEN pv.color ILIKE '%silver%' THEN 'Silver'
  WHEN pv.color ILIKE '%gold%' THEN 'Gold'
  WHEN pv.color ILIKE '%champagne%' THEN 'Gold'
  WHEN pv.color ILIKE '%white%' THEN 'White'
  WHEN pv.color ILIKE '%ivory%' THEN 'White'
  WHEN pv.color ILIKE '%cream%' THEN 'White'
  WHEN pv.color ILIKE '%mixed%' THEN 'Mixed'
  ELSE INITCAP(SPLIT_PART(TRIM(pv.color), ' ', 1))
END
FROM products p
WHERE pv.product_id = p.id 
  AND p.category_id = 'c2788e4d-1195-403b-a87b-c98c8974b88c' 
  AND pv.color IS NOT NULL;

-- ── 3. CLEAN MATERIALS FOR PRODUCTS ──────────────────────────────────
UPDATE products
SET material = CASE
  WHEN material ILIKE '%kundan%' THEN 'Kundan'
  WHEN material ILIKE '%polki%' THEN 'Polki'
  WHEN material ILIKE '%pearl%' THEN 'Pearls'
  WHEN material ILIKE '%zircon%' THEN 'Zircon'
  WHEN material ILIKE '%cz%' THEN 'Zircon'
  WHEN material ILIKE '%crystal%' THEN 'Crystals'
  WHEN material ILIKE '%stone%' THEN 'Beads'
  WHEN material ILIKE '%bead%' THEN 'Beads'
  WHEN material ILIKE '%metal%' THEN 'Metal'
  WHEN material ILIKE '%alloy%' THEN 'Metal'
  ELSE INITCAP(SPLIT_PART(TRIM(material), ' ', 1))
END
WHERE category_id = 'c2788e4d-1195-403b-a87b-c98c8974b88c' 
  AND material IS NOT NULL;

-- ── 4. CLEAN MATERIALS FOR PRODUCT VARIATIONS ────────────────────────
UPDATE product_variations pv
SET material = CASE
  WHEN pv.material ILIKE '%kundan%' THEN 'Kundan'
  WHEN pv.material ILIKE '%polki%' THEN 'Polki'
  WHEN pv.material ILIKE '%pearl%' THEN 'Pearls'
  WHEN pv.material ILIKE '%zircon%' THEN 'Zircon'
  WHEN pv.material ILIKE '%cz%' THEN 'Zircon'
  WHEN pv.material ILIKE '%crystal%' THEN 'Crystals'
  WHEN pv.material ILIKE '%stone%' THEN 'Beads'
  WHEN pv.material ILIKE '%bead%' THEN 'Beads'
  WHEN pv.material ILIKE '%metal%' THEN 'Metal'
  WHEN pv.material ILIKE '%alloy%' THEN 'Metal'
  ELSE INITCAP(SPLIT_PART(TRIM(pv.material), ' ', 1))
END
FROM products p
WHERE pv.product_id = p.id 
  AND p.category_id = 'c2788e4d-1195-403b-a87b-c98c8974b88c' 
  AND pv.material IS NOT NULL;

-- ── 5. CLEAN SIZES FOR PRODUCTS ──────────────────────────────────────
UPDATE products
SET size = CASE
  WHEN size ILIKE '%adjustable%' THEN 'Adjustable'
  WHEN size ILIKE '%standard%' THEN 'Standard'
  ELSE INITCAP(SPLIT_PART(TRIM(size), ' ', 1))
END
WHERE category_id = 'c2788e4d-1195-403b-a87b-c98c8974b88c' 
  AND size IS NOT NULL;

UPDATE products
SET size = 'Standard'
WHERE category_id = 'c2788e4d-1195-403b-a87b-c98c8974b88c' 
  AND size IS NULL;

-- ── 6. CLEAN SIZES FOR PRODUCT VARIATIONS ────────────────────────────
UPDATE product_variations pv
SET size = CASE
  WHEN pv.size ILIKE '%adjustable%' THEN 'Adjustable'
  WHEN pv.size ILIKE '%standard%' THEN 'Standard'
  ELSE INITCAP(SPLIT_PART(TRIM(pv.size), ' ', 1))
END
FROM products p
WHERE pv.product_id = p.id 
  AND p.category_id = 'c2788e4d-1195-403b-a87b-c98c8974b88c' 
  AND pv.size IS NOT NULL;

UPDATE product_variations pv
SET size = 'Standard'
FROM products p
WHERE pv.product_id = p.id 
  AND p.category_id = 'c2788e4d-1195-403b-a87b-c98c8974b88c' 
  AND pv.size IS NULL;
