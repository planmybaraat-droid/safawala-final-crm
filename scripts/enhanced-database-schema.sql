-- Drop existing tables if they exist
DROP TABLE IF EXISTS laundry_items CASCADE;
DROP TABLE IF EXISTS laundry_batches CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS franchises CASCADE;

-- Create franchises table
CREATE TABLE franchises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    manager_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'franchise_admin', 'staff', 'readonly')),
    franchise_id UUID REFERENCES franchises(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
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
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(50),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    outstanding_balance DECIMAL(12,2) DEFAULT 0,
    franchise_id UUID REFERENCES franchises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vendors table
CREATE TABLE vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(10),
    contact_person VARCHAR(255),
    payment_terms INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    qr_code VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('turban', 'accessory', 'package', 'fabric', 'cleaning_supply')),
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    rental_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_total INTEGER NOT NULL DEFAULT 0,
    stock_available INTEGER NOT NULL DEFAULT 0,
    stock_booked INTEGER NOT NULL DEFAULT 0,
    stock_damaged INTEGER NOT NULL DEFAULT 0,
    stock_in_laundry INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    usage_count INTEGER DEFAULT 0,
    damage_count INTEGER DEFAULT 0,
    image_url TEXT,
    franchise_id UUID REFERENCES franchises(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    qr_code VARCHAR(100) UNIQUE,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct_sale', 'rental')),
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('full', 'advance', 'deposit_only')),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    pending_amount DECIMAL(12,2) DEFAULT 0,
    deposit_amount DECIMAL(12,2) DEFAULT 0,
    refund_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'returned', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 1,
    event_date DATE,
    delivery_date DATE,
    pickup_date DATE,
    actual_delivery_date DATE,
    actual_pickup_date DATE,
    assigned_staff_id UUID REFERENCES users(id),
    delivery_address TEXT,
    special_instructions TEXT,
    notes TEXT,
    invoice_generated BOOLEAN DEFAULT false,
    whatsapp_sent BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking_items table
CREATE TABLE booking_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL,
    condition_on_delivery VARCHAR(20) DEFAULT 'clean' CHECK (condition_on_delivery IN ('clean', 'dirty', 'damaged', 'in_laundry')),
    condition_on_return VARCHAR(20) CHECK (condition_on_return IN ('clean', 'dirty', 'damaged', 'in_laundry')),
    damage_notes TEXT,
    damage_photo_url TEXT,
    damage_cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    pending_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
    purchase_date DATE NOT NULL,
    due_date DATE,
    payment_terms INTEGER DEFAULT 30,
    notes TEXT,
    receipt_url TEXT,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_items table
