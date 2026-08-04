-- =====================================================
-- BARCODE SCANNING SYSTEM - INTEGRATION WITH EXISTING PRODUCT_ITEMS
-- =====================================================
-- This script EXTENDS your existing product_items table
-- Adds scanning functionality without duplicating data
-- Uses existing barcodes from inventory system
-- =====================================================

BEGIN;

-- =====================================================
-- 1. EXTEND PRODUCT_ITEMS TABLE (Your existing table)
-- =====================================================
-- Add new columns to track scanning and lifecycle

-- Add scanning metadata
ALTER TABLE product_items 
ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_scanned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS total_scans INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rentals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_laundry_cycles INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_booking_id UUID,
ADD COLUMN IF NOT EXISTS current_location TEXT;

-- Add indexes for scanning performance
CREATE INDEX IF NOT EXISTS idx_product_items_barcode ON product_items(barcode);
CREATE INDEX IF NOT EXISTS idx_product_items_last_scanned ON product_items(last_scanned_at);
CREATE INDEX IF NOT EXISTS idx_product_items_current_booking ON product_items(current_booking_id);

COMMENT ON COLUMN product_items.last_scanned_at IS 'Timestamp of last barcode scan';
COMMENT ON COLUMN product_items.total_scans IS 'Total number of times this item has been scanned';
COMMENT ON COLUMN product_items.current_booking_id IS 'Active booking this item belongs to (NULL if available)';

