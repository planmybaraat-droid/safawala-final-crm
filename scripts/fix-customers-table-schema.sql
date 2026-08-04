-- Fix customers table schema to match the expected structure

DO $$ 
BEGIN
    -- Add customer_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'customer_code') THEN
        ALTER TABLE customers ADD COLUMN customer_code VARCHAR(50) UNIQUE;
    END IF;
    
    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'email') THEN
        ALTER TABLE customers ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Add whatsapp column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'whatsapp') THEN
        ALTER TABLE customers ADD COLUMN whatsapp VARCHAR(20);
    END IF;
    
    -- Add address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'address') THEN
        ALTER TABLE customers ADD COLUMN address TEXT;
    END IF;
    
    -- Add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'city') THEN
        ALTER TABLE customers ADD COLUMN city VARCHAR(100);
    END IF;
    
    -- Add pincode column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'pincode') THEN
        ALTER TABLE customers ADD COLUMN pincode VARCHAR(10);
    END IF;
    
    -- Add gst_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'gst_number') THEN
        ALTER TABLE customers ADD COLUMN gst_number VARCHAR(15);
    END IF;
    
    -- Add credit_limit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'credit_limit') THEN
        ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add outstanding_balance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'outstanding_balance') THEN
        ALTER TABLE customers ADD COLUMN outstanding_balance DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add total_bookings column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'total_bookings') THEN
        ALTER TABLE customers ADD COLUMN total_bookings INTEGER DEFAULT 0;
    END IF;
    
    -- Add total_spent column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'total_spent') THEN
        ALTER TABLE customers ADD COLUMN total_spent DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Ensure franchise_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'franchise_id') THEN
        ALTER TABLE customers ADD COLUMN franchise_id UUID REFERENCES franchises(id);
    END IF;
END $$;

-- Generate customer codes for existing customers without codes using a subquery approach
WITH numbered_customers AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
    FROM customers 
    WHERE customer_code IS NULL
)
UPDATE customers 
SET customer_code = 'CUST' || LPAD(nc.row_num::TEXT, 3, '0')
FROM numbered_customers nc
WHERE customers.id = nc.id;

-- Set default whatsapp to phone if whatsapp is null
UPDATE customers 
SET whatsapp = phone 
WHERE whatsapp IS NULL AND phone IS NOT NULL;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
ORDER BY ordinal_position;
