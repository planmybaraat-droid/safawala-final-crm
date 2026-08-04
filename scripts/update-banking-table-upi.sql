-- Update banking table to include UPI support
-- This script adds UPI ID field if it doesn't exist

-- Add UPI ID column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banking_details' 
        AND column_name = 'upi_id'
    ) THEN
        ALTER TABLE banking_details ADD COLUMN upi_id VARCHAR(100);
    END IF;
END $$;

-- Update existing rows to have empty UPI ID if NULL
UPDATE banking_details SET upi_id = '' WHERE upi_id IS NULL;

-- Add index on UPI ID for faster queries
CREATE INDEX IF NOT EXISTS idx_banking_details_upi_id ON banking_details(upi_id);

-- Add index on franchise_id for faster franchise-specific queries
CREATE INDEX IF NOT EXISTS idx_banking_details_franchise_id ON banking_details(franchise_id);

-- Ensure the table has all required columns with proper constraints
DO $$
BEGIN
    -- Check and add other columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banking_details' 
        AND column_name = 'is_primary'
    ) THEN
        ALTER TABLE banking_details ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banking_details' 
        AND column_name = 'show_on_invoice'
    ) THEN
        ALTER TABLE banking_details ADD COLUMN show_on_invoice BOOLEAN DEFAULT TRUE;
    END IF;
END $$;