-- Create the generate_quote_number function that's missing from the database
-- This function generates a unique quote number in the format QT-YYYYMMDD-XXXX

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    current_date_str TEXT;
    sequence_num INTEGER;
    quote_number TEXT;
    max_attempts INTEGER := 100;
    attempt_count INTEGER := 0;
BEGIN
    -- Get current date in YYYYMMDD format
    current_date_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Loop to find a unique quote number
    LOOP
        attempt_count := attempt_count + 1;
        
        -- Get the next sequence number for today
        SELECT COALESCE(MAX(
            CASE 
                WHEN quote_number ~ ('^QT-' || current_date_str || '-[0-9]+$') 
                THEN CAST(SUBSTRING(quote_number FROM LENGTH('QT-' || current_date_str || '-') + 1) AS INTEGER)
                ELSE 0 
            END
        ), 0) + 1
        INTO sequence_num
        FROM quotes
        WHERE quote_number LIKE 'QT-' || current_date_str || '-%';
        
        -- Format the quote number with leading zeros
        quote_number := 'QT-' || current_date_str || '-' || LPAD(sequence_num::TEXT, 4, '0');
        
        -- Check if this quote number already exists
        IF NOT EXISTS (SELECT 1 FROM quotes WHERE quote_number = quote_number) THEN
            RETURN quote_number;
        END IF;
        
        -- Safety check to prevent infinite loop
        IF attempt_count >= max_attempts THEN
            -- Fallback to timestamp-based number
            quote_number := 'QT-' || current_date_str || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
            RETURN quote_number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_quote_number() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_quote_number() TO service_role;

-- Test the function
SELECT generate_quote_number() as sample_quote_number;
