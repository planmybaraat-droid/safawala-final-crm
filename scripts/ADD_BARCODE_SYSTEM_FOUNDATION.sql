-- =====================================================
-- BARCODE SCANNING SYSTEM - PHASE 1: FOUNDATION
-- =====================================================
-- This script creates the foundational tables for barcode scanning
-- Support for: Booking, Archive, Laundry, Returns
-- Steve Jobs Philosophy: Simple, Context-Aware, Invisible Technology
-- =====================================================

BEGIN;

-- =====================================================
-- 1. PRODUCT BARCODES TABLE
-- =====================================================
-- Master table: Links barcodes to physical product items
-- Each physical item gets ONE unique barcode
CREATE TABLE IF NOT EXISTS product_barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode TEXT UNIQUE NOT NULL,                          -- Physical barcode on item (e.g., "SAFA-001-A")
    
    -- Product Identification
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID,                                        -- Optional: for package variants
    
    -- Current Status & Location
    status TEXT NOT NULL DEFAULT 'available' CHECK (
        status IN (
            'available',      -- Ready to rent
            'rented',         -- Currently with customer
            'in_laundry',     -- Sent to laundry
            'in_transit',     -- Being delivered/returned
            'maintenance',    -- Under repair
            'damaged',        -- Damaged, not usable
            'archived'        -- Stored, not in active circulation
        )
    ),
    
    -- Tracking Information
    current_booking_id UUID,                               -- NULL if not rented
    current_location TEXT,                                 -- Warehouse, Laundry, Customer, etc.
    last_scanned_at TIMESTAMPTZ,
    last_scanned_by UUID REFERENCES auth.users(id),
    
    -- Lifecycle Tracking
    total_scans INTEGER DEFAULT 0,
    total_rentals INTEGER DEFAULT 0,
    total_laundry_cycles INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT fk_current_booking 
        FOREIGN KEY (current_booking_id) 
        REFERENCES package_bookings(id) 
        ON DELETE SET NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_barcodes_barcode ON product_barcodes(barcode);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_product_id ON product_barcodes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_status ON product_barcodes(status);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_current_booking ON product_barcodes(current_booking_id);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_franchise ON product_barcodes(franchise_id);

COMMENT ON TABLE product_barcodes IS 'Master table tracking individual physical items via barcodes';
COMMENT ON COLUMN product_barcodes.barcode IS 'Unique barcode identifier on physical item';
COMMENT ON COLUMN product_barcodes.status IS 'Current lifecycle status of the item';
COMMENT ON COLUMN product_barcodes.current_booking_id IS 'Active booking this item belongs to (NULL if available)';

-- =====================================================
-- 2. BARCODE SCAN HISTORY TABLE
-- =====================================================
-- Immutable audit log of every scan action
-- Used for: Analytics, tracking, troubleshooting
CREATE TABLE IF NOT EXISTS barcode_scan_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scan Information
    barcode TEXT NOT NULL,                                 -- Barcode that was scanned
    scan_action TEXT NOT NULL CHECK (
        scan_action IN (
            'booking_add',        -- Added to booking
            'booking_remove',     -- Removed from booking
            'delivery_out',       -- Delivered to customer
            'return_in',          -- Returned from customer
            'laundry_send',       -- Sent to laundry
            'laundry_receive',    -- Received from laundry
            'archive_in',         -- Moved to archive
            'archive_out',        -- Removed from archive
            'inventory_check',    -- General inventory scan
            'damage_report',      -- Item marked as damaged
            'maintenance_in',     -- Sent for maintenance
            'maintenance_out'     -- Returned from maintenance
        )
    ),
    
    -- Context Information
    booking_id UUID,                                       -- Related booking (if applicable)
    order_id UUID,                                         -- Related order (if applicable)
    laundry_batch_id UUID,                                -- Related laundry batch (if applicable)
    
    -- Status Changes
    status_before TEXT,                                   -- Status before scan
    status_after TEXT,                                    -- Status after scan
    
    -- User & Location
    scanned_by UUID REFERENCES auth.users(id),
    scanned_location TEXT,                                -- Optional: GPS coordinates or location name
    device_info JSONB,                                    -- Optional: Device details
    
    -- Additional Data
    notes TEXT,
    metadata JSONB,                                       -- Flexible field for action-specific data
    
    -- Timestamps
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    
    -- Foreign Keys
    CONSTRAINT fk_scan_history_booking 
        FOREIGN KEY (booking_id) 
        REFERENCES package_bookings(id) 
        ON DELETE SET NULL,
    CONSTRAINT fk_scan_history_order 
        FOREIGN KEY (order_id) 
        REFERENCES product_orders(id) 
        ON DELETE SET NULL
);

-- Indexes for analytics and queries
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_barcode ON barcode_scan_history(barcode);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_action ON barcode_scan_history(scan_action);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_booking ON barcode_scan_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_user ON barcode_scan_history(scanned_by);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_date ON barcode_scan_history(scanned_at);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_franchise ON barcode_scan_history(franchise_id);

