-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS franchises CASCADE;

-- Create franchises table
CREATE TABLE franchises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    owner_name VARCHAR(255) NOT NULL,
    gst_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('super_admin', 'franchise_admin', 'staff', 'readonly')) NOT NULL,
    franchise_id UUID REFERENCES franchises(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    gst_number VARCHAR(50),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    outstanding_balance DECIMAL(12,2) DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('turban', 'sehra', 'kalgi', 'necklace', 'bracelet', 'ring', 'shoes', 'other')) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    size VARCHAR(50),
    color VARCHAR(50),
    material VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    rental_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    stock_total INTEGER DEFAULT 0,
    stock_available INTEGER DEFAULT 0,
    stock_booked INTEGER DEFAULT 0,
    stock_damaged INTEGER DEFAULT 0,
    stock_in_laundry INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 5,
    usage_count INTEGER DEFAULT 0,
    damage_count INTEGER DEFAULT 0,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('rental', 'direct_sale')) NOT NULL,
    event_type VARCHAR(50) CHECK (event_type IN ('wedding', 'engagement', 'reception', 'sangeet', 'mehendi', 'other')) DEFAULT 'wedding',
    payment_type VARCHAR(20) CHECK (payment_type IN ('full', 'advance', 'advance_with_deposit')) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    security_deposit DECIMAL(12,2) DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    pending_amount DECIMAL(12,2) DEFAULT 0,
    refund_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'delivered', 'returned', 'completed', 'cancelled')) DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    event_date DATE,
    delivery_date DATE,
    pickup_date DATE,
    groom_name VARCHAR(255),
    bride_name VARCHAR(255),
    venue_name VARCHAR(255),
    venue_address TEXT,
    special_instructions TEXT,
    invoice_generated BOOLEAN DEFAULT false,
    whatsapp_sent BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking_items table
CREATE TABLE booking_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    damage_cost DECIMAL(10,2) DEFAULT 0,
    cleaning_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    vendor_name VARCHAR(255),
    bill_number VARCHAR(100),
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample franchises
INSERT INTO franchises (id, name, code, address, city, state, pincode, phone, email, owner_name, gst_number) VALUES
('f1111111-1111-1111-1111-111111111111', 'Safawala Main Branch', 'MAIN', '123 Wedding Street, Central Market', 'Delhi', 'Delhi', '110001', '+91-9876543210', 'main@safawala.com', 'Rajesh Kumar', '07AAACH7409R1ZZ'),
('f2222222-2222-2222-2222-222222222222', 'Safawala North Branch', 'NORTH', '456 Bridal Avenue, North Plaza', 'Delhi', 'Delhi', '110009', '+91-9876543211', 'north@safawala.com', 'Amit Sharma', '07AAACH7409R1ZY');

-- Insert sample users
INSERT INTO users (id, name, email, password_hash, role, franchise_id) VALUES
('u1111111-1111-1111-1111-111111111111', 'Super Admin', 'admin@safawala.com', '$2b$10$hash', 'super_admin', NULL),
('u2222222-2222-2222-2222-222222222222', 'Main Branch Manager', 'manager@safawala.com', '$2b$10$hash', 'franchise_admin', 'f1111111-1111-1111-1111-111111111111'),
('u3333333-3333-3333-3333-333333333333', 'North Branch Manager', 'north.manager@safawala.com', '$2b$10$hash', 'franchise_admin', 'f2222222-2222-2222-2222-222222222222'),
('u4444444-4444-4444-4444-444444444444', 'Staff Member', 'staff@safawala.com', '$2b$10$hash', 'staff', 'f1111111-1111-1111-1111-111111111111');

-- Insert sample customers
INSERT INTO customers (id, customer_code, name, phone, whatsapp, email, address, city, pincode, franchise_id) VALUES
('c1111111-1111-1111-1111-111111111111', 'CUST001', 'Rajesh Gupta', '+91-9876543210', '+91-9876543210', 'rajesh@email.com', '789 Residential Area, Sector 15', 'Delhi', '110015', 'f1111111-1111-1111-1111-111111111111'),
('c2222222-2222-2222-2222-222222222222', 'CUST002', 'Amit Verma', '+91-9876543211', '+91-9876543211', 'amit@email.com', '321 Housing Society, Block A', 'Delhi', '110020', 'f1111111-1111-1111-1111-111111111111'),
('c3333333-3333-3333-3333-333333333333', 'CUST003', 'Vikram Singh', '+91-9876543212', '+91-9876543212', 'vikram@email.com', '654 Apartment Complex, Tower B', 'Delhi', '110025', 'f2222222-2222-2222-2222-222222222222');