CREATE TABLE purchase_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id),
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('utilities', 'rent', 'salaries', 'supplies', 'maintenance', 'marketing', 'transport', 'other')),
    subcategory VARCHAR(100),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    vendor_name VARCHAR(255),
    expense_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque')),
    receipt_number VARCHAR(100),
    receipt_url TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20),
    approved_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    purchase_id UUID REFERENCES purchases(id),
    customer_id UUID REFERENCES customers(id),
    vendor_id UUID REFERENCES vendors(id),
    amount DECIMAL(12,2) NOT NULL,
    method VARCHAR(20) NOT NULL CHECK (method IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque')),
    status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
    payment_date DATE NOT NULL,
    transaction_id VARCHAR(100),
    reference_number VARCHAR(100),
    bank_name VARCHAR(100),
    notes TEXT,
    receipt_url TEXT,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create laundry_batches table
CREATE TABLE laundry_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    total_items INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_per_item DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_process', 'completed', 'returned')),
    sent_date DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    quality_check_notes TEXT,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create laundry_items table
CREATE TABLE laundry_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES laundry_batches(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    condition_before VARCHAR(20) NOT NULL CHECK (condition_before IN ('clean', 'dirty', 'damaged', 'in_laundry')),
    condition_after VARCHAR(20) CHECK (condition_after IN ('clean', 'dirty', 'damaged', 'in_laundry')),
    special_instructions TEXT,
    damage_notes TEXT,
    photo_before_url TEXT,
    photo_after_url TEXT,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_franchise_id ON users(franchise_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_customers_franchise_id ON customers(franchise_id);
CREATE INDEX idx_products_franchise_id ON products(franchise_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_bookings_franchise_id ON bookings(franchise_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX idx_booking_items_product_id ON booking_items(product_id);
CREATE INDEX idx_purchases_franchise_id ON purchases(franchise_id);
CREATE INDEX idx_purchases_vendor_id ON purchases(vendor_id);
CREATE INDEX idx_expenses_franchise_id ON expenses(franchise_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_purchase_id ON payments(purchase_id);
CREATE INDEX idx_laundry_batches_franchise_id ON laundry_batches(franchise_id);
CREATE INDEX idx_laundry_items_batch_id ON laundry_items(batch_id);

-- Insert sample data
INSERT INTO franchises (name, code, address, phone, email, manager_name) VALUES
('Mumbai Central', 'MUM001', '123 Main Street, Mumbai, Maharashtra 400001', '+91-9876543210', 'mumbai@safawala.com', 'Rajesh Kumar'),
('Delhi North', 'DEL001', '456 Ring Road, Delhi 110001', '+91-9876543211', 'delhi@safawala.com', 'Amit Sharma'),
('Bangalore South', 'BLR001', '789 MG Road, Bangalore, Karnataka 560001', '+91-9876543212', 'bangalore@safawala.com', 'Priya Patel');

-- Insert sample users
INSERT INTO users (email, password_hash, name, phone, role, franchise_id) VALUES
('admin@safawala.com', '$2b$10$example', 'Super Admin', '+91-9999999999', 'super_admin', NULL),
('mumbai.admin@safawala.com', '$2b$10$example', 'Mumbai Admin', '+91-9876543210', 'franchise_admin', (SELECT id FROM franchises WHERE code = 'MUM001')),
('delhi.admin@safawala.com', '$2b$10$example', 'Delhi Admin', '+91-9876543211', 'franchise_admin', (SELECT id FROM franchises WHERE code = 'DEL001')),
('staff1@safawala.com', '$2b$10$example', 'Staff Member 1', '+91-9876543213', 'staff', (SELECT id FROM franchises WHERE code = 'MUM001'));

-- Insert sample vendors
INSERT INTO vendors (vendor_code, name, phone, email, contact_person, payment_terms) VALUES
('VEN001', 'Premium Laundry Services', '+91-9876543220', 'contact@premiumlaundry.com', 'Suresh Gupta', 15),
('VEN002', 'Fabric Care Solutions', '+91-9876543221', 'info@fabriccare.com', 'Meera Singh', 30),
('VEN003', 'Quick Clean Express', '+91-9876543222', 'support@quickclean.com', 'Ravi Verma', 7);

-- Insert sample customers
INSERT INTO customers (customer_code, name, phone, whatsapp, email, address, franchise_id) VALUES
('CUST001', 'Arjun Mehta', '+91-9876543230', '+91-9876543230', 'arjun@example.com', '123 Customer Street, Mumbai', (SELECT id FROM franchises WHERE code = 'MUM001')),
('CUST002', 'Priya Sharma', '+91-9876543231', '+91-9876543231', 'priya@example.com', '456 Client Avenue, Delhi', (SELECT id FROM franchises WHERE code = 'DEL001')),
('CUST003', 'Vikram Singh', '+91-9876543232', '+91-9876543232', 'vikram@example.com', '789 Buyer Boulevard, Mumbai', (SELECT id FROM franchises WHERE code = 'MUM001'));

-- Insert sample products
INSERT INTO products (product_code, barcode, qr_code, name, category, price, rental_price, cost_price, stock_total, stock_available, franchise_id) VALUES
('PRD001', 'BAR001', 'QR001', 'Premium Silk Turban - Red', 'turban', 2500.00, 500.00, 1500.00, 50, 45, (SELECT id FROM franchises WHERE code = 'MUM001')),
('PRD002', 'BAR002', 'QR002', 'Cotton Turban - White', 'turban', 1500.00, 300.00, 800.00, 100, 85, (SELECT id FROM franchises WHERE code = 'MUM001')),
('PRD003', 'BAR003', 'QR003', 'Designer Kalgi Set', 'accessory', 3000.00, 600.00, 2000.00, 25, 20, (SELECT id FROM franchises WHERE code = 'MUM001')),
('PRD004', 'BAR004', 'QR004', 'Wedding Package Deluxe', 'package', 15000.00, 3000.00, 10000.00, 10, 8, (SELECT id FROM franchises WHERE code = 'MUM001'));

-- Enable Row Level Security
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simplified for demo)
CREATE POLICY "Enable all for authenticated users" ON franchises FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON users FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON customers FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON vendors FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON products FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON bookings FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON booking_items FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON purchases FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON purchase_items FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON expenses FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON payments FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON laundry_batches FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON laundry_items FOR ALL USING (true);
