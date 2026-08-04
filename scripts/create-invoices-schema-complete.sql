-- Complete invoices schema setup with comprehensive data
-- This script creates all necessary tables, indexes, and sample data for the invoice system

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS payment_terms CASCADE;

-- Create invoice statuses enum
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Create payment terms enum
CREATE TYPE payment_terms AS ENUM ('immediate', '7_days', '15_days', '30_days', '45_days', '60_days');

-- Create invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID,
    franchise_id UUID,
    booking_id UUID,
    
    -- Invoice details
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date DATE,
    
    -- Financial details
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Status and terms
    status invoice_status NOT NULL DEFAULT 'draft',
    payment_terms payment_terms NOT NULL DEFAULT '15_days',
    
    -- Additional details
    notes TEXT,
    terms_conditions TEXT,
    
    -- Customer details (denormalized for easier querying)
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    
    -- Metadata
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice items table
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID,
    
    -- Item details
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(12,2) NOT NULL,
    
    -- Product details (denormalized)
    product_name VARCHAR(255),
    product_sku VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_franchise_id ON invoices(franchise_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_customer_name ON invoices(customer_name);
CREATE INDEX idx_invoices_customer_email ON invoices(customer_email);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product_id ON invoice_items(product_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoice_items_updated_at ON invoice_items;
CREATE TRIGGER update_invoice_items_updated_at
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert comprehensive sample invoices data
INSERT INTO invoices (
    id,
    invoice_number,
    customer_id,
    franchise_id,
    booking_id,
    issue_date,
    due_date,
    paid_date,
    subtotal,
    tax_rate,
    tax_amount,
    discount_amount,
    total_amount,
    paid_amount,
    balance_amount,
    status,
    payment_terms,
    notes,
    terms_conditions,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    created_by
) VALUES 
-- Paid Invoices
(
    'inv11111-1111-1111-1111-111111111111',
    'INV-2024-001',
    'c1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    '2024-01-15',
    '2024-01-30',
    '2024-01-20',
    25000.00,
    18.00,
    4500.00,
    1000.00,
    28500.00,
    28500.00,
    0.00,
    'paid',
    '15_days',
    'Premium wedding package - handled with extra care',
    'Payment due within 15 days. Late payment charges applicable.',
    'Rajesh Kumar',
    'rajesh.kumar@email.com',
    '+91-9876543210',
    '123 MG Road, Bangalore, Karnataka 560001',
    '22222222-2222-2222-2222-222222222222'
),
(
    'inv22222-2222-2222-2222-222222222222',
    'INV-2024-002',
    'c2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    '2024-01-14',
    '2024-01-29',
    '2024-01-25',
    16000.00,
    18.00,
    2880.00,
    500.00,
    18380.00,
    18380.00,
    0.00,
    'paid',
    '15_days',
    'Engagement ceremony rental package',
    'Payment due within 15 days. Late payment charges applicable.',
    'Priya Sharma',
    'priya.sharma@email.com',
    '+91-9876543211',
    '456 Brigade Road, Bangalore, Karnataka 560025',
    '33333333-3333-3333-3333-333333333333'
),
(
    'inv33333-3333-3333-3333-333333333333',
    'INV-2024-003',
    'c4444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'b4444444-4444-4444-4444-444444444444',
    '2024-02-01',
    '2024-02-16',
    '2024-02-10',
    47200.00,
    18.00,
    8496.00,
    2000.00,
    53696.00,
    53696.00,
    0.00,
    'paid',
    '15_days',
    'Reception party - premium furniture and lighting',
    'Payment due within 15 days. Late payment charges applicable.',
    'Amit Patel',
    'amit.patel@email.com',
    '+91-9876543212',
    '789 Commercial Street, Bangalore, Karnataka 560001',
    '22222222-2222-2222-2222-222222222222'
),

-- Pending Invoices
(
    'inv44444-4444-4444-4444-444444444444',
    'INV-2024-004',
    'c3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'b3333333-3333-3333-3333-333333333333',
    '2024-02-20',
    '2024-03-06',
    NULL,
    59000.00,
    18.00,
    10620.00,
    3000.00,
    66620.00,
    40000.00,
    26620.00,
    'sent',
    '15_days',
    'Direct sale - premium sherwani and jewelry set',
    'Payment due within 15 days. Late payment charges applicable.',
    'Sneha Gupta',
    'sneha.gupta@email.com',
    '+91-9876543213',
    '321 Koramangala, Bangalore, Karnataka 560034',
    '44444444-4444-4444-4444-444444444444'
),
(
    'inv55555-5555-5555-5555-555555555555',
    'INV-2024-005',
    'c5555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'b5555555-5555-5555-5555-555555555555',
    '2024-02-25',
    '2024-03-11',
    NULL,
    12000.00,
    18.00,
    2160.00,
    200.00,
    13960.00,
    7000.00,
    6960.00,
    'sent',
    '15_days',
    'Sangeet ceremony lighting setup',
    'Payment due within 15 days. Late payment charges applicable.',
    'Vikram Singh',
    'vikram.singh@email.com',
    '+91-9876543214',
    '654 Indiranagar, Bangalore, Karnataka 560038',
    '33333333-3333-3333-3333-333333333333'
),

-- Overdue Invoices
(
    'inv66666-6666-6666-6666-666666666666',
    'INV-2024-006',
    'c1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    '2024-01-10',
    '2024-01-25',
    NULL,
    8500.00,
    18.00,
    1530.00,
    0.00,
    10030.00,
    3000.00,
    7030.00,
    'overdue',
    '15_days',
    'Additional services - makeup and accessories',
    'Payment due within 15 days. Late payment charges applicable.',
    'Rajesh Kumar',
    'rajesh.kumar@email.com',
    '+91-9876543210',
    '123 MG Road, Bangalore, Karnataka 560001',
    '22222222-2222-2222-2222-222222222222'
),
(
    'inv77777-7777-7777-7777-777777777777',
    'INV-2024-007',
    'c2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    '2024-01-05',
    '2024-01-20',
    NULL,
    15000.00,
    18.00,
    2700.00,
    500.00,
    17200.00,
    5000.00,
    12200.00,
    'overdue',
    '15_days',
    'Emergency alteration services',
    'Payment due within 15 days. Late payment charges applicable.',
    'Priya Sharma',
    'priya.sharma@email.com',
    '+91-9876543211',
    '456 Brigade Road, Bangalore, Karnataka 560025',
    '33333333-3333-3333-3333-333333333333'
),

-- Draft Invoices
(
    'inv88888-8888-8888-8888-888888888888',
    'INV-2024-008',
    'c3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    '2024-03-01',
    '2024-03-16',
    NULL,
    22000.00,
    18.00,
    3960.00,
    1000.00,
    24960.00,
    0.00,
    24960.00,
    'draft',
    '15_days',
    'Upcoming wedding consultation and planning',
    'Payment due within 15 days. Late payment charges applicable.',
    'Sneha Gupta',
    'sneha.gupta@email.com',
    '+91-9876543213',
    '321 Koramangala, Bangalore, Karnataka 560034',
    '44444444-4444-4444-4444-444444444444'
),

-- Recent Invoices
(
    'inv99999-9999-9999-9999-999999999999',
    'INV-2024-009',
    'c4444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    '2024-03-05',
    '2024-03-20',
    NULL,
    35000.00,
    18.00,
    6300.00,
    2000.00,
    39300.00,
    20000.00,
    19300.00,
    'sent',
    '15_days',
    'Complete bridal package with premium services',
    'Payment due within 15 days. Late payment charges applicable.',
    'Amit Patel',
    'amit.patel@email.com',
    '+91-9876543212',
    '789 Commercial Street, Bangalore, Karnataka 560001',
    '22222222-2222-2222-2222-222222222222'
),
(
    'invaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'INV-2024-010',
    'c5555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    '2024-03-08',
    '2024-03-23',
    '2024-03-15',
    18500.00,
    18.00,
    3330.00,
    800.00,
    21030.00,
    21030.00,
    0.00,
    'paid',
    '15_days',
    'Groom accessories and styling package',
    'Payment due within 15 days. Late payment charges applicable.',
    'Vikram Singh',
    'vikram.singh@email.com',
    '+91-9876543214',
    '654 Indiranagar, Bangalore, Karnataka 560038',
    '33333333-3333-3333-3333-333333333333'
);

-- Insert invoice items
INSERT INTO invoice_items (
    id,
    invoice_id,
    product_id,
    description,
    quantity,
    unit_price,
    discount_percent,
    line_total,
    product_name,
    product_sku
) VALUES 
-- Items for INV-2024-001
(
    'item1111-1111-1111-1111-111111111111',
    'inv11111-1111-1111-1111-111111111111',
    'p1111111-1111-1111-1111-111111111111',
    'Royal Groom Sherwani - Premium Rental',
    1,
    15000.00,
    0.00,
    15000.00,
    'Royal Groom Sherwani',
    'RGS-001'
),
(
    'item1112-1111-1111-1111-111111111111',
    'inv11111-1111-1111-1111-111111111111',
    'p2222222-2222-2222-2222-222222222222',
    'Diamond Necklace Set - Rental',
    1,
    2500.00,
    0.00,
    2500.00,
    'Diamond Necklace Set',
    'DNS-001'
),
(
    'item1113-1111-1111-1111-111111111111',
    'inv11111-1111-1111-1111-111111111111',
    'p3333333-3333-3333-3333-333333333333',
    'Wedding Stage Decoration - Complete Setup',
    1,
    8000.00,
    5.00,
    7500.00,
    'Wedding Stage Decoration',
    'WSD-001'
),

-- Items for INV-2024-002
(
    'item2221-1111-1111-1111-111111111111',
    'inv22222-2222-2222-2222-222222222222',
    'p4444444-4444-4444-4444-444444444444',
    'Designer Groom Sherwani - Blue Collection',
    1,
    8000.00,
    0.00,
    8000.00,
    'Designer Groom Sherwani',
    'DGS-002'
),
(
    'item2222-1111-1111-1111-111111111111',
    'inv22222-2222-2222-2222-222222222222',
    'p5555555-5555-5555-5555-555555555555',
    'Gold Bracelet Set - Pair Rental',
    2,
    1800.00,
    0.00,
    3600.00,
    'Gold Bracelet Set',
    'GBS-001'
),
(
    'item2223-1111-1111-1111-111111111111',
    'inv22222-2222-2222-2222-222222222222',
    'p6666666-6666-6666-6666-666666666666',
    'Bridal Makeup Kit - Premium Package',
    3,
    1500.00,
    5.00,
    4275.00,
    'Bridal Makeup Kit',
    'BMK-001'
),

-- Items for INV-2024-003
(
    'item3331-1111-1111-1111-111111111111',
    'inv33333-3333-3333-3333-333333333333',
    'p7777777-7777-7777-7777-777777777777',
    'Wedding Seating Set - Premium Furniture',
    10,
    5000.00,
    5.00,
    47500.00,
    'Wedding Seating Set',
    'WSS-001'
),

-- Items for INV-2024-004 (Direct Sale)
(
    'item4441-1111-1111-1111-111111111111',
    'inv44444-4444-4444-4444-444444444444',
    'p1111111-1111-1111-1111-111111111111',
    'Royal Groom Sherwani - Direct Sale',
    1,
    75000.00,
    20.00,
    60000.00,
    'Royal Groom Sherwani',
    'RGS-001'
),

-- Items for INV-2024-005
(
    'item5551-1111-1111-1111-111111111111',
    'inv55555-5555-5555-5555-555555555555',
    'p8888888-8888-8888-8888-888888888888',
    'LED Lighting Setup - Sangeet Package',
    4,
    3000.00,
    0.00,
    12000.00,
    'LED Lighting Setup',
    'LLS-001'
),

-- Items for INV-2024-006
(
    'item6661-1111-1111-1111-111111111111',
    'inv66666-6666-6666-6666-666666666666',
    'p6666666-6666-6666-6666-666666666666',
    'Additional Makeup Services',
    5,
    1500.00,
    10.00,
    6750.00,
    'Makeup Services',
    'MS-001'
),
(
    'item6662-1111-1111-1111-111111111111',
    'inv66666-6666-6666-6666-666666666666',
    'p5555555-5555-5555-5555-555555555555',
    'Extra Jewelry Accessories',
    1,
    1800.00,
    2.00,
    1764.00,
    'Jewelry Accessories',
    'JA-001'
),

-- Items for INV-2024-007
(
    'item7771-1111-1111-1111-111111111111',
    'inv77777-7777-7777-7777-777777777777',
    NULL,
    'Emergency Alteration Services - Lehenga',
    1,
    8000.00,
    0.00,
    8000.00,
    'Alteration Services',
    'AS-001'
),
(
    'item7772-1111-1111-1111-111111111111',
    'inv77777-7777-7777-7777-777777777777',
    NULL,
    'Rush Delivery Charges',
    1,
    7000.00,
    0.00,
    7000.00,
    'Delivery Service',
    'DS-001'
),

-- Items for INV-2024-008
(
    'item8881-1111-1111-1111-111111111111',
    'inv88888-8888-8888-8888-888888888888',
    NULL,
    'Wedding Consultation Services',
    1,
    15000.00,
    0.00,
    15000.00,
    'Consultation Services',
    'CS-001'
),
(
    'item8882-1111-1111-1111-111111111111',
    'inv88888-8888-8888-8888-888888888888',
    NULL,
    'Event Planning and Coordination',
    1,
    7000.00,
    0.00,
    7000.00,
    'Event Planning',
    'EP-001'
),

-- Items for INV-2024-009
(
    'item9991-1111-1111-1111-111111111111',
    'inv99999-9999-9999-9999-999999999999',
    'p1111111-1111-1111-1111-111111111111',
    'Premium Bridal Package - Sherwani',
    1,
    15000.00,
    0.00,
    15000.00,
    'Premium Bridal Package',
    'PBP-001'
),
(
    'item9992-1111-1111-1111-111111111111',
    'inv99999-9999-9999-9999-999999999999',
    'p2222222-2222-2222-2222-222222222222',
    'Premium Bridal Package - Jewelry',
    1,
    2500.00,
    0.00,
    2500.00,
    'Premium Jewelry',
    'PJ-001'
),
(
    'item9993-1111-1111-1111-111111111111',
    'inv99999-9999-9999-9999-999999999999',
    NULL,
    'Premium Styling Services',
    1,
    17500.00,
    0.00,
    17500.00,
    'Styling Services',
    'SS-001'
),

-- Items for INV-2024-010
(
    'itemaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'invaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'p5555555-5555-5555-5555-555555555555',
    'Groom Accessories Package',
    3,
    1800.00,
    0.00,
    5400.00,
    'Groom Accessories',
    'GA-001'
),
(
    'itemaaab-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'invaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    'Professional Styling and Grooming',
    1,
    13100.00,
    0.00,
    13100.00,
    'Professional Styling',
    'PS-001'
);

-- Create a view for easier invoice querying
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.customer_name,
    i.customer_email,
    i.customer_phone,
    i.issue_date,
    i.due_date,
    i.paid_date,
    i.total_amount,
    i.paid_amount,
    i.balance_amount,
    i.status,
    i.notes,
    COUNT(ii.id) as item_count,
    COALESCE(SUM(ii.quantity), 0) as total_quantity,
    i.created_at,
    i.updated_at
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
GROUP BY i.id, i.invoice_number, i.customer_name, i.customer_email, i.customer_phone,
         i.issue_date, i.due_date, i.paid_date, i.total_amount, i.paid_amount, 
         i.balance_amount, i.status, i.notes, i.created_at, i.updated_at;

-- Final verification and summary
SELECT 
    'Invoice Schema Created Successfully!' as status,
    (SELECT COUNT(*) FROM invoices) as total_invoices,
    (SELECT COUNT(*) FROM invoices WHERE status = 'paid') as paid_invoices,
    (SELECT COUNT(*) FROM invoices WHERE status = 'sent') as pending_invoices,
    (SELECT COUNT(*) FROM invoices WHERE status = 'overdue') as overdue_invoices,
    (SELECT COUNT(*) FROM invoices WHERE status = 'draft') as draft_invoices,
    (SELECT COUNT(*) FROM invoice_items) as total_invoice_items,
    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices) as total_invoice_value;
