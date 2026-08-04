-- Create the missing package_sets table for package management
CREATE TABLE IF NOT EXISTS public.package_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    category_id UUID REFERENCES public.packages_categories(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id),
    package_type VARCHAR(100) DEFAULT 'standard',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_sets_category_id ON public.package_sets(category_id);
CREATE INDEX IF NOT EXISTS idx_package_sets_franchise_id ON public.package_sets(franchise_id);
CREATE INDEX IF NOT EXISTS idx_package_sets_active ON public.package_sets(is_active);

-- Enable RLS
ALTER TABLE public.package_sets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view packages for their franchise" ON public.package_sets
    FOR SELECT USING (
        franchise_id IN (
            SELECT franchise_id FROM public.users WHERE id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Users can create packages for their franchise" ON public.package_sets
    FOR INSERT WITH CHECK (
        franchise_id IN (
            SELECT franchise_id FROM public.users WHERE id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Users can update packages for their franchise" ON public.package_sets
    FOR UPDATE USING (
        franchise_id IN (
            SELECT franchise_id FROM public.users WHERE id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Users can delete packages for their franchise" ON public.package_sets
    FOR DELETE USING (
        franchise_id IN (
            SELECT franchise_id FROM public.users WHERE id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_package_sets_updated_at BEFORE UPDATE ON public.package_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for existing categories
INSERT INTO public.package_sets (name, description, base_price, category_id, franchise_id, created_by, package_type, display_order) 
SELECT 
    CASE 
        WHEN pc.name = '21 Safas' THEN 'Royal Wedding Package'
        WHEN pc.name = '31 Safas' THEN 'Premium Wedding Package'  
        WHEN pc.name = '51 Safas' THEN 'Grand Wedding Package'
        WHEN pc.name = '101 Safas' THEN 'Luxury Wedding Package'
        ELSE 'Standard Package'
    END as name,
    CASE 
        WHEN pc.name = '21 Safas' THEN 'Complete wedding safa collection for 21 people with traditional designs'
        WHEN pc.name = '31 Safas' THEN 'Premium wedding safa collection for 31 people with elegant patterns'
        WHEN pc.name = '51 Safas' THEN 'Grand wedding safa collection for 51 people with royal designs'
        WHEN pc.name = '101 Safas' THEN 'Luxury wedding safa collection for 101 people with exclusive patterns'
        ELSE 'Standard safa collection'
    END as description,
    CASE 
        WHEN pc.name = '21 Safas' THEN 15000
        WHEN pc.name = '31 Safas' THEN 22000
        WHEN pc.name = '51 Safas' THEN 35000
        WHEN pc.name = '101 Safas' THEN 65000
        ELSE 10000
    END as base_price,
    pc.id as category_id,
    f.id as franchise_id,
    u.id as created_by,
    'wedding' as package_type,
    1 as display_order
FROM public.packages_categories pc
CROSS JOIN (SELECT id FROM public.franchises LIMIT 1) f
CROSS JOIN (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1) u
WHERE pc.is_active = true
ON CONFLICT DO NOTHING;

-- Add a second package for each category
INSERT INTO public.package_sets (name, description, base_price, category_id, franchise_id, created_by, package_type, display_order) 
SELECT 
    CASE 
        WHEN pc.name = '21 Safas' THEN 'Traditional Wedding Package'
        WHEN pc.name = '31 Safas' THEN 'Classic Wedding Package'  
        WHEN pc.name = '51 Safas' THEN 'Deluxe Wedding Package'
        WHEN pc.name = '101 Safas' THEN 'Imperial Wedding Package'
        ELSE 'Basic Package'
    END as name,
    CASE 
        WHEN pc.name = '21 Safas' THEN 'Traditional wedding safa collection for 21 people with classic designs'
        WHEN pc.name = '31 Safas' THEN 'Classic wedding safa collection for 31 people with timeless patterns'
        WHEN pc.name = '51 Safas' THEN 'Deluxe wedding safa collection for 51 people with premium designs'
        WHEN pc.name = '101 Safas' THEN 'Imperial wedding safa collection for 101 people with majestic patterns'
        ELSE 'Basic safa collection'
    END as description,
    CASE 
        WHEN pc.name = '21 Safas' THEN 12000
        WHEN pc.name = '31 Safas' THEN 18000
        WHEN pc.name = '51 Safas' THEN 28000
        WHEN pc.name = '101 Safas' THEN 55000
        ELSE 8000
    END as base_price,
    pc.id as category_id,
    f.id as franchise_id,
    u.id as created_by,
    'wedding' as package_type,
    2 as display_order
FROM public.packages_categories pc
CROSS JOIN (SELECT id FROM public.franchises LIMIT 1) f
CROSS JOIN (SELECT id FROM public.users WHERE role = 'super_admin' LIMIT 1) u
WHERE pc.is_active = true
ON CONFLICT DO NOTHING;
