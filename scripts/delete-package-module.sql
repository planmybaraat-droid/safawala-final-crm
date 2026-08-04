-- Delete Package Module from Supabase Database
-- This script removes all package-related tables and data

-- Drop package-related tables in correct order (foreign key dependencies)
DROP TABLE IF EXISTS package_variants CASCADE;
DROP TABLE IF EXISTS package_sub_packages CASCADE;
DROP TABLE IF EXISTS package_features CASCADE;
DROP TABLE IF EXISTS package_items CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS distance_pricing_tiers CASCADE;

-- Remove any package-related functions
DROP FUNCTION IF EXISTS get_package_pricing(uuid, numeric, integer) CASCADE;
DROP FUNCTION IF EXISTS calculate_distance_pricing(text, text) CASCADE;

-- Remove any package-related views
DROP VIEW IF EXISTS package_summary_view CASCADE;
DROP VIEW IF EXISTS package_pricing_view CASCADE;

-- Clean up any package-related triggers
DROP TRIGGER IF EXISTS update_package_updated_at ON packages CASCADE;
DROP TRIGGER IF EXISTS update_sub_package_updated_at ON package_sub_packages CASCADE;

-- Remove package-related RLS policies (if any exist)
-- Note: This will not error if policies don't exist
DO $$ 
BEGIN
    -- Drop RLS policies for packages table
    DROP POLICY IF EXISTS "packages_select_policy" ON packages;
    DROP POLICY IF EXISTS "packages_insert_policy" ON packages;
    DROP POLICY IF EXISTS "packages_update_policy" ON packages;
    DROP POLICY IF EXISTS "packages_delete_policy" ON packages;
    
    -- Drop RLS policies for sub-packages table
    DROP POLICY IF EXISTS "sub_packages_select_policy" ON package_sub_packages;
    DROP POLICY IF EXISTS "sub_packages_insert_policy" ON package_sub_packages;
    DROP POLICY IF EXISTS "sub_packages_update_policy" ON package_sub_packages;
    DROP POLICY IF EXISTS "sub_packages_delete_policy" ON package_sub_packages;
    
    -- Drop RLS policies for variants table
    DROP POLICY IF EXISTS "variants_select_policy" ON package_variants;
    DROP POLICY IF EXISTS "variants_insert_policy" ON package_variants;
    DROP POLICY IF EXISTS "variants_update_policy" ON package_variants;
    DROP POLICY IF EXISTS "variants_delete_policy" ON package_variants;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if policies don't exist
        NULL;
END $$;

-- Remove any package-related indexes
DROP INDEX IF EXISTS idx_packages_franchise_id;
DROP INDEX IF EXISTS idx_packages_created_by;
DROP INDEX IF EXISTS idx_packages_category;
DROP INDEX IF EXISTS idx_sub_packages_package_id;
DROP INDEX IF EXISTS idx_variants_sub_package_id;
DROP INDEX IF EXISTS idx_distance_pricing_range;

-- Clean up any package-related sequences
DROP SEQUENCE IF EXISTS packages_id_seq CASCADE;
DROP SEQUENCE IF EXISTS package_sub_packages_id_seq CASCADE;
DROP SEQUENCE IF EXISTS package_variants_id_seq CASCADE;

-- Success message
SELECT 'Package module successfully deleted from database' as result;
