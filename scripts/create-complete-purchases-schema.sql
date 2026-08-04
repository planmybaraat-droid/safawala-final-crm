-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;

-- Create purchases table with all required columns
CREATE TABLE purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_contact VARCHAR(255),
    vendor_email VARCHAR(255),
    vendor_address TEXT,
    purchase_order_number VARCHAR(100) UNIQUE,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount + tax_amount - discount_amount) STORED,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'paid', 'cancelled', 'refunded')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    due_date DATE,
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    internal_notes TEXT,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_items table for line items
CREATE TABLE purchase_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_sku VARCHAR(100),
    category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_of_measure VARCHAR(50) DEFAULT 'piece',
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(12,2) GENERATED ALWAYS AS (
        (quantity * unit_price) - discount_amount + tax_amount
    ) STORED,
    received_quantity INTEGER DEFAULT 0,
    quality_status VARCHAR(50) DEFAULT 'pending' CHECK (quality_status IN ('pending', 'approved', 'rejected', 'partial')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_attachments table for documents
CREATE TABLE purchase_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_history table for audit trail
CREATE TABLE purchase_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_purchases_franchise_id ON purchases(franchise_id);
CREATE INDEX idx_purchases_vendor_name ON purchases(vendor_name);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX idx_purchases_po_number ON purchases(purchase_order_number);
CREATE INDEX idx_purchases_created_by ON purchases(created_by);

CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON purchase_items(product_id);
CREATE INDEX idx_purchase_items_item_name ON purchase_items(item_name);

CREATE INDEX idx_purchase_attachments_purchase_id ON purchase_attachments(purchase_id);
CREATE INDEX idx_purchase_history_purchase_id ON purchase_history(purchase_id);

-- Create function to generate purchase order numbers
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    po_number TEXT;
BEGIN
    -- Get the next sequence number
    SELECT COALESCE(MAX(CAST(SUBSTRING(purchase_order_number FROM 3) AS INTEGER)), 0) + 1
    INTO next_number
    FROM purchases
    WHERE purchase_order_number LIKE 'PO%';
    
    -- Format as PO001, PO002, etc.
    po_number := 'PO' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN po_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate PO numbers
CREATE OR REPLACE FUNCTION set_po_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.purchase_order_number IS NULL THEN
        NEW.purchase_order_number := generate_po_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_po_number
    BEFORE INSERT ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION set_po_number();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO purchases (
    franchise_id, vendor_name, vendor_contact, vendor_email, vendor_address,
    amount, tax_amount, status, priority, purchase_date, expected_delivery_date,
    due_date, payment_terms, notes, created_by
)
SELECT 
    f.id,
    'Premium Wedding Suppliers',
    '+91 98765 43210',
    'orders@premiumwedding.com',
    '123 Wedding Street, Mumbai, Maharashtra 400001',
    25000.00,
    4500.00,
    'pending',
    'high',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '30 days',
    'Net 30',
    'Bulk order for upcoming wedding season',
    u.id
FROM franchises f
CROSS JOIN users u
WHERE f.is_active = true AND u.role = 'admin'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO purchases (
    franchise_id, vendor_name, vendor_contact, vendor_email,
    amount, tax_amount, status, priority, purchase_date, expected_delivery_date,
    payment_terms, notes, created_by
)
SELECT 
    f.id,
    'Royal Accessories Ltd',
    '+91 87654 32109',
    'sales@royalaccessories.com',
    18500.00,
    3330.00,
    'approved',
    'medium',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '5 days',
    'Net 15',
    'Regular monthly inventory restocking',
    u.id
FROM franchises f
CROSS JOIN users u
WHERE f.is_active = true AND u.role = 'admin'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample purchase items
INSERT INTO purchase_items (
    purchase_id, item_name, item_description, quantity, unit_price, tax_percentage
)
SELECT 
    p.id,
    'Premium Silk Turban - Red',
    'High-quality silk turban with gold embroidery',
    5,
    3000.00,
    18.0
FROM purchases p
WHERE p.vendor_name = 'Premium Wedding Suppliers'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO purchase_items (
    purchase_id, item_name, item_description, quantity, unit_price, tax_percentage
)
SELECT 
    p.id,
    'Designer Sehra - Gold',
    'Traditional gold sehra with pearls',
    3,
    5500.00,
    18.0
FROM purchases p
WHERE p.vendor_name = 'Premium Wedding Suppliers'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO purchase_items (
    purchase_id, item_name, item_description, quantity, unit_price, tax_percentage
)
SELECT 
    p.id,
    'Wedding Kalgi Set',
    'Complete kalgi set with feathers',
    4,
    2125.00,
    18.0
FROM purchases p
WHERE p.vendor_name = 'Premium Wedding Suppliers'
LIMIT 1
ON CONFLICT DO NOTHING;
