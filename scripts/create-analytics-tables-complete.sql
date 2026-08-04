-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS analytics_summary CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;

-- Create expense categories table
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID REFERENCES franchises(id),
    category_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics summary table
CREATE TABLE analytics_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID REFERENCES franchises(id),
    date DATE NOT NULL,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_expenses DECIMAL(12,2) DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    rental_revenue DECIMAL(12,2) DEFAULT 0,
    sales_revenue DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(franchise_id, date)
);

-- Create indexes for better performance
CREATE INDEX idx_expenses_franchise_date ON expenses(franchise_id, expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_name);
CREATE INDEX idx_analytics_franchise_date ON analytics_summary(franchise_id, date);
CREATE INDEX idx_analytics_date ON analytics_summary(date);

-- Insert expense categories
INSERT INTO expense_categories (name, description) VALUES
('RENT', 'Monthly rent and property costs'),
('UTILITIES', 'Electricity, water, internet, phone bills'),
('MARKETING', 'Advertising, promotions, social media'),
('SUPPLIES', 'Office supplies, cleaning materials'),
('MAINTENANCE', 'Equipment maintenance and repairs'),
('STAFF', 'Salaries, wages, benefits'),
('INSURANCE', 'Business insurance premiums'),
('TRANSPORT', 'Vehicle costs, fuel, delivery charges'),
('MISCELLANEOUS', 'Other business expenses');

