-- Add only the essential missing columns to bookings table
DO $$ 
BEGIN
    -- Add notes column (was causing the error)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'notes') THEN
        ALTER TABLE bookings ADD COLUMN notes TEXT;
    END IF;
    
    -- Add event_type column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'event_type') THEN
        ALTER TABLE bookings ADD COLUMN event_type VARCHAR(50);
    END IF;
    
    -- Add groom_name column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'groom_name') THEN
        ALTER TABLE bookings ADD COLUMN groom_name VARCHAR(255);
    END IF;
    
    -- Add bride_name column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'bride_name') THEN
        ALTER TABLE bookings ADD COLUMN bride_name VARCHAR(255);
    END IF;
    
    -- Add venue_name column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'venue_name') THEN
        ALTER TABLE bookings ADD COLUMN venue_name VARCHAR(255);
    END IF;
    
    -- Add venue_address column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'venue_address') THEN
        ALTER TABLE bookings ADD COLUMN venue_address TEXT;
    END IF;
    
    -- Add special_instructions column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'special_instructions') THEN
        ALTER TABLE bookings ADD COLUMN special_instructions TEXT;
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Essential booking columns added successfully!';
END $$;
