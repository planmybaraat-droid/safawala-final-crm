-- Create package_features table
CREATE TABLE IF NOT EXISTS public.package_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    feature_name VARCHAR(255) NOT NULL,
    feature_description TEXT,
    is_included BOOLEAN DEFAULT true,
    additional_cost NUMERIC(10,2) DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create package_variants table
CREATE TABLE IF NOT EXISTS public.package_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    variant_name VARCHAR(255) NOT NULL,
    base_price NUMERIC(10,2) NOT NULL,
    extra_cost_per_unit NUMERIC(10,2) DEFAULT 0,
    included_items TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_features_package_id ON public.package_features(package_id);
CREATE INDEX IF NOT EXISTS idx_package_variants_package_id ON public.package_variants(package_id);
CREATE INDEX IF NOT EXISTS idx_package_features_display_order ON public.package_features(display_order);
CREATE INDEX IF NOT EXISTS idx_package_variants_display_order ON public.package_variants(display_order);

-- Enable RLS (Row Level Security)
ALTER TABLE public.package_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_variants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for package_features
CREATE POLICY "Users can view package features" ON public.package_features
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert package features" ON public.package_features
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update package features" ON public.package_features
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete package features" ON public.package_features
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for package_variants
CREATE POLICY "Users can view package variants" ON public.package_variants
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert package variants" ON public.package_variants
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update package variants" ON public.package_variants
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete package variants" ON public.package_variants
    FOR DELETE USING (auth.role() = 'authenticated');

-- Insert sample data for testing
INSERT INTO public.package_variants (package_id, variant_name, base_price, extra_cost_per_unit, included_items, notes)
SELECT 
    p.id,
    'Standard Variant',
    12500.00,
    100.00,
    '3 VIP family safas, no groom safa included',
    'Basic package with essential items'
FROM public.packages p
WHERE p.name LIKE '%Wedding%' OR p.name LIKE '%Safa%'
LIMIT 1;

-- Add sample features
INSERT INTO public.package_features (package_id, feature_name, feature_description, is_included)
SELECT 
    p.id,
    'VIP Family Safas',
    'Premium quality safas for family members',
    true
FROM public.packages p
WHERE p.name LIKE '%Wedding%' OR p.name LIKE '%Safa%'
LIMIT 1;
