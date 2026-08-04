-- Create Financial Management Tables and Data for Supabase

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS financial_categories CASCADE;
DROP VIEW IF EXISTS monthly_financial_summary CASCADE;
DROP VIEW IF EXISTS franchise_financial_summary CASCADE;

-- Create Payment Methods table
CREATE TABLE payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Financial Categories table
CREATE TABLE financial_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Financial Transactions table
CREATE TABLE financial_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    category_id UUID REFERENCES financial_categories(id) NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id),
    booking_id UUID REFERENCES bookings(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    reference_number VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_financial_transactions_franchise_id ON financial_transactions(franchise_id);
CREATE INDEX idx_financial_transactions_category_id ON financial_transactions(category_id);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(transaction_type);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Insert Payment Methods
INSERT INTO payment_methods (name, description) VALUES
('Cash', 'Cash payments'),
('UPI', 'UPI payments (GPay, PhonePe, Paytm, etc.)'),
('Card', 'Credit/Debit card payments'),
('Bank Transfer', 'Direct bank transfers'),
('Cheque', 'Cheque payments'),
('Digital Wallet', 'Other digital wallet payments');

-- Insert Financial Categories
INSERT INTO financial_categories (name, type, description) VALUES
-- Income Categories
('Service Revenue', 'income', 'Revenue from laundry and dry cleaning services'),
('Product Sales', 'income', 'Revenue from product sales'),
('Delivery Charges', 'income', 'Charges for pickup and delivery services'),
('Rental Income', 'income', 'Income from equipment or space rental'),
('Late Fees', 'income', 'Late payment fees from customers'),
('Other Income', 'income', 'Miscellaneous income'),

-- Expense Categories
('Staff Salaries', 'expense', 'Employee wages and salaries'),
('Utilities', 'expense', 'Electricity, water, gas bills'),
('Supplies', 'expense', 'Detergents, chemicals, packaging materials'),
('Rent', 'expense', 'Facility rental costs'),
('Equipment Maintenance', 'expense', 'Machine maintenance and repairs'),
('Marketing', 'expense', 'Advertising and promotional expenses'),
('Insurance', 'expense', 'Business insurance premiums'),
('Transportation', 'expense', 'Vehicle fuel and maintenance'),
('Professional Services', 'expense', 'Legal, accounting, consulting fees'),
('Other Expenses', 'expense', 'Miscellaneous business expenses');

-- Insert sample financial transactions for the last 6 months
-- Get franchise IDs
DO $$
DECLARE
    franchise_mumbai UUID;
    franchise_delhi UUID;
    franchise_bangalore UUID;
    user_admin UUID;
    
    -- Category IDs
    cat_service_revenue UUID;
    cat_product_sales UUID;
    cat_delivery_charges UUID;
    cat_staff_salaries UUID;
    cat_utilities UUID;
    cat_supplies UUID;
    cat_rent UUID;
    cat_marketing UUID;
    
    -- Payment Method IDs
    pm_cash UUID;
    pm_upi UUID;
    pm_card UUID;
    pm_bank UUID;
    
    current_month DATE;
    i INTEGER;
BEGIN
    -- Get franchise IDs
    SELECT id INTO franchise_mumbai FROM franchises WHERE name = 'Mumbai Central' LIMIT 1;
    SELECT id INTO franchise_delhi FROM franchises WHERE name = 'Delhi North' LIMIT 1;
    SELECT id INTO franchise_bangalore FROM franchises WHERE name = 'Bangalore South' LIMIT 1;
    
    -- Get user ID
    SELECT id INTO user_admin FROM users WHERE email = 'admin@safawala.com' LIMIT 1;
    
    -- Get category IDs
    SELECT id INTO cat_service_revenue FROM financial_categories WHERE name = 'Service Revenue';
    SELECT id INTO cat_product_sales FROM financial_categories WHERE name = 'Product Sales';
    SELECT id INTO cat_delivery_charges FROM financial_categories WHERE name = 'Delivery Charges';
    SELECT id INTO cat_staff_salaries FROM financial_categories WHERE name = 'Staff Salaries';
    SELECT id INTO cat_utilities FROM financial_categories WHERE name = 'Utilities';
    SELECT id INTO cat_supplies FROM financial_categories WHERE name = 'Supplies';
    SELECT id INTO cat_rent FROM financial_categories WHERE name = 'Rent';
    SELECT id INTO cat_marketing FROM financial_categories WHERE name = 'Marketing';
    
    -- Get payment method IDs
    SELECT id INTO pm_cash FROM payment_methods WHERE name = 'Cash';
    SELECT id INTO pm_upi FROM payment_methods WHERE name = 'UPI';
    SELECT id INTO pm_card FROM payment_methods WHERE name = 'Card';
    SELECT id INTO pm_bank FROM payment_methods WHERE name = 'Bank Transfer';
    
    -- Generate transactions for last 6 months
    FOR i IN 0..5 LOOP
        current_month := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' * i;
        
        -- Mumbai Central Transactions
        IF franchise_mumbai IS NOT NULL THEN
            -- Income transactions
            INSERT INTO financial_transactions (franchise_id, category_id, payment_method_id, transaction_type, amount, description, transaction_date, created_by) VALUES
            (franchise_mumbai, cat_service_revenue, pm_upi, 'income', 45000 + (i * 2000), 'Monthly service revenue', current_month + INTERVAL '5 days', user_admin),
            (franchise_mumbai, cat_product_sales, pm_card, 'income', 12000 + (i * 500), 'Product sales revenue', current_month + INTERVAL '10 days', user_admin),
            (franchise_mumbai, cat_delivery_charges, pm_cash, 'income', 8000 + (i * 300), 'Delivery charges collected', current_month + INTERVAL '15 days', user_admin);
            
            -- Expense transactions
            INSERT INTO financial_transactions (franchise_id, category_id, payment_method_id, transaction_type, amount, description, transaction_date, created_by) VALUES
            (franchise_mumbai, cat_staff_salaries, pm_bank, 'expense', 25000, 'Monthly staff salaries', current_month + INTERVAL '1 days', user_admin),
            (franchise_mumbai, cat_utilities, pm_upi, 'expense', 4500 + (i * 200), 'Electricity and water bills', current_month + INTERVAL '3 days', user_admin),
            (franchise_mumbai, cat_supplies, pm_card, 'expense', 8000 + (i * 400), 'Detergents and supplies', current_month + INTERVAL '7 days', user_admin),
            (franchise_mumbai, cat_rent, pm_bank, 'expense', 15000, 'Monthly rent payment', current_month + INTERVAL '1 days', user_admin),
            (franchise_mumbai, cat_marketing, pm_upi, 'expense', 3000 + (i * 150), 'Marketing and advertising', current_month + INTERVAL '12 days', user_admin);
        END IF;
        
        -- Delhi North Transactions
        IF franchise_delhi IS NOT NULL THEN
            -- Income transactions
            INSERT INTO financial_transactions (franchise_id, category_id, payment_method_id, transaction_type, amount, description, transaction_date, created_by) VALUES
            (franchise_delhi, cat_service_revenue, pm_card, 'income', 38000 + (i * 1800), 'Monthly service revenue', current_month + INTERVAL '6 days', user_admin),
            (franchise_delhi, cat_product_sales, pm_upi, 'income', 10000 + (i * 400), 'Product sales revenue', current_month + INTERVAL '11 days', user_admin),
            (franchise_delhi, cat_delivery_charges, pm_cash, 'income', 6500 + (i * 250), 'Delivery charges collected', current_month + INTERVAL '16 days', user_admin);
            
            -- Expense transactions
            INSERT INTO financial_transactions (franchise_id, category_id, payment_method_id, transaction_type, amount, description, transaction_date, created_by) VALUES
            (franchise_delhi, cat_staff_salaries, pm_bank, 'expense', 22000, 'Monthly staff salaries', current_month + INTERVAL '1 days', user_admin),
            (franchise_delhi, cat_utilities, pm_upi, 'expense', 3800 + (i * 180), 'Electricity and water bills', current_month + INTERVAL '4 days', user_admin),
            (franchise_delhi, cat_supplies, pm_card, 'expense', 6500 + (i * 350), 'Detergents and supplies', current_month + INTERVAL '8 days', user_admin),
            (franchise_delhi, cat_rent, pm_bank, 'expense', 12000, 'Monthly rent payment', current_month + INTERVAL '1 days', user_admin),
            (franchise_delhi, cat_marketing, pm_upi, 'expense', 2500 + (i * 120), 'Marketing and advertising', current_month + INTERVAL '13 days', user_admin);
        END IF;
        
        -- Bangalore South Transactions
        IF franchise_bangalore IS NOT NULL THEN
            -- Income transactions
            INSERT INTO financial_transactions (franchise_id, category_id, payment_method_id, transaction_type, amount, description, transaction_date, created_by) VALUES
            (franchise_bangalore, cat_service_revenue, pm_upi, 'income', 42000 + (i * 1900), 'Monthly service revenue', current_month + INTERVAL '7 days', user_admin),
            (franchise_bangalore, cat_product_sales, pm_card, 'income', 11000 + (i * 450), 'Product sales revenue', current_month + INTERVAL '12 days', user_admin),
            (franchise_bangalore, cat_delivery_charges, pm_cash, 'income', 7200 + (i * 280), 'Delivery charges collected', current_month + INTERVAL '17 days', user_admin);
            
            -- Expense transactions
            INSERT INTO financial_transactions (franchise_id, category_id, payment_method_id, transaction_type, amount, description, transaction_date, created_by) VALUES
            (franchise_bangalore, cat_staff_salaries, pm_bank, 'expense', 24000, 'Monthly staff salaries', current_month + INTERVAL '1 days', user_admin),
            (franchise_bangalore, cat_utilities, pm_upi, 'expense', 4200 + (i * 190), 'Electricity and water bills', current_month + INTERVAL '5 days', user_admin),
            (franchise_bangalore, cat_supplies, pm_card, 'expense', 7200 + (i * 380), 'Detergents and supplies', current_month + INTERVAL '9 days', user_admin),
            (franchise_bangalore, cat_rent, pm_bank, 'expense', 13500, 'Monthly rent payment', current_month + INTERVAL '1 days', user_admin),
            (franchise_bangalore, cat_marketing, pm_upi, 'expense', 2800 + (i * 140), 'Marketing and advertising', current_month + INTERVAL '14 days', user_admin);
        END IF;
    END LOOP;
END $$;

-- Create Monthly Financial Summary View
CREATE VIEW monthly_financial_summary AS
SELECT 
    DATE_TRUNC('month', ft.transaction_date) as month,
    ft.franchise_id,
    f.name as franchise_name,
    SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE -ft.amount END) as net_profit,
    ROUND(
        (SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE -ft.amount END) / 
         NULLIF(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0)) * 100, 
        2
    ) as profit_margin_percent
