-- Create package_sub_packages table for hierarchical structure: packages > sub-packages > variants
CREATE TABLE IF NOT EXISTS package_sub_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Handmade", "Live", "Premium"
    description TEXT,
    base_price NUMERIC(10,2) DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add sub_package_id to package_variants table
ALTER TABLE package_variants 
ADD COLUMN IF NOT EXISTS sub_package_id UUID REFERENCES package_sub_packages(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_sub_packages_package_id ON package_sub_packages(package_id);
CREATE INDEX IF NOT EXISTS idx_package_variants_sub_package_id ON package_variants(sub_package_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_package_sub_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_package_sub_packages_updated_at
    BEFORE UPDATE ON package_sub_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_package_sub_packages_updated_at();

-- Insert sample sub-packages for existing packages
INSERT INTO package_sub_packages (package_id, name, description, display_order) 
SELECT 
    p.id,
    sub.name,
    sub.description,
    sub.display_order
FROM packages p
CROSS JOIN (
    VALUES 
        ('Handmade', 'Traditional handmade safas with intricate craftsmanship', 1),
        ('Live', 'Live performance style safas with vibrant colors', 2),
        ('Premium', 'Premium quality safas with luxury materials', 3)
) AS sub(name, description, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM package_sub_packages psp WHERE psp.package_id = p.id
);

-- Update existing package_variants to link to sub_packages
-- This will link variants to the first sub-package of each package for now
UPDATE package_variants 
SET sub_package_id = (
    SELECT psp.id 
    FROM package_sub_packages psp 
    WHERE psp.package_id = package_variants.package_id 
    ORDER BY psp.display_order 
    LIMIT 1
)
WHERE sub_package_id IS NULL;
