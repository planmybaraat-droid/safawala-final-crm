-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- Addresses
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    
    -- Scheduling
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_time TIME NOT NULL,
    
    -- Status and tracking
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pickup_pending', 'in_transit', 'delivered', 'failed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    
    -- Driver assignment
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    vehicle_number VARCHAR(20),
    
    -- Items and instructions
    items_description TEXT,
    special_instructions TEXT,
    
    -- Tracking info
    pickup_time_actual TIMESTAMP,
    delivery_time_actual TIMESTAMP,
    estimated_delivery_time TIMESTAMP,
    
    -- Financial
    delivery_charge DECIMAL(10,2) DEFAULT 0,
    fuel_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Notes
    pickup_notes TEXT,
    delivery_notes TEXT,
    customer_feedback TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_id ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_franchise_id ON deliveries(franchise_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_pickup_date ON deliveries(pickup_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_date ON deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_name ON deliveries(driver_name);

-- Insert demo delivery data
INSERT INTO deliveries (
    delivery_number, customer_id, franchise_id, booking_id,
    pickup_address, delivery_address,
    pickup_date, pickup_time, delivery_date, delivery_time,
    status, priority, driver_name, driver_phone, vehicle_number,
    items_description, special_instructions,
    pickup_time_actual, delivery_time_actual,
    delivery_charge, fuel_cost,
    pickup_notes, delivery_notes,
    created_by
) VALUES 
-- Delivered deliveries
('DEL001', 
 (SELECT id FROM customers LIMIT 1 OFFSET 0),
 (SELECT id FROM franchises LIMIT 1),
 (SELECT id FROM bookings LIMIT 1 OFFSET 0),
 '123 Main Street, Downtown Area, Mumbai - 400001',
 '456 Oak Avenue, Suburb Area, Mumbai - 400002',
 '2024-01-15', '09:00:00', '2024-01-15', '15:00:00',
 'delivered', 'normal', 'Raj Kumar', '+91 9876543220', 'MH-01-AB-1234',
 'Dry cleaning items: 3 shirts, 2 pants, 1 blazer',
 'Handle with care, customer prefers evening delivery',
 '2024-01-15 09:15:00', '2024-01-15 14:45:00',
 150.00, 50.00,
 'Items collected successfully', 'Delivered to customer directly',
 (SELECT id FROM users LIMIT 1)),

('DEL002',
 (SELECT id FROM customers LIMIT 1 OFFSET 1),
 (SELECT id FROM franchises LIMIT 1),
 (SELECT id FROM bookings LIMIT 1 OFFSET 1),
 '789 Pine Street, Mall Area, Mumbai - 400003',
 '321 Cedar Lane, Residential Area, Mumbai - 400004',
 '2024-01-14', '10:30:00', '2024-01-14', '16:30:00',
 'delivered', 'high', 'Amit Singh', '+91 9876543221', 'MH-01-CD-5678',
 'Laundry items: 5 shirts, 3 trousers, bedsheets',
 'Urgent delivery required, customer available after 4 PM',
 '2024-01-14 10:45:00', '2024-01-14 16:15:00',
 200.00, 75.00,
 'All items collected as per list', 'Customer satisfied with service',
 (SELECT id FROM users LIMIT 1)),

-- In transit deliveries
('DEL003',
 (SELECT id FROM customers LIMIT 1 OFFSET 2),
 (SELECT id FROM franchises LIMIT 1),
 (SELECT id FROM bookings LIMIT 1 OFFSET 2),
 '555 Market Street, Commercial District, Mumbai - 400005',
 '777 Garden Road, Upscale Area, Mumbai - 400006',
 '2024-01-16', '11:00:00', '2024-01-16', '17:00:00',
 'in_transit', 'normal', 'Suresh Patel', '+91 9876543222', 'MH-01-EF-9012',
 'Formal wear: 2 suits, 4 shirts, 2 ties',
 'Customer prefers contactless delivery',
 '2024-01-16 11:20:00', NULL,
 180.00, 60.00,
 'Items picked up on time', NULL,
 (SELECT id FROM users LIMIT 1)),

('DEL004',
 (SELECT id FROM customers LIMIT 1 OFFSET 0),
 (SELECT id FROM franchises LIMIT 1),
 NULL,
 '888 Business Park, IT Corridor, Mumbai - 400007',
 '999 Residential Complex, Suburb, Mumbai - 400008',
 '2024-01-16', '14:00:00', '2024-01-16', '19:00:00',
 'in_transit', 'high', 'Raj Kumar', '+91 9876543220', 'MH-01-AB-1234',
 'Curtains and upholstery cleaning items',
 'Large items, may need assistance for handling',
 '2024-01-16 14:30:00', NULL,
 250.00, 80.00,
 'Items require careful handling', NULL,
 (SELECT id FROM users LIMIT 1)),

-- Scheduled deliveries
('DEL005',
 (SELECT id FROM customers LIMIT 1 OFFSET 1),
 (SELECT id FROM franchises LIMIT 1),
 (SELECT id FROM bookings LIMIT 1 OFFSET 3),
 '111 Tech Hub, Software City, Mumbai - 400009',
 '222 Family Apartments, Residential Zone, Mumbai - 400010',
 '2024-01-17', '09:30:00', '2024-01-17', '15:30:00',
 'scheduled', 'normal', 'Amit Singh', '+91 9876543221', 'MH-01-CD-5678',
 'Regular laundry: shirts, pants, casual wear',
 'Customer available between 3-6 PM for delivery',
 NULL, NULL,
 120.00, 40.00,
 NULL, NULL,
 (SELECT id FROM users LIMIT 1)),

('DEL006',
 (SELECT id FROM customers LIMIT 1 OFFSET 2),
 (SELECT id FROM franchises LIMIT 1),
 NULL,
 '333 Shopping Mall, Retail District, Mumbai - 400011',
 '444 Villa Complex, Premium Area, Mumbai - 400012',
 '2024-01-17', '12:00:00', '2024-01-17', '18:00:00',
 'scheduled', 'urgent', 'Suresh Patel', '+91 9876543222', 'MH-01-EF-9012',
 'Wedding dress and formal attire',
 'Extremely urgent - wedding tomorrow, handle with utmost care',
 NULL, NULL,
 300.00, 100.00,
 NULL, NULL,
 (SELECT id FROM users LIMIT 1)),

-- Pickup pending deliveries
('DEL007',
 (SELECT id FROM customers LIMIT 1 OFFSET 0),
 (SELECT id FROM franchises LIMIT 1),
 (SELECT id FROM bookings LIMIT 1 OFFSET 4),
 '666 Corporate Tower, Business District, Mumbai - 400013',
 '777 Residential Society, Family Area, Mumbai - 400014',
 '2024-01-18', '08:00:00', '2024-01-18', '14:00:00',
 'pickup_pending', 'normal', 'Raj Kumar', '+91 9876543220', 'MH-01-AB-1234',
 'Office uniforms and formal shirts',
 'Pickup from office reception, contact security',
 NULL, NULL,
 160.00, 55.00,
 NULL, NULL,
 (SELECT id FROM users LIMIT 1)),

('DEL008',
 (SELECT id FROM customers LIMIT 1 OFFSET 1),
 (SELECT id FROM franchises LIMIT 1),
 NULL,
 '888 Hotel Complex, Hospitality Zone, Mumbai - 400015',
 '999 Apartment Building, Urban Area, Mumbai - 400016',
 '2024-01-18', '10:00:00', '2024-01-18', '16:00:00',
 'pickup_pending', 'high', 'Amit Singh', '+91 9876543221', 'MH-01-CD-5678',
 'Hotel linens and towels',
 'Bulk pickup, coordinate with hotel housekeeping',
 NULL, NULL,
 400.00, 120.00,
 NULL, NULL,
 (SELECT id FROM users LIMIT 1)),

-- Failed delivery (for demo purposes)
('DEL009',
 (SELECT id FROM customers LIMIT 1 OFFSET 2),
 (SELECT id FROM franchises LIMIT 1),
 (SELECT id FROM bookings LIMIT 1 OFFSET 5),
 '123 Old Building, Heritage Area, Mumbai - 400017',
 '456 New Complex, Modern District, Mumbai - 400018',
 '2024-01-13', '13:00:00', '2024-01-13', '19:00:00',
 'failed', 'normal', 'Suresh Patel', '+91 9876543222', 'MH-01-EF-9012',
 'Delicate fabric items and silk garments',
 'Customer requested specific time slot',
 '2024-01-13 13:15:00', NULL,
 220.00, 70.00,
 'Items collected successfully', 'Customer not available, rescheduling required',
 (SELECT id FROM users LIMIT 1)),

-- Cancelled delivery
('DEL010',
 (SELECT id FROM customers LIMIT 1 OFFSET 0),
 (SELECT id FROM franchises LIMIT 1),
 NULL,
 '789 Community Center, Social Area, Mumbai - 400019',
 '321 Private Residence, Quiet Zone, Mumbai - 400020',
 '2024-01-12', '15:00:00', '2024-01-12', '20:00:00',
 'cancelled', 'normal', NULL, NULL, NULL,
 'Party wear and ethnic clothing',
 'Customer cancelled due to change in plans',
 NULL, NULL,
 0.00, 0.00,
 NULL, 'Delivery cancelled by customer request',
 (SELECT id FROM users LIMIT 1));

-- Create a function to update delivery status
CREATE OR REPLACE FUNCTION update_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_status();

-- Create a view for delivery analytics
CREATE OR REPLACE VIEW delivery_analytics AS
SELECT 
    DATE_TRUNC('day', pickup_date) as delivery_date,
    status,
    priority,
    COUNT(*) as delivery_count,
    SUM(delivery_charge) as total_charges,
    SUM(fuel_cost) as total_fuel_cost,
    AVG(delivery_charge) as avg_delivery_charge
FROM deliveries 
GROUP BY DATE_TRUNC('day', pickup_date), status, priority
ORDER BY delivery_date DESC;

-- Grant necessary permissions
GRANT ALL ON deliveries TO authenticated;
GRANT ALL ON delivery_analytics TO authenticated;