-- =====================================================
-- 2. BARCODE SCAN HISTORY TABLE (New - Audit Log)
-- =====================================================
CREATE TABLE IF NOT EXISTS barcode_scan_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Item Reference (using your existing product_items)
    product_item_id UUID NOT NULL REFERENCES product_items(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL,
    
    -- Scan Information
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
    booking_id UUID,                                       -- Related booking
    order_id UUID,                                         -- Related order
    laundry_batch_id UUID,                                -- Related laundry batch
    
    -- Status Changes
    status_before TEXT,
    status_after TEXT,
    
    -- User & Location
    scanned_by UUID REFERENCES auth.users(id),
    scanned_location TEXT,
    device_info JSONB,
    
    -- Additional Data
    notes TEXT,
    metadata JSONB,
    
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

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_item ON barcode_scan_history(product_item_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_barcode ON barcode_scan_history(barcode);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_action ON barcode_scan_history(scan_action);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_booking ON barcode_scan_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_user ON barcode_scan_history(scanned_by);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_date ON barcode_scan_history(scanned_at);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_history_franchise ON barcode_scan_history(franchise_id);

COMMENT ON TABLE barcode_scan_history IS 'Immutable audit log of all barcode scans';

-- =====================================================
-- 3. BOOKING ITEM LINKS TABLE (Track which items in booking)
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_item_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    booking_id UUID NOT NULL,
    product_item_id UUID NOT NULL REFERENCES product_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
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
    
    -- Foreign Key
    CONSTRAINT fk_booking_item_link_booking 
        FOREIGN KEY (booking_id) 
        REFERENCES package_bookings(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint
    UNIQUE (booking_id, product_item_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_item_links_booking ON booking_item_links(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_item_links_item ON booking_item_links(product_item_id);
CREATE INDEX IF NOT EXISTS idx_booking_item_links_product ON booking_item_links(product_id);
CREATE INDEX IF NOT EXISTS idx_booking_item_links_status ON booking_item_links(status);
CREATE INDEX IF NOT EXISTS idx_booking_item_links_franchise ON booking_item_links(franchise_id);

COMMENT ON TABLE booking_item_links IS 'Links specific product items to bookings via barcode scanning';

-- =====================================================
-- 4. LAUNDRY ITEM TRACKING (Extend existing laundry system)
-- =====================================================
CREATE TABLE IF NOT EXISTS laundry_item_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    batch_id UUID NOT NULL REFERENCES laundry_batches(id) ON DELETE CASCADE,
    product_item_id UUID NOT NULL REFERENCES product_items(id) ON DELETE CASCADE,
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
    
    -- Unique constraint
    UNIQUE (batch_id, product_item_id)
);

CREATE INDEX IF NOT EXISTS idx_laundry_tracking_batch ON laundry_item_tracking(batch_id);
CREATE INDEX IF NOT EXISTS idx_laundry_tracking_item ON laundry_item_tracking(product_item_id);
CREATE INDEX IF NOT EXISTS idx_laundry_tracking_status ON laundry_item_tracking(status);
CREATE INDEX IF NOT EXISTS idx_laundry_tracking_franchise ON laundry_item_tracking(franchise_id);

COMMENT ON TABLE laundry_item_tracking IS 'Tracks individual items in laundry batches via barcode';

-- =====================================================
-- 5. TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Trigger: Auto-increment scan counters
CREATE OR REPLACE FUNCTION increment_item_scan_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE product_items
    SET 
        total_scans = total_scans + 1,
        last_scanned_at = NEW.scanned_at,
        last_scanned_by = NEW.scanned_by
    WHERE id = NEW.product_item_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_scan_count ON barcode_scan_history;
CREATE TRIGGER trg_increment_scan_count
    AFTER INSERT ON barcode_scan_history
    FOR EACH ROW
    EXECUTE FUNCTION increment_item_scan_count();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function: Get item status by barcode
CREATE OR REPLACE FUNCTION get_item_by_barcode(p_barcode TEXT)
RETURNS TABLE (
    item_id UUID,
    item_code TEXT,
    barcode TEXT,
    status TEXT,
    product_name TEXT,
    product_code TEXT,
    current_location TEXT,
    last_scanned_at TIMESTAMPTZ,
    current_booking_number TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pi.id AS item_id,
        pi.item_code,
        pi.barcode,
        pi.status,
        p.name AS product_name,
        p.product_code,
        pi.current_location,
        pi.last_scanned_at,
        pkg.package_number AS current_booking_number
    FROM product_items pi
    LEFT JOIN products p ON p.id = pi.product_id
    LEFT JOIN package_bookings pkg ON pkg.id = pi.current_booking_id
    WHERE pi.barcode = p_barcode;
END;
$$ LANGUAGE plpgsql;

-- Function: Record barcode scan (simplified)
CREATE OR REPLACE FUNCTION record_scan(
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
    v_item_id UUID;
    v_current_status TEXT;
    v_new_status TEXT;
BEGIN
    -- Get item details
    SELECT id, status INTO v_item_id, v_current_status
    FROM product_items
    WHERE barcode = p_barcode;
    
    IF v_item_id IS NULL THEN
        RAISE EXCEPTION 'Barcode not found: %', p_barcode;
    END IF;
    
    -- Determine new status based on action
    v_new_status := CASE p_action
        WHEN 'booking_add' THEN 'booked'
        WHEN 'delivery_out' THEN 'booked'
        WHEN 'return_in' THEN 'available'
        WHEN 'laundry_send' THEN 'in_laundry'
        WHEN 'laundry_receive' THEN 'available'
        WHEN 'archive_in' THEN 'available'
        WHEN 'damage_report' THEN 'damaged'
        ELSE v_current_status
    END;
    
    -- Insert scan history
    INSERT INTO barcode_scan_history (
        product_item_id,
        barcode,
        scan_action,
        booking_id,
        status_before,
        status_after,
        scanned_by,
        notes,
        franchise_id
    ) VALUES (
        v_item_id,
        p_barcode,
        p_action,
        p_booking_id,
        v_current_status,
        v_new_status,
        p_user_id,
        p_notes,
        p_franchise_id
    ) RETURNING id INTO v_scan_id;
    
    -- Update item status
    UPDATE product_items
    SET 
        status = v_new_status,
        current_booking_id = CASE 
            WHEN p_action IN ('booking_add', 'delivery_out') THEN p_booking_id
            WHEN p_action IN ('return_in', 'booking_remove') THEN NULL
            ELSE current_booking_id
        END
    WHERE id = v_item_id;
    
    RETURN v_scan_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_scan IS 'Records barcode scan and updates item status automatically';

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE barcode_scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_item_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_item_tracking ENABLE ROW LEVEL SECURITY;

-- Policies for scan history
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

-- Policies for booking links
CREATE POLICY "Users can manage their franchise booking links"
    ON booking_item_links
    FOR ALL
    USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

-- Policies for laundry tracking
CREATE POLICY "Users can manage their franchise laundry tracking"
    ON laundry_item_tracking
    FOR ALL
    USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 8. DATA MIGRATION (Optional - run if needed)
-- =====================================================

-- Populate current_booking_id for items that are already booked
-- UPDATE product_items pi
-- SET current_booking_id = (
--     SELECT pb.id 
--     FROM package_bookings pb
--     JOIN package_booking_items pbi ON pbi.booking_id = pb.id
--     WHERE pbi.product_id = pi.product_id
--     AND pb.status NOT IN ('completed', 'cancelled')
--     LIMIT 1
-- )
-- WHERE pi.status = 'booked' AND pi.current_booking_id IS NULL;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check new columns added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'product_items'
    AND column_name IN (
        'last_scanned_at',
        'last_scanned_by',
        'total_scans',
        'current_booking_id'
    );

-- Check new tables created
SELECT 
    'barcode_scan_history' AS table_name, 
    COUNT(*) AS record_count 
FROM barcode_scan_history
UNION ALL
SELECT 
    'booking_item_links' AS table_name, 
    COUNT(*) AS record_count 
FROM booking_item_links
UNION ALL
SELECT 
    'laundry_item_tracking' AS table_name, 
    COUNT(*) AS record_count 
FROM laundry_item_tracking;

-- =====================================================
-- SCRIPT COMPLETED SUCCESSFULLY
-- =====================================================
-- Extended:
-- - product_items table with scanning metadata
-- Created:
-- - barcode_scan_history (audit log)
-- - booking_item_links (booking assignments)
-- - laundry_item_tracking (laundry tracking)
-- - Helper functions for scanning
-- - RLS policies for security
-- =====================================================
