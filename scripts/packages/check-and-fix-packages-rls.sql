-- ============================================
-- CHECK AND FIX RLS FOR PACKAGES TABLES
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check RLS status for all package-related tables
SELECT 
    'RLS STATUS' as section,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('package_sets', 'package_variants', 'distance_pricing', 'packages_categories')
ORDER BY tablename;

-- 2. Check if packages have franchise_id
SELECT 
    'SAMPLE PACKAGES' as section,
    id,
    name,
    franchise_id,
    is_active
FROM package_sets
LIMIT 5;

-- 3. Count packages by franchise
SELECT 
    'PACKAGES BY FRANCHISE' as section,
    f.name as franchise_name,
    COUNT(ps.id) as package_count
FROM franchises f
LEFT JOIN package_sets ps ON f.id = ps.franchise_id AND ps.is_active = true
GROUP BY f.id, f.name
ORDER BY package_count DESC;

-- ============================================
-- FIX: DISABLE RLS ON PACKAGE TABLES
-- ============================================

-- Disable RLS on all package tables
ALTER TABLE package_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE package_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE distance_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE packages_categories DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    'RLS DISABLED?' as verification,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('package_sets', 'package_variants', 'distance_pricing', 'packages_categories')
ORDER BY tablename;
