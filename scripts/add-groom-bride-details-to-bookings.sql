DO $$
BEGIN
    -- Add event_for column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'event_for') THEN
        ALTER TABLE bookings ADD COLUMN event_for VARCHAR(20) DEFAULT 'both';
    END IF;

    -- Add groom_home_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'groom_home_address') THEN
        ALTER TABLE bookings ADD COLUMN groom_home_address TEXT;
    END IF;

    -- Add groom_additional_whatsapp column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'groom_additional_whatsapp') THEN
        ALTER TABLE bookings ADD COLUMN groom_additional_whatsapp VARCHAR(20);
    END IF;

    -- Add bride_additional_whatsapp column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'bride_additional_whatsapp') THEN
        ALTER TABLE bookings ADD COLUMN bride_additional_whatsapp VARCHAR(20);
    END IF;
END $$;

-- Set default values for existing bookings for new columns
UPDATE bookings SET
    event_for = COALESCE(event_for, 'both'),
    groom_home_address = COALESCE(groom_home_address, NULL),
    groom_additional_whatsapp = COALESCE(groom_additional_whatsapp, NULL),
    bride_additional_whatsapp = COALESCE(bride_additional_whatsapp, NULL)
WHERE event_for IS NULL OR groom_home_address IS NULL OR groom_additional_whatsapp IS NULL OR bride_additional_whatsapp IS NULL;

-- Verify the table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;
