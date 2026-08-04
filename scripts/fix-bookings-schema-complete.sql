-- Complete schema fix for bookings table
-- This script adds all missing columns and constraints safely

-- First, let's check what columns exist in the bookings table
DO $$
DECLARE
    column_exists boolean;
BEGIN
    -- Add event_type column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'event_type'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN event_type VARCHAR(50) DEFAULT 'wedding';
        RAISE NOTICE 'Added event_type column to bookings table';
    END IF;

    -- Add groom_name column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'groom_name'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN groom_name VARCHAR(255);
        RAISE NOTICE 'Added groom_name column to bookings table';
    END IF;

    -- Add bride_name column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'bride_name'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN bride_name VARCHAR(255);
        RAISE NOTICE 'Added bride_name column to bookings table';
    END IF;

    -- Add venue_name column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'venue_name'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN venue_name VARCHAR(255);
        RAISE NOTICE 'Added venue_name column to bookings table';
    END IF;

    -- Add venue_address column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'venue_address'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN venue_address TEXT;
        RAISE NOTICE 'Added venue_address column to bookings table';
    END IF;

    -- Add special_instructions column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'special_instructions'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN special_instructions TEXT;
        RAISE NOTICE 'Added special_instructions column to bookings table';
    END IF;

    -- Add discount_amount column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'discount_amount'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_amount column to bookings table';
    END IF;

    -- Add tax_amount column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'tax_amount'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN tax_amount DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added tax_amount column to bookings table';
    END IF;

    -- Add security_deposit column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'security_deposit'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN security_deposit DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added security_deposit column to bookings table';
    END IF;

    -- Add priority column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'priority'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN priority INTEGER DEFAULT 1;
        RAISE NOTICE 'Added priority column to bookings table';
    END IF;

    -- Add invoice_generated column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'invoice_generated'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN invoice_generated BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added invoice_generated column to bookings table';
    END IF;

    -- Add whatsapp_sent column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'whatsapp_sent'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE bookings ADD COLUMN whatsapp_sent BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added whatsapp_sent column to bookings table';
    END IF;

END $$;

-- Now let's fix the booking_items table
DO $$
DECLARE
    column_exists boolean;
BEGIN
    -- Add discount_percent column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'booking_items' 
        AND column_name = 'discount_percent'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE booking_items ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_percent column to booking_items table';
    END IF;

    -- Add security_deposit column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'booking_items' 
        AND column_name = 'security_deposit'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE booking_items ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added security_deposit column to booking_items table';
    END IF;

    -- Add damage_cost column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'booking_items' 
        AND column_name = 'damage_cost'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE booking_items ADD COLUMN damage_cost DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added damage_cost column to booking_items table';
    END IF;

    -- Add cleaning_required column if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'booking_items' 
        AND column_name = 'cleaning_required'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE booking_items ADD COLUMN cleaning_required BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added cleaning_required column to booking_items table';
    END IF;

END $$;

-- Add missing columns to other tables if needed
DO $$
DECLARE
    column_exists boolean;
BEGIN
    -- Check and add missing columns to franchises table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'franchises' 
        AND column_name = 'code'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE franchises ADD COLUMN code VARCHAR(50);
        RAISE NOTICE 'Added code column to franchises table';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'franchises' 
        AND column_name = 'city'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE franchises ADD COLUMN city VARCHAR(100);
        RAISE NOTICE 'Added city column to franchises table';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'franchises' 
        AND column_name = 'state'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE franchises ADD COLUMN state VARCHAR(100);
        RAISE NOTICE 'Added state column to franchises table';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'franchises' 
        AND column_name = 'pincode'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE franchises ADD COLUMN pincode VARCHAR(10);
        RAISE NOTICE 'Added pincode column to franchises table';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'franchises' 
        AND column_name = 'owner_name'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE franchises ADD COLUMN owner_name VARCHAR(255);
        RAISE NOTICE 'Added owner_name column to franchises table';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'franchises' 
        AND column_name = 'gst_number'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE franchises ADD COLUMN gst_number VARCHAR(50);
        RAISE NOTICE 'Added gst_number column to franchises table';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'franchises' 
        AND column_name = 'is_active'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE franchises ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to franchises table';
    END IF;

END $$;

-- Show final structure
SELECT 'Schema update completed. Current bookings table structure:' as message;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
