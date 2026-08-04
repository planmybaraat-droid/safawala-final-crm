-- Function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock(
  product_id UUID,
  quantity_change INTEGER,
  stock_type TEXT
)
RETURNS VOID AS $$
BEGIN
  CASE stock_type
    WHEN 'available' THEN
      UPDATE products 
      SET stock_available = stock_available + quantity_change,
          updated_at = NOW()
      WHERE id = product_id;
    WHEN 'booked' THEN
      UPDATE products 
      SET stock_booked = stock_booked + quantity_change,
          updated_at = NOW()
      WHERE id = product_id;
    WHEN 'damaged' THEN
      UPDATE products 
      SET stock_damaged = stock_damaged + quantity_change,
          updated_at = NOW()
      WHERE id = product_id;
    ELSE
      RAISE EXCEPTION 'Invalid stock_type: %', stock_type;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  booking_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM bookings
  WHERE booking_number ~ '^BK[0-9]+$';
  
  booking_number := 'BK' || LPAD(next_number::TEXT, 6, '0');
  RETURN booking_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate booking totals
CREATE OR REPLACE FUNCTION calculate_booking_totals(booking_id UUID)
RETURNS TABLE(
  total_amount DECIMAL(10,2),
  items_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(bi.total_price), 0) as total_amount,
    COALESCE(COUNT(bi.id)::INTEGER, 0) as items_count
  FROM booking_items bi
  WHERE bi.booking_id = calculate_booking_totals.booking_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update booking totals when items change
CREATE OR REPLACE FUNCTION update_booking_totals_trigger()
RETURNS TRIGGER AS $$
DECLARE
  booking_totals RECORD;
BEGIN
  -- Get the booking_id from either NEW or OLD record
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO booking_totals FROM calculate_booking_totals(OLD.booking_id);
    UPDATE bookings 
    SET total_amount = booking_totals.total_amount,
        updated_at = NOW()
    WHERE id = OLD.booking_id;
  ELSE
    SELECT * INTO booking_totals FROM calculate_booking_totals(NEW.booking_id);
    UPDATE bookings 
    SET total_amount = booking_totals.total_amount,
        updated_at = NOW()
    WHERE id = NEW.booking_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking items (with existence check)
DO $$
BEGIN
    -- Check if booking_items table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'booking_items'
    ) THEN
        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS booking_items_totals_trigger ON booking_items;
        
        -- Create the trigger
        CREATE TRIGGER booking_items_totals_trigger
          AFTER INSERT OR UPDATE OR DELETE ON booking_items
          FOR EACH ROW EXECUTE FUNCTION update_booking_totals_trigger();
          
        RAISE NOTICE 'Trigger booking_items_totals_trigger created successfully';
    ELSE
        RAISE NOTICE 'Table booking_items does not exist, skipping trigger creation';
    END IF;
END $$;

-- Function to handle stock updates when booking status changes
CREATE OR REPLACE FUNCTION handle_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking is confirmed, move stock from available to booked
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    UPDATE products 
    SET stock_available = stock_available - bi.quantity,
        stock_booked = stock_booked + bi.quantity
    FROM booking_items bi
    WHERE bi.booking_id = NEW.id AND products.id = bi.product_id;
  
  -- When booking is completed (for sales), remove from booked
  ELSIF NEW.status = 'completed' AND OLD.status IN ('confirmed', 'delivered') THEN
    IF NEW.type = 'direct_sale' THEN
      UPDATE products 
      SET stock_booked = stock_booked - bi.quantity
      FROM booking_items bi
      WHERE bi.booking_id = NEW.id AND products.id = bi.product_id;
    END IF;
  
  -- When rental is returned, move from booked back to available
  ELSIF NEW.status = 'returned' AND OLD.status = 'delivered' THEN
    UPDATE products 
    SET stock_booked = stock_booked - bi.quantity,
        stock_available = stock_available + bi.quantity
    FROM booking_items bi
    WHERE bi.booking_id = NEW.id AND products.id = bi.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking status changes
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings'
    ) THEN
        DROP TRIGGER IF EXISTS booking_status_change_trigger ON bookings;
        
        CREATE TRIGGER booking_status_change_trigger
          AFTER UPDATE OF status ON bookings
          FOR EACH ROW EXECUTE FUNCTION handle_booking_status_change();
          
        RAISE NOTICE 'Trigger booking_status_change_trigger created successfully';
    END IF;
END $$;
