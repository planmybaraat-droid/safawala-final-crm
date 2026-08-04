-- Setup Laundry Management Database Schema
-- This script creates all necessary tables for the laundry management system

-- Creating comprehensive laundry management schema to fix "Database not configured" error

-- First, add category column to products table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'category'
    ) THEN
        ALTER TABLE products ADD COLUMN category VARCHAR(100);
        
        -- Update existing products with intelligent categorization
        UPDATE products SET category = CASE
            WHEN LOWER(name) LIKE '%dress%' OR LOWER(name) LIKE '%gown%' OR LOWER(name) LIKE '%bridal%' THEN 'Bridal Wear'
            WHEN LOWER(name) LIKE '%tuxedo%' OR LOWER(name) LIKE '%suit%' OR LOWER(name) LIKE '%formal%' THEN 'Formal Wear'
            WHEN LOWER(name) LIKE '%turban%' OR LOWER(name) LIKE '%pagri%' OR LOWER(name) LIKE '%headwear%' THEN 'Traditional Headwear'
            WHEN LOWER(name) LIKE '%tablecloth%' OR LOWER(name) LIKE '%napkin%' OR LOWER(name) LIKE '%linen%' THEN 'Linens'
            WHEN LOWER(name) LIKE '%decoration%' OR LOWER(name) LIKE '%centerpiece%' OR LOWER(name) LIKE '%flower%' THEN 'Decorations'
            WHEN LOWER(name) LIKE '%jewelry%' OR LOWER(name) LIKE '%necklace%' OR LOWER(name) LIKE '%earring%' THEN 'Jewelry'
            WHEN LOWER(name) LIKE '%shoe%' OR LOWER(name) LIKE '%footwear%' THEN 'Footwear'
            WHEN LOWER(name) LIKE '%veil%' OR LOWER(name) LIKE '%dupatta%' THEN 'Veils & Drapes'
            WHEN LOWER(name) LIKE '%light%' OR LOWER(name) LIKE '%candle%' OR LOWER(name) LIKE '%lamp%' THEN 'Lighting'
            ELSE 'Wedding Accessories'
        END;
        
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        RAISE NOTICE 'Category column added to products table and existing products categorized';
    ELSE
        RAISE NOTICE 'Category column already exists in products table';
    END IF;
END $$;

-- Create vendors table if it doesn't exist
CREATE TABLE IF NOT EXISTS vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    service_type VARCHAR(100) DEFAULT 'laundry',
    pricing_per_item DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create laundry_batches table
CREATE TABLE IF NOT EXISTS laundry_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    vendor_name VARCHAR(255) NOT NULL,
    franchise_id UUID REFERENCES franchises(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'returned', 'cancelled')),
    total_items INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    sent_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    notes TEXT,
    special_instructions TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create laundry_batch_items table