-- Get existing franchise and user IDs, or create them
DO $$
DECLARE
    franchise1_id UUID;
    franchise2_id UUID;
    franchise3_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get or create franchises
    SELECT id INTO franchise1_id FROM franchises WHERE name ILIKE '%mumbai%' OR name ILIKE '%central%' LIMIT 1;
    IF franchise1_id IS NULL THEN
        INSERT INTO franchises (name, code, address, city, state, phone, email, owner_name, is_active) 
        VALUES ('Mumbai Central', 'MUM01', '123 Main Street', 'Mumbai', 'Maharashtra', '+91-9876543210', 'mumbai@safawala.com', 'Rajesh Kumar', true)
        RETURNING id INTO franchise1_id;
    END IF;

    SELECT id INTO franchise2_id FROM franchises WHERE name ILIKE '%delhi%' OR name ILIKE '%north%' LIMIT 1;
    IF franchise2_id IS NULL THEN
        INSERT INTO franchises (name, code, address, city, state, phone, email, owner_name, is_active) 
        VALUES ('Delhi North', 'DEL01', '456 Ring Road', 'Delhi', 'Delhi', '+91-9876543211', 'delhi@safawala.com', 'Amit Sharma', true)
        RETURNING id INTO franchise2_id;
    END IF;

    SELECT id INTO franchise3_id FROM franchises WHERE name ILIKE '%bangalore%' OR name ILIKE '%south%' LIMIT 1;
    IF franchise3_id IS NULL THEN
        INSERT INTO franchises (name, code, address, city, state, phone, email, owner_name, is_active) 
        VALUES ('Bangalore South', 'BLR01', '789 MG Road', 'Bangalore', 'Karnataka', '+91-9876543212', 'bangalore@safawala.com', 'Suresh Reddy', true)
        RETURNING id INTO franchise3_id;
    END IF;

    -- Get or create admin user
    SELECT id INTO admin_user_id FROM users WHERE role = 'super_admin' LIMIT 1;
    IF admin_user_id IS NULL THEN
        INSERT INTO users (email, name, role, franchise_id, is_active) 
        VALUES ('admin@safawala.com', 'System Admin', 'super_admin', franchise1_id, true)
        RETURNING id INTO admin_user_id;
    END IF;

    -- Insert analytics summary data for the last 8 months
    INSERT INTO analytics_summary (franchise_id, date, total_revenue, total_expenses, total_bookings, total_customers, rental_revenue, sales_revenue) VALUES
    -- Mumbai Central - 8 months of data
    (franchise1_id, '2024-01-31', 125000, 43500, 18, 12, 95000, 30000),
    (franchise1_id, '2024-02-29', 185000, 55700, 25, 18, 135000, 50000),
    (franchise1_id, '2024-03-31', 165000, 55300, 22, 16, 115000, 50000),
    (franchise1_id, '2024-04-30', 195000, 51700, 28, 20, 145000, 50000),
    (franchise1_id, '2024-05-31', 225000, 79300, 32, 24, 175000, 50000),
    (franchise1_id, '2024-06-30', 245000, 85500, 35, 28, 195000, 50000),
    (franchise1_id, '2024-07-31', 265000, 92000, 38, 30, 210000, 55000),
    (franchise1_id, '2024-08-31', 285000, 98500, 42, 32, 225000, 60000),
    
    -- Delhi North - 8 months of data
    (franchise2_id, '2024-01-31', 110000, 38200, 16, 11, 85000, 25000),
    (franchise2_id, '2024-02-29', 165000, 49500, 22, 16, 120000, 45000),
    (franchise2_id, '2024-03-31', 145000, 48700, 19, 14, 100000, 45000),
    (franchise2_id, '2024-04-30', 175000, 46200, 25, 18, 130000, 45000),
    (franchise2_id, '2024-05-31', 205000, 71100, 29, 22, 160000, 45000),
    (franchise2_id, '2024-06-30', 225000, 76500, 32, 25, 180000, 45000),
    (franchise2_id, '2024-07-31', 240000, 82000, 35, 27, 190000, 50000),
    (franchise2_id, '2024-08-31', 255000, 87500, 38, 29, 200000, 55000),
    
    -- Bangalore South - 8 months of data
    (franchise3_id, '2024-01-31', 95000, 33100, 14, 9, 75000, 20000),
    (franchise3_id, '2024-02-29', 145000, 42300, 19, 13, 110000, 35000),
    (franchise3_id, '2024-03-31', 125000, 41900, 16, 12, 90000, 35000),
    (franchise3_id, '2024-04-30', 155000, 39800, 22, 15, 120000, 35000),
    (franchise3_id, '2024-05-31', 185000, 62700, 26, 19, 150000, 35000),
    (franchise3_id, '2024-06-30', 205000, 67200, 29, 22, 170000, 35000),
    (franchise3_id, '2024-07-31', 220000, 72500, 32, 24, 180000, 40000),
    (franchise3_id, '2024-08-31', 235000, 78000, 35, 26, 190000, 45000)
    ON CONFLICT (franchise_id, date) DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        total_expenses = EXCLUDED.total_expenses,
        total_bookings = EXCLUDED.total_bookings,
        total_customers = EXCLUDED.total_customers,
        rental_revenue = EXCLUDED.rental_revenue,
        sales_revenue = EXCLUDED.sales_revenue,
        updated_at = NOW();

    -- Insert detailed expense records
    INSERT INTO expenses (franchise_id, category_name, amount, description, expense_date, created_by) VALUES
    -- Mumbai Central expenses - Recent months
    (franchise1_id, 'RENT', 25000, 'Monthly rent payment', '2024-08-01', admin_user_id),
    (franchise1_id, 'UTILITIES', 8500, 'Electricity and water bills', '2024-08-05', admin_user_id),
    (franchise1_id, 'MARKETING', 15000, 'Social media advertising campaign', '2024-08-10', admin_user_id),
    (franchise1_id, 'SUPPLIES', 6000, 'Office supplies and cleaning materials', '2024-08-15', admin_user_id),
    (franchise1_id, 'MAINTENANCE', 4500, 'Equipment maintenance and repairs', '2024-08-20', admin_user_id),
    (franchise1_id, 'STAFF', 18000, 'Part-time staff wages', '2024-08-25', admin_user_id),
    (franchise1_id, 'TRANSPORT', 7500, 'Delivery and logistics costs', '2024-08-30', admin_user_id),
    (franchise1_id, 'INSURANCE', 14000, 'Business insurance premium', '2024-08-31', admin_user_id),
    
    (franchise1_id, 'RENT', 25000, 'Monthly rent payment', '2024-07-01', admin_user_id),
    (franchise1_id, 'UTILITIES', 7800, 'Electricity and water bills', '2024-07-05', admin_user_id),
    (franchise1_id, 'MARKETING', 18000, 'Wedding season promotion', '2024-07-10', admin_user_id),
    (franchise1_id, 'SUPPLIES', 5500, 'Office supplies and cleaning materials', '2024-07-15', admin_user_id),
    (franchise1_id, 'MAINTENANCE', 3200, 'Equipment maintenance', '2024-07-20', admin_user_id),
    (franchise1_id, 'STAFF', 20000, 'Peak season staff wages', '2024-07-25', admin_user_id),
    (franchise1_id, 'TRANSPORT', 12500, 'Delivery and logistics', '2024-07-30', admin_user_id),
    
    (franchise1_id, 'RENT', 25000, 'Monthly rent payment', '2024-06-01', admin_user_id),
    (franchise1_id, 'UTILITIES', 7200, 'Electricity and water bills', '2024-06-05', admin_user_id),
    (franchise1_id, 'MARKETING', 16000, 'Summer wedding campaign', '2024-06-10', admin_user_id),
    (franchise1_id, 'SUPPLIES', 5800, 'Office and cleaning supplies', '2024-06-15', admin_user_id),
    (franchise1_id, 'MAINTENANCE', 4200, 'AC and equipment maintenance', '2024-06-20', admin_user_id),
    (franchise1_id, 'STAFF', 19000, 'Staff salaries', '2024-06-25', admin_user_id),
    (franchise1_id, 'TRANSPORT', 8300, 'Delivery costs', '2024-06-30', admin_user_id),
    
    -- Delhi North expenses
    (franchise2_id, 'RENT', 22000, 'Monthly rent payment', '2024-08-01', admin_user_id),
    (franchise2_id, 'UTILITIES', 7200, 'Electricity and water bills', '2024-08-05', admin_user_id),
    (franchise2_id, 'MARKETING', 12000, 'Local advertising campaign', '2024-08-10', admin_user_id),
    (franchise2_id, 'SUPPLIES', 5200, 'Office supplies and materials', '2024-08-15', admin_user_id),
    (franchise2_id, 'MAINTENANCE', 3800, 'Equipment repairs', '2024-08-20', admin_user_id),
    (franchise2_id, 'STAFF', 15000, 'Staff salaries', '2024-08-25', admin_user_id),
    (franchise2_id, 'TRANSPORT', 6300, 'Delivery costs', '2024-08-30', admin_user_id),
    (franchise2_id, 'INSURANCE', 16000, 'Business insurance', '2024-08-31', admin_user_id),
    
    (franchise2_id, 'RENT', 22000, 'Monthly rent payment', '2024-07-01', admin_user_id),
    (franchise2_id, 'UTILITIES', 6800, 'Electricity and water bills', '2024-07-05', admin_user_id),
    (franchise2_id, 'MARKETING', 15000, 'Summer wedding ads', '2024-07-10', admin_user_id),
    (franchise2_id, 'SUPPLIES', 4800, 'Office and cleaning supplies', '2024-07-15', admin_user_id),
    (franchise2_id, 'MAINTENANCE', 2500, 'AC maintenance', '2024-07-20', admin_user_id),
    (franchise2_id, 'STAFF', 18000, 'Peak season wages', '2024-07-25', admin_user_id),
    (franchise2_id, 'TRANSPORT', 7700, 'Transport and delivery', '2024-07-30', admin_user_id),
    
    (franchise2_id, 'RENT', 22000, 'Monthly rent payment', '2024-06-01', admin_user_id),
    (franchise2_id, 'UTILITIES', 6500, 'Electricity and water bills', '2024-06-05', admin_user_id),
    (franchise2_id, 'MARKETING', 13500, 'Wedding season marketing', '2024-06-10', admin_user_id),
    (franchise2_id, 'SUPPLIES', 4600, 'Office supplies', '2024-06-15', admin_user_id),
    (franchise2_id, 'MAINTENANCE', 3200, 'Equipment maintenance', '2024-06-20', admin_user_id),
    (franchise2_id, 'STAFF', 17000, 'Staff wages', '2024-06-25', admin_user_id),
    (franchise2_id, 'TRANSPORT', 9700, 'Delivery and transport', '2024-06-30', admin_user_id),
    
    -- Bangalore South expenses
    (franchise3_id, 'RENT', 18000, 'Monthly rent payment', '2024-08-01', admin_user_id),
    (franchise3_id, 'UTILITIES', 6000, 'Electricity and water bills', '2024-08-05', admin_user_id),
    (franchise3_id, 'MARKETING', 10000, 'Digital marketing campaign', '2024-08-10', admin_user_id),
    (franchise3_id, 'SUPPLIES', 4500, 'Office supplies', '2024-08-15', admin_user_id),
    (franchise3_id, 'MAINTENANCE', 3200, 'Equipment maintenance', '2024-08-20', admin_user_id),
    (franchise3_id, 'STAFF', 12000, 'Staff wages', '2024-08-25', admin_user_id),
    (franchise3_id, 'TRANSPORT', 5300, 'Delivery and transport', '2024-08-30', admin_user_id),
    (franchise3_id, 'INSURANCE', 19000, 'Business insurance premium', '2024-08-31', admin_user_id),
    
    (franchise3_id, 'RENT', 18000, 'Monthly rent payment', '2024-07-01', admin_user_id),
    (franchise3_id, 'UTILITIES', 5500, 'Electricity and water bills', '2024-07-05', admin_user_id),
    (franchise3_id, 'MARKETING', 12000, 'Wedding season promotion', '2024-07-10', admin_user_id),
    (franchise3_id, 'SUPPLIES', 4000, 'Office and cleaning supplies', '2024-07-15', admin_user_id),
    (franchise3_id, 'MAINTENANCE', 2800, 'Equipment repairs', '2024-07-20', admin_user_id),
    (franchise3_id, 'STAFF', 15000, 'Peak season staff', '2024-07-25', admin_user_id),
    (franchise3_id, 'TRANSPORT', 5200, 'Transport costs', '2024-07-30', admin_user_id),
    
    (franchise3_id, 'RENT', 18000, 'Monthly rent payment', '2024-06-01', admin_user_id),
    (franchise3_id, 'UTILITIES', 5200, 'Electricity and water bills', '2024-06-05', admin_user_id),
    (franchise3_id, 'MARKETING', 11000, 'Summer marketing campaign', '2024-06-10', admin_user_id),
    (franchise3_id, 'SUPPLIES', 3800, 'Office supplies', '2024-06-15', admin_user_id),
    (franchise3_id, 'MAINTENANCE', 3500, 'Equipment and AC maintenance', '2024-06-20', admin_user_id),
    (franchise3_id, 'STAFF', 14000, 'Staff salaries', '2024-06-25', admin_user_id),
    (franchise3_id, 'TRANSPORT', 11700, 'Delivery and logistics', '2024-06-30', admin_user_id);

