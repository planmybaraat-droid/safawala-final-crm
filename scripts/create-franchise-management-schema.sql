-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order to handle dependencies)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS laundry_items CASCADE;
DROP TABLE IF EXISTS laundry_batches CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS franchises CASCADE;

-- Create franchises table (main table for franchise management)
CREATE TABLE franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    manager_name VARCHAR(255),
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    license_number VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(255),
    bank_ifsc VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    opening_date DATE DEFAULT CURRENT_DATE,
    monthly_target DECIMAL(12,2) DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    security_deposit DECIMAL(12,2) DEFAULT 0,
    agreement_start_date DATE,
    agreement_end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (franchise staff management)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'franchise_admin', 'staff', 'readonly')),
    franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    permissions JSONB DEFAULT '{}',
    salary DECIMAL(10,2) DEFAULT 0,
    joining_date DATE DEFAULT CURRENT_DATE,
    emergency_contact VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table (franchise customers)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(50),
    credit_limit DECIMAL(12,2) DEFAULT 100000,
    outstanding_balance DECIMAL(12,2) DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    last_booking_date DATE,
    customer_type VARCHAR(20) DEFAULT 'regular' CHECK (customer_type IN ('regular', 'premium', 'vip')),
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vendors table (franchise vendors/suppliers)
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    contact_person VARCHAR(255),
    payment_terms INTEGER DEFAULT 30,
    vendor_type VARCHAR(50) DEFAULT 'supplier' CHECK (vendor_type IN ('supplier', 'laundry', 'transport', 'maintenance', 'other')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table (franchise inventory)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    qr_code VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('turban', 'sehra', 'kalgi', 'necklace', 'bracelet', 'ring', 'shoes', 'fabric', 'accessory', 'package', 'other')),
    subcategory VARCHAR(100),
    description TEXT,
    brand VARCHAR(100),
    size VARCHAR(50),
    color VARCHAR(50),
    material VARCHAR(100),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    rental_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    stock_total INTEGER NOT NULL DEFAULT 0,
    stock_available INTEGER NOT NULL DEFAULT 0,
    stock_booked INTEGER NOT NULL DEFAULT 0,
    stock_damaged INTEGER NOT NULL DEFAULT 0,
    stock_in_laundry INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 5,
    usage_count INTEGER DEFAULT 0,
    damage_count INTEGER DEFAULT 0,
    location VARCHAR(100),
    image_url TEXT,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table (franchise orders/rentals)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    qr_code VARCHAR(100) UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'rental' CHECK (type IN ('rental', 'direct_sale')),
    event_type VARCHAR(50) CHECK (event_type IN ('wedding', 'engagement', 'reception', 'sangeet', 'mehendi', 'other')),
    payment_type VARCHAR(20) CHECK (payment_type IN ('full', 'advance', 'deposit_only')),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    security_deposit DECIMAL(12,2) DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    pending_amount DECIMAL(12,2) DEFAULT 0,
    refund_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'returned', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 2 CHECK (priority IN (1, 2, 3)),
    event_date DATE,
    delivery_date DATE,
    pickup_date DATE,
    actual_delivery_date DATE,
    actual_pickup_date DATE,
    groom_name VARCHAR(255),
    bride_name VARCHAR(255),
    venue_name VARCHAR(255),
    venue_address TEXT,
    delivery_address TEXT,
    special_instructions TEXT,
    notes TEXT,
    invoice_generated BOOLEAN DEFAULT false,
    whatsapp_sent BOOLEAN DEFAULT false,
    assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking_items table (items in each booking)
CREATE TABLE booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    damage_cost DECIMAL(10,2) DEFAULT 0,
    cleaning_required BOOLEAN DEFAULT false,
    condition_on_delivery VARCHAR(20) DEFAULT 'clean' CHECK (condition_on_delivery IN ('clean', 'dirty', 'damaged')),
    condition_on_return VARCHAR(20) CHECK (condition_on_return IN ('clean', 'dirty', 'damaged')),
    damage_notes TEXT,
    damage_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table (franchise payment tracking)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'online')),
    payment_date DATE NOT NULL,
    transaction_id VARCHAR(255),
    reference_number VARCHAR(100),
    bank_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
    notes TEXT,
    receipt_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchases table (franchise purchases from vendors)
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    pending_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'partial', 'overdue')),
    purchase_date DATE NOT NULL,
    due_date DATE,
    payment_terms INTEGER DEFAULT 30,
    notes TEXT,
    receipt_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_items table (items in each purchase)
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table (franchise expenses)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('utilities', 'rent', 'salaries', 'supplies', 'maintenance', 'marketing', 'transport', 'insurance', 'other')),
    subcategory VARCHAR(100),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    vendor_name VARCHAR(255),
    expense_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque')),
    receipt_number VARCHAR(100),
    receipt_url TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20) CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create laundry_batches table (franchise laundry management)
