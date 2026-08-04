-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create franchises table
CREATE TABLE franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    address TEXT,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    gst_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('super_admin', 'franchise_admin', 'staff', 'readonly')),
    franchise_id UUID REFERENCES franchises(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(10),
    credit_limit DECIMAL(10,2) DEFAULT 50000,
    outstanding_balance DECIMAL(10,2) DEFAULT 0,
    franchise_id UUID REFERENCES franchises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    size VARCHAR(50),
    color VARCHAR(50),
    material VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    rental_price DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    stock_total INTEGER DEFAULT 0,
    stock_available INTEGER DEFAULT 0,
    stock_booked INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    condition VARCHAR(20) DEFAULT 'new' CHECK (condition IN ('new', 'good', 'fair', 'damaged')),
    location VARCHAR(100),
    qr_code VARCHAR(255),
    barcode VARCHAR(255),
    franchise_id UUID REFERENCES franchises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    type VARCHAR(20) DEFAULT 'rental' CHECK (type IN ('rental', 'direct_sale')),
    event_type VARCHAR(50) CHECK (event_type IN ('wedding', 'engagement', 'reception', 'sangeet', 'mehendi', 'other')),
    payment_type VARCHAR(20) CHECK (payment_type IN ('full', 'advance', 'deposit_only')),
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    pending_amount DECIMAL(10,2) DEFAULT 0,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'returned', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 2 CHECK (priority IN (1, 2, 3)),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    receipt_number VARCHAR(100),
    vendor_name VARCHAR(255),
    notes TEXT,
    franchise_id UUID REFERENCES franchises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
INSERT INTO franchises (name, location, address, contact_person, phone, email, gst_number) VALUES
('Safawala Mumbai Central', 'Mumbai', '123 Wedding Street, Dadar, Mumbai - 400014', 'Rajesh Kumar', '+91 9876543210', 'mumbai@safawala.com', '27AAAAA0000A1Z5'),
('Safawala Delhi North', 'Delhi', '456 Celebration Avenue, Karol Bagh, Delhi - 110005', 'Amit Sharma', '+91 9876543211', 'delhi@safawala.com', '07BBBBB1111B2Z6'),
('Safawala Bangalore South', 'Bangalore', '789 Royal Road, Jayanagar, Bangalore - 560041', 'Vikram Reddy', '+91 9876543212', 'bangalore@safawala.com', '29CCCCC2222C3Z7');

-- Insert sample users
INSERT INTO users (name, email, phone, role, franchise_id) VALUES
('Super Admin', 'admin@safawala.com', '+91 9999999999', 'super_admin', NULL),
('Mumbai Manager', 'mumbai.manager@safawala.com', '+91 9876543210', 'franchise_admin', (SELECT id FROM franchises WHERE name = 'Safawala Mumbai Central')),
('Delhi Manager', 'delhi.manager@safawala.com', '+91 9876543211', 'franchise_admin', (SELECT id FROM franchises WHERE name = 'Safawala Delhi North')),
('Staff Member', 'staff@safawala.com', '+91 9876543213', 'staff', (SELECT id FROM franchises WHERE name = 'Safawala Mumbai Central'));

-- Insert sample customers
INSERT INTO customers (customer_code, name, phone, whatsapp, email, address, city, pincode, franchise_id) VALUES
('CUST001', 'Rajesh Kumar', '+91 9876543220', '+91 9876543220', 'rajesh@example.com', '123 Main Street, Andheri', 'Mumbai', '400058', (SELECT id FROM franchises WHERE name = 'Safawala Mumbai Central')),
('CUST002', 'Priya Sharma', '+91 9876543221', '+91 9876543221', 'priya@example.com', '456 Park Avenue, CP', 'Delhi', '110001', (SELECT id FROM franchises WHERE name = 'Safawala Delhi North')),
('CUST003', 'Vikram Singh', '+91 9876543222', '+91 9876543222', 'vikram@example.com', '789 Brigade Road, MG Road', 'Bangalore', '560025', (SELECT id FROM franchises WHERE name = 'Safawala Bangalore South'));

-- Insert sample products
INSERT INTO products (product_code, name, category, subcategory, size, color, material, price, rental_price, security_deposit, stock_total, stock_available, stock_booked, franchise_id) VALUES
('TUR001', 'Royal Red Turban', 'Turban', 'Wedding', 'L', 'Red', 'Silk', 5000, 500, 1000, 10, 8, 2, (SELECT id FROM franchises WHERE name = 'Safawala Mumbai Central')),
('SEH001', 'Golden Sehra', 'Sehra', 'Bridal', 'One Size', 'Gold', 'Silk with Pearls', 3000, 300, 500, 15, 12, 3, (SELECT id FROM franchises WHERE name = 'Safawala Mumbai Central')),
('KAL001', 'Pearl Kalgi', 'Kalgi', 'Groom', 'Medium', 'White', 'Pearls', 2000, 200, 300, 20, 18, 2, (SELECT id FROM franchises WHERE name = 'Safawala Delhi North')),
('NEK001', 'Diamond Necklace Set', 'Necklace', 'Bridal', 'One Size', 'Gold', 'Artificial Diamond', 8000, 800, 2000, 5, 4, 1, (SELECT id FROM franchises WHERE name = 'Safawala Bangalore South'));

-- Create indexes for better performance
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_franchise ON customers(franchise_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_franchise ON bookings(franchise_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_franchise ON products(franchise_id);
CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_franchises_updated_at BEFORE UPDATE ON franchises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
