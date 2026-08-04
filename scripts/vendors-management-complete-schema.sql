CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS vendor_service_pricing CASCADE;
DROP TABLE IF EXISTS vendor_transactions CASCADE;
DROP TABLE IF EXISTS vendor_services CASCADE;
DROP TABLE IF EXISTS vendor_categories CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;

-- Create vendor categories table
CREATE TABLE vendor_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vendors table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    category_id UUID REFERENCES vendor_categories(id),
    service_type VARCHAR(50) CHECK (service_type IN ('laundry', 'dry_cleaning', 'both', 'catering', 'decoration', 'photography', 'transportation', 'other')),
    business_type VARCHAR(50) CHECK (business_type IN ('individual', 'company', 'partnership', 'llp')) DEFAULT 'individual',
    gst_number VARCHAR(15),
    pan_number VARCHAR(10),
    bank_account_number VARCHAR(30),
    bank_name VARCHAR(100),
    bank_branch VARCHAR(100),
    ifsc_code VARCHAR(11),
    payment_terms INTEGER DEFAULT 30, -- Payment terms in days
    credit_limit DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0, -- Outstanding amount
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    franchise_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vendor services table
CREATE TABLE vendor_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    service_category VARCHAR(100),
    description TEXT,
    pricing_type VARCHAR(20) CHECK (pricing_type IN ('fixed', 'hourly', 'per_item', 'per_kg', 'custom')) DEFAULT 'fixed',
    base_price DECIMAL(10,2),
    unit VARCHAR(50), -- kg, piece, hour, etc.
    minimum_quantity INTEGER DEFAULT 1,
    maximum_quantity INTEGER,
    turnaround_time INTEGER, -- in hours
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vendor_id, service_name)
);

-- Create vendor service pricing table (for complex pricing structures)
CREATE TABLE vendor_service_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES vendor_services(id) ON DELETE CASCADE,
    quantity_from INTEGER NOT NULL,
    quantity_to INTEGER,
    price_per_unit DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vendor transactions table
CREATE TABLE vendor_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('order', 'payment', 'refund', 'adjustment', 'advance')) NOT NULL,
    reference_type VARCHAR(20) CHECK (reference_type IN ('laundry_batch', 'purchase', 'booking', 'manual')),
    reference_id UUID, -- Reference to laundry_batches, purchases, bookings, etc.
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other')),
    payment_reference VARCHAR(100), -- Cheque number, UPI transaction ID, etc.
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue')) DEFAULT 'pending',
    notes TEXT,
    franchise_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_vendors_category ON vendors(category_id);
CREATE INDEX idx_vendors_service_type ON vendors(service_type);
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_vendors_franchise ON vendors(franchise_id);
CREATE INDEX idx_vendor_services_vendor ON vendor_services(vendor_id);
CREATE INDEX idx_vendor_services_active ON vendor_services(is_active);
CREATE INDEX idx_vendor_transactions_vendor ON vendor_transactions(vendor_id);
CREATE INDEX idx_vendor_transactions_type ON vendor_transactions(transaction_type);
CREATE INDEX idx_vendor_transactions_status ON vendor_transactions(status);
CREATE INDEX idx_vendor_transactions_date ON vendor_transactions(transaction_date);

-- Create function to generate vendor codes
CREATE OR REPLACE FUNCTION generate_vendor_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    current_year TEXT;
    sequence_num INTEGER;