CREATE TABLE laundry_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    total_items INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_per_item DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_process', 'completed', 'returned')),
    sent_date DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    quality_notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create laundry_items table (items in each laundry batch)
CREATE TABLE laundry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES laundry_batches(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    condition_before VARCHAR(20) NOT NULL CHECK (condition_before IN ('clean', 'dirty', 'damaged')),
    condition_after VARCHAR(20) CHECK (condition_after IN ('clean', 'dirty', 'damaged')),
    special_instructions TEXT,
    damage_notes TEXT,
    photo_before_url TEXT,
    photo_after_url TEXT,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_logs table (franchise activity tracking)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_franchises_code ON franchises(code);
CREATE INDEX idx_franchises_city ON franchises(city);
CREATE INDEX idx_franchises_is_active ON franchises(is_active);

CREATE INDEX idx_users_franchise_id ON users(franchise_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_customers_franchise_id ON customers(franchise_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_customer_code ON customers(customer_code);

CREATE INDEX idx_products_franchise_id ON products(franchise_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_stock_available ON products(stock_available);

CREATE INDEX idx_bookings_franchise_id ON bookings(franchise_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

CREATE INDEX idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX idx_booking_items_product_id ON booking_items(product_id);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

CREATE INDEX idx_purchases_franchise_id ON purchases(franchise_id);
CREATE INDEX idx_purchases_vendor_id ON purchases(vendor_id);
CREATE INDEX idx_purchases_status ON purchases(status);

CREATE INDEX idx_expenses_franchise_id ON expenses(franchise_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

CREATE INDEX idx_laundry_batches_franchise_id ON laundry_batches(franchise_id);
CREATE INDEX idx_laundry_batches_status ON laundry_batches(status);

CREATE INDEX idx_activity_logs_franchise_id ON activity_logs(franchise_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_franchises_updated_at BEFORE UPDATE ON franchises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_booking_items_updated_at BEFORE UPDATE ON booking_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_laundry_batches_updated_at BEFORE UPDATE ON laundry_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_laundry_items_updated_at BEFORE UPDATE ON laundry_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helpers for RLS (idempotent)
CREATE OR REPLACE FUNCTION jwt_franchise_id()
RETURNS uuid STABLE LANGUAGE sql AS $$
    SELECT COALESCE(
        NULLIF(auth.jwt() ->> 'franchise_id', '')::uuid,
        NULLIF((auth.jwt() -> 'user_metadata' ->> 'franchise_id'), '')::uuid
    )
$$;

CREATE OR REPLACE FUNCTION app_is_super_admin()
RETURNS boolean STABLE LANGUAGE sql AS $$
    SELECT (auth.jwt() ->> 'app_role') = 'super_admin'
                 OR (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'super_admin';
$$;

-- Drop demo-open policies if present
DO $$BEGIN
    FOR policy_name IN SELECT polname FROM pg_policies WHERE polname = 'Enable all for authenticated users'
    LOOP
        FOR tab IN SELECT c.relname FROM pg_policies p JOIN pg_class c ON c.oid = p.polrelid WHERE p.polname = policy_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS "%s" ON %I', policy_name, tab.relname);
        END LOOP;
    END LOOP;
END$$;

-- Tenant policies for key tables
-- customers
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'customers'::regclass AND polname = 'customers_select') THEN
        EXECUTE $$CREATE POLICY customers_select ON customers FOR SELECT
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'customers'::regclass AND polname = 'customers_insert') THEN
        EXECUTE $$CREATE POLICY customers_insert ON customers FOR INSERT
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'customers'::regclass AND polname = 'customers_update') THEN
        EXECUTE $$CREATE POLICY customers_update ON customers FOR UPDATE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'customers'::regclass AND polname = 'customers_delete') THEN
        EXECUTE $$CREATE POLICY customers_delete ON customers FOR DELETE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
END$$;

-- products
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'products'::regclass AND polname = 'products_select') THEN
        EXECUTE $$CREATE POLICY products_select ON products FOR SELECT
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'products'::regclass AND polname = 'products_insert') THEN
        EXECUTE $$CREATE POLICY products_insert ON products FOR INSERT
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'products'::regclass AND polname = 'products_update') THEN
        EXECUTE $$CREATE POLICY products_update ON products FOR UPDATE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'products'::regclass AND polname = 'products_delete') THEN
        EXECUTE $$CREATE POLICY products_delete ON products FOR DELETE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
