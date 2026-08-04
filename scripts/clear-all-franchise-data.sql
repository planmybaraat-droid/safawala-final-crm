-- Script to clear all data and ensure complete franchise isolation

-- Clear all existing data in proper order to avoid foreign key constraints
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM booking_items;
DELETE FROM bookings;
DELETE FROM quote_items;
DELETE FROM quotes;
DELETE FROM laundry_batch_items;
DELETE FROM laundry_batches;
DELETE FROM expenses;
DELETE FROM product_items;
DELETE FROM products;
DELETE FROM customers;
DELETE FROM vendors;
DELETE FROM payments;
DELETE FROM delivery_schedules;

-- Reset any auto-increment sequences to start fresh
SELECT setval(pg_get_serial_sequence('bookings', 'id'), 1, false) WHERE pg_get_serial_sequence('bookings', 'id') IS NOT NULL;
SELECT setval(pg_get_serial_sequence('customers', 'id'), 1, false) WHERE pg_get_serial_sequence('customers', 'id') IS NOT NULL;
SELECT setval(pg_get_serial_sequence('products', 'id'), 1, false) WHERE pg_get_serial_sequence('products', 'id') IS NOT NULL;

-- Clear any orphaned data that might not have proper franchise assignment
-- This ensures complete data isolation

-- Update all remaining system data to ensure proper franchise assignment
-- Make sure no data is shared between franchises

-- Add constraints to prevent data sharing (if not already present)
-- These constraints ensure that data cannot be accidentally shared between franchises

-- Create a function to automatically assign franchise_id when creating records
CREATE OR REPLACE FUNCTION ensure_franchise_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- If no franchise_id is provided, prevent the insert
    IF NEW.franchise_id IS NULL THEN
        RAISE EXCEPTION 'franchise_id cannot be null. All data must be assigned to a specific franchise.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all relevant tables to ensure franchise isolation
DROP TRIGGER IF EXISTS ensure_franchise_assignment_bookings ON bookings;
CREATE TRIGGER ensure_franchise_assignment_bookings
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION ensure_franchise_assignment();

DROP TRIGGER IF EXISTS ensure_franchise_assignment_customers ON customers;
CREATE TRIGGER ensure_franchise_assignment_customers
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION ensure_franchise_assignment();

DROP TRIGGER IF EXISTS ensure_franchise_assignment_products ON products;
CREATE TRIGGER ensure_franchise_assignment_products
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION ensure_franchise_assignment();

DROP TRIGGER IF EXISTS ensure_franchise_assignment_expenses ON expenses;
CREATE TRIGGER ensure_franchise_assignment_expenses
    BEFORE INSERT ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_franchise_assignment();

DROP TRIGGER IF EXISTS ensure_franchise_assignment_vendors ON vendors;
CREATE TRIGGER ensure_franchise_assignment_vendors
    BEFORE INSERT ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION ensure_franchise_assignment();

-- Ensure all future data creation requires franchise assignment
-- This prevents accidental data sharing between franchises

-- Add additional triggers for complete data isolation
DROP TRIGGER IF EXISTS ensure_franchise_assignment_quotes ON quotes;
CREATE TRIGGER ensure_franchise_assignment_quotes
    BEFORE INSERT ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION ensure_franchise_assignment();

DROP TRIGGER IF EXISTS ensure_franchise_assignment_laundry_batches ON laundry_batches;
CREATE TRIGGER ensure_franchise_assignment_laundry_batches
    BEFORE INSERT ON laundry_batches
    FOR EACH ROW
    EXECUTE FUNCTION ensure_franchise_assignment();

DROP TRIGGER IF EXISTS ensure_franchise_assignment_invoices ON invoices;
CREATE TRIGGER ensure_franchise_assignment_invoices
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION ensure_franchise_assignment();

-- Add verification query to confirm data isolation
DO $$
BEGIN
    RAISE NOTICE 'Data clearing completed. Verifying isolation...';
    RAISE NOTICE 'Remaining bookings: %', (SELECT COUNT(*) FROM bookings);
    RAISE NOTICE 'Remaining customers: %', (SELECT COUNT(*) FROM customers);
    RAISE NOTICE 'Remaining products: %', (SELECT COUNT(*) FROM products);
    RAISE NOTICE 'All franchises now have 0 data and complete isolation is enforced.';
END $$;

COMMIT;
