-- Create a new linking table between packages and categories
-- This allows for flexible relationships between packages and categories

-- Create the package_category_links table
CREATE TABLE IF NOT EXISTS public.package_category_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES public.packages_categories(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Ensure unique package-category combinations
    UNIQUE(package_id, category_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_category_links_package_id ON public.package_category_links(package_id);
CREATE INDEX IF NOT EXISTS idx_package_category_links_category_id ON public.package_category_links(category_id);
CREATE INDEX IF NOT EXISTS idx_package_category_links_active ON public.package_category_links(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_package_category_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_package_category_links_updated_at
    BEFORE UPDATE ON public.package_category_links
    FOR EACH ROW
    EXECUTE FUNCTION update_package_category_links_updated_at();

-- Enable RLS
ALTER TABLE public.package_category_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view package category links" ON public.package_category_links
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert package category links" ON public.package_category_links
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own package category links" ON public.package_category_links
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete package category links" ON public.package_category_links
    FOR DELETE USING (auth.role() = 'authenticated');

-- Insert sample linking data
-- First, get the category IDs from packages_categories
DO $$
DECLARE
    cat_21_id UUID;
    cat_31_id UUID;
    cat_51_id UUID;
    cat_101_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO cat_21_id FROM public.packages_categories WHERE name = '21 Safas' LIMIT 1;
    SELECT id INTO cat_31_id FROM public.packages_categories WHERE name = '31 Safas' LIMIT 1;
    SELECT id INTO cat_51_id FROM public.packages_categories WHERE name = '51 Safas' LIMIT 1;
    SELECT id INTO cat_101_id FROM public.packages_categories WHERE name = '101 Safas' LIMIT 1;

    -- Insert sample package category links
    -- Note: These use placeholder package_ids since we don't have actual packages yet
    INSERT INTO public.package_category_links (package_id, category_id, display_order, is_active) VALUES
    -- Links for 21 Safas category
    (gen_random_uuid(), cat_21_id, 1, true),
    (gen_random_uuid(), cat_21_id, 2, true),
    
    -- Links for 31 Safas category
    (gen_random_uuid(), cat_31_id, 1, true),
    (gen_random_uuid(), cat_31_id, 2, true),
    
    -- Links for 51 Safas category
    (gen_random_uuid(), cat_51_id, 1, true),
    (gen_random_uuid(), cat_51_id, 2, true),
    
    -- Links for 101 Safas category
    (gen_random_uuid(), cat_101_id, 1, true),
    (gen_random_uuid(), cat_101_id, 2, true)
    
    ON CONFLICT (package_id, category_id) DO NOTHING;
    
END $$;

-- Grant permissions
GRANT ALL ON public.package_category_links TO authenticated;
GRANT ALL ON public.package_category_links TO service_role;

-- Success message
SELECT 'Package category links table created successfully with ' || COUNT(*) || ' sample records' as result
FROM public.package_category_links;
