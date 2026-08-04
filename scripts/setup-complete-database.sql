-- Complete Safawala CRM Database Setup
-- This script sets up all essential tables for the wedding safa rental CRM

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS franchises CASCADE;
DROP TABLE IF EXISTS package_variants CASCADE;
DROP TABLE IF EXISTS package_sets CASCADE;
DROP TABLE IF EXISTS packages_categories CASCADE;
DROP TABLE IF EXISTS distance_pricing CASCADE;

-- 1. Franchises Table
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

-- 2. Users Table
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

-- 3. Customers Table
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    area VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Categories Table
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    franchise_id UUID REFERENCES franchises(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Products Table
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    brand VARCHAR(100),
    size VARCHAR(50),
    color VARCHAR(50),
    material VARCHAR(100),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    rental_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    stock_total INTEGER DEFAULT 0,
    stock_available INTEGER DEFAULT 0,
    stock_booked INTEGER DEFAULT 0,
    stock_damaged INTEGER DEFAULT 0,
    stock_in_laundry INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 5,
    usage_count INTEGER DEFAULT 0,
    damage_count INTEGER DEFAULT 0,
    barcode VARCHAR(255),
    qr_code VARCHAR(255),
    image_url TEXT,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Bookings Table
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('rental', 'direct_sale')) DEFAULT 'rental',
    event_type VARCHAR(50) DEFAULT 'wedding',
    event_for VARCHAR(10) CHECK (event_for IN ('groom', 'bride', 'both')) DEFAULT 'groom',
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pickup_date TIMESTAMP WITH TIME ZONE,
    delivery_date TIMESTAMP WITH TIME ZONE,
    event_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) CHECK (status IN ('pending_payment', 'pending_selection', 'confirmed', 'delivered', 'returned', 'order_complete', 'cancelled')) DEFAULT 'pending_selection',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')) DEFAULT 'pending',
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    groom_name VARCHAR(255),
    groom_home_address TEXT,
    groom_additional_whatsapp VARCHAR(20),
    bride_name VARCHAR(255),
    bride_additional_whatsapp VARCHAR(20),
    venue_name VARCHAR(255),
    venue_address TEXT,
    special_instructions TEXT,
    notes TEXT,
    invoice_generated BOOLEAN DEFAULT false,
    whatsapp_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Booking Items Table
CREATE TABLE booking_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Quotes Table
CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    franchise_id UUID REFERENCES franchises(id),
    type VARCHAR(20) CHECK (type IN ('rental', 'direct_sale')) DEFAULT 'rental',
    event_type VARCHAR(50) DEFAULT 'wedding',
    event_date TIMESTAMP WITH TIME ZONE,
    delivery_date TIMESTAMP WITH TIME ZONE,
    return_date TIMESTAMP WITH TIME ZONE,
    event_for VARCHAR(10) CHECK (event_for IN ('groom', 'bride', 'both')) DEFAULT 'groom',
    groom_name VARCHAR(255),
    bride_name VARCHAR(255),
    venue_name VARCHAR(255),
    venue_address TEXT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_whatsapp VARCHAR(20),
    customer_email VARCHAR(255),
    customer_address TEXT,
    customer_city VARCHAR(100),
    customer_pincode VARCHAR(10),
    customer_state VARCHAR(100),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('generated', 'sent', 'viewed', 'accepted', 'rejected')) DEFAULT 'generated',
    valid_until TIMESTAMP WITH TIME ZONE,
    special_instructions TEXT,
    notes TEXT,
    pdf_generated BOOLEAN DEFAULT false,
    pdf_url TEXT,
    whatsapp_sent BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    converted_to_booking_id UUID REFERENCES bookings(id),
    converted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Quote Items Table
CREATE TABLE quote_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(50),
    category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Inventory Transactions Table
CREATE TABLE inventory_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) NOT NULL,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('in', 'out', 'adjustment', 'damage', 'repair')) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_value DECIMAL(10,2),
    reference_type VARCHAR(50) CHECK (reference_type IN ('purchase', 'sale', 'booking', 'adjustment', 'return', 'damage', 'repair')),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Expenses Table
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    category_id UUID REFERENCES categories(id),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'cheque', 'upi')) DEFAULT 'cash',
    receipt_number VARCHAR(100),
    vendor_name VARCHAR(255),
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'paid', 'rejected')) DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Notifications Table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    franchise_id UUID REFERENCES franchises(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) CHECK (type IN ('info', 'warning', 'error', 'success', 'booking', 'payment', 'inventory', 'system')) DEFAULT 'info',
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 13. Package Categories Table
CREATE TABLE packages_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Package Sets Table
CREATE TABLE package_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    package_type VARCHAR(50) DEFAULT 'traditional',
    category_id UUID REFERENCES packages_categories(id),
    franchise_id UUID REFERENCES franchises(id),
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Package Variants Table
CREATE TABLE package_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    package_id UUID REFERENCES package_sets(id) ON DELETE CASCADE,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Distance Pricing Table
CREATE TABLE distance_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id UUID REFERENCES package_variants(id) ON DELETE CASCADE,
    distance_range VARCHAR(50) NOT NULL,
    price_multiplier DECIMAL(4,2) DEFAULT 1.0,
    extra_price DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for development