END$$;

-- bookings
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'bookings'::regclass AND polname = 'bookings_select') THEN
        EXECUTE $$CREATE POLICY bookings_select ON bookings FOR SELECT
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'bookings'::regclass AND polname = 'bookings_insert') THEN
        EXECUTE $$CREATE POLICY bookings_insert ON bookings FOR INSERT
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'bookings'::regclass AND polname = 'bookings_update') THEN
        EXECUTE $$CREATE POLICY bookings_update ON bookings FOR UPDATE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'bookings'::regclass AND polname = 'bookings_delete') THEN
        EXECUTE $$CREATE POLICY bookings_delete ON bookings FOR DELETE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
END$$;

-- booking_items: enforce via booking
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'booking_items'::regclass AND polname = 'bi_select') THEN
        EXECUTE $$CREATE POLICY bi_select ON booking_items FOR SELECT
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'booking_items'::regclass AND polname = 'bi_insert') THEN
        EXECUTE $$CREATE POLICY bi_insert ON booking_items FOR INSERT
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'booking_items'::regclass AND polname = 'bi_update') THEN
        EXECUTE $$CREATE POLICY bi_update ON booking_items FOR UPDATE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
                         ))
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'booking_items'::regclass AND polname = 'bi_delete') THEN
        EXECUTE $$CREATE POLICY bi_delete ON booking_items FOR DELETE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
END$$;

-- payments, purchases, purchase_items, expenses: similar tenant policies
-- payments (via booking franchise)
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'payments'::regclass AND polname = 'payments_select') THEN
        EXECUTE $$CREATE POLICY payments_select ON payments FOR SELECT
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'payments'::regclass AND polname = 'payments_insert') THEN
        EXECUTE $$CREATE POLICY payments_insert ON payments FOR INSERT
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'payments'::regclass AND polname = 'payments_update') THEN
        EXECUTE $$CREATE POLICY payments_update ON payments FOR UPDATE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
                         ))
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'payments'::regclass AND polname = 'payments_delete') THEN
        EXECUTE $$CREATE POLICY payments_delete ON payments FOR DELETE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
END$$;

-- purchases (direct)
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'purchases'::regclass AND polname = 'purchases_select') THEN
        EXECUTE $$CREATE POLICY purchases_select ON purchases FOR SELECT
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'purchases'::regclass AND polname = 'purchases_insert') THEN
        EXECUTE $$CREATE POLICY purchases_insert ON purchases FOR INSERT
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'purchases'::regclass AND polname = 'purchases_update') THEN
        EXECUTE $$CREATE POLICY purchases_update ON purchases FOR UPDATE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'purchases'::regclass AND polname = 'purchases_delete') THEN
        EXECUTE $$CREATE POLICY purchases_delete ON purchases FOR DELETE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
END$$;

-- purchase_items (via purchase)
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'purchase_items'::regclass AND polname = 'pi_select') THEN
        EXECUTE $$CREATE POLICY pi_select ON purchase_items FOR SELECT
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM purchases p WHERE p.id = purchase_id AND p.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'purchase_items'::regclass AND polname = 'pi_insert') THEN
        EXECUTE $$CREATE POLICY pi_insert ON purchase_items FOR INSERT
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM purchases p WHERE p.id = purchase_id AND p.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'purchase_items'::regclass AND polname = 'pi_update') THEN
        EXECUTE $$CREATE POLICY pi_update ON purchase_items FOR UPDATE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM purchases p WHERE p.id = purchase_id AND p.franchise_id = jwt_franchise_id()
                         ))
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM purchases p WHERE p.id = purchase_id AND p.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'purchase_items'::regclass AND polname = 'pi_delete') THEN
        EXECUTE $$CREATE POLICY pi_delete ON purchase_items FOR DELETE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM purchases p WHERE p.id = purchase_id AND p.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
END$$;

-- expenses (direct)
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'expenses'::regclass AND polname = 'expenses_select') THEN
        EXECUTE $$CREATE POLICY expenses_select ON expenses FOR SELECT
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'expenses'::regclass AND polname = 'expenses_insert') THEN
        EXECUTE $$CREATE POLICY expenses_insert ON expenses FOR INSERT
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'expenses'::regclass AND polname = 'expenses_update') THEN
        EXECUTE $$CREATE POLICY expenses_update ON expenses FOR UPDATE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'expenses'::regclass AND polname = 'expenses_delete') THEN
        EXECUTE $$CREATE POLICY expenses_delete ON expenses FOR DELETE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
