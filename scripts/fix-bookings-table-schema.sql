-- Fix bookings table schema to match the expected structure

DO $$ 
BEGIN
    -- Add event_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'event_type') THEN
        ALTER TABLE bookings ADD COLUMN event_type VARCHAR(100);
    END IF;
    
    -- Add discount_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'discount_amount') THEN
        ALTER TABLE bookings ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add tax_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'tax_amount') THEN
        ALTER TABLE bookings ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add security_deposit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'security_deposit') THEN
        ALTER TABLE bookings ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'priority') THEN
        ALTER TABLE bookings ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
    END IF;
    
    -- Add groom_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'groom_name') THEN
        ALTER TABLE bookings ADD COLUMN groom_name VARCHAR(255);
    END IF;
    
    -- Add bride_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'bride_name') THEN
        ALTER TABLE bookings ADD COLUMN bride_name VARCHAR(255);
    END IF;
    
    -- Add venue_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'venue_name') THEN
        ALTER TABLE bookings ADD COLUMN venue_name VARCHAR(255);
    END IF;
    
    -- Add venue_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'venue_address') THEN
        ALTER TABLE bookings ADD COLUMN venue_address TEXT;
    END IF;
    
    -- Add special_instructions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'special_instructions') THEN
        ALTER TABLE bookings ADD COLUMN special_instructions TEXT;
    END IF;
    
    -- Add invoice_generated column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'invoice_generated') THEN
        ALTER TABLE bookings ADD COLUMN invoice_generated BOOLEAN DEFAULT false;
    END IF;
    
    -- Add whatsapp_sent column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'whatsapp_sent') THEN
        ALTER TABLE bookings ADD COLUMN whatsapp_sent BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Set default values for existing bookings
UPDATE bookings SET 
    event_type = COALESCE(event_type, 'Wedding'),
    discount_amount = COALESCE(discount_amount, 0),
    tax_amount = COALESCE(tax_amount, 0),
    security_deposit = COALESCE(security_deposit, 0),
    priority = COALESCE(priority, 'medium'),
    invoice_generated = COALESCE(invoice_generated, false),
    whatsapp_sent = COALESCE(whatsapp_sent, false)
WHERE event_type IS NULL OR discount_amount IS NULL OR tax_amount IS NULL 
   OR security_deposit IS NULL OR priority IS NULL OR invoice_generated IS NULL 
   OR whatsapp_sent IS NULL;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
