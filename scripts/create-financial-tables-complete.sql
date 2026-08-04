-- Create comprehensive financial management tables for Supabase

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS financial_categories CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP VIEW IF EXISTS monthly_financial_summary CASCADE;
DROP VIEW IF EXISTS category_financial_summary CASCADE;
DROP VIEW IF EXISTS payment_method_summary CASCADE;

-- Create payment methods table
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial categories table
CREATE TABLE financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial transactions table
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    description TEXT,
    reference_number VARCHAR(100),
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX idx_financial_transactions_category ON financial_transactions(category_id);
CREATE INDEX idx_financial_transactions_franchise ON financial_transactions(franchise_id);
CREATE INDEX idx_financial_transactions_payment_method ON financial_transactions(payment_method_id);

-- Insert payment methods
INSERT INTO payment_methods (name, description) VALUES
('Cash', 'Cash payments'),
('UPI', 'UPI payments (PhonePe, GPay, Paytm, etc.)'),
('Credit Card', 'Credit card payments'),
('Debit Card', 'Debit card payments'),
('Bank Transfer', 'Direct bank transfers'),
('Cheque', 'Cheque payments'),
('Digital Wallet', 'Other digital wallet payments');

-- Insert financial categories
INSERT INTO financial_categories (name, type, description) VALUES
-- Income categories
('Laundry Services', 'income', 'Revenue from laundry and dry cleaning services'),
('Product Sales', 'income', 'Revenue from product sales'),
('Delivery Charges', 'income', 'Delivery and pickup charges'),
('Express Service', 'income', 'Premium express service charges'),
('Late Fees', 'income', 'Late return fees from customers'),
('Damage Charges', 'income', 'Charges for damaged items'),
('Membership Fees', 'income', 'Customer membership and subscription fees'),

-- Expense categories
('Staff Salaries', 'expense', 'Employee wages and salaries'),
('Rent', 'expense', 'Office and facility rent'),
('Utilities', 'expense', 'Electricity, water, gas, internet bills'),
('Supplies', 'expense', 'Cleaning supplies, detergents, packaging materials'),
('Transportation', 'expense', 'Vehicle fuel, maintenance, delivery costs'),
('Equipment Maintenance', 'expense', 'Machine maintenance and repairs'),
('Marketing', 'expense', 'Advertising and promotional expenses'),
('Insurance', 'expense', 'Business insurance premiums'),
('Professional Services', 'expense', 'Legal, accounting, consulting fees'),
('Miscellaneous', 'expense', 'Other business expenses');

-- Generate comprehensive demo data for the past 12 months
DO $$
DECLARE
    franchise_record RECORD;
    user_id UUID;
    category_record RECORD;
    payment_method_record RECORD;
    month_offset INTEGER;
    transaction_date DATE;
    base_amount DECIMAL;
    random_amount DECIMAL;
    transactions_per_month INTEGER;
    i INTEGER;
    total_transactions INTEGER := 0;