BEGIN
    current_year := TO_CHAR(NOW(), 'YY');
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(vendor_code FROM 3 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM vendors
    WHERE vendor_code LIKE 'V' || current_year || '%';
    
    -- Format: V + YY + 4-digit sequence (V240001, V240002, etc.)
    new_code := 'V' || current_year || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate transaction numbers
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    current_year TEXT;
    current_month TEXT;
    sequence_num INTEGER;
BEGIN
    current_year := TO_CHAR(NOW(), 'YY');
    current_month := TO_CHAR(NOW(), 'MM');
    
    -- Get the next sequence number for this month
    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 5 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM vendor_transactions
    WHERE transaction_number LIKE 'VT' || current_year || current_month || '%';
    
    -- Format: VT + YYMM + 4-digit sequence (VT24120001, VT24120002, etc.)
    new_number := 'VT' || current_year || current_month || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-generate codes
CREATE OR REPLACE FUNCTION set_vendor_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.vendor_code IS NULL OR NEW.vendor_code = '' THEN
        NEW.vendor_code := generate_vendor_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_transaction_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
        NEW.transaction_number := generate_transaction_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_set_vendor_code
    BEFORE INSERT ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION set_vendor_code();

CREATE TRIGGER trigger_set_transaction_number
    BEFORE INSERT ON vendor_transactions
    FOR EACH ROW
    EXECUTE FUNCTION set_transaction_number();

-- Create trigger to update vendor balance
CREATE OR REPLACE FUNCTION update_vendor_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update vendor balance based on transaction type
        IF NEW.transaction_type IN ('order', 'advance') THEN
            UPDATE vendors 
            SET current_balance = current_balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.vendor_id;
        ELSIF NEW.transaction_type IN ('payment', 'refund') THEN
            UPDATE vendors 
            SET current_balance = current_balance - NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.vendor_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverse old transaction and apply new one
        IF OLD.transaction_type IN ('order', 'advance') THEN
            UPDATE vendors 
            SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.vendor_id;
        ELSIF OLD.transaction_type IN ('payment', 'refund') THEN
            UPDATE vendors 
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.vendor_id;
        END IF;
        
        IF NEW.transaction_type IN ('order', 'advance') THEN
            UPDATE vendors 
            SET current_balance = current_balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.vendor_id;
        ELSIF NEW.transaction_type IN ('payment', 'refund') THEN
            UPDATE vendors 
            SET current_balance = current_balance - NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.vendor_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Reverse the transaction
        IF OLD.transaction_type IN ('order', 'advance') THEN
            UPDATE vendors 
            SET current_balance = current_balance - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.vendor_id;
        ELSIF OLD.transaction_type IN ('payment', 'refund') THEN
            UPDATE vendors 
            SET current_balance = current_balance + OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.vendor_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendor_balance
    AFTER INSERT OR UPDATE OR DELETE ON vendor_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_balance();

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_vendor_categories_updated_at
    BEFORE UPDATE ON vendor_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_vendor_services_updated_at
    BEFORE UPDATE ON vendor_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_vendor_transactions_updated_at
    BEFORE UPDATE ON vendor_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample vendor categories
INSERT INTO vendor_categories (name, description, color) VALUES
('Laundry Services', 'Washing, cleaning, and garment care services', '#3B82F6'),
('Catering', 'Food and beverage services for events', '#10B981'),
('Decoration', 'Event decoration and setup services', '#F59E0B'),
('Photography', 'Photography and videography services', '#8B5CF6'),
('Transportation', 'Vehicle rental and transportation services', '#EF4444'),
('Entertainment', 'Music, DJ, and entertainment services', '#EC4899'),
('Floral', 'Flower arrangements and floral decorations', '#84CC16'),
('Equipment Rental', 'Furniture, sound, and equipment rental', '#6B7280');

-- Insert sample vendors
INSERT INTO vendors (name, contact_person, phone, email, address, city, state, pincode, category_id, service_type, business_type, rating, notes, is_verified) VALUES
('Clean & Fresh Laundry', 'Rajesh Kumar', '9876543210', 'rajesh@cleanfresh.com', '123 MG Road', 'Bangalore', 'Karnataka', '560001', (SELECT id FROM vendor_categories WHERE name = 'Laundry Services'), 'both', 'company', 4, 'Reliable laundry service with quick turnaround', true),
('Royal Caterers', 'Priya Sharma', '9876543211', 'priya@royalcaterers.com', '456 Brigade Road', 'Bangalore', 'Karnataka', '560002', (SELECT id FROM vendor_categories WHERE name = 'Catering'), 'other', 'partnership', 5, 'Premium catering service for weddings', true),
('Elegant Decorations', 'Amit Patel', '9876543212', 'amit@elegantdeco.com', '789 Commercial Street', 'Bangalore', 'Karnataka', '560003', (SELECT id FROM vendor_categories WHERE name = 'Decoration'), 'other', 'company', 4, 'Creative decoration solutions', true),
('Capture Moments Studio', 'Sneha Reddy', '9876543213', 'sneha@capturemoments.com', '321 Indiranagar', 'Bangalore', 'Karnataka', '560004', (SELECT id FROM vendor_categories WHERE name = 'Photography'), 'other', 'individual', 5, 'Professional wedding photography', true),
('Swift Transport Services', 'Ravi Gupta', '9876543214', 'ravi@swifttransport.com', '654 Whitefield', 'Bangalore', 'Karnataka', '560005', (SELECT id FROM vendor_categories WHERE name = 'Transportation'), 'other', 'company', 3, 'Vehicle rental and transportation', false);

-- Insert sample vendor services
INSERT INTO vendor_services (vendor_id, service_name, service_category, description, pricing_type, base_price, unit, turnaround_time) VALUES
((SELECT id FROM vendors WHERE name = 'Clean & Fresh Laundry'), 'Regular Washing', 'Laundry', 'Regular clothes washing and drying', 'per_kg', 25.00, 'kg', 24),
((SELECT id FROM vendors WHERE name = 'Clean & Fresh Laundry'), 'Dry Cleaning', 'Dry Cleaning', 'Professional dry cleaning service', 'per_item', 150.00, 'piece', 48),
((SELECT id FROM vendors WHERE name = 'Clean & Fresh Laundry'), 'Express Service', 'Laundry', 'Same day laundry service', 'per_kg', 40.00, 'kg', 8),
((SELECT id FROM vendors WHERE name = 'Royal Caterers'), 'Wedding Catering', 'Catering', 'Complete wedding catering service', 'per_item', 350.00, 'person', 0),
((SELECT id FROM vendors WHERE name = 'Royal Caterers'), 'Corporate Lunch', 'Catering', 'Office lunch catering', 'per_item', 120.00, 'person', 0),
((SELECT id FROM vendors WHERE name = 'Elegant Decorations'), 'Stage Decoration', 'Decoration', 'Wedding stage decoration', 'fixed', 15000.00, 'setup', 0),
((SELECT id FROM vendors WHERE name = 'Elegant Decorations'), 'Hall Decoration', 'Decoration', 'Complete hall decoration', 'fixed', 25000.00, 'setup', 0),
((SELECT id FROM vendors WHERE name = 'Capture Moments Studio'), 'Wedding Photography', 'Photography', 'Complete wedding photography package', 'fixed', 35000.00, 'event', 0),
((SELECT id FROM vendors WHERE name = 'Capture Moments Studio'), 'Pre-wedding Shoot', 'Photography', 'Pre-wedding photography session', 'fixed', 8000.00, 'session', 0);

-- Insert sample vendor transactions
INSERT INTO vendor_transactions (vendor_id, transaction_type, reference_type, amount, description, transaction_date, status, payment_method) VALUES
((SELECT id FROM vendors WHERE name = 'Clean & Fresh Laundry'), 'order', 'laundry_batch', 2500.00, 'Laundry batch processing', CURRENT_DATE - INTERVAL '5 days', 'completed', 'bank_transfer'),
((SELECT id FROM vendors WHERE name = 'Clean & Fresh Laundry'), 'payment', 'manual', 2500.00, 'Payment for laundry services', CURRENT_DATE - INTERVAL '3 days', 'completed', 'bank_transfer'),
((SELECT id FROM vendors WHERE name = 'Royal Caterers'), 'order', 'booking', 45000.00, 'Wedding catering order', CURRENT_DATE - INTERVAL '10 days', 'pending', null),
((SELECT id FROM vendors WHERE name = 'Royal Caterers'), 'advance', 'manual', 15000.00, 'Advance payment received', CURRENT_DATE - INTERVAL '8 days', 'completed', 'cash'),
((SELECT id FROM vendors WHERE name = 'Elegant Decorations'), 'order', 'booking', 25000.00, 'Hall decoration order', CURRENT_DATE - INTERVAL '7 days', 'completed', 'upi'),
((SELECT id FROM vendors WHERE name = 'Capture Moments Studio'), 'order', 'booking', 35000.00, 'Wedding photography booking', CURRENT_DATE - INTERVAL '15 days', 'pending', null);

-- Create views for reporting
CREATE OR REPLACE VIEW vendor_summary AS
SELECT 
    v.id,
    v.vendor_code,
    v.name,
    v.contact_person,
    v.phone,
    v.email,
    vc.name as category_name,
    v.service_type,
    v.current_balance,
    v.rating,
    v.is_active,
    v.is_verified,
    COUNT(vs.id) as total_services,
    COUNT(vt.id) as total_transactions,
    COALESCE(SUM(CASE WHEN vt.transaction_type IN ('order', 'advance') THEN vt.amount ELSE 0 END), 0) as total_orders,
    COALESCE(SUM(CASE WHEN vt.transaction_type IN ('payment', 'refund') THEN vt.amount ELSE 0 END), 0) as total_payments,
    v.created_at
FROM vendors v
LEFT JOIN vendor_categories vc ON v.category_id = vc.id
LEFT JOIN vendor_services vs ON v.id = vs.vendor_id AND vs.is_active = true
LEFT JOIN vendor_transactions vt ON v.id = vt.vendor_id
GROUP BY v.id, v.vendor_code, v.name, v.contact_person, v.phone, v.email, vc.name, v.service_type, v.current_balance, v.rating, v.is_active, v.is_verified, v.created_at;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- Create RLS policies (uncomment and adjust as needed)
-- ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vendor_services ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vendor_transactions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE vendors IS 'Main vendor information and contact details';
COMMENT ON TABLE vendor_categories IS 'Categories for organizing vendors by service type';
COMMENT ON TABLE vendor_services IS 'Services offered by each vendor with pricing';
COMMENT ON TABLE vendor_transactions IS 'All financial transactions with vendors';
COMMENT ON TABLE vendor_service_pricing IS 'Tiered pricing structure for vendor services';
