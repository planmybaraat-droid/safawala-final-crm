-- Adding missing database functions that APIs are trying to call

-- Function to generate customer codes
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    counter INTEGER;
BEGIN
    -- Get the current count of customers and add 1
    SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 5) AS INTEGER)), 0) + 1
    INTO counter
    FROM customers
    WHERE customer_code ~ '^CUS-[0-9]+$';
    
    -- Format as CUS-XXXX
    new_code := 'CUS-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking numbers
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
    year_suffix TEXT;
BEGIN
    -- Get current year suffix (last 2 digits)
    year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    year_suffix := RIGHT(year_suffix, 2);
    
    -- Get the current count of bookings for this year and add 1
    SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 5 FOR 4) AS INTEGER)), 0) + 1
    INTO counter
    FROM bookings
    WHERE booking_number ~ ('^BKG-[0-9]{4}-' || year_suffix || '$')
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Format as BKG-XXXX-YY (where YY is year)
    new_number := 'BKG-' || LPAD(counter::TEXT, 4, '0') || '-' || year_suffix;
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
    year_suffix TEXT;
BEGIN
    -- Get current year suffix (last 2 digits)
    year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    year_suffix := RIGHT(year_suffix, 2);
    
    -- Get the current count of quotes for this year and add 1
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 4 FOR 4) AS INTEGER)), 0) + 1
    INTO counter
    FROM quotes
    WHERE quote_number ~ ('^QT-[0-9]{4}-' || year_suffix || '$')
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Format as QT-XXXX-YY (where YY is year)
    new_number := 'QT-' || LPAD(counter::TEXT, 4, '0') || '-' || year_suffix;
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
    year_suffix TEXT;
BEGIN
    -- Get current year suffix (last 2 digits)
    year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    year_suffix := RIGHT(year_suffix, 2);
    
    -- Get the current count of invoices for this year and add 1
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5 FOR 4) AS INTEGER)), 0) + 1
    INTO counter
    FROM invoices
    WHERE invoice_number ~ ('^INV-[0-9]{4}-' || year_suffix || '$')
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Format as INV-XXXX-YY (where YY is year)
    new_number := 'INV-' || LPAD(counter::TEXT, 4, '0') || '-' || year_suffix;
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Add missing settings column to integration_settings if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integration_settings' 
        AND column_name = 'settings'
    ) THEN
        ALTER TABLE integration_settings ADD COLUMN settings JSONB;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_name ON bookings(venue_name);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_integration_settings_name ON integration_settings(integration_name);
