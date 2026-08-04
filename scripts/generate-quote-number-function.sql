-- Create function to generate unique quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    current_month TEXT;
    sequence_num INTEGER;
    new_quote_number TEXT;
BEGIN
    -- Get current year and month
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    current_month := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0');
    
    -- Get the next sequence number for this month
    SELECT COALESCE(MAX(
        CASE 
            WHEN q.quote_number ~ ('^QT' || current_year || current_month || '[0-9]{4}$')
            THEN SUBSTRING(q.quote_number FROM LENGTH('QT' || current_year || current_month) + 1)::INTEGER
            ELSE 0
        END
    ), 0) + 1
    INTO sequence_num
    FROM quotes q
    WHERE q.quote_number LIKE 'QT' || current_year || current_month || '%';
    
    -- Format the quote number: QT + YYYYMM + 4-digit sequence
    new_quote_number := 'QT' || current_year || current_month || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_quote_number;
END;
$$ LANGUAGE plpgsql;
