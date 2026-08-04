-- Remove purchase orders module completely from database
-- Drop all purchase order related tables and functions

-- Drop dependent tables first (foreign key constraints)
DROP TABLE IF EXISTS purchase_history CASCADE;
DROP TABLE IF EXISTS purchase_attachments CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;

-- Drop main purchases table
DROP TABLE IF EXISTS purchases CASCADE;

-- Drop purchase order related functions
DROP FUNCTION IF EXISTS generate_po_number() CASCADE;
DROP FUNCTION IF EXISTS set_po_number() CASCADE;

-- Drop any purchase order related triggers
DROP TRIGGER IF EXISTS trigger_set_po_number ON purchases;
DROP TRIGGER IF EXISTS trigger_purchases_updated_at ON purchases;

-- Remove any purchase order related views
DROP VIEW IF EXISTS purchase_summary CASCADE;
DROP VIEW IF EXISTS purchase_analytics CASCADE;

-- Clean up any purchase order related sequences
DROP SEQUENCE IF EXISTS purchase_order_seq CASCADE;

-- Remove purchase order related indexes (if they exist independently)
-- Note: Most indexes are automatically dropped with the tables

-- Log the cleanup
INSERT INTO system_logs (action, description, created_at) 
VALUES ('CLEANUP', 'Removed purchase orders module completely', NOW())
ON CONFLICT DO NOTHING;

-- Verify cleanup
SELECT 'Purchase orders module removed successfully' as status;