END$$;

-- laundry_batches (direct)
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batches'::regclass AND polname = 'lb_select') THEN
        EXECUTE $$CREATE POLICY lb_select ON laundry_batches FOR SELECT
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batches'::regclass AND polname = 'lb_insert') THEN
        EXECUTE $$CREATE POLICY lb_insert ON laundry_batches FOR INSERT
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batches'::regclass AND polname = 'lb_update') THEN
        EXECUTE $$CREATE POLICY lb_update ON laundry_batches FOR UPDATE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_batches'::regclass AND polname = 'lb_delete') THEN
        EXECUTE $$CREATE POLICY lb_delete ON laundry_batches FOR DELETE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
END$$;

-- laundry_items (via batch)
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_items'::regclass AND polname = 'li_select') THEN
        EXECUTE $$CREATE POLICY li_select ON laundry_items FOR SELECT
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_items'::regclass AND polname = 'li_insert') THEN
        EXECUTE $$CREATE POLICY li_insert ON laundry_items FOR INSERT
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_items'::regclass AND polname = 'li_update') THEN
        EXECUTE $$CREATE POLICY li_update ON laundry_items FOR UPDATE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))
                         WITH CHECK (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'laundry_items'::regclass AND polname = 'li_delete') THEN
        EXECUTE $$CREATE POLICY li_delete ON laundry_items FOR DELETE
                         USING (app_is_super_admin() OR EXISTS (
                             SELECT 1 FROM laundry_batches b WHERE b.id = batch_id AND b.franchise_id = jwt_franchise_id()
                         ))$$;
    END IF;
END$$;

-- activity_logs (direct)
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'activity_logs'::regclass AND polname = 'al_select') THEN
        EXECUTE $$CREATE POLICY al_select ON activity_logs FOR SELECT
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'activity_logs'::regclass AND polname = 'al_insert') THEN
        EXECUTE $$CREATE POLICY al_insert ON activity_logs FOR INSERT
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'activity_logs'::regclass AND polname = 'al_update') THEN
        EXECUTE $$CREATE POLICY al_update ON activity_logs FOR UPDATE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'activity_logs'::regclass AND polname = 'al_delete') THEN
        EXECUTE $$CREATE POLICY al_delete ON activity_logs FOR DELETE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
END$$;

-- users: restrict by franchise; super_admin can see all
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'users'::regclass AND polname = 'users_select') THEN
        EXECUTE $$CREATE POLICY users_select ON users FOR SELECT
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'users'::regclass AND polname = 'users_insert') THEN
        EXECUTE $$CREATE POLICY users_insert ON users FOR INSERT
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'users'::regclass AND polname = 'users_update') THEN
        EXECUTE $$CREATE POLICY users_update ON users FOR UPDATE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())
                         WITH CHECK (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'users'::regclass AND polname = 'users_delete') THEN
        EXECUTE $$CREATE POLICY users_delete ON users FOR DELETE
                         USING (app_is_super_admin() OR franchise_id = jwt_franchise_id())$$;
    END IF;
END$$;

-- franchises: tenants see only their own; super_admin can manage all
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'franchises'::regclass AND polname = 'fr_select') THEN
        EXECUTE $$CREATE POLICY fr_select ON franchises FOR SELECT
                         USING (app_is_super_admin() OR id = jwt_franchise_id())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'franchises'::regclass AND polname = 'fr_insert') THEN
        EXECUTE $$CREATE POLICY fr_insert ON franchises FOR INSERT
                         WITH CHECK (app_is_super_admin())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'franchises'::regclass AND polname = 'fr_update') THEN
        EXECUTE $$CREATE POLICY fr_update ON franchises FOR UPDATE
                         USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'franchises'::regclass AND polname = 'fr_delete') THEN
        EXECUTE $$CREATE POLICY fr_delete ON franchises FOR DELETE
                         USING (app_is_super_admin())$$;
    END IF;
END$$;

-- vendors (shared catalog; admin-only writes)
DO $$BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'vendors'::regclass AND polname = 'Enable all for authenticated users') THEN
        EXECUTE 'DROP POLICY "Enable all for authenticated users" ON vendors';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'vendors'::regclass AND polname = 'vendors_read') THEN
        EXECUTE $$CREATE POLICY vendors_read ON vendors FOR SELECT USING (true)$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polrelid = 'vendors'::regclass AND polname = 'vendors_write_admin') THEN
        EXECUTE $$CREATE POLICY vendors_write_admin ON vendors FOR ALL
                         USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())$$;
    END IF;
END$$;
