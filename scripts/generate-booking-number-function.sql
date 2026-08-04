-- Create function to generate unique booking numbers
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
    new_booking_number TEXT;
    current_year TEXT;
    current_month TEXT;
    sequence_num INTEGER;
BEGIN
    -- Get current year and month
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    current_month := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0');
    
    -- Get the next sequence number for this month
    SELECT COALESCE(MAX(
        CASE 
            WHEN b.booking_number ~ ('^BK' || current_year || current_month || '[0-9]+$') 
            THEN SUBSTRING(b.booking_number FROM LENGTH('BK' || current_year || current_month) + 1)::INTEGER
            ELSE 0
        END
    ), 0) + 1
    INTO sequence_num
    FROM bookings b
    WHERE b.booking_number LIKE 'BK' || current_year || current_month || '%';
    
    -- Generate the booking number: BK + YYYY + MM + 4-digit sequence
    new_booking_number := 'BK' || current_year || current_month || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_booking_number;
END;
$$ LANGUAGE plpgsql;