BEGIN
    -- Get first user
    SELECT id INTO user_id FROM users LIMIT 1;
    
    -- Generate data for each franchise
    FOR franchise_record IN 
        SELECT id, name FROM franchises WHERE is_active = true
    LOOP
        -- Generate data for each of the past 12 months
        FOR month_offset IN 0..11 LOOP
            transaction_date := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' * month_offset;
            
            -- Generate income transactions
            FOR category_record IN 
                SELECT * FROM financial_categories WHERE type = 'income' AND is_active = true
            LOOP
                -- Determine base amount and frequency based on category
                CASE category_record.name
                    WHEN 'Laundry Services' THEN 
                        base_amount := 80000 + (RANDOM() * 40000);
                        transactions_per_month := 20 + (RANDOM() * 15)::INTEGER;
                    WHEN 'Product Sales' THEN 
                        base_amount := 15000 + (RANDOM() * 10000);
                        transactions_per_month := 8 + (RANDOM() * 5)::INTEGER;
                    WHEN 'Delivery Charges' THEN 
                        base_amount := 12000 + (RANDOM() * 8000);
                        transactions_per_month := 15 + (RANDOM() * 10)::INTEGER;
                    WHEN 'Express Service' THEN 
                        base_amount := 8000 + (RANDOM() * 5000);
                        transactions_per_month := 5 + (RANDOM() * 3)::INTEGER;
                    WHEN 'Late Fees' THEN 
                        base_amount := 2000 + (RANDOM() * 1500);
                        transactions_per_month := 2 + (RANDOM() * 2)::INTEGER;
                    WHEN 'Damage Charges' THEN 
                        base_amount := 3000 + (RANDOM() * 2000);
                        transactions_per_month := 1 + (RANDOM() * 2)::INTEGER;
                    WHEN 'Membership Fees' THEN 
                        base_amount := 5000 + (RANDOM() * 3000);
                        transactions_per_month := 3 + (RANDOM() * 2)::INTEGER;
                    ELSE 
                        base_amount := 5000;
                        transactions_per_month := 3;
                END CASE;
                
                -- Create multiple transactions for the month
                FOR i IN 1..transactions_per_month LOOP
                    -- Random amount variation
                    random_amount := (base_amount / transactions_per_month) * (0.7 + RANDOM() * 0.6);
                    
                    -- Random payment method
                    SELECT * INTO payment_method_record 
                    FROM payment_methods 
                    WHERE is_active = true 
                    ORDER BY RANDOM() 
                    LIMIT 1;
                    
                    INSERT INTO financial_transactions (
                        transaction_date,
                        amount,
                        type,
                        category_id,
                        payment_method_id,
                        description,
                        reference_number,
                        franchise_id,
                        created_by
                    ) VALUES (
                        transaction_date + (RANDOM() * 28)::INTEGER,
                        ROUND(random_amount, 2),
                        'income',
                        category_record.id,
                        payment_method_record.id,
                        category_record.name || ' - ' || TO_CHAR(transaction_date, 'Month YYYY'),
                        'TXN' || LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0'),
                        franchise_record.id,
                        user_id
                    );
                    
                    total_transactions := total_transactions + 1;
                END LOOP;
            END LOOP;
            
            -- Generate expense transactions
            FOR category_record IN 
                SELECT * FROM financial_categories WHERE type = 'expense' AND is_active = true
            LOOP
                -- Determine base amount and frequency based on category
                CASE category_record.name
                    WHEN 'Staff Salaries' THEN 
                        base_amount := 45000 + (RANDOM() * 15000);
                        transactions_per_month := 1; -- Monthly salary
                    WHEN 'Rent' THEN 
                        base_amount := 25000 + (RANDOM() * 10000);
                        transactions_per_month := 1; -- Monthly rent
                    WHEN 'Utilities' THEN 
                        base_amount := 8000 + (RANDOM() * 4000);
                        transactions_per_month := 3 + (RANDOM() * 2)::INTEGER;
                    WHEN 'Supplies' THEN 
                        base_amount := 15000 + (RANDOM() * 8000);
                        transactions_per_month := 6 + (RANDOM() * 4)::INTEGER;
                    WHEN 'Transportation' THEN 
                        base_amount := 6000 + (RANDOM() * 4000);
                        transactions_per_month := 8 + (RANDOM() * 5)::INTEGER;
                    WHEN 'Equipment Maintenance' THEN 
                        base_amount := 10000 + (RANDOM() * 5000);
                        transactions_per_month := 3 + (RANDOM() * 2)::INTEGER;
                    WHEN 'Marketing' THEN 
                        base_amount := 8000 + (RANDOM() * 4000);
                        transactions_per_month := 2 + (RANDOM() * 2)::INTEGER;
                    WHEN 'Insurance' THEN 
                        base_amount := 3000 + (RANDOM() * 1500);
                        transactions_per_month := 1; -- Monthly premium
                    WHEN 'Professional Services' THEN 
                        base_amount := 5000 + (RANDOM() * 3000);
                        transactions_per_month := 1 + (RANDOM() * 2)::INTEGER;
                    ELSE 
                        base_amount := 3000;
                        transactions_per_month := 2;
                END CASE;
                
                -- Create transactions for the month
                FOR i IN 1..transactions_per_month LOOP
                    -- Random amount variation (smaller for expenses)
                    random_amount := (base_amount / transactions_per_month) * (0.8 + RANDOM() * 0.4);
                    
                    -- Random payment method (expenses more likely to be bank transfer or cash)
                    SELECT * INTO payment_method_record 
                    FROM payment_methods 
                    WHERE is_active = true 
                    AND name IN ('Bank Transfer', 'Cash', 'UPI', 'Cheque')
                    ORDER BY RANDOM() 
                    LIMIT 1;
                    
                    INSERT INTO financial_transactions (
                        transaction_date,
                        amount,
                        type,
                        category_id,
                        payment_method_id,
                        description,
                        reference_number,
                        franchise_id,
                        created_by
                    ) VALUES (
                        transaction_date + (RANDOM() * 28)::INTEGER,
                        ROUND(random_amount, 2),
                        'expense',
                        category_record.id,
                        payment_method_record.id,
                        category_record.name || ' - ' || TO_CHAR(transaction_date, 'Month YYYY'),
                        'EXP' || LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0'),
                        franchise_record.id,
                        user_id
                    );
                    
                    total_transactions := total_transactions + 1;
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated % financial transactions across all franchises', total_transactions;
END $$;

