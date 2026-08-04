-- Function to generate unique quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    quote_number TEXT;
    counter INTEGER;
BEGIN
    -- Get the current year and month
    quote_number := 'QT' || TO_CHAR(NOW(), 'YYMM');
    
    -- Get the count of quotes created this month
    SELECT COUNT(*) + 1 INTO counter
    FROM quotes 
    WHERE quote_number LIKE quote_number || '%'
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW());
    
    -- Format the final quote number with zero-padded counter
    quote_number := quote_number || LPAD(counter::TEXT, 4, '0');
    
    RETURN quote_number;
END;
$$ LANGUAGE plpgsql;