CREATE TABLE IF NOT EXISTS laundry_batch_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES laundry_batches(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    product_category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    condition_before VARCHAR(50) DEFAULT 'dirty' CHECK (condition_before IN ('dirty', 'stained', 'damaged', 'clean')),
    condition_after VARCHAR(50) CHECK (condition_after IN ('clean', 'stained', 'damaged', 'lost')),
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    damage_description TEXT,
    damage_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create laundry_tracking table for detailed status tracking
CREATE TABLE IF NOT EXISTS laundry_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES laundry_batches(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    status_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_laundry_batches_vendor_id ON laundry_batches(vendor_id);
CREATE INDEX IF NOT EXISTS idx_laundry_batches_status ON laundry_batches(status);
CREATE INDEX IF NOT EXISTS idx_laundry_batches_sent_date ON laundry_batches(sent_date);
CREATE INDEX IF NOT EXISTS idx_laundry_batches_franchise_id ON laundry_batches(franchise_id);
CREATE INDEX IF NOT EXISTS idx_laundry_batch_items_batch_id ON laundry_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_laundry_batch_items_product_id ON laundry_batch_items(product_id);
CREATE INDEX IF NOT EXISTS idx_laundry_tracking_batch_id ON laundry_tracking(batch_id);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_laundry_batches_updated_at ON laundry_batches;
CREATE TRIGGER update_laundry_batches_updated_at BEFORE UPDATE ON laundry_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_laundry_batch_items_updated_at ON laundry_batch_items;
CREATE TRIGGER update_laundry_batch_items_updated_at BEFORE UPDATE ON laundry_batch_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update batch totals
CREATE OR REPLACE FUNCTION update_batch_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE laundry_batches 
    SET 
        total_items = (
            SELECT COALESCE(SUM(quantity), 0) 
            FROM laundry_batch_items 
            WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)
        ),
        total_cost = (
            SELECT COALESCE(SUM(total_cost), 0.00) 
            FROM laundry_batch_items 
            WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)
        )
    WHERE id = COALESCE(NEW.batch_id, OLD.batch_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply trigger to automatically update batch totals
DROP TRIGGER IF EXISTS update_batch_totals_trigger ON laundry_batch_items;
CREATE TRIGGER update_batch_totals_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON laundry_batch_items 
    FOR EACH ROW EXECUTE FUNCTION update_batch_totals();

-- Insert sample vendors
INSERT INTO vendors (name, contact_person, phone, email, service_type, pricing_per_item, notes) VALUES
('Premium Dry Cleaners', 'Rajesh Kumar', '+91-9876543210', 'rajesh@premiumdry.com', 'both', 25.00, 'Specializes in delicate fabrics and wedding attire'),
('Royal Laundry Services', 'Priya Sharma', '+91-9876543211', 'priya@royallaundry.com', 'laundry', 15.00, 'Fast turnaround, good for bulk items'),
('Express Clean Co.', 'Amit Singh', '+91-9876543212', 'amit@expressclean.com', 'dry_cleaning', 30.00, 'Premium service for expensive items'),
('City Wash Center', 'Sunita Devi', '+91-9876543213', 'sunita@citywash.com', 'laundry', 12.00, 'Budget-friendly option for linens'),
('Elite Fabric Care', 'Vikram Gupta', '+91-9876543214', 'vikram@elitefabric.com', 'both', 35.00, 'Luxury service for high-end wedding items')
ON CONFLICT (name) DO NOTHING;

-- Insert sample laundry batches with proper data
DO $$
DECLARE
    vendor1_id UUID;
    vendor2_id UUID;
    franchise1_id UUID;
    user1_id UUID;
    batch1_id UUID;
BEGIN
    -- Get vendor IDs
    SELECT id INTO vendor1_id FROM vendors WHERE name = 'Premium Dry Cleaners' LIMIT 1;
    SELECT id INTO vendor2_id FROM vendors WHERE name = 'Royal Laundry Services' LIMIT 1;
    
    -- Get franchise and user IDs
    SELECT id INTO franchise1_id FROM franchises LIMIT 1;
    SELECT id INTO user1_id FROM users LIMIT 1;
    
    -- Insert sample batch
    INSERT INTO laundry_batches (batch_number, vendor_id, vendor_name, franchise_id, status, sent_date, expected_return_date, notes, created_by) VALUES
    ('LB001', vendor1_id, 'Premium Dry Cleaners', franchise1_id, 'in_progress', '2025-01-15', '2025-01-18', 'Handle with care - delicate fabrics', user1_id)
    ON CONFLICT (batch_number) DO NOTHING
    RETURNING id INTO batch1_id;
    
    -- Get the batch ID if it already exists
    IF batch1_id IS NULL THEN
        SELECT id INTO batch1_id FROM laundry_batches WHERE batch_number = 'LB001';
    END IF;
    
    -- Insert sample batch items
    IF batch1_id IS NOT NULL THEN
        INSERT INTO laundry_batch_items (batch_id, product_name, product_category, quantity, condition_before, unit_cost, total_cost, notes) VALUES
        (batch1_id, 'Wedding Dress', 'Bridal Wear', 2, 'dirty', 50.00, 100.00, 'Delicate silk material'),
        (batch1_id, 'Tuxedo', 'Formal Wear', 3, 'stained', 40.00, 120.00, 'Wine stain on lapel')
        ON CONFLICT DO NOTHING;
        
        -- Insert tracking records
        INSERT INTO laundry_tracking (batch_id, status, status_date, notes, updated_by) VALUES
        (batch1_id, 'pending', '2025-01-15 09:00:00', 'Batch created and sent to vendor', user1_id),
        (batch1_id, 'in_progress', '2025-01-15 14:00:00', 'Vendor confirmed receipt and started processing', user1_id)
        ON CONFLICT DO NOTHING;
    END IF;
    
END $$;

-- Enable RLS (production mode)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_tracking ENABLE ROW LEVEL SECURITY;

-- Helpers for tenant policies
CREATE OR REPLACE FUNCTION jwt_franchise_id()
RETURNS uuid STABLE LANGUAGE sql AS $$
    SELECT COALESCE(
        NULLIF(auth.jwt() ->> 'franchise_id', '')::uuid,
        NULLIF((auth.jwt() -> 'user_metadata' ->> 'franchise_id'), '')::uuid
    )
$$;

CREATE OR REPLACE FUNCTION app_is_super_admin()
RETURNS boolean STABLE LANGUAGE sql AS $$
    SELECT (auth.jwt() ->> 'app_role') = 'super_admin'
                 OR (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'super_admin';
$$;

-- Vendors strategy: shared catalog (read for all authenticated), writes only by super_admin
DO $$BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'vendors'::regclass AND polname ILIKE 'Enable all%') THEN
        EXECUTE 'DROP POLICY "Enable all for authenticated users" ON vendors';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'vendors'::regclass AND polname = 'vendors_read') THEN
        EXECUTE $$CREATE POLICY vendors_read ON vendors FOR SELECT USING (true)$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'vendors'::regclass AND polname = 'vendors_write_admin') THEN
        EXECUTE $$CREATE POLICY vendors_write_admin ON vendors FOR ALL
                         USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())$$;
    END IF;
