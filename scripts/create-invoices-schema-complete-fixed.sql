-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables and views if they exist (for clean setup)
DROP VIEW IF EXISTS invoice_summary CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Create invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date DATE,
    subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    terms_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_items table
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_customer_name ON invoices(customer_name);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for invoice summary with aggregated data
CREATE VIEW invoice_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.customer_name,
    i.customer_email,
    i.customer_phone,
    i.customer_address,
    i.issue_date,
    i.due_date,
    i.paid_date,
    i.subtotal_amount,
    i.tax_amount,
    i.discount_amount,
    i.total_amount,
    i.paid_amount,
    i.balance_amount,
    i.status,
    i.notes,
    i.terms_conditions,
    i.created_at,
    i.updated_at,
    COALESCE(item_stats.item_count, 0) as item_count,
    COALESCE(item_stats.total_quantity, 0) as total_quantity
FROM invoices i
LEFT JOIN (
    SELECT 
        invoice_id,
        COUNT(*) as item_count,
        SUM(quantity) as total_quantity
    FROM invoice_items
    GROUP BY invoice_id
) item_stats ON i.id = item_stats.invoice_id;

-- Insert sample data using DO block for proper UUID handling
DO $$
DECLARE
    invoice_id_1 UUID := gen_random_uuid();
    invoice_id_2 UUID := gen_random_uuid();
    invoice_id_3 UUID := gen_random_uuid();
    invoice_id_4 UUID := gen_random_uuid();
    invoice_id_5 UUID := gen_random_uuid();
    invoice_id_6 UUID := gen_random_uuid();
    invoice_id_7 UUID := gen_random_uuid();
    invoice_id_8 UUID := gen_random_uuid();
    invoice_id_9 UUID := gen_random_uuid();
    invoice_id_10 UUID := gen_random_uuid();
BEGIN
    -- Insert sample invoices
    INSERT INTO invoices (id, invoice_number, customer_name, customer_email, customer_phone, customer_address, issue_date, due_date, paid_date, subtotal_amount, tax_amount, discount_amount, total_amount, paid_amount, balance_amount, status, notes, terms_conditions) VALUES
    (invoice_id_1, 'INV-2024-001', 'Rajesh Kumar', 'rajesh.kumar@email.com', '+91-9876543210', '123 MG Road, Bangalore, Karnataka 560001', '2024-01-15', '2024-01-30', '2024-01-20', 25000.00, 3500.00, 0.00, 28500.00, 28500.00, 0.00, 'paid', 'Premium wedding package - handled with extra care', 'Payment due within 15 days. Late payment charges applicable.'),
    
    (invoice_id_2, 'INV-2024-002', 'Priya Sharma', 'priya.sharma@email.com', '+91-9876543211', '456 Park Street, Mumbai, Maharashtra 400001', '2024-01-14', '2024-01-29', '2024-01-25', 16500.00, 1880.00, 0.00, 18380.00, 18380.00, 0.00, 'paid', 'Engagement ceremony rental package', 'Payment due within 15 days. Late payment charges applicable.'),
    
    (invoice_id_3, 'INV-2024-003', 'Amit Patel', 'amit.patel@email.com', '+91-9876543212', '789 Ring Road, Ahmedabad, Gujarat 380001', '2024-02-01', '2024-02-16', '2024-02-10', 47500.00, 6196.00, 0.00, 53696.00, 53696.00, 0.00, 'paid', 'Reception party - premium furniture and lighting', 'Payment due within 15 days. Late payment charges applicable.'),
    
    (invoice_id_4, 'INV-2024-004', 'Sneha Gupta', 'sneha.gupta@email.com', '+91-9876543213', '321 Civil Lines, Delhi 110001', '2024-02-20', '2024-03-06', NULL, 60000.00, 6620.00, 0.00, 66620.00, 40000.00, 26620.00, 'sent', 'Direct sale - premium sherwani and jewelry set', 'Payment due within 15 days. Late payment charges applicable.'),
    
    (invoice_id_5, 'INV-2024-005', 'Vikram Singh', 'vikram.singh@email.com', '+91-9876543214', '654 Mall Road, Shimla, Himachal Pradesh 171001', '2024-02-25', '2024-03-11', NULL, 12000.00, 1960.00, 0.00, 13960.00, 7000.00, 6960.00, 'sent', 'Sangeet ceremony lighting setup', 'Payment due within 15 days. Late payment charges applicable.'),
    
    (invoice_id_6, 'INV-2024-006', 'Rajesh Kumar', 'rajesh.kumar@email.com', '+91-9876543210', '123 MG Road, Bangalore, Karnataka 560001', '2024-01-10', '2024-01-25', NULL, 8750.00, 1280.00, 0.00, 10030.00, 3000.00, 7030.00, 'overdue', 'Additional services - makeup and accessories', 'Payment due within 15 days. Late payment charges applicable.'),
    
    (invoice_id_7, 'INV-2024-007', 'Priya Sharma', 'priya.sharma@email.com', '+91-9876543211', '456 Park Street, Mumbai, Maharashtra 400001', '2024-01-05', '2024-01-20', NULL, 15000.00, 2200.00, 0.00, 17200.00, 5000.00, 12200.00, 'overdue', 'Emergency alteration services', 'Payment due within 15 days. Late payment charges applicable.'),
    
    (invoice_id_8, 'INV-2024-008', 'Sneha Gupta', 'sneha.gupta@email.com', '+91-9876543213', '321 Civil Lines, Delhi 110001', '2024-03-01', '2024-03-16', NULL, 22000.00, 2960.00, 0.00, 24960.00, 0.00, 24960.00, 'draft', 'Upcoming wedding consultation and planning', 'Payment due within 15 days. Late payment charges applicable.'),
    
    (invoice_id_9, 'INV-2024-009', 'Arjun Reddy', 'arjun.reddy@email.com', '+91-9876543215', '987 Tank Bund Road, Hyderabad, Telangana 500001', '2024-02-28', '2024-03-15', NULL, 35000.00, 4550.00, 1000.00, 38550.00, 20000.00, 18550.00, 'sent', 'Wedding photography and videography package', 'Payment due within 15 days. Late payment charges applicable.'),
    
    (invoice_id_10, 'INV-2024-010', 'Kavya Nair', 'kavya.nair@email.com', '+91-9876543216', '147 Marine Drive, Kochi, Kerala 682001', '2024-03-05', '2024-03-20', NULL, 18000.00, 2340.00, 500.00, 19840.00, 0.00, 19840.00, 'draft', 'Bridal makeup and styling consultation', 'Payment due within 15 days. Late payment charges applicable.');

    -- Insert sample invoice items
    INSERT INTO invoice_items (invoice_id, item_name, description, quantity, unit_price, line_total) VALUES
    -- Invoice 1 items
    (invoice_id_1, 'Royal Groom Sherwani', 'Premium rental - Gold embroidered sherwani with accessories', 1, 15000.00, 15000.00),
    (invoice_id_1, 'Diamond Necklace Set', 'Rental - Traditional diamond necklace with earrings', 1, 2500.00, 2500.00),
    (invoice_id_1, 'Wedding Stage Decoration', 'Complete setup with flowers and lighting', 1, 7500.00, 7500.00),
    
    -- Invoice 2 items
    (invoice_id_2, 'Designer Groom Sherwani', 'Blue collection - Premium rental', 1, 8000.00, 8000.00),
    (invoice_id_2, 'Gold Bracelet Set', 'Pair rental - Traditional design', 2, 1800.00, 3600.00),
    (invoice_id_2, 'Bridal Makeup Kit', 'Premium package with styling', 3, 1500.00, 4500.00),
    
    -- Invoice 3 items
    (invoice_id_3, 'Wedding Seating Set', 'Premium furniture - 50 chairs with covers', 10, 4750.00, 47500.00),
    
    -- Invoice 4 items
    (invoice_id_4, 'Royal Groom Sherwani', 'Direct sale - Premium quality with all accessories', 1, 60000.00, 60000.00),
    
    -- Invoice 5 items
    (invoice_id_5, 'LED Lighting Setup', 'Sangeet package - Colorful LED lights with DJ setup', 4, 3000.00, 12000.00),
    
    -- Invoice 6 items
    (invoice_id_6, 'Additional Makeup Services', 'Extended makeup session for family members', 5, 1500.00, 7500.00),
    (invoice_id_6, 'Extra Jewelry Accessories', 'Additional jewelry pieces for complete look', 1, 1250.00, 1250.00),
    
    -- Invoice 7 items
    (invoice_id_7, 'Emergency Alteration Services', 'Last-minute alterations for lehenga', 1, 8000.00, 8000.00),
    (invoice_id_7, 'Rush Delivery Charges', 'Express delivery within 24 hours', 1, 7000.00, 7000.00),
    
    -- Invoice 8 items
    (invoice_id_8, 'Wedding Consultation Services', 'Complete wedding planning consultation', 1, 15000.00, 15000.00),
    (invoice_id_8, 'Event Planning Coordination', 'Full event coordination and management', 1, 7000.00, 7000.00),
    
    -- Invoice 9 items
    (invoice_id_9, 'Wedding Photography', 'Full day photography with edited photos', 1, 20000.00, 20000.00),
    (invoice_id_9, 'Wedding Videography', 'Cinematic wedding video with highlights', 1, 15000.00, 15000.00),
    
    -- Invoice 10 items
    (invoice_id_10, 'Bridal Makeup Session', 'Complete bridal makeup with trial', 1, 12000.00, 12000.00),
    (invoice_id_10, 'Hair Styling Service', 'Professional bridal hair styling', 1, 6000.00, 6000.00);

