-- Create comprehensive financial management schema with demo data

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS financial_categories CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;

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
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES financial_categories(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    description TEXT,
    reference_number VARCHAR(100),
    franchise_id UUID REFERENCES franchises(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
('Services', 'income', 'Revenue from rental and cleaning services'),
('Products', 'income', 'Revenue from product sales'),
('Delivery', 'income', 'Delivery charges'),
('Express Service', 'income', 'Premium express service charges'),
('Late Fees', 'income', 'Late return fees'),
('Damage Charges', 'income', 'Charges for damaged items'),

-- Expense categories
('Salaries', 'expense', 'Staff salaries and wages'),
('Rent', 'expense', 'Office and warehouse rent'),
('Utilities', 'expense', 'Electricity, water, internet bills'),
('Supplies', 'expense', 'Cleaning supplies and materials'),
('Transportation', 'expense', 'Vehicle fuel and maintenance'),
('Maintenance', 'expense', 'Equipment and facility maintenance'),
('Marketing', 'expense', 'Advertising and promotional expenses'),
('Insurance', 'expense', 'Business insurance premiums'),
('Professional Services', 'expense', 'Legal, accounting, consulting fees'),
('Miscellaneous', 'expense', 'Other business expenses');

-- Generate comprehensive demo data for the past 12 months
DO $$
DECLARE
    franchise_id UUID;
    user_id UUID;
    category_record RECORD;
    payment_method_record RECORD;
    month_offset INTEGER;
    transaction_date DATE;
    base_amount DECIMAL;
    random_amount DECIMAL;
    transactions_per_month INTEGER;
    i INTEGER;
BEGIN
    -- Get first franchise and user
    SELECT id INTO franchise_id FROM franchises LIMIT 1;
    SELECT id INTO user_id FROM users LIMIT 1;
    
    -- Generate data for each of the past 12 months
    FOR month_offset IN 0..11 LOOP
        transaction_date := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' * month_offset;
        
        -- Generate income transactions
        FOR category_record IN 
            SELECT * FROM financial_categories WHERE type = 'income' AND is_active = true
        LOOP
            -- Determine base amount and frequency based on category
            CASE category_record.name
                WHEN 'Services' THEN 
                    base_amount := 150000;
                    transactions_per_month := 25 + (RANDOM() * 10)::INTEGER;
                WHEN 'Products' THEN 
                    base_amount := 25000;
                    transactions_per_month := 8 + (RANDOM() * 5)::INTEGER;
                WHEN 'Delivery' THEN 
                    base_amount := 15000;
                    transactions_per_month := 15 + (RANDOM() * 8)::INTEGER;
                WHEN 'Express Service' THEN 
                    base_amount := 12000;
                    transactions_per_month := 6 + (RANDOM() * 4)::INTEGER;
                WHEN 'Late Fees' THEN 
                    base_amount := 3000;
                    transactions_per_month := 3 + (RANDOM() * 3)::INTEGER;
                WHEN 'Damage Charges' THEN 
                    base_amount := 5000;
                    transactions_per_month := 2 + (RANDOM() * 2)::INTEGER;
                ELSE 
                    base_amount := 10000;
                    transactions_per_month := 5;
            END CASE;
            
            -- Create multiple transactions for the month
            FOR i IN 1..transactions_per_month LOOP
                -- Random amount variation (±30%)
                random_amount := base_amount * (0.7 + RANDOM() * 0.6) / transactions_per_month;
                
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
                    random_amount,
                    'income',
                    category_record.id,
                    payment_method_record.id,
                    category_record.name || ' - ' || TO_CHAR(transaction_date, 'Month YYYY'),
                    'TXN' || LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0'),
                    franchise_id,
                    user_id
                );
            END LOOP;
        END LOOP;
        
        -- Generate expense transactions
        FOR category_record IN 
            SELECT * FROM financial_categories WHERE type = 'expense' AND is_active = true
        LOOP
            -- Determine base amount and frequency based on category
            CASE category_record.name
                WHEN 'Salaries' THEN 
                    base_amount := 80000;
                    transactions_per_month := 1; -- Monthly salary
                WHEN 'Rent' THEN 
                    base_amount := 45000;
                    transactions_per_month := 1; -- Monthly rent
                WHEN 'Utilities' THEN 
                    base_amount := 12000;
                    transactions_per_month := 3 + (RANDOM() * 2)::INTEGER;
                WHEN 'Supplies' THEN 
                    base_amount := 25000;
                    transactions_per_month := 8 + (RANDOM() * 4)::INTEGER;
                WHEN 'Transportation' THEN 
                    base_amount := 8000;
                    transactions_per_month := 6 + (RANDOM() * 4)::INTEGER;
                WHEN 'Maintenance' THEN 
                    base_amount := 15000;
                    transactions_per_month := 4 + (RANDOM() * 3)::INTEGER;
                WHEN 'Marketing' THEN 
                    base_amount := 10000;
                    transactions_per_month := 3 + (RANDOM() * 2)::INTEGER;
                WHEN 'Insurance' THEN 
                    base_amount := 5000;
                    transactions_per_month := 1; -- Monthly premium
                WHEN 'Professional Services' THEN 
                    base_amount := 8000;
                    transactions_per_month := 2 + (RANDOM() * 2)::INTEGER;
                ELSE 
                    base_amount := 5000;
                    transactions_per_month := 2 + (RANDOM() * 2)::INTEGER;
            END CASE;
            
            -- Create transactions for the month
            FOR i IN 1..transactions_per_month LOOP
                -- Random amount variation (±20% for expenses, more predictable)
                random_amount := base_amount * (0.8 + RANDOM() * 0.4) / transactions_per_month;
                
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
                    random_amount,
                    'expense',
                    category_record.id,
                    payment_method_record.id,
                    category_record.name || ' - ' || TO_CHAR(transaction_date, 'Month YYYY'),
                    'EXP' || LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0'),
                    franchise_id,
                    user_id
                );
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Create useful views for reporting
CREATE OR REPLACE VIEW monthly_financial_summary AS
SELECT 
    DATE_TRUNC('month', transaction_date) as month,
    type,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count