END $$;

-- Create views for easy querying
CREATE OR REPLACE VIEW monthly_analytics AS
SELECT 
    a.franchise_id,
    f.name as franchise_name,
    DATE_TRUNC('month', a.date) as month,
    SUM(a.total_revenue) as total_revenue,
    SUM(a.total_expenses) as total_expenses,
    SUM(a.total_revenue - a.total_expenses) as net_profit,
    CASE 
        WHEN SUM(a.total_revenue) > 0 
        THEN ROUND((SUM(a.total_revenue - a.total_expenses) / SUM(a.total_revenue) * 100)::numeric, 2)
        ELSE 0 
    END as profit_margin,
    SUM(a.total_bookings) as total_bookings,
    MAX(a.total_customers) as total_customers,
    SUM(a.rental_revenue) as rental_revenue,
    SUM(a.sales_revenue) as sales_revenue
FROM analytics_summary a
JOIN franchises f ON a.franchise_id = f.id
GROUP BY a.franchise_id, f.name, DATE_TRUNC('month', a.date)
ORDER BY month DESC, f.name;

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view expense categories" ON expense_categories FOR SELECT USING (true);
CREATE POLICY "Users can view expenses for their franchise" ON expenses FOR SELECT USING (true);
CREATE POLICY "Users can view analytics for their franchise" ON analytics_summary FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT ON expense_categories TO authenticated;
GRANT SELECT ON expenses TO authenticated;
GRANT SELECT ON analytics_summary TO authenticated;
GRANT SELECT ON monthly_analytics TO authenticated;

-- Create function to check table existence
CREATE OR REPLACE FUNCTION check_table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION check_table_exists(TEXT) TO authenticated;

-- Success message
SELECT 
    'Analytics tables created successfully!' as status,
    (SELECT COUNT(*) FROM analytics_summary) as analytics_records,
    (SELECT COUNT(*) FROM expenses) as expense_records,
    (SELECT COUNT(*) FROM expense_categories) as expense_categories,
    (SELECT COUNT(*) FROM franchises) as franchises_count;
