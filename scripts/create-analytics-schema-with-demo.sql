-- Create analytics summary table for pre-calculated metrics
CREATE TABLE IF NOT EXISTS analytics_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id),
    date DATE NOT NULL,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_expenses DECIMAL(12,2) DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    rental_revenue DECIMAL(12,2) DEFAULT 0,
    sales_revenue DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(id),
    category_id UUID REFERENCES expense_categories(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_summary_franchise_date ON analytics_summary(franchise_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_date ON analytics_summary(date);
CREATE INDEX IF NOT EXISTS idx_expenses_franchise_date ON expenses(franchise_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

-- Insert expense categories
INSERT INTO expense_categories (name, description) VALUES
('RENT', 'Monthly rent and property costs'),
('UTILITIES', 'Electricity, water, internet, phone bills'),
('MARKETING', 'Advertising, promotions, social media'),
('SUPPLIES', 'Office supplies, cleaning materials'),
('MAINTENANCE', 'Equipment maintenance and repairs'),
('TRANSPORTATION', 'Vehicle costs, fuel, delivery charges'),
('INSURANCE', 'Business insurance premiums'),
('STAFF_SALARY', 'Employee salaries and benefits'),
('MISCELLANEOUS', 'Other business expenses')
ON CONFLICT (name) DO NOTHING;

-- Get franchise IDs for demo data
DO $$
DECLARE
    franchise_1_id UUID;
    franchise_2_id UUID;
    franchise_3_id UUID;
    category_rent_id UUID;
    category_utilities_id UUID;
    category_marketing_id UUID;
    category_supplies_id UUID;
    category_maintenance_id UUID;
    category_transport_id UUID;
    category_insurance_id UUID;
    category_salary_id UUID;
    category_misc_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get franchise IDs
    SELECT id INTO franchise_1_id FROM franchises WHERE name = 'Mumbai Central' LIMIT 1;
    SELECT id INTO franchise_2_id FROM franchises WHERE name = 'Delhi North' LIMIT 1;
    SELECT id INTO franchise_3_id FROM franchises WHERE name = 'Bangalore South' LIMIT 1;
    
    -- Get category IDs
    SELECT id INTO category_rent_id FROM expense_categories WHERE name = 'RENT';
    SELECT id INTO category_utilities_id FROM expense_categories WHERE name = 'UTILITIES';
    SELECT id INTO category_marketing_id FROM expense_categories WHERE name = 'MARKETING';
    SELECT id INTO category_supplies_id FROM expense_categories WHERE name = 'SUPPLIES';
    SELECT id INTO category_maintenance_id FROM expense_categories WHERE name = 'MAINTENANCE';
    SELECT id INTO category_transport_id FROM expense_categories WHERE name = 'TRANSPORTATION';
    SELECT id INTO category_insurance_id FROM expense_categories WHERE name = 'INSURANCE';
    SELECT id INTO category_salary_id FROM expense_categories WHERE name = 'STAFF_SALARY';
    SELECT id INTO category_misc_id FROM expense_categories WHERE name = 'MISCELLANEOUS';
    
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM users WHERE role = 'super_admin' LIMIT 1;
    
    -- If franchises don't exist, create them
    IF franchise_1_id IS NULL THEN
        INSERT INTO franchises (name, address, phone, email, is_active) 
        VALUES ('Mumbai Central', '123 Main St, Mumbai', '+91-9876543210', 'mumbai@safawala.com', true)
        RETURNING id INTO franchise_1_id;
    END IF;
    
    IF franchise_2_id IS NULL THEN
        INSERT INTO franchises (name, address, phone, email, is_active) 
        VALUES ('Delhi North', '456 Ring Road, Delhi', '+91-9876543211', 'delhi@safawala.com', true)
        RETURNING id INTO franchise_2_id;
    END IF;
    
    IF franchise_3_id IS NULL THEN
        INSERT INTO franchises (name, address, phone, email, is_active) 
        VALUES ('Bangalore South', '789 MG Road, Bangalore', '+91-9876543212', 'bangalore@safawala.com', true)
        RETURNING id INTO franchise_3_id;
    END IF;
    
    -- Insert analytics summary data for the last 6 months
    INSERT INTO analytics_summary (franchise_id, date, total_revenue, total_expenses, total_bookings, total_customers, rental_revenue, sales_revenue) VALUES
    -- Mumbai Central
    (franchise_1_id, '2024-01-01', 125000, 65000, 45, 32, 95000, 30000),
    (franchise_1_id, '2024-02-01', 185000, 72000, 62, 45, 140000, 45000),
    (franchise_1_id, '2024-03-01', 165000, 68000, 58, 41, 125000, 40000),
    (franchise_1_id, '2024-04-01', 195000, 75000, 68, 52, 150000, 45000),
    (franchise_1_id, '2024-05-01', 225000, 82000, 78, 58, 175000, 50000),
    (franchise_1_id, '2024-06-01', 245000, 85000, 85, 62, 190000, 55000),
    
    -- Delhi North
    (franchise_2_id, '2024-01-01', 110000, 58000, 38, 28, 85000, 25000),
    (franchise_2_id, '2024-02-01', 165000, 65000, 55, 38, 125000, 40000),
    (franchise_2_id, '2024-03-01', 145000, 62000, 52, 36, 110000, 35000),
    (franchise_2_id, '2024-04-01', 175000, 68000, 62, 45, 135000, 40000),
    (franchise_2_id, '2024-05-01', 205000, 75000, 72, 52, 160000, 45000),
    (franchise_2_id, '2024-06-01', 220000, 78000, 78, 55, 170000, 50000),
    
    -- Bangalore South
    (franchise_3_id, '2024-01-01', 95000, 52000, 32, 24, 75000, 20000),
    (franchise_3_id, '2024-02-01', 145000, 58000, 48, 32, 115000, 30000),
    (franchise_3_id, '2024-03-01', 125000, 55000, 45, 28, 95000, 30000),
    (franchise_3_id, '2024-04-01', 155000, 62000, 55, 38, 120000, 35000),
    (franchise_3_id, '2024-05-01', 185000, 68000, 65, 45, 145000, 40000),
    (franchise_3_id, '2024-06-01', 195000, 72000, 68, 48, 150000, 45000)
    ON CONFLICT DO NOTHING;
    
    -- Insert detailed expense records
    INSERT INTO expenses (franchise_id, category_id, amount, description, expense_date, created_by) VALUES
    -- January 2024 expenses
    (franchise_1_id, category_rent_id, 25000, 'Monthly rent payment', '2024-01-01', admin_user_id),
    (franchise_1_id, category_utilities_id, 8000, 'Electricity and water bills', '2024-01-05', admin_user_id),
    (franchise_1_id, category_marketing_id, 15000, 'Social media advertising', '2024-01-10', admin_user_id),
    (franchise_1_id, category_supplies_id, 5000, 'Office supplies and materials', '2024-01-15', admin_user_id),
    (franchise_1_id, category_salary_id, 12000, 'Staff salaries', '2024-01-31', admin_user_id),
    
    -- February 2024 expenses
    (franchise_1_id, category_rent_id, 25000, 'Monthly rent payment', '2024-02-01', admin_user_id),
    (franchise_1_id, category_utilities_id, 9000, 'Electricity and water bills', '2024-02-05', admin_user_id),
    (franchise_1_id, category_marketing_id, 18000, 'Wedding season promotions', '2024-02-10', admin_user_id),
    (franchise_1_id, category_supplies_id, 7000, 'Cleaning and maintenance supplies', '2024-02-15', admin_user_id),
    (franchise_1_id, category_maintenance_id, 3000, 'Equipment maintenance', '2024-02-20', admin_user_id),
    (franchise_1_id, category_salary_id, 10000, 'Staff salaries', '2024-02-28', admin_user_id),
    
    -- March 2024 expenses
    (franchise_1_id, category_rent_id, 25000, 'Monthly rent payment', '2024-03-01', admin_user_id),
    (franchise_1_id, category_utilities_id, 7500, 'Electricity and water bills', '2024-03-05', admin_user_id),
    (franchise_1_id, category_marketing_id, 12000, 'Print advertisements', '2024-03-10', admin_user_id),
    (franchise_1_id, category_supplies_id, 6000, 'Office supplies', '2024-03-15', admin_user_id),
    (franchise_1_id, category_transport_id, 4500, 'Delivery charges', '2024-03-20', admin_user_id),
    (franchise_1_id, category_salary_id, 13000, 'Staff salaries', '2024-03-31', admin_user_id),
    
    -- April 2024 expenses
    (franchise_1_id, category_rent_id, 25000, 'Monthly rent payment', '2024-04-01', admin_user_id),
    (franchise_1_id, category_utilities_id, 8500, 'Electricity and water bills', '2024-04-05', admin_user_id),
    (franchise_1_id, category_marketing_id, 20000, 'Wedding season campaigns', '2024-04-10', admin_user_id),
    (franchise_1_id, category_supplies_id, 8000, 'Inventory supplies', '2024-04-15', admin_user_id),
    (franchise_1_id, category_insurance_id, 3500, 'Business insurance premium', '2024-04-20', admin_user_id),
    (franchise_1_id, category_salary_id, 10000, 'Staff salaries', '2024-04-30', admin_user_id),
    
    -- May 2024 expenses
    (franchise_1_id, category_rent_id, 25000, 'Monthly rent payment', '2024-05-01', admin_user_id),
    (franchise_1_id, category_utilities_id, 9500, 'Electricity and water bills', '2024-05-05', admin_user_id),
    (franchise_1_id, category_marketing_id, 22000, 'Peak season advertising', '2024-05-10', admin_user_id),
    (franchise_1_id, category_supplies_id, 9000, 'Additional supplies', '2024-05-15', admin_user_id),
    (franchise_1_id, category_maintenance_id, 4500, 'Equipment upgrades', '2024-05-20', admin_user_id),
    (franchise_1_id, category_salary_id, 12000, 'Staff salaries', '2024-05-31', admin_user_id),
    
    -- June 2024 expenses
    (franchise_1_id, category_rent_id, 25000, 'Monthly rent payment', '2024-06-01', admin_user_id),
    (franchise_1_id, category_utilities_id, 10000, 'Electricity and water bills', '2024-06-05', admin_user_id),
    (franchise_1_id, category_marketing_id, 25000, 'Summer wedding promotions', '2024-06-10', admin_user_id),
    (franchise_1_id, category_supplies_id, 10000, 'Premium supplies', '2024-06-15', admin_user_id),
    (franchise_1_id, category_transport_id, 5000, 'Increased delivery costs', '2024-06-20', admin_user_id),
    (franchise_1_id, category_misc_id, 2000, 'Miscellaneous expenses', '2024-06-25', admin_user_id),
    (franchise_1_id, category_salary_id, 8000, 'Staff salaries', '2024-06-30', admin_user_id)
    ON CONFLICT DO NOTHING;
    
END $$;

-- Create a view for monthly analytics
CREATE OR REPLACE VIEW monthly_analytics AS
SELECT 
    DATE_TRUNC('month', date) as month,
    franchise_id,
    f.name as franchise_name,
    SUM(total_revenue) as total_revenue,
    SUM(total_expenses) as total_expenses,
    SUM(total_revenue - total_expenses) as net_profit,
    CASE 
        WHEN SUM(total_revenue) > 0 THEN (SUM(total_revenue - total_expenses) / SUM(total_revenue)) * 100
        ELSE 0 
    END as profit_margin,
    SUM(total_bookings) as total_bookings,
    MAX(total_customers) as total_customers,
    SUM(rental_revenue) as rental_revenue,
    SUM(sales_revenue) as sales_revenue
FROM analytics_summary a
JOIN franchises f ON a.franchise_id = f.id
GROUP BY DATE_TRUNC('month', date), franchise_id, f.name
ORDER BY month DESC, franchise_name;

-- Create a view for expense analysis
CREATE OR REPLACE VIEW expense_analysis AS
SELECT 
    DATE_TRUNC('month', expense_date) as month,
    e.franchise_id,
    f.name as franchise_name,
    ec.name as category_name,
    ec.description as category_description,
    SUM(e.amount) as total_amount,
    COUNT(*) as transaction_count,
    AVG(e.amount) as avg_amount
FROM expenses e
JOIN expense_categories ec ON e.category_id = ec.id
JOIN franchises f ON e.franchise_id = f.id
WHERE ec.is_active = true
GROUP BY DATE_TRUNC('month', expense_date), e.franchise_id, f.name, ec.name, ec.description
ORDER BY month DESC, franchise_name, total_amount DESC;

-- Grant permissions
GRANT SELECT ON analytics_summary TO authenticated;
GRANT SELECT ON expense_categories TO authenticated;
GRANT SELECT ON expenses TO authenticated;
GRANT SELECT ON monthly_analytics TO authenticated;
GRANT SELECT ON expense_analysis TO authenticated;

-- Enable RLS
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view analytics for their franchise" ON analytics_summary
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM users WHERE 
            (role = 'super_admin') OR 
            (franchise_id = analytics_summary.franchise_id)
        )
    );

CREATE POLICY "Users can view expense categories" ON expense_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view expenses for their franchise" ON expenses
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM users WHERE 
            (role = 'super_admin') OR 
            (franchise_id = expenses.franchise_id)
        )
    );

-- Insert or update function for analytics summary
CREATE OR REPLACE FUNCTION update_analytics_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be used to automatically update analytics when bookings change
    -- For now, it's a placeholder for future automation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