ALTER TABLE franchises DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE packages_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE package_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE package_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE distance_pricing DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_customers_franchise_id ON customers(franchise_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_products_franchise_id ON products(franchise_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_bookings_franchise_id ON bookings(franchise_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX idx_booking_items_product_id ON booking_items(product_id);
CREATE INDEX idx_quotes_franchise_id ON quotes(franchise_id);
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_franchise_id ON inventory_transactions(franchise_id);
CREATE INDEX idx_expenses_franchise_id ON expenses(franchise_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_franchise_id ON notifications(franchise_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Insert default franchise
INSERT INTO franchises (id, name, code, address, city, state, pincode, phone, owner_name, is_active) VALUES
('95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 'Main Franchise', 'MAIN001', '123 Wedding Street', 'Mumbai', 'Maharashtra', '400001', '+91-9876543210', 'Suresh Pithara', true);

-- Insert default admin user
INSERT INTO users (id, name, email, password_hash, role, franchise_id, is_active) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Super Admin', 'admin@safawala.com', '$2b$10$rOdpNb2LFRh0fR9xQgJ8g.K1vJJxhHdJ8fJKnEjDdJ9jHdJKnEjDdJ', 'super_admin', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', true);

-- Insert default categories
INSERT INTO categories (id, name, description, franchise_id) VALUES
('cat-turban', 'Turbans', 'Traditional wedding turbans and safas', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050'),
('cat-sehra', 'Sehra', 'Wedding sehra and groom accessories', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050'),
('cat-kalgi', 'Kalgi', 'Feather kalgi and plumes', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050'),
('cat-jewelry', 'Jewelry', 'Traditional groom jewelry', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050'),
('cat-shoes', 'Shoes', 'Wedding shoes and footwear', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050');

-- Insert sample products
INSERT INTO products (id, product_code, name, description, category_id, price, rental_price, cost_price, stock_total, stock_available, franchise_id) VALUES
('prod-turban-001', 'TUR001', 'Royal Red Turban', 'Premium silk turban in royal red color', 'cat-turban', 5000, 500, 2000, 10, 8, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050'),
('prod-turban-002', 'TUR002', 'Golden Yellow Turban', 'Traditional yellow turban with golden work', 'cat-turban', 4500, 450, 1800, 15, 12, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050'),
('prod-sehra-001', 'SEH001', 'Pearl Sehra', 'Elegant pearl sehra for groom', 'cat-sehra', 3000, 300, 1200, 8, 6, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050'),
('prod-kalgi-001', 'KAL001', 'Peacock Feather Kalgi', 'Beautiful peacock feather kalgi', 'cat-kalgi', 2000, 200, 800, 12, 10, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050'),
('prod-shoes-001', 'SHO001', 'Traditional Mojari', 'Handcrafted leather mojari', 'cat-shoes', 3500, 350, 1400, 20, 18, '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050');

-- Insert package categories
INSERT INTO packages_categories (id, name, description, display_order) VALUES
('pkg-cat-30', '30 Safas', 'Wedding packages for 30 people', 1),
('pkg-cat-51', '51 Safas', 'Wedding packages for 51 people', 2),
('pkg-cat-101', '101 Safas', 'Wedding packages for 101 people', 3),
('pkg-cat-111', '111 Safas', 'Wedding packages for 111 people', 4);

-- Insert sample packages
INSERT INTO package_sets (id, name, description, base_price, package_type, category_id, franchise_id, display_order) VALUES
('pkg-30-basic', 'Basic 30 Safa Package', 'Basic wedding safa collection for 30 people', 15000, 'wedding', 'pkg-cat-30', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 1),
('pkg-30-premium', 'Premium 30 Safa Package', 'Premium wedding safa collection for 30 people', 20000, 'premium', 'pkg-cat-30', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 2),
('pkg-51-deluxe', 'Deluxe 51 Safa Package', 'Deluxe wedding safa collection for 51 people', 35000, 'wedding', 'pkg-cat-51', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 1),
('pkg-101-royal', 'Royal 101 Safa Package', 'Royal wedding safa collection for 101 people', 75000, 'premium', 'pkg-cat-101', '95168a3d-a6a5-4f9b-bbe2-7b88c7cef050', 1);

-- Create functions for auto-generating numbers
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    booking_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 'BK(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM bookings
    WHERE booking_number ~ '^BK\d+$';
    
    booking_number := 'BK' || LPAD(next_number::TEXT, 6, '0');
    RETURN booking_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    quote_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'QT(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM quotes
    WHERE quote_number ~ '^QT\d+$';
    
    quote_number := 'QT' || LPAD(next_number::TEXT, 6, '0');
    RETURN quote_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    customer_code TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'CUST(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM customers
    WHERE customer_code ~ '^CUST\d+$';
    
    customer_code := 'CUST' || LPAD(next_number::TEXT, 6, '0');
    RETURN customer_code;
END;
$$ LANGUAGE plpgsql;