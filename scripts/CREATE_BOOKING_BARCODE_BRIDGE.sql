-- =====================================================
-- BOOKING BARCODE ASSIGNMENT SYSTEM
-- =====================================================
-- This table bridges the gap between:
--   1. Generic bookings (quantity-based: "10 sherwanis")
--   2. Physical barcodes (individual: "PROD-6736-001")
-- 
-- Purpose: Track WHICH specific barcoded items are assigned to WHICH booking
-- Enables: Full lifecycle tracking from assignment → delivery → return
-- =====================================================

-- Drop existing table if exists
DROP TABLE IF EXISTS booking_barcode_assignments CASCADE;
DROP INDEX IF EXISTS idx_booking_barcode_assignments_booking;
DROP INDEX IF EXISTS idx_booking_barcode_assignments_barcode;
DROP INDEX IF EXISTS idx_booking_barcode_assignments_product;
DROP INDEX IF EXISTS idx_booking_barcode_assignments_status;
DROP INDEX IF EXISTS idx_booking_barcode_assignments_franchise;

-- =====================================================
-- MAIN TABLE: booking_barcode_assignments
-- =====================================================
CREATE TABLE booking_barcode_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Booking Context (supports both package_bookings and product_orders)
  booking_id UUID NOT NULL,
  booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('package', 'product')),
  
  -- Barcode Link
  barcode_id UUID NOT NULL REFERENCES product_barcodes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Lifecycle Status Tracking
  status VARCHAR(20) DEFAULT 'assigned' CHECK (
    status IN (
      'assigned',       -- Barcode assigned to booking (pending delivery)
      'delivered',      -- Item delivered to customer
      'with_customer',  -- Currently with customer (active rental)
      'returned',       -- Item returned from customer
      'completed'       -- Booking completed, item back to available
    )
  ),
  
  -- Timestamps for Complete Lifecycle Tracking
  assigned_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  returned_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- User Tracking
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  delivered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  returned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Additional Context
  notes TEXT,
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(booking_id, barcode_id)
);

-- =====================================================
-- INDEXES for Fast Lookups
-- =====================================================
CREATE INDEX idx_booking_barcode_assignments_booking ON booking_barcode_assignments(booking_id);
CREATE INDEX idx_booking_barcode_assignments_barcode ON booking_barcode_assignments(barcode_id);
CREATE INDEX idx_booking_barcode_assignments_product ON booking_barcode_assignments(product_id);
CREATE INDEX idx_booking_barcode_assignments_status ON booking_barcode_assignments(status);
CREATE INDEX idx_booking_barcode_assignments_franchise ON booking_barcode_assignments(franchise_id);
CREATE INDEX idx_booking_barcode_assignments_booking_type ON booking_barcode_assignments(booking_type);

-- Combined indexes for common queries
CREATE INDEX idx_booking_barcode_assignments_status_franchise 
  ON booking_barcode_assignments(status, franchise_id);
CREATE INDEX idx_booking_barcode_assignments_booking_status 
  ON booking_barcode_assignments(booking_id, status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE booking_barcode_assignments ENABLE ROW LEVEL SECURITY;

-- Allow all operations (using API key auth)
DROP POLICY IF EXISTS "Allow all operations on booking_barcode_assignments" ON booking_barcode_assignments;
CREATE POLICY "Allow all operations on booking_barcode_assignments" 
  ON booking_barcode_assignments 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- 1. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_barcode_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_booking_barcode_assignments_timestamp ON booking_barcode_assignments;
CREATE TRIGGER update_booking_barcode_assignments_timestamp
  BEFORE UPDATE ON booking_barcode_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_barcode_assignments_updated_at();

-- 2. Sync barcode status when assignment changes
CREATE OR REPLACE FUNCTION sync_barcode_status_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- When assigned: Update product_barcodes status and link booking
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'assigned') THEN
    UPDATE product_barcodes
    SET 
      status = 'in_use',
      booking_id = NEW.booking_id,
      last_used_at = NOW()
    WHERE id = NEW.barcode_id;
    
  -- When completed/returned: Clear booking link, mark available
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' THEN
    UPDATE product_barcodes
    SET 
      status = 'available',
      booking_id = NULL
    WHERE id = NEW.barcode_id;
    
  -- When deleted: Clear booking link
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE product_barcodes
    SET 
      status = 'available',
      booking_id = NULL
    WHERE id = OLD.barcode_id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_barcode_status_trigger ON booking_barcode_assignments;
CREATE TRIGGER sync_barcode_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON booking_barcode_assignments
  FOR EACH ROW
  EXECUTE FUNCTION sync_barcode_status_on_assignment();

-- 3. Auto-update timestamps based on status changes
CREATE OR REPLACE FUNCTION auto_update_assignment_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set delivered_at when status changes to delivered
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.delivered_at = NOW();
  END IF;
  
  -- Auto-set returned_at when status changes to returned
  IF NEW.status = 'returned' AND OLD.status != 'returned' THEN
    NEW.returned_at = NOW();
  END IF;
  
  -- Auto-set completed_at when status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_timestamp_trigger ON booking_barcode_assignments;
