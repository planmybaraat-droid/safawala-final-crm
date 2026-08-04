-- Create packages table for delivery packages with distance-based pricing
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category VARCHAR(100),
  package_type VARCHAR(50) DEFAULT 'delivery', -- delivery, pickup, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  franchise_id UUID REFERENCES franchises(id)
);

-- Create distance pricing tiers table
CREATE TABLE IF NOT EXISTS distance_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name VARCHAR(100) NOT NULL,
  min_distance INTEGER NOT NULL, -- in km
  max_distance INTEGER NOT NULL, -- in km
  price_multiplier DECIMAL(5,2) NOT NULL, -- 1.00 = 100%, 1.79 = 179%
  base_location VARCHAR(255) DEFAULT 'Alkapuri, Vadodara',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default distance pricing tiers for Alkapuri, Vadodara
INSERT INTO distance_pricing_tiers (tier_name, min_distance, max_distance, price_multiplier, base_location) VALUES
('Local Delivery (0-11 km)', 0, 11, 1.00, 'Alkapuri, Vadodara'),
('City Extended (12-25 km)', 12, 25, 1.79, 'Alkapuri, Vadodara'),
('Regional (26-150 km)', 26, 150, 1.79, 'Alkapuri, Vadodara'),
('Long Distance (151-300 km)', 151, 300, 1.79, 'Alkapuri, Vadodara')
ON CONFLICT DO NOTHING;

-- Create package items junction table for package contents
CREATE TABLE IF NOT EXISTS package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_packages_franchise_id ON packages(franchise_id);
CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active);
CREATE INDEX IF NOT EXISTS idx_distance_pricing_active ON distance_pricing_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON package_items(package_id);

-- Add RLS policies
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE distance_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;

-- Packages policies
CREATE POLICY "Users can view packages" ON packages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert packages" ON packages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their franchise packages" ON packages FOR UPDATE USING (
  franchise_id IN (
    SELECT franchise_id FROM users WHERE id = auth.uid()
  ) OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Distance pricing tiers policies (read-only for most users)
CREATE POLICY "Users can view distance pricing tiers" ON distance_pricing_tiers FOR SELECT USING (true);
CREATE POLICY "Only super admins can modify distance pricing" ON distance_pricing_tiers FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Package items policies
CREATE POLICY "Users can view package items" ON package_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage package items" ON package_items FOR ALL USING (auth.role() = 'authenticated');
