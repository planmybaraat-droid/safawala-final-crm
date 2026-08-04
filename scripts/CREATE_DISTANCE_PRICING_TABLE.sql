-- =====================================================
-- CREATE DISTANCE PRICING TABLE
-- =====================================================
-- This table stores distance-based pricing for package levels
-- Distance pricing adds to the level's total (base + additional)
-- Final Price = (Variant Base + Level Additional) + Distance Charge
-- =====================================================

-- Drop existing table if exists
DROP TABLE IF EXISTS distance_pricing CASCADE;

-- Create distance_pricing table
CREATE TABLE IF NOT EXISTS distance_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_level_id UUID NOT NULL REFERENCES package_levels(id) ON DELETE CASCADE,
    distance_range TEXT NOT NULL, -- e.g., "Internal City", "0-10 km", "10-20 km"
    min_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Minimum distance in kilometers
    max_distance_km NUMERIC(10, 2) NOT NULL, -- Maximum distance in kilometers
    additional_price NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Price added to level total
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_distance_pricing_level;
DROP INDEX IF EXISTS idx_distance_pricing_franchise;
DROP INDEX IF EXISTS idx_distance_pricing_active;
DROP INDEX IF EXISTS idx_distance_pricing_distance_range;

-- Create indexes for better query performance
CREATE INDEX idx_distance_pricing_level ON distance_pricing(package_level_id);
CREATE INDEX idx_distance_pricing_franchise ON distance_pricing(franchise_id);
CREATE INDEX idx_distance_pricing_active ON distance_pricing(is_active);
CREATE INDEX idx_distance_pricing_distance_range ON distance_pricing(min_distance_km, max_distance_km);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_distance_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_distance_pricing_updated_at
    BEFORE UPDATE ON distance_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_distance_pricing_updated_at();

-- Disable RLS (app uses API key authentication, not JWT)
ALTER TABLE distance_pricing DISABLE ROW LEVEL SECURITY;

-- Add helpful comment
COMMENT ON TABLE distance_pricing IS 'Distance-based pricing that adds to package level totals. Final Price = (Variant Base + Level Additional) + Distance Charge. RLS disabled - app uses API key auth with franchise_id filtering.';
COMMENT ON COLUMN distance_pricing.distance_range IS 'Human-readable distance range label (e.g., "Internal City", "0-10 km")';
COMMENT ON COLUMN distance_pricing.additional_price IS 'Price added to level total (Variant Base + Level Additional)';
COMMENT ON COLUMN distance_pricing.min_distance_km IS 'Minimum distance in kilometers for this pricing tier';
COMMENT ON COLUMN distance_pricing.max_distance_km IS 'Maximum distance in kilometers for this pricing tier';

-- =====================================================
-- SEED SAMPLE DATA (for testing)
-- =====================================================
-- This will be inserted after table creation
-- Sample franchise_id: 95168a3d-a6a5-4f9b-bbe2-7b88c7cef050
-- Sample level_id will be from package_levels table
-- =====================================================
