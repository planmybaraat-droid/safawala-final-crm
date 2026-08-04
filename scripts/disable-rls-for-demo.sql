-- Temporarily disable RLS for demo setup
ALTER TABLE franchises DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Clear any existing data and recreate demo data
DELETE FROM booking_items;
DELETE FROM bookings;
DELETE FROM payments;
DELETE FROM products;
DELETE FROM users;
DELETE FROM franchises;

-- Insert demo franchises
INSERT INTO franchises (name, address, phone, email) VALUES 
('Main Branch', '123 Wedding Street, City Center', '+91-9876543210', 'main@safawala.com'),
('North Branch', '456 North Avenue, North City', '+91-9876543211', 'north@safawala.com');

-- Insert demo users
INSERT INTO users (email, name, phone, role, franchise_id, password_hash, is_active) VALUES 
('admin@safawala.com', 'Super Admin', '+91-9999999999', 'super_admin', NULL, 'demo_hash', true),
('manager1@safawala.com', 'Main Branch Manager', '+91-9999999998', 'franchise_admin', (SELECT id FROM franchises WHERE name = 'Main Branch'), 'demo_hash', true),
('staff1@safawala.com', 'Staff Member 1', '+91-9999999997', 'staff', (SELECT id FROM franchises WHERE name = 'Main Branch'), 'demo_hash', true);

-- Insert demo products
INSERT INTO products (name, category, price, rental_price, stock_total, stock_available, franchise_id) VALUES 
('Royal Red Turban', 'turban', 5000.00, 500.00, 10, 8, (SELECT id FROM franchises WHERE name = 'Main Branch')),
('Golden Kalgi', 'accessory', 2000.00, 200.00, 15, 12, (SELECT id FROM franchises WHERE name = 'Main Branch')),
('Wedding Package Deluxe', 'package', 15000.00, 1500.00, 5, 4, (SELECT id FROM franchises WHERE name = 'Main Branch'));

-- Insert demo customers
INSERT INTO customers (name, phone, whatsapp, email, address) VALUES 
('Rajesh Kumar', '+91-9876543210', '+91-9876543210', 'rajesh@example.com', '123 Main Street, Delhi'),
('Priya Sharma', '+91-9876543211', '+91-9876543211', 'priya@example.com', '456 Park Avenue, Mumbai'),
('Amit Singh', '+91-9876543212', '+91-9876543212', 'amit@example.com', '789 Garden Road, Bangalore');