FROM financial_transactions ft
JOIN franchises f ON ft.franchise_id = f.id
GROUP BY DATE_TRUNC('month', ft.transaction_date), ft.franchise_id, f.name
ORDER BY month DESC, franchise_name;

-- Create Franchise Financial Summary View
CREATE VIEW franchise_financial_summary AS
SELECT 
    ft.franchise_id,
    f.name as franchise_name,
    SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE -ft.amount END) as net_profit,
    ROUND(
        (SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE -ft.amount END) / 
         NULLIF(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0)) * 100, 
        2
    ) as profit_margin_percent,
    COUNT(DISTINCT DATE_TRUNC('month', ft.transaction_date)) as months_active
FROM financial_transactions ft
JOIN franchises f ON ft.franchise_id = f.id
WHERE ft.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY ft.franchise_id, f.name
ORDER BY total_revenue DESC;

-- Create Payment Method Summary View
CREATE VIEW payment_method_summary AS
SELECT 
    pm.name as payment_method,
    SUM(ft.amount) as total_amount,
    COUNT(*) as transaction_count,
    ROUND(
        (SUM(ft.amount) / (SELECT SUM(amount) FROM financial_transactions WHERE transaction_type = 'income')) * 100, 
        2
    ) as percentage_of_total
FROM financial_transactions ft
JOIN payment_methods pm ON ft.payment_method_id = pm.id
WHERE ft.transaction_type = 'income'
AND ft.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY pm.name
ORDER BY total_amount DESC;

-- Create Category-wise Financial Summary View
CREATE VIEW category_financial_summary AS
SELECT 
    fc.name as category_name,
    fc.type as category_type,
    SUM(ft.amount) as total_amount,
    COUNT(*) as transaction_count,
    AVG(ft.amount) as average_amount,
    DATE_TRUNC('month', MAX(ft.transaction_date)) as last_transaction_month
FROM financial_transactions ft
JOIN financial_categories fc ON ft.category_id = fc.id
WHERE ft.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY fc.name, fc.type
ORDER BY fc.type, total_amount DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Financial Management schema created successfully!';
    RAISE NOTICE 'Tables created: payment_methods, financial_categories, financial_transactions';
    RAISE NOTICE 'Views created: monthly_financial_summary, franchise_financial_summary, payment_method_summary, category_financial_summary';
    RAISE NOTICE 'Sample data: % payment methods, % categories, % transactions', 
        (SELECT COUNT(*) FROM payment_methods),
        (SELECT COUNT(*) FROM financial_categories), 
        (SELECT COUNT(*) FROM financial_transactions);
END $$;