FROM financial_transactions
GROUP BY DATE_TRUNC('month', transaction_date), type
ORDER BY month DESC, type;

CREATE OR REPLACE VIEW category_wise_summary AS
SELECT 
    fc.name as category_name,
    fc.type,
    SUM(ft.amount) as total_amount,
    COUNT(ft.*) as transaction_count,
    AVG(ft.amount) as average_amount
FROM financial_transactions ft
JOIN financial_categories fc ON ft.category_id = fc.id
WHERE ft.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY fc.id, fc.name, fc.type
ORDER BY fc.type, total_amount DESC;

CREATE OR REPLACE VIEW payment_method_summary AS
SELECT 
    pm.name as payment_method,
    SUM(ft.amount) as total_amount,
    COUNT(ft.*) as transaction_count,
    ROUND(COUNT(ft.*) * 100.0 / SUM(COUNT(ft.*)) OVER (), 2) as percentage
FROM financial_transactions ft
JOIN payment_methods pm ON ft.payment_method_id = pm.id
WHERE ft.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY pm.id, pm.name
ORDER BY total_amount DESC;

-- Create indexes for better performance
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX idx_financial_transactions_category ON financial_transactions(category_id);
CREATE INDEX idx_financial_transactions_payment_method ON financial_transactions(payment_method_id);
CREATE INDEX idx_financial_transactions_franchise ON financial_transactions(franchise_id);

-- Display summary of created data
SELECT 
    'Data Summary' as info,
    (SELECT COUNT(*) FROM financial_transactions WHERE type = 'income') as income_transactions,
    (SELECT COUNT(*) FROM financial_transactions WHERE type = 'expense') as expense_transactions,
    (SELECT SUM(amount) FROM financial_transactions WHERE type = 'income') as total_income,
    (SELECT SUM(amount) FROM financial_transactions WHERE type = 'expense') as total_expenses;
