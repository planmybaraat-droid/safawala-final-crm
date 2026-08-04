-- Migration: Remove Foreign Key Constraints from Customers Table
-- Purpose: Allow independent management of customer records without cascade constraints
-- Created: 2025-11-09

-- Drop foreign key constraint if it exists
ALTER TABLE returns
DROP CONSTRAINT IF EXISTS returns_customer_id_fkey;

-- Verify the constraint has been removed
-- You can manually verify with:
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'returns' AND constraint_type = 'FOREIGN KEY';
