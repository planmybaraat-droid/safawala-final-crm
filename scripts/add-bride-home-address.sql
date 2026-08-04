-- Add bride_home_address column to bookings table
DO $$
BEGIN
    -- Add bride_home_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'bride_home_address') THEN
        ALTER TABLE bookings ADD COLUMN bride_home_address TEXT;
    END IF;
END $$;

-- Set default values for existing bookings
UPDATE bookings SET bride_home_address = NULL WHERE bride_home_address IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name = 'bride_home_address';