END $$;

-- Create a function to update invoice status based on payment
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance amount
    NEW.balance_amount = NEW.total_amount - NEW.paid_amount;
    
    -- Update status based on payment and dates
    IF NEW.paid_amount >= NEW.total_amount THEN
        NEW.status = 'paid';
        IF NEW.paid_date IS NULL THEN
            NEW.paid_date = CURRENT_DATE;
        END IF;
    ELSIF NEW.status = 'paid' AND NEW.paid_amount < NEW.total_amount THEN
        NEW.status = 'sent';
        NEW.paid_date = NULL;
    ELSIF NEW.status != 'draft' AND NEW.status != 'cancelled' AND NEW.due_date < CURRENT_DATE AND NEW.paid_amount < NEW.total_amount THEN
        NEW.status = 'overdue';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status updates
CREATE TRIGGER trigger_update_invoice_status
    BEFORE INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_status();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON invoices TO your_app_user;
-- GRANT ALL PRIVILEGES ON invoice_items TO your_app_user;
-- GRANT SELECT ON invoice_summary TO your_app_user;

-- Display summary of created data
SELECT 
    'Invoices Created' as summary_type,
    COUNT(*) as count,
    SUM(total_amount) as total_value
FROM invoices
UNION ALL
SELECT 
    'Invoice Items Created' as summary_type,
    COUNT(*) as count,
    SUM(line_total) as total_value
FROM invoice_items
UNION ALL
SELECT 
    'Invoice Status Distribution' as summary_type,
    NULL as count,
    NULL as total_value
UNION ALL
SELECT 
    CONCAT('  - ', status) as summary_type,
    COUNT(*) as count,
    SUM(total_amount) as total_value
FROM invoices
GROUP BY status
ORDER BY summary_type;

-- Success message
SELECT 'Invoice system setup completed successfully!' as message;
