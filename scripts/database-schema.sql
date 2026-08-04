-- Enable RLS (Row Level Security)

-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'franchise_admin', 'staff', 'readonly');
CREATE TYPE booking_type AS ENUM ('direct_sale', 'rental');
CREATE TYPE payment_type AS ENUM ('full', 'advance', 'deposit_only');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'delivered', 'returned', 'completed', 'cancelled');
CREATE TYPE product_category AS ENUM ('turban', 'accessory', 'package');
CREATE TYPE item_condition AS ENUM ('clean', 'dirty', 'damaged');
CREATE TYPE laundry_status AS ENUM ('pending', 'in_process', 'completed');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'bank_transfer', 'card');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'failed');

-- Franchises table
CREATE TABLE franchises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    gst_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'staff',
    franchise_id UUID REFERENCES franchises(id),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category product_category NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    rental_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_total INTEGER NOT NULL DEFAULT 0,
    stock_available INTEGER NOT NULL DEFAULT 0,
    stock_booked INTEGER NOT NULL DEFAULT 0,
    stock_damaged INTEGER NOT NULL DEFAULT 0,
    qr_code VARCHAR(255),
    usage_count INTEGER DEFAULT 0,
    image_url TEXT,
    franchise_id UUID REFERENCES franchises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    type booking_type NOT NULL,
    payment_type payment_type NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    pending_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status booking_status NOT NULL DEFAULT 'pending',
    event_date DATE,
    delivery_date DATE,
    pickup_date DATE,
    assigned_staff_id UUID REFERENCES users(id),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking Items table
CREATE TABLE booking_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    condition_on_return item_condition,
    damage_notes TEXT,
    damage_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendors table
CREATE TABLE vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    gst_number VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases table
CREATE TABLE purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    purchase_date DATE NOT NULL,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id),
    amount DECIMAL(10,2) NOT NULL,
    method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    payment_date DATE NOT NULL,
    transaction_id VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Laundry Batches table
CREATE TABLE laundry_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    batch_number VARCHAR(50) NOT NULL,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    status laundry_status NOT NULL DEFAULT 'pending',
    date_created DATE NOT NULL,
    date_completed DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Laundry Items table
CREATE TABLE laundry_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    batch_id UUID REFERENCES laundry_batches(id) NOT NULL,
    condition item_condition NOT NULL,
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Logs table
CREATE TABLE activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_bookings_franchise_id ON bookings(franchise_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_products_franchise_id ON products(franchise_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Enable Row Level Security
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Insert sample data
INSERT INTO franchises (name, address, phone, email) VALUES 
('Main Branch', '123 Wedding Street, City Center', '+91-9876543210', 'main@safawala.com'),
('North Branch', '456 North Avenue, North City', '+91-9876543211', 'north@safawala.com');

INSERT INTO users (email, name, phone, role, franchise_id, password_hash) VALUES 
('admin@safawala.com', 'Super Admin', '+91-9999999999', 'super_admin', NULL, '$2a$10$example_hash'),
('manager1@safawala.com', 'Main Branch Manager', '+91-9999999998', 'franchise_admin', (SELECT id FROM franchises WHERE name = 'Main Branch'), '$2a$10$example_hash'),
('staff1@safawala.com', 'Staff Member 1', '+91-9999999997', 'staff', (SELECT id FROM franchises WHERE name = 'Main Branch'), '$2a$10$example_hash');

INSERT INTO products (name, category, price, rental_price, stock_total, stock_available, franchise_id) VALUES 
('Royal Red Turban', 'turban', 5000.00, 500.00, 10, 8, (SELECT id FROM franchises WHERE name = 'Main Branch')),
('Golden Kalgi', 'accessory', 2000.00, 200.00, 15, 12, (SELECT id FROM franchises WHERE name = 'Main Branch')),
('Wedding Package Deluxe', 'package', 15000.00, 1500.00, 5, 4, (SELECT id FROM franchises WHERE name = 'Main Branch'));
