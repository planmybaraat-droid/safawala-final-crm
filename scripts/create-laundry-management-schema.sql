-- Create Laundry Management Schema for Supabase
-- This script creates all necessary tables and columns for laundry management

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
        
        -- Create index for better performance
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
    service_type VARCHAR(100) DEFAULT 'laundry', -- laundry, dry_cleaning, both
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
    vendor_name VARCHAR(255) NOT NULL, -- Denormalized for easier queries
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
    product_name VARCHAR(255) NOT NULL, -- Denormalized for easier queries
    product_category VARCHAR(100), -- Denormalized for easier queries
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
    -- Update total_items and total_cost in laundry_batches
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
ON CONFLICT DO NOTHING;

-- Insert sample laundry batches
DO $$
DECLARE
    vendor1_id UUID;
    vendor2_id UUID;
    vendor3_id UUID;
    franchise1_id UUID;
    user1_id UUID;
    batch1_id UUID;
    batch2_id UUID;
    batch3_id UUID;
    product1_id UUID;
    product2_id UUID;
    product3_id UUID;
BEGIN
    -- Get vendor IDs
    SELECT id INTO vendor1_id FROM vendors WHERE name = 'Premium Dry Cleaners' LIMIT 1;
    SELECT id INTO vendor2_id FROM vendors WHERE name = 'Royal Laundry Services' LIMIT 1;
    SELECT id INTO vendor3_id FROM vendors WHERE name = 'Express Clean Co.' LIMIT 1;
    
    -- Get franchise and user IDs
    SELECT id INTO franchise1_id FROM franchises LIMIT 1;
    SELECT id INTO user1_id FROM users LIMIT 1;
    
    -- Get some product IDs
    SELECT id INTO product1_id FROM products LIMIT 1 OFFSET 0;
    SELECT id INTO product2_id FROM products LIMIT 1 OFFSET 1;
    SELECT id INTO product3_id FROM products LIMIT 1 OFFSET 2;
    
    -- Insert sample batches
    INSERT INTO laundry_batches (batch_number, vendor_id, vendor_name, franchise_id, status, sent_date, expected_return_date, actual_return_date, notes, created_by) VALUES
    ('LB001', vendor1_id, 'Premium Dry Cleaners', franchise1_id, 'in_progress', '2024-01-15', '2024-01-18', NULL, 'Handle with care - delicate fabrics', user1_id),
    ('LB002', vendor2_id, 'Royal Laundry Services', franchise1_id, 'completed', '2024-01-12', '2024-01-15', '2024-01-15', 'Regular cleaning batch', user1_id),
    ('LB003', vendor3_id, 'Express Clean Co.', franchise1_id, 'pending', '2024-01-16', '2024-01-19', NULL, 'Rush order for weekend wedding', user1_id)
    RETURNING id INTO batch1_id;
    
    -- Get the batch IDs for items
    SELECT id INTO batch1_id FROM laundry_batches WHERE batch_number = 'LB001';
    SELECT id INTO batch2_id FROM laundry_batches WHERE batch_number = 'LB002';
    SELECT id INTO batch3_id FROM laundry_batches WHERE batch_number = 'LB003';
    
    -- Insert sample batch items
    IF product1_id IS NOT NULL AND batch1_id IS NOT NULL THEN
        INSERT INTO laundry_batch_items (batch_id, product_id, product_name, product_category, quantity, condition_before, unit_cost, total_cost, notes) VALUES
        (batch1_id, product1_id, 'Wedding Dress', 'Bridal Wear', 2, 'dirty', 50.00, 100.00, 'Delicate silk material'),
        (batch1_id, product2_id, 'Tuxedo', 'Formal Wear', 3, 'stained', 40.00, 120.00, 'Wine stain on lapel'),
        (batch2_id, product3_id, 'Tablecloth', 'Linens', 5, 'dirty', 15.00, 75.00, 'Standard cleaning'),
        (batch2_id, product1_id, 'Napkins', 'Linens', 20, 'dirty', 5.00, 100.00, 'Bulk cleaning'),
        (batch3_id, product2_id, 'Bridal Veil', 'Veils & Drapes', 1, 'stained', 60.00, 60.00, 'Makeup stains - urgent');
    END IF;
    
    -- Insert tracking records
    IF batch1_id IS NOT NULL THEN
        INSERT INTO laundry_tracking (batch_id, status, status_date, notes, updated_by) VALUES
        (batch1_id, 'pending', '2024-01-15 09:00:00', 'Batch created and sent to vendor', user1_id),
        (batch1_id, 'in_progress', '2024-01-15 14:00:00', 'Vendor confirmed receipt and started processing', user1_id);
    END IF;
    
    IF batch2_id IS NOT NULL THEN
        INSERT INTO laundry_tracking (batch_id, status, status_date, notes, updated_by) VALUES
        (batch2_id, 'pending', '2024-01-12 10:00:00', 'Batch created and sent to vendor', user1_id),
        (batch2_id, 'in_progress', '2024-01-12 15:00:00', 'Processing started', user1_id),
        (batch2_id, 'completed', '2024-01-15 11:00:00', 'All items cleaned and ready for pickup', user1_id);
    END IF;
    
    IF batch3_id IS NOT NULL THEN
        INSERT INTO laundry_tracking (batch_id, status, status_date, notes, updated_by) VALUES
        (batch3_id, 'pending', '2024-01-16 08:00:00', 'Rush order created', user1_id);
    END IF;
    
END $$;

-- Create a view for easy batch summary queries
CREATE OR REPLACE VIEW laundry_batch_summary AS
SELECT 
    lb.id,
    lb.batch_number,
    lb.vendor_name,
    lb.status,
    lb.total_items,
    lb.total_cost,
    lb.sent_date,
    lb.expected_return_date,
    lb.actual_return_date,
    lb.notes,
    lb.created_at,
    COUNT(lbi.id) as item_types_count,
    STRING_AGG(DISTINCT lbi.product_category, ', ') as categories
FROM laundry_batches lb
LEFT JOIN laundry_batch_items lbi ON lb.id = lbi.batch_id
GROUP BY lb.id, lb.batch_number, lb.vendor_name, lb.status, lb.total_items, lb.total_cost, 
         lb.sent_date, lb.expected_return_date, lb.actual_return_date, lb.notes, lb.created_at
ORDER BY lb.created_at DESC;

-- Enable Row Level Security (RLS) for the new tables
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - can be customized based on requirements)
CREATE POLICY "Users can view vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Users can manage vendors" ON vendors FOR ALL USING (true);

CREATE POLICY "Users can view laundry batches" ON laundry_batches FOR SELECT USING (true);
CREATE POLICY "Users can manage laundry batches" ON laundry_batches FOR ALL USING (true);

CREATE POLICY "Users can view batch items" ON laundry_batch_items FOR SELECT USING (true);
CREATE POLICY "Users can manage batch items" ON laundry_batch_items FOR ALL USING (true);

CREATE POLICY "Users can view tracking" ON laundry_tracking FOR SELECT USING (true);
CREATE POLICY "Users can manage tracking" ON laundry_tracking FOR ALL USING (true);

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
    RAISE NOTICE 'Additional features:';
    RAISE NOTICE '- Category column added to products table';
    RAISE NOTICE '- Automatic timestamp updates';
    RAISE NOTICE '- Automatic batch total calculations';
    RAISE NOTICE '- Performance indexes created';
    RAISE NOTICE '- Row Level Security enabled';
    RAISE NOTICE '- laundry_batch_summary view created';
    RAISE NOTICE '';
    RAISE NOTICE 'The laundry management system is now ready to use!';
END $$;
