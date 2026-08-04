-- ============================================
-- CHECK IF PRODUCT_ITEMS TABLE EXISTS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if product_items table exists
SELECT 
    'TABLE EXISTS?' as check_type,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_items'
    ) as exists;

-- 2. If exists, check RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'product_items';

-- 3. If exists, check structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'product_items'
ORDER BY ordinal_position;

-- 4. Check if any data exists
SELECT 
    COUNT(*) as total_items
FROM product_items
WHERE TRUE;  -- This works even with RLS because we're using service role

-- ============================================
-- IF TABLE DOESN'T EXIST, CREATE IT
-- ============================================

-- Uncomment and run this if table doesn't exist:
/*
CREATE TABLE IF NOT EXISTS product_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL UNIQUE,
    barcode TEXT NOT NULL,
    qr_code TEXT,
    serial_number TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'damaged', 'in_laundry', 'sold')),
    condition TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'good', 'fair', 'poor', 'damaged')),
    location TEXT,
    notes TEXT,
    purchase_date DATE,
    last_used_date DATE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    franchise_id UUID REFERENCES franchises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_items_product_id ON product_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_items_franchise_id ON product_items(franchise_id);
CREATE INDEX IF NOT EXISTS idx_product_items_item_code ON product_items(item_code);
CREATE INDEX IF NOT EXISTS idx_product_items_status ON product_items(status);

-- Disable RLS for now (or add proper policies later)
ALTER TABLE product_items DISABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_product_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_items_updated_at
    BEFORE UPDATE ON product_items
    FOR EACH ROW
    EXECUTE FUNCTION update_product_items_updated_at();
*/
