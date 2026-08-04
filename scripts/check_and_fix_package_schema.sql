-- CHECK AND FIX PACKAGE SCHEMA
-- Idempotent script to align DB with Categories → Variants → Levels → Distance Pricing
-- Safe to run multiple times in Supabase SQL editor

-- 1) Ensure gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Ensure package_levels table exists
CREATE TABLE IF NOT EXISTS package_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES package_variants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for package_levels
CREATE INDEX IF NOT EXISTS idx_package_levels_variant_id ON package_levels(variant_id);

-- 3) Ensure distance_pricing table has required columns
-- Add level_id
ALTER TABLE distance_pricing
  ADD COLUMN IF NOT EXISTS level_id UUID;

-- Add variant_id (legacy may exist already)
ALTER TABLE distance_pricing
  ADD COLUMN IF NOT EXISTS variant_id UUID;

-- Add distance_range (and rename range_name if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='distance_pricing' AND column_name='distance_range'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='distance_pricing' AND column_name='range_name'
    ) THEN
      EXECUTE 'ALTER TABLE distance_pricing RENAME COLUMN range_name TO distance_range';
    ELSE
      EXECUTE 'ALTER TABLE distance_pricing ADD COLUMN distance_range VARCHAR(100)';
    END IF;
  END IF;
END$$;

-- Add min_km/max_km/base_price_addition/display_order/is_active columns if missing
ALTER TABLE distance_pricing ADD COLUMN IF NOT EXISTS min_km INT;
ALTER TABLE distance_pricing ADD COLUMN IF NOT EXISTS max_km INT;
ALTER TABLE distance_pricing ADD COLUMN IF NOT EXISTS base_price_addition NUMERIC(12,2) DEFAULT 0;
ALTER TABLE distance_pricing ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE distance_pricing ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE distance_pricing ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE distance_pricing ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4) Add foreign keys if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'distance_pricing_level_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE distance_pricing
        ADD CONSTRAINT distance_pricing_level_id_fkey
        FOREIGN KEY (level_id) REFERENCES package_levels(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'distance_pricing_variant_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE distance_pricing
        ADD CONSTRAINT distance_pricing_variant_id_fkey
        FOREIGN KEY (variant_id) REFERENCES package_variants(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

-- 5) Ensure package_variants has category_id for the new flow
ALTER TABLE package_variants
  ADD COLUMN IF NOT EXISTS category_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'package_variants_category_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE package_variants
        ADD CONSTRAINT package_variants_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES packages_categories(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

-- 6) Create default levels for variants missing levels (optional helper)
-- Creates a single 'Base' level using variant.base_price
DO $$
DECLARE
  v_rec RECORD;
  new_level_id UUID;
BEGIN
  FOR v_rec IN
    SELECT pv.id AS variant_id, pv.base_price
    FROM package_variants pv
    WHERE NOT EXISTS (
      SELECT 1 FROM package_levels pl WHERE pl.variant_id = pv.id
    )
  LOOP
    INSERT INTO package_levels (variant_id, name, base_price, is_active, display_order)
    VALUES (v_rec.variant_id, 'Base', COALESCE(v_rec.base_price, 0), TRUE, 1)
    RETURNING id INTO new_level_id;

    -- Backfill distance_pricing.level_id from variant_id
    UPDATE distance_pricing dp
    SET level_id = new_level_id
    WHERE dp.level_id IS NULL AND dp.variant_id = v_rec.variant_id;
  END LOOP;
END$$;

-- 7) Index on distance_pricing.level_id
CREATE INDEX IF NOT EXISTS idx_distance_pricing_level_id ON distance_pricing(level_id);
CREATE INDEX IF NOT EXISTS idx_distance_pricing_variant_id ON distance_pricing(variant_id);

-- 8) Report summary
SELECT table_name AS tbl, COUNT(*) AS columns
FROM information_schema.columns
WHERE table_name IN ('packages_categories','package_variants','package_levels','distance_pricing')
GROUP BY table_name
ORDER BY table_name;

-- Detailed columns list (optional)
SELECT table_name, array_agg(column_name ORDER BY column_name) AS columns
FROM information_schema.columns
WHERE table_name IN ('packages_categories','package_variants','package_levels','distance_pricing')
GROUP BY table_name
ORDER BY table_name;
