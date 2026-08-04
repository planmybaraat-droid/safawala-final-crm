-- Fix booking_items table schema to match the expected structure

DO $$ 
BEGIN
    -- Add discount_percent column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'booking_items' AND column_name = 'discount_percent') THEN
        ALTER TABLE booking_items ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    -- Add security_deposit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'booking_items' AND column_name = 'security_deposit') THEN
        ALTER TABLE booking_items ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add damage_cost column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'booking_items' AND column_name = 'damage_cost') THEN
        ALTER TABLE booking_items ADD COLUMN damage_cost DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add cleaning_required column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'booking_items' AND column_name = 'cleaning_required') THEN
        ALTER TABLE booking_items ADD COLUMN cleaning_required BOOLEAN DEFAULT false;
    END IF;
    
    -- Add condition_on_delivery column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'booking_items' AND column_name = 'condition_on_delivery') THEN
        ALTER TABLE booking_items ADD COLUMN condition_on_delivery VARCHAR(50) DEFAULT 'good';
    END IF;
    
    -- Add condition_on_return column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'booking_items' AND column_name = 'condition_on_return') THEN
        ALTER TABLE booking_items ADD COLUMN condition_on_return VARCHAR(50);
    END IF;
END $$;

-- Set default values for existing booking items
UPDATE booking_items SET 
    discount_percent = COALESCE(discount_percent, 0),
    security_deposit = COALESCE(security_deposit, 0),
    damage_cost = COALESCE(damage_cost, 0),
    cleaning_required = COALESCE(cleaning_required, false),
    condition_on_delivery = COALESCE(condition_on_delivery, 'good')
WHERE discount_percent IS NULL OR security_deposit IS NULL OR damage_cost IS NULL 
   OR cleaning_required IS NULL OR condition_on_delivery IS NULL;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'booking_items' 
ORDER BY ordinal_position;
