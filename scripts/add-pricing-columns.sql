-- Add missing columns for pricing data
-- Run this BEFORE importing the CSV data

-- Add extra_safa_price to package_variants
ALTER TABLE package_variants 
ADD COLUMN IF NOT EXISTS extra_safa_price NUMERIC(10,2) DEFAULT 0;

-- Add missing_safa_penalty to package_variants  
ALTER TABLE package_variants 
ADD COLUMN IF NOT EXISTS missing_safa_penalty NUMERIC(10,2) DEFAULT 0;

-- Add category_id to package_variants (for linking variant directly to category)
ALTER TABLE package_variants
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES packages_categories(id) ON DELETE CASCADE;

-- Add franchise_id to package_variants
ALTER TABLE package_variants
ADD COLUMN IF NOT EXISTS franchise_id UUID;

-- Add inclusions field (JSONB array)
ALTER TABLE package_variants
ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb;

-- Add package_level_id to distance_pricing
ALTER TABLE distance_pricing
ADD COLUMN IF NOT EXISTS package_level_id UUID REFERENCES package_levels(id) ON DELETE CASCADE;

-- Add package_levels table if it doesn't exist
CREATE TABLE IF NOT EXISTS package_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    variant_id UUID REFERENCES package_variants(id) ON DELETE CASCADE,
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_package_variants_category_id ON package_variants(category_id);
CREATE INDEX IF NOT EXISTS idx_package_levels_variant_id ON package_levels(variant_id);
CREATE INDEX IF NOT EXISTS idx_distance_pricing_level_id ON distance_pricing(package_level_id);

SELECT '✅ Columns added successfully' as status;
