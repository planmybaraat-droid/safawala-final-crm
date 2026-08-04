-- Add missing columns to booking_items table if they don't exist
DO $$ 
BEGIN
    -- Add discount_percent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'booking_items' AND column_name = 'discount_percent') THEN
        ALTER TABLE booking_items ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    -- Add security_deposit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'booking_items' AND column_name = 'security_deposit') THEN
        ALTER TABLE booking_items ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add damage_cost column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'booking_items' AND column_name = 'damage_cost') THEN
        ALTER TABLE booking_items ADD COLUMN damage_cost DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add cleaning_required column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'booking_items' AND column_name = 'cleaning_required') THEN
        ALTER TABLE booking_items ADD COLUMN cleaning_required BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add missing columns to bookings table if they don't exist
DO $$ 
BEGIN
    -- Add deposit_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'deposit_amount') THEN
        ALTER TABLE bookings ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add discount_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'discount_amount') THEN
        ALTER TABLE bookings ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add tax_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'tax_amount') THEN
        ALTER TABLE bookings ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add security_deposit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'security_deposit') THEN
        ALTER TABLE bookings ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add priority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'priority') THEN
        ALTER TABLE bookings ADD COLUMN priority INTEGER DEFAULT 1;
    END IF;
    
    -- Add event_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'event_type') THEN
        ALTER TABLE bookings ADD COLUMN event_type VARCHAR(50);
    END IF;
    
    -- Add groom_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'groom_name') THEN
        ALTER TABLE bookings ADD COLUMN groom_name VARCHAR(255);
    END IF;
    
    -- Add bride_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'bride_name') THEN
        ALTER TABLE bookings ADD COLUMN bride_name VARCHAR(255);
    END IF;
    
    -- Add venue_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'venue_name') THEN
        ALTER TABLE bookings ADD COLUMN venue_name VARCHAR(255);
    END IF;
    
    -- Add venue_address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'venue_address') THEN
        ALTER TABLE bookings ADD COLUMN venue_address TEXT;
    END IF;
    
    -- Add special_instructions column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'special_instructions') THEN
        ALTER TABLE bookings ADD COLUMN special_instructions TEXT;
    END IF;
    
    -- Add invoice_generated column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'invoice_generated') THEN
        ALTER TABLE bookings ADD COLUMN invoice_generated BOOLEAN DEFAULT false;
    END IF;
    
    -- Add whatsapp_sent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'whatsapp_sent') THEN
        ALTER TABLE bookings ADD COLUMN whatsapp_sent BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add missing columns to products table if they don't exist
DO $$ 
BEGIN
    -- Add product_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'product_code') THEN
        ALTER TABLE products ADD COLUMN product_code VARCHAR(50);
        -- Generate product codes for existing products
        UPDATE products SET product_code = 'PRD' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 4, '0') WHERE product_code IS NULL;
    END IF;
    
    -- Add brand column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'brand') THEN
        ALTER TABLE products ADD COLUMN brand VARCHAR(100);
    END IF;
    
    -- Add size column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'size') THEN
        ALTER TABLE products ADD COLUMN size VARCHAR(50);
    END IF;
    
    -- Add color column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'color') THEN
        ALTER TABLE products ADD COLUMN color VARCHAR(50);
    END IF;
    
    -- Add material column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'material') THEN
        ALTER TABLE products ADD COLUMN material VARCHAR(100);
    END IF;
    
    -- Add cost_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add security_deposit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'security_deposit') THEN
        ALTER TABLE products ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add stock_in_laundry column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'stock_in_laundry') THEN
        ALTER TABLE products ADD COLUMN stock_in_laundry INTEGER DEFAULT 0;
    END IF;
    
    -- Add reorder_level column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'reorder_level') THEN
        ALTER TABLE products ADD COLUMN reorder_level INTEGER DEFAULT 5;
    END IF;
    
    -- Add damage_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'damage_count') THEN
        ALTER TABLE products ADD COLUMN damage_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add missing columns to customers table if they don't exist
DO $$ 
BEGIN
    -- Add customer_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'customer_code') THEN
        ALTER TABLE customers ADD COLUMN customer_code VARCHAR(50);
        -- Generate customer codes for existing customers
        UPDATE customers SET customer_code = 'CUST' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 4, '0') WHERE customer_code IS NULL;
    END IF;
    
    -- Add city column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'city') THEN
        ALTER TABLE customers ADD COLUMN city VARCHAR(100);
    END IF;
    
    -- Add pincode column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'pincode') THEN
        ALTER TABLE customers ADD COLUMN pincode VARCHAR(10);
    END IF;
    
    -- Add gst_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'gst_number') THEN
        ALTER TABLE customers ADD COLUMN gst_number VARCHAR(50);
    END IF;
    
    -- Add credit_limit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'credit_limit') THEN
        ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(10,2) DEFAULT 50000;
    END IF;
    
    -- Add outstanding_balance column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'outstanding_balance') THEN
        ALTER TABLE customers ADD COLUMN outstanding_balance DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add total_bookings column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'total_bookings') THEN
        ALTER TABLE customers ADD COLUMN total_bookings INTEGER DEFAULT 0;
    END IF;
    
    -- Add total_spent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'total_spent') THEN
        ALTER TABLE customers ADD COLUMN total_spent DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add franchise_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'franchise_id') THEN
        ALTER TABLE customers ADD COLUMN franchise_id UUID REFERENCES franchises(id);
    END IF;
END $$;

-- Add missing columns to franchises table if they don't exist
DO $$ 
BEGIN
    -- Add code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'code') THEN
        ALTER TABLE franchises ADD COLUMN code VARCHAR(20);
        -- Generate franchise codes for existing franchises
        UPDATE franchises SET code = 'SWL' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 3, '0') WHERE code IS NULL;
    END IF;
    
    -- Add city column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'city') THEN
        ALTER TABLE franchises ADD COLUMN city VARCHAR(100);
    END IF;
    
    -- Add state column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'state') THEN
        ALTER TABLE franchises ADD COLUMN state VARCHAR(100);
    END IF;
    
    -- Add pincode column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'pincode') THEN
        ALTER TABLE franchises ADD COLUMN pincode VARCHAR(10);
    END IF;
    
    -- Add owner_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'owner_name') THEN
        ALTER TABLE franchises ADD COLUMN owner_name VARCHAR(255);
    END IF;
    
    -- Add is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'is_active') THEN
        ALTER TABLE franchises ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Update existing data with default values
UPDATE products SET 
    security_deposit = CASE 
        WHEN category = 'turban' THEN rental_price * 0.5
        WHEN category = 'accessory' THEN rental_price * 0.3
        ELSE rental_price * 0.4
    END
WHERE security_deposit = 0 AND rental_price > 0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_franchises_code ON franchises(code);
CREATE INDEX IF NOT EXISTS idx_bookings_event_type ON bookings(event_type);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Schema update completed successfully! All missing columns have been added.';
END $$;
