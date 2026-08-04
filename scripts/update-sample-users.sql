-- Update sample users with better demo data
UPDATE users SET password_hash = 'demo_password_hash' WHERE email = 'admin@safawala.com';
UPDATE users SET password_hash = 'demo_password_hash' WHERE email = 'manager1@safawala.com';
UPDATE users SET password_hash = 'demo_password_hash' WHERE email = 'staff1@safawala.com';

-- Add some sample customers for testing
INSERT INTO customers (name, phone, whatsapp, email, address) VALUES 
('Rajesh Kumar', '+91-9876543210', '+91-9876543210', 'rajesh@example.com', '123 Main Street, Delhi'),
('Priya Sharma', '+91-9876543211', '+91-9876543211', 'priya@example.com', '456 Park Avenue, Mumbai'),
('Amit Singh', '+91-9876543212', '+91-9876543212', 'amit@example.com', '789 Garden Road, Bangalore')
ON CONFLICT (phone) DO NOTHING;

-- Add some sample bookings for testing
DO $$
DECLARE
    customer_id UUID;
    franchise_id UUID;
    user_id UUID;
    product_id UUID;
    booking_id UUID;
BEGIN
    -- Get IDs for sample data
    SELECT id INTO customer_id FROM customers WHERE name = 'Rajesh Kumar' LIMIT 1;
    SELECT id INTO franchise_id FROM franchises WHERE name = 'Main Branch' LIMIT 1;
    SELECT id INTO user_id FROM users WHERE email = 'staff1@safawala.com' LIMIT 1;
    SELECT id INTO product_id FROM products WHERE name = 'Royal Red Turban' LIMIT 1;
    
    -- Insert sample booking if customer exists
    IF customer_id IS NOT NULL AND franchise_id IS NOT NULL THEN
        INSERT INTO bookings (
            booking_number, customer_id, franchise_id, type, payment_type,
            total_amount, amount_paid, pending_amount, status, created_by
        ) VALUES (
            'BK000001', customer_id, franchise_id, 'rental', 'advance',
            1500.00, 500.00, 1000.00, 'confirmed', user_id
        ) RETURNING id INTO booking_id;
        
        -- Insert booking item if booking was created
        IF booking_id IS NOT NULL AND product_id IS NOT NULL THEN
            INSERT INTO booking_items (
                booking_id, product_id, quantity, unit_price, total_price
            ) VALUES (
                booking_id, product_id, 3, 500.00, 1500.00
            );
        END IF;
    END IF;
END $$;
