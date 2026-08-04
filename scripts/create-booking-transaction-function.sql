-- Create atomic booking creation function to prevent race conditions
CREATE OR REPLACE FUNCTION create_booking_with_conflict_check(
  p_customer_id UUID,
  p_event_date TIMESTAMP,
  p_venue_name TEXT,
  p_franchise_id UUID,
  p_created_by TEXT,
  p_booking_data JSONB,
  p_booking_items JSONB
) RETURNS JSONB AS $$
DECLARE
  v_booking_id UUID;
  v_booking_number TEXT;
  v_conflict_count INTEGER;
  v_customer_record RECORD;
  v_item JSONB;
  v_product_record RECORD;
  v_booking JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Check for venue conflicts with exact matching
    SELECT COUNT(*) INTO v_conflict_count
    FROM bookings 
    WHERE DATE(event_date) = DATE(p_event_date)
      AND TRIM(LOWER(venue_name)) = TRIM(LOWER(p_venue_name))
      AND status IN ('confirmed', 'pending_payment', 'pending_selection', 'delivered');
    
    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'Booking conflict detected. Venue "%" is already booked for %', 
        p_venue_name, DATE(p_event_date);
    END IF;
    
    -- Validate customer exists and belongs to franchise
    SELECT * INTO v_customer_record
    FROM customers 
    WHERE id = p_customer_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Customer not found';
    END IF;
    
    IF p_franchise_id IS NOT NULL AND v_customer_record.franchise_id != p_franchise_id THEN
      RAISE EXCEPTION 'Customer does not belong to your franchise';
    END IF;
    
    -- Validate stock for all items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_booking_items)
    LOOP
      SELECT * INTO v_product_record
      FROM products 
      WHERE id = (v_item->>'product_id')::UUID;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', v_item->>'product_id';
      END IF;
      
      IF v_product_record.stock_quantity < (v_item->>'quantity')::INTEGER THEN
        RAISE EXCEPTION 'Insufficient stock for %. Available: %, Requested: %', 
          v_product_record.name, v_product_record.stock_quantity, v_item->>'quantity';
      END IF;
    END LOOP;
    
    -- Generate booking number
    SELECT generate_booking_number() INTO v_booking_number;
    
    -- Create booking
    INSERT INTO bookings (
      booking_number, customer_id, event_date, venue_name, status,
      franchise_id, created_by, type, event_type, payment_type,
      delivery_date, return_date, event_for, groom_name, groom_home_address,
      groom_additional_whatsapp, bride_name, bride_home_address, 
      bride_additional_whatsapp, venue_address, special_instructions,
      total_amount, subtotal, gst_amount, other_amount
    ) VALUES (
      v_booking_number, p_customer_id, p_event_date, p_venue_name, 'pending',
      COALESCE(p_franchise_id, v_customer_record.franchise_id), NULLIF(p_created_by, '')::UUID,
      p_booking_data->>'type', p_booking_data->>'event_type', p_booking_data->>'payment_type',
      (p_booking_data->>'delivery_date')::TIMESTAMP, (p_booking_data->>'return_date')::TIMESTAMP,
      p_booking_data->>'event_for', p_booking_data->>'groom_name', p_booking_data->>'groom_home_address',
      p_booking_data->>'groom_additional_whatsapp', p_booking_data->>'bride_name', 
      p_booking_data->>'bride_home_address', p_booking_data->>'bride_additional_whatsapp',
      p_booking_data->>'venue_address', p_booking_data->>'special_instructions',
      (p_booking_data->>'total_amount')::DECIMAL, (p_booking_data->>'subtotal')::DECIMAL,
      (p_booking_data->>'gst_amount')::DECIMAL, (p_booking_data->>'other_amount')::DECIMAL
    ) RETURNING id INTO v_booking_id;
    
    -- Create booking items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_booking_items)
    LOOP
      INSERT INTO booking_items (
        booking_id, product_id, quantity, unit_price, total_price
      ) VALUES (
        v_booking_id,
        (v_item->>'product_id')::UUID,
        (v_item->>'quantity')::INTEGER,
        COALESCE((v_item->>'unit_price')::DECIMAL, 0),
        COALESCE((v_item->>'total_price')::DECIMAL, (v_item->>'unit_price')::DECIMAL * (v_item->>'quantity')::INTEGER, 0)
      );
    END LOOP;
    
    -- Return the created booking
    SELECT to_jsonb(b.*) INTO v_booking
    FROM bookings b
    WHERE b.id = v_booking_id;
    
    RETURN v_booking;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in PostgreSQL functions
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;