-- Create useful views for reporting
CREATE VIEW monthly_financial_summary AS
SELECT 
    DATE_TRUNC('month', ft.transaction_date) as month,
    ft.franchise_id,
    f.name as franchise_name,
    ft.type,
    SUM(ft.amount) as total_amount,
    COUNT(*) as transaction_count
FROM financial_transactions ft
JOIN franchises f ON ft.franchise_id = f.id
GROUP BY DATE_TRUNC('month', ft.transaction_date), ft.franchise_id, f.name, ft.type
ORDER BY month DESC, franchise_name, ft.type;

CREATE VIEW category_financial_summary AS
SELECT 
    fc.name as category_name,
    fc.type,
    ft.franchise_id,
    f.name as franchise_name,
    SUM(ft.amount) as total_amount,
    COUNT(ft.*) as transaction_count,
    AVG(ft.amount) as average_amount,
    MAX(ft.transaction_date) as last_transaction_date
FROM financial_transactions ft
JOIN financial_categories fc ON ft.category_id = fc.id
JOIN franchises f ON ft.franchise_id = f.id
WHERE ft.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY fc.id, fc.name, fc.type, ft.franchise_id, f.name
ORDER BY fc.type, total_amount DESC;

CREATE VIEW payment_method_summary AS
SELECT 
    pm.name as payment_method,
    ft.franchise_id,
    f.name as franchise_name,
    SUM(ft.amount) as total_amount,
    COUNT(ft.*) as transaction_count,
    ROUND(
        COUNT(ft.*) * 100.0 / SUM(COUNT(ft.*)) OVER (PARTITION BY ft.franchise_id), 
        2
    ) as percentage_of_franchise_total
FROM financial_transactions ft
JOIN payment_methods pm ON ft.payment_method_id = pm.id
JOIN franchises f ON ft.franchise_id = f.id
WHERE ft.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY pm.id, pm.name, ft.franchise_id, f.name
ORDER BY ft.franchise_id, total_amount DESC;

-- Enable RLS (Row Level Security)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on payment_methods" ON payment_methods FOR ALL USING (true);
CREATE POLICY "Allow all operations on financial_categories" ON financial_categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on financial_transactions" ON financial_transactions FOR ALL USING (true);

-- Display summary of created data
DO $$
DECLARE
    income_count INTEGER;
    expense_count INTEGER;
    total_income DECIMAL;
    total_expenses DECIMAL;
    franchise_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO income_count FROM financial_transactions WHERE type = 'income';
    SELECT COUNT(*) INTO expense_count FROM financial_transactions WHERE type = 'expense';
    SELECT COALESCE(SUM(amount), 0) INTO total_income FROM financial_transactions WHERE type = 'income';
    SELECT COALESCE(SUM(amount), 0) INTO total_expenses FROM financial_transactions WHERE type = 'expense';
    SELECT COUNT(*) INTO franchise_count FROM franchises WHERE is_active = true;
    
    RAISE NOTICE '=== Financial Management Schema Created Successfully ===';
    RAISE NOTICE 'Payment Methods: %', (SELECT COUNT(*) FROM payment_methods);
    RAISE NOTICE 'Financial Categories: %', (SELECT COUNT(*) FROM financial_categories);
    RAISE NOTICE 'Income Transactions: %', income_count;
    RAISE NOTICE 'Expense Transactions: %', expense_count;
    RAISE NOTICE 'Total Income: ₹%', total_income;
    RAISE NOTICE 'Total Expenses: ₹%', total_expenses;
    RAISE NOTICE 'Net Profit: ₹%', (total_income - total_expenses);
    RAISE NOTICE 'Active Franchises: %', franchise_count;
    RAISE NOTICE '=== Views Created: monthly_financial_summary, category_financial_summary, payment_method_summary ===';
END $$;