END$$;

-- Tenant policies for laundry tables (scoped by franchise_id via laundry_batches)
-- laundry_batches
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batches'::regclass AND polname = 'lb_select') THEN
        EXECUTE $$CREATE POLICY lb_select ON laundry_batches FOR SELECT
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batches'::regclass AND polname = 'lb_insert') THEN
        EXECUTE $$CREATE POLICY lb_insert ON laundry_batches FOR INSERT
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batches'::regclass AND polname = 'lb_update') THEN
        EXECUTE $$CREATE POLICY lb_update ON laundry_batches FOR UPDATE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batches'::regclass AND polname = 'lb_delete') THEN
        EXECUTE $$CREATE POLICY lb_delete ON laundry_batches FOR DELETE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
END$$;

-- laundry_batch_items (join-based enforcement via batch)
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batch_items'::regclass AND polname = 'lbi_select') THEN
        EXECUTE $$CREATE POLICY lbi_select ON laundry_batch_items FOR SELECT
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batch_items'::regclass AND polname = 'lbi_insert') THEN
        EXECUTE $$CREATE POLICY lbi_insert ON laundry_batch_items FOR INSERT
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batch_items'::regclass AND polname = 'lbi_update') THEN
        EXECUTE $$CREATE POLICY lbi_update ON laundry_batch_items FOR UPDATE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batch_items'::regclass AND polname = 'lbi_delete') THEN
        EXECUTE $$CREATE POLICY lbi_delete ON laundry_batch_items FOR DELETE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
END$$;

-- laundry_tracking: enforce via batch
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_tracking'::regclass AND polname = 'lt_select') THEN
        EXECUTE $$CREATE POLICY lt_select ON laundry_tracking FOR SELECT
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_tracking'::regclass AND polname = 'lt_insert') THEN
        EXECUTE $$CREATE POLICY lt_insert ON laundry_tracking FOR INSERT
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_tracking'::regclass AND polname = 'lt_update') THEN
        EXECUTE $$CREATE POLICY lt_update ON laundry_tracking FOR UPDATE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_tracking'::regclass AND polname = 'lt_delete') THEN
        EXECUTE $$CREATE POLICY lt_delete ON laundry_tracking FOR DELETE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
END$$;

-- Final verification and summary
DO $$
DECLARE
    vendor_count INTEGER;
    batch_count INTEGER;
    item_count INTEGER;
    tracking_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO vendor_count FROM vendors;
    SELECT COUNT(*) INTO batch_count FROM laundry_batches;
    SELECT COUNT(*) INTO item_count FROM laundry_batch_items;
    SELECT COUNT(*) INTO tracking_count FROM laundry_tracking;
    
    RAISE NOTICE '=== LAUNDRY MANAGEMENT SCHEMA SETUP COMPLETE ===';
    RAISE NOTICE 'Vendors created: %', vendor_count;
    RAISE NOTICE 'Laundry batches created: %', batch_count;
    RAISE NOTICE 'Batch items created: %', item_count;
    RAISE NOTICE 'Tracking records created: %', tracking_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '- vendors (with sample data)';
    RAISE NOTICE '- laundry_batches (with sample data)';
    RAISE NOTICE '- laundry_batch_items (with sample data)';
    RAISE NOTICE '- laundry_tracking (with sample data)';
    RAISE NOTICE '';
    RAISE NOTICE 'The laundry management system is now ready to use!';
END $$;