-- Insert sample products
INSERT INTO products (id, product_code, name, category, description, brand, size, color, material, price, rental_price, cost_price, security_deposit, stock_total, stock_available, franchise_id) VALUES
('p1111111-1111-1111-1111-111111111111', 'TUR001', 'Royal Silk Turban', 'turban', 'Premium silk turban with golden work', 'Royal Collection', 'L', 'Maroon', 'Silk', 15000, 2500, 8000, 5000, 5, 4, 'f1111111-1111-1111-1111-111111111111'),
('p2222222-2222-2222-2222-222222222222', 'KAL001', 'Diamond Kalgi', 'kalgi', 'Artificial diamond kalgi with pearls', 'Premium Jewels', 'Standard', 'Gold', 'Metal', 8000, 1500, 4000, 3000, 3, 3, 'f1111111-1111-1111-1111-111111111111'),
('p3333333-3333-3333-3333-333333333333', 'SEH001', 'Floral Sehra', 'sehra', 'Fresh flower sehra with jasmine', 'Flower Art', 'Standard', 'White', 'Flowers', 3000, 800, 1500, 500, 10, 8, 'f1111111-1111-1111-1111-111111111111'),
('p4444444-4444-4444-4444-444444444444', 'NEC001', 'Pearl Necklace Set', 'necklace', '3-layer pearl necklace with earrings', 'Bridal Jewels', 'Standard', 'White', 'Pearls', 12000, 2000, 6000, 4000, 4, 4, 'f2222222-2222-2222-2222-222222222222'),
('p5555555-5555-5555-5555-555555555555', 'SHO001', 'Leather Mojari', 'shoes', 'Handcrafted leather mojari with embroidery', 'Traditional Wear', '9', 'Brown', 'Leather', 5000, 800, 2500, 1000, 8, 7, 'f2222222-2222-2222-2222-222222222222');

-- Insert sample booking
INSERT INTO bookings (id, booking_number, customer_id, franchise_id, type, event_type, payment_type, total_amount, discount_amount, tax_amount, security_deposit, amount_paid, pending_amount, status, event_date, delivery_date, pickup_date, groom_name, bride_name, venue_name, venue_address, created_by) VALUES
('b1111111-1111-1111-1111-111111111111', 'WED001', 'c1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'rental', 'wedding', 'advance_with_deposit', 4300, 0, 774, 8500, 2000, 3074, 'confirmed', '2024-02-15', '2024-02-14', '2024-02-16', 'Rajesh Gupta', 'Priya Sharma', 'Grand Palace Hotel', '123 Wedding Venue Road, Delhi', 'u2222222-2222-2222-2222-222222222222');

-- Insert sample booking items
INSERT INTO booking_items (booking_id, product_id, quantity, unit_price, total_price, security_deposit) VALUES
('b1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 1, 2500, 2500, 5000),
('b1111111-1111-1111-1111-111111111111', 'p3333333-3333-3333-3333-333333333333', 1, 800, 800, 500),
('b1111111-1111-1111-1111-111111111111', 'p5555555-5555-5555-5555-555555555555', 1, 800, 800, 1000),
('b1111111-1111-1111-1111-111111111111', 'p2222222-2222-2222-2222-222222222222', 1, 1500, 1500, 3000);

-- Insert sample expenses
INSERT INTO expenses (expense_number, category, description, amount, expense_date, payment_method, vendor_name, franchise_id, created_by) VALUES
('EXP001', 'Inventory Purchase', 'New turban collection purchase', 50000, '2024-01-15', 'bank_transfer', 'Royal Textiles Ltd', 'f1111111-1111-1111-1111-111111111111', 'u2222222-2222-2222-2222-222222222222'),
('EXP002', 'Store Rent', 'Monthly store rent payment', 25000, '2024-01-01', 'bank_transfer', 'Property Owner', 'f1111111-1111-1111-1111-111111111111', 'u2222222-2222-2222-2222-222222222222'),
('EXP003', 'Marketing', 'Social media advertising', 8000, '2024-01-10', 'online', 'Facebook Ads', 'f2222222-2222-2222-2222-222222222222', 'u3333333-3333-3333-3333-333333333333');

-- Create indexes for better performance
CREATE INDEX idx_customers_franchise ON customers(franchise_id);
CREATE INDEX idx_products_franchise ON products(franchise_id);
CREATE INDEX idx_bookings_franchise ON bookings(franchise_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX idx_booking_items_product ON booking_items(product_id);

-- Disable RLS for all tables (for development/testing)
ALTER TABLE franchises DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