CREATE TRIGGER auto_timestamp_trigger
  BEFORE UPDATE ON booking_barcode_assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_assignment_timestamps();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get all barcodes for a booking
CREATE OR REPLACE FUNCTION get_booking_barcodes(
  p_booking_id UUID,
  p_booking_type VARCHAR(20) DEFAULT 'package'
)
RETURNS TABLE (
  barcode_number VARCHAR(50),
  product_name VARCHAR(255),
  product_code VARCHAR(50),
  status VARCHAR(20),
  assigned_at TIMESTAMP,
  delivered_at TIMESTAMP,
  returned_at TIMESTAMP,
  assigned_by_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pb.barcode_number,
    p.name AS product_name,
    p.product_code,
    bba.status,
    bba.assigned_at,
    bba.delivered_at,
    bba.returned_at,
    u.name AS assigned_by_name
  FROM booking_barcode_assignments bba
  JOIN product_barcodes pb ON pb.id = bba.barcode_id
  JOIN products p ON p.id = bba.product_id
  LEFT JOIN users u ON u.id = bba.assigned_by
  WHERE bba.booking_id = p_booking_id
    AND bba.booking_type = p_booking_type
  ORDER BY bba.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get barcode assignment stats for a booking
CREATE OR REPLACE FUNCTION get_booking_barcode_stats(
  p_booking_id UUID,
  p_booking_type VARCHAR(20) DEFAULT 'package'
)
RETURNS TABLE (
  total_assigned BIGINT,
  total_delivered BIGINT,
  total_with_customer BIGINT,
  total_returned BIGINT,
  total_completed BIGINT,
  total_pending BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) AS total_assigned,
    COUNT(*) FILTER (WHERE status = 'delivered') AS total_delivered,
    COUNT(*) FILTER (WHERE status = 'with_customer') AS total_with_customer,
    COUNT(*) FILTER (WHERE status = 'returned') AS total_returned,
    COUNT(*) FILTER (WHERE status = 'completed') AS total_completed,
    COUNT(*) FILTER (WHERE status IN ('assigned', 'delivered', 'with_customer')) AS total_pending
  FROM booking_barcode_assignments
  WHERE booking_id = p_booking_id
    AND booking_type = p_booking_type;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if all items returned for a booking
CREATE OR REPLACE FUNCTION check_booking_items_returned(
  p_booking_id UUID,
  p_booking_type VARCHAR(20) DEFAULT 'package'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_pending_count
  FROM booking_barcode_assignments
  WHERE booking_id = p_booking_id
    AND booking_type = p_booking_type
    AND status NOT IN ('returned', 'completed');
  
  RETURN v_pending_count = 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERMISSIONS
-- =====================================================
GRANT ALL ON booking_barcode_assignments TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_booking_barcodes TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_booking_barcode_stats TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_booking_items_returned TO postgres, anon, authenticated, service_role;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE booking_barcode_assignments IS 'Links specific barcoded items to bookings for complete lifecycle tracking';
COMMENT ON COLUMN booking_barcode_assignments.booking_type IS 'Type of booking: package (package_bookings) or product (product_orders)';
COMMENT ON COLUMN booking_barcode_assignments.status IS 'Lifecycle status: assigned → delivered → with_customer → returned → completed';
COMMENT ON COLUMN booking_barcode_assignments.assigned_at IS 'When barcode was assigned to booking';
COMMENT ON COLUMN booking_barcode_assignments.delivered_at IS 'When item was delivered to customer';
COMMENT ON COLUMN booking_barcode_assignments.returned_at IS 'When item was returned from customer';
COMMENT ON COLUMN booking_barcode_assignments.completed_at IS 'When booking lifecycle completed for this item';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify table created
SELECT 
  'booking_barcode_assignments' AS table_name,
  COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'booking_barcode_assignments';

-- Verify indexes created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'booking_barcode_assignments'
ORDER BY indexname;

-- Verify triggers created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'booking_barcode_assignments'
ORDER BY trigger_name;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Booking Barcode Bridge System Created Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was created:';
  RAISE NOTICE '  ✓ booking_barcode_assignments table';
  RAISE NOTICE '  ✓ 8 indexes for fast lookups';
  RAISE NOTICE '  ✓ RLS policies configured';
  RAISE NOTICE '  ✓ 3 automatic triggers (sync status, timestamps)';
  RAISE NOTICE '  ✓ 3 helper functions (get barcodes, stats, check returns)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '  1. Build API endpoints for barcode assignment';
  RAISE NOTICE '  2. Add "View Barcodes" to booking details page';
  RAISE NOTICE '  3. Implement scanner integration';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Test Query:';
  RAISE NOTICE '  SELECT * FROM get_booking_barcode_stats(''booking-uuid'', ''package'');';
END $$;
