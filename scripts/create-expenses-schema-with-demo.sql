-- Create expenses table with all required fields
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    receipt_number VARCHAR(100),
    vendor_name VARCHAR(255),
    notes TEXT,
    receipt_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_franchise_id ON expenses(franchise_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Insert demo expense data
INSERT INTO expenses (
    franchise_id,
    category,
    description,
    amount,
    expense_date,
    payment_method,
    receipt_number,
    vendor_name,
    notes,
    created_by
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'Rent',
    'Monthly shop rent for December 2024',
    25000.00,
    '2024-12-01',
    'Bank Transfer',
    'RENT001',
    'Property Owner',
    'Paid monthly rent on time',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Utilities',
    'Electricity bill for November 2024',
    3500.00,
    '2024-12-05',
    'UPI',
    'ELEC001',
    'State Electricity Board',
    'Monthly electricity consumption',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Marketing',
    'Social media advertising campaign',
    8000.00,
    '2024-12-10',
    'Credit Card',
    'FB001',
    'Facebook Ads',
    'Wedding season promotion campaign',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Supplies',
    'Packaging materials and covers',
    4500.00,
    '2024-12-12',
    'Cash',
    'PKG001',
    'Packaging Supplies Co',
    'Garment covers and boxes',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Transportation',
    'Delivery vehicle fuel',
    2800.00,
    '2024-12-15',
    'UPI',
    'FUEL001',
    'Petrol Pump',
    'Monthly fuel for delivery van',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Maintenance',
    'AC servicing and repair',
    1200.00,
    '2024-12-18',
    'Cash',
    'AC001',
    'Cool Air Services',
    'Annual AC maintenance',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Insurance',
    'Shop insurance premium',
    15000.00,
    '2024-12-20',
    'Bank Transfer',
    'INS001',
    'Insurance Company',
    'Annual shop insurance renewal',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Professional Services',
    'Accountant fees for tax filing',
    5000.00,
    '2024-12-22',
    'Cheque',
    'ACC001',
    'CA Sharma & Associates',
    'GST return filing and consultation',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Equipment',
    'New steam iron purchase',
    3200.00,
    '2024-12-25',
    'Debit Card',
    'IRON001',
    'Electronics Store',
    'Professional steam iron for garments',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Other',
    'Office stationery and supplies',
    800.00,
    '2024-12-28',
    'Cash',
    'STAT001',
    'Stationery Shop',
    'Pens, papers, files, etc.',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Utilities',
    'Internet and phone bill',
    1800.00,
    '2024-12-30',
    'UPI',
    'NET001',
    'Telecom Provider',
    'Monthly internet and phone charges',
    '22222222-2222-2222-2222-222222222222'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Marketing',
    'Print advertising in local newspaper',
    2500.00,
    '2024-12-31',
    'Cash',
    'NEWS001',
    'Local Newspaper',
    'New Year special advertisement',
    '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT (id) DO NOTHING;

-- Verify the data
SELECT 
    'Expenses Setup Complete!' as status,
    COUNT(*) as total_expenses,
    SUM(amount) as total_amount,
    COUNT(DISTINCT category) as categories_count
FROM expenses;

-- Show category-wise summary
SELECT 
    category,
    COUNT(*) as expense_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
FROM expenses 
GROUP BY category 
ORDER BY total_amount DESC;