COMMENT ON TABLE barcode_scan_history IS 'Immutable audit log of all barcode scans';
COMMENT ON COLUMN barcode_scan_history.scan_action IS 'Type of action performed during scan';
COMMENT ON COLUMN barcode_scan_history.metadata IS 'Flexible JSONB field for action-specific data';

-- =====================================================
-- 3. BOOKING BARCODE LINKS TABLE
-- =====================================================
-- Links barcodes to bookings (many-to-many)
-- Tracks which specific items were assigned to which booking
CREATE TABLE IF NOT EXISTS booking_barcode_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    booking_id UUID NOT NULL,
    barcode_id UUID NOT NULL REFERENCES product_barcodes(id) ON DELETE CASCADE,
    
    -- Item Details
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    
    -- Status Tracking
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (
        status IN (
            'assigned',       -- Assigned to booking
            'delivered',      -- Delivered to customer
            'with_customer',  -- Currently with customer
            'in_laundry',     -- In laundry during rental
            'returned',       -- Returned from customer
            'completed'       -- Booking completed
        )
    ),
    
    -- Timestamps
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    
    -- Foreign Keys
    CONSTRAINT fk_booking_link_booking 
        FOREIGN KEY (booking_id) 
        REFERENCES package_bookings(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint: same barcode can't be assigned twice to same booking
    UNIQUE (booking_id, barcode_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_barcode_links_booking ON booking_barcode_links(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_barcode_links_barcode ON booking_barcode_links(barcode_id);
CREATE INDEX IF NOT EXISTS idx_booking_barcode_links_product ON booking_barcode_links(product_id);
CREATE INDEX IF NOT EXISTS idx_booking_barcode_links_status ON booking_barcode_links(status);
CREATE INDEX IF NOT EXISTS idx_booking_barcode_links_franchise ON booking_barcode_links(franchise_id);

COMMENT ON TABLE booking_barcode_links IS 'Links specific barcoded items to bookings';
COMMENT ON COLUMN booking_barcode_links.status IS 'Current status of this item within the booking lifecycle';

-- =====================================================
-- 4. LAUNDRY BARCODE TRACKING TABLE
-- =====================================================
-- Extension to existing laundry_batches for barcode tracking
CREATE TABLE IF NOT EXISTS laundry_barcode_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    batch_id UUID NOT NULL REFERENCES laundry_batches(id) ON DELETE CASCADE,
    barcode_id UUID NOT NULL REFERENCES product_barcodes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'sent' CHECK (
        status IN (
            'sent',           -- Sent to laundry
            'in_process',     -- Being cleaned
            'ready',          -- Ready for pickup
            'received',       -- Received back
            'damaged',        -- Damaged during laundry
            'lost'            -- Lost at laundry
        )
    ),
    
    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    received_at TIMESTAMPTZ,
    expected_return_date DATE,
    
    -- Cost & Notes
    cleaning_cost NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    
    -- Unique constraint: same item can't be in same batch twice
    UNIQUE (batch_id, barcode_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_laundry_barcode_items_batch ON laundry_barcode_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_laundry_barcode_items_barcode ON laundry_barcode_items(barcode_id);
CREATE INDEX IF NOT EXISTS idx_laundry_barcode_items_status ON laundry_barcode_items(status);
CREATE INDEX IF NOT EXISTS idx_laundry_barcode_items_franchise ON laundry_barcode_items(franchise_id);

COMMENT ON TABLE laundry_barcode_items IS 'Tracks individual barcoded items in laundry batches';

-- =====================================================
-- 5. TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Trigger: Update product_barcodes.updated_at
CREATE OR REPLACE FUNCTION update_product_barcodes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_barcodes_updated ON product_barcodes;
CREATE TRIGGER trg_product_barcodes_updated
    BEFORE UPDATE ON product_barcodes
    FOR EACH ROW
    EXECUTE FUNCTION update_product_barcodes_timestamp();

-- Trigger: Auto-increment total_scans on product_barcodes when scanned
CREATE OR REPLACE FUNCTION increment_barcode_scan_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE product_barcodes
    SET 
        total_scans = total_scans + 1,
        last_scanned_at = NEW.scanned_at,
        last_scanned_by = NEW.scanned_by
    WHERE barcode = NEW.barcode;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_scan_count ON barcode_scan_history;
CREATE TRIGGER trg_increment_scan_count
    AFTER INSERT ON barcode_scan_history
    FOR EACH ROW
    EXECUTE FUNCTION increment_barcode_scan_count();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_barcode_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_barcode_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see barcodes from their franchise only
CREATE POLICY "Users can view their franchise barcodes"
    ON product_barcodes
    FOR SELECT
    USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert/update barcodes in their franchise
CREATE POLICY "Users can manage their franchise barcodes"
    ON product_barcodes
    FOR ALL
    USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

-- Similar policies for other tables
CREATE POLICY "Users can view their franchise scan history"
    ON barcode_scan_history
    FOR SELECT
    USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert scan history for their franchise"
    ON barcode_scan_history
    FOR INSERT
    WITH CHECK (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

-- Booking barcode links
CREATE POLICY "Users can manage their franchise booking barcodes"
    ON booking_barcode_links
    FOR ALL
    USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

-- Laundry barcode items
CREATE POLICY "Users can manage their franchise laundry barcodes"
    ON laundry_barcode_items
    FOR ALL
    USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function: Get barcode status
CREATE OR REPLACE FUNCTION get_barcode_status(p_barcode TEXT)
RETURNS TABLE (
    barcode TEXT,
    status TEXT,
    product_name TEXT,
    current_location TEXT,
    last_scanned_at TIMESTAMPTZ,
    current_booking_number TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pb.barcode,
        pb.status,
        p.name AS product_name,
        pb.current_location,
        pb.last_scanned_at,
        pkg.package_number AS current_booking_number
    FROM product_barcodes pb
    LEFT JOIN products p ON p.id = pb.product_id
    LEFT JOIN package_bookings pkg ON pkg.id = pb.current_booking_id
    WHERE pb.barcode = p_barcode;
END;
$$ LANGUAGE plpgsql;

-- Function: Record barcode scan
CREATE OR REPLACE FUNCTION record_barcode_scan(
    p_barcode TEXT,
    p_action TEXT,
    p_booking_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_franchise_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_scan_id UUID;
    v_current_status TEXT;
    v_new_status TEXT;
BEGIN
    -- Get current status
    SELECT status INTO v_current_status
    FROM product_barcodes
    WHERE barcode = p_barcode;
    
    -- Determine new status based on action
    v_new_status := CASE p_action
        WHEN 'booking_add' THEN 'rented'
        WHEN 'delivery_out' THEN 'rented'
        WHEN 'return_in' THEN 'available'
        WHEN 'laundry_send' THEN 'in_laundry'
        WHEN 'laundry_receive' THEN 'available'
        WHEN 'archive_in' THEN 'archived'
        WHEN 'archive_out' THEN 'available'
        WHEN 'damage_report' THEN 'damaged'
        WHEN 'maintenance_in' THEN 'maintenance'
        WHEN 'maintenance_out' THEN 'available'
        ELSE v_current_status
    END;
    
    -- Insert scan history
    INSERT INTO barcode_scan_history (
        barcode,
        scan_action,
        booking_id,
        status_before,
        status_after,
        scanned_by,
        notes,
        franchise_id
    ) VALUES (
        p_barcode,
        p_action,
        p_booking_id,
        v_current_status,
        v_new_status,
        p_user_id,
        p_notes,
        p_franchise_id
    ) RETURNING id INTO v_scan_id;
    
    -- Update barcode status
    UPDATE product_barcodes
    SET 
        status = v_new_status,
        current_booking_id = CASE 
            WHEN p_action IN ('booking_add', 'delivery_out') THEN p_booking_id
            WHEN p_action IN ('return_in', 'booking_remove') THEN NULL
            ELSE current_booking_id
        END
    WHERE barcode = p_barcode;
    
    RETURN v_scan_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_barcode_scan IS 'Records a barcode scan and updates item status automatically';

-- =====================================================
-- 8. SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample barcodes (only if products table has data)
-- DO $$
-- DECLARE
--     v_product_id UUID;
--     v_franchise_id UUID;
-- BEGIN
--     -- Get first product and franchise
--     SELECT id INTO v_product_id FROM products LIMIT 1;
--     SELECT id INTO v_franchise_id FROM franchises LIMIT 1;
--     
--     IF v_product_id IS NOT NULL AND v_franchise_id IS NOT NULL THEN
--         INSERT INTO product_barcodes (barcode, product_id, status, franchise_id)
--         VALUES 
--             ('SAFA-001-A', v_product_id, 'available', v_franchise_id),
--             ('SAFA-001-B', v_product_id, 'available', v_franchise_id),
--             ('SAFA-001-C', v_product_id, 'available', v_franchise_id)
--         ON CONFLICT (barcode) DO NOTHING;
--     END IF;
-- END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check tables created
SELECT 
    'product_barcodes' AS table_name, 
    COUNT(*) AS record_count 
FROM product_barcodes
UNION ALL
SELECT 
    'barcode_scan_history' AS table_name, 
    COUNT(*) AS record_count 
FROM barcode_scan_history
UNION ALL
SELECT 
    'booking_barcode_links' AS table_name, 
    COUNT(*) AS record_count 
FROM booking_barcode_links
UNION ALL
SELECT 
    'laundry_barcode_items' AS table_name, 
    COUNT(*) AS record_count 
FROM laundry_barcode_items;

-- =====================================================
-- SCRIPT COMPLETED SUCCESSFULLY
-- =====================================================
-- Created:
-- - product_barcodes table (master barcode tracking)
-- - barcode_scan_history table (audit log)
-- - booking_barcode_links table (booking assignments)
-- - laundry_barcode_items table (laundry tracking)
-- - Triggers for auto-updates
-- - RLS policies for security
-- - Helper functions for common operations
-- =====================================================
