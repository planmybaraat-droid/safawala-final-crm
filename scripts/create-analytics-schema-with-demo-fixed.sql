-- Create analytics schema with demo data (fixed version)

-- First, create the expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the expenses table (simplified without foreign key)
CREATE TABLE IF NOT EXISTS expenses (
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

-- Create the analytics_summary table
CREATE TABLE IF NOT EXISTS analytics_summary (
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
CREATE INDEX IF NOT EXISTS idx_expenses_franchise_date ON expenses(franchise_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_name);
CREATE INDEX IF NOT EXISTS idx_analytics_franchise_date ON analytics_summary(franchise_id, date);

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
('MISCELLANEOUS', 'Other business expenses')
ON CONFLICT (name) DO NOTHING;

-- Get franchise IDs for demo data
DO $$
DECLARE
    franchise1_id UUID;
    franchise2_id UUID;
    franchise3_id UUID;
    user_id UUID;
BEGIN
    -- Get or create franchises
    SELECT id INTO franchise1_id FROM franchises WHERE name = 'Mumbai Central' LIMIT 1;
    IF franchise1_id IS NULL THEN
        INSERT INTO franchises (name, address, phone, email, is_active) 
        VALUES ('Mumbai Central', 'Mumbai, Maharashtra', '+91-9876543210', 'mumbai@safawala.com', true)
        RETURNING id INTO franchise1_id;
    END IF;

    SELECT id INTO franchise2_id FROM franchises WHERE name = 'Delhi North' LIMIT 1;
    IF franchise2_id IS NULL THEN
        INSERT INTO franchises (name, address, phone, email, is_active) 
        VALUES ('Delhi North', 'Delhi, India', '+91-9876543211', 'delhi@safawala.com', true)
        RETURNING id INTO franchise2_id;
    END IF;

    SELECT id INTO franchise3_id FROM franchises WHERE name = 'Bangalore South' LIMIT 1;
    IF franchise3_id IS NULL THEN
        INSERT INTO franchises (name, address, phone, email, is_active) 
        VALUES ('Bangalore South', 'Bangalore, Karnataka', '+91-9876543212', 'bangalore@safawala.com', true)
        RETURNING id INTO franchise3_id;
    END IF;

    -- Get a user ID for created_by
    SELECT id INTO user_id FROM users WHERE role = 'super_admin' LIMIT 1;
    IF user_id IS NULL THEN
        SELECT id INTO user_id FROM users LIMIT 1;
    END IF;

    -- Insert analytics summary data for the last 6 months
    INSERT INTO analytics_summary (franchise_id, date, total_revenue, total_expenses, total_bookings, total_customers, rental_revenue, sales_revenue) VALUES
    -- Mumbai Central
    (franchise1_id, '2024-01-31', 125000, 43500, 18, 12, 95000, 30000),
    (franchise1_id, '2024-02-29', 185000, 55700, 25, 18, 135000, 50000),
    (franchise1_id, '2024-03-31', 165000, 55300, 22, 16, 115000, 50000),
    (franchise1_id, '2024-04-30', 195000, 51700, 28, 20, 145000, 50000),
    (franchise1_id, '2024-05-31', 225000, 79300, 32, 24, 175000, 50000),
    (franchise1_id, '2024-06-30', 245000, 85500, 35, 28, 195000, 50000),
    
    -- Delhi North
    (franchise2_id, '2024-01-31', 110000, 38200, 16, 11, 85000, 25000),
    (franchise2_id, '2024-02-29', 165000, 49500, 22, 16, 120000, 45000),
    (franchise2_id, '2024-03-31', 145000, 48700, 19, 14, 100000, 45000),
    (franchise2_id, '2024-04-30', 175000, 46200, 25, 18, 130000, 45000),
    (franchise2_id, '2024-05-31', 205000, 71100, 29, 22, 160000, 45000),
    (franchise2_id, '2024-06-30', 225000, 76500, 32, 25, 180000, 45000),
    
    -- Bangalore South
    (franchise3_id, '2024-01-31', 95000, 33100, 14, 9, 75000, 20000),
    (franchise3_id, '2024-02-29', 145000, 42300, 19, 13, 110000, 35000),
    (franchise3_id, '2024-03-31', 125000, 41900, 16, 12, 90000, 35000),
    (franchise3_id, '2024-04-30', 155000, 39800, 22, 15, 120000, 35000),
    (franchise3_id, '2024-05-31', 185000, 62700, 26, 19, 150000, 35000),
    (franchise3_id, '2024-06-30', 205000, 67200, 29, 22, 170000, 35000)
    ON CONFLICT (franchise_id, date) DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        total_expenses = EXCLUDED.total_expenses,
        total_bookings = EXCLUDED.total_bookings,
        total_customers = EXCLUDED.total_customers,
        rental_revenue = EXCLUDED.rental_revenue,
        sales_revenue = EXCLUDED.sales_revenue,
        updated_at = NOW();

    -- Insert expense data for the last 6 months
    INSERT INTO expenses (franchise_id, category_name, amount, description, expense_date, created_by) VALUES
    -- January 2024 expenses
    (franchise1_id, 'RENT', 25000, 'Monthly rent payment', '2024-01-05', user_id),
    (franchise1_id, 'UTILITIES', 3500, 'Electricity and water bills', '2024-01-10', user_id),
    (franchise1_id, 'MARKETING', 8000, 'Social media advertising', '2024-01-15', user_id),
    (franchise1_id, 'SUPPLIES', 4000, 'Office and cleaning supplies', '2024-01-20', user_id),
    (franchise1_id, 'MAINTENANCE', 3000, 'Equipment maintenance', '2024-01-25', user_id),
    
    -- February 2024 expenses
    (franchise1_id, 'RENT', 25000, 'Monthly rent payment', '2024-02-05', user_id),
    (franchise1_id, 'UTILITIES', 4200, 'Electricity and water bills', '2024-02-10', user_id),
    (franchise1_id, 'MARKETING', 12000, 'Valentine season promotion', '2024-02-15', user_id),
    (franchise1_id, 'SUPPLIES', 5500, 'Office and cleaning supplies', '2024-02-20', user_id),
    (franchise1_id, 'MAINTENANCE', 2500, 'Equipment maintenance', '2024-02-25', user_id),
    (franchise1_id, 'STAFF', 6500, 'Part-time staff wages', '2024-02-28', user_id),
    
    -- March 2024 expenses
    (franchise1_id, 'RENT', 25000, 'Monthly rent payment', '2024-03-05', user_id),
    (franchise1_id, 'UTILITIES', 4800, 'Electricity and water bills', '2024-03-10', user_id),
    (franchise1_id, 'MARKETING', 10000, 'Wedding season advertising', '2024-03-15', user_id),
    (franchise1_id, 'SUPPLIES', 6000, 'Office and cleaning supplies', '2024-03-20', user_id),
    (franchise1_id, 'MAINTENANCE', 4500, 'Equipment repairs', '2024-03-25', user_id),
    (franchise1_id, 'TRANSPORT', 5000, 'Delivery charges', '2024-03-30', user_id),
    
    -- April 2024 expenses
    (franchise1_id, 'RENT', 25000, 'Monthly rent payment', '2024-04-05', user_id),
    (franchise1_id, 'UTILITIES', 3800, 'Electricity and water bills', '2024-04-10', user_id),
    (franchise1_id, 'MARKETING', 9000, 'Spring wedding promotion', '2024-04-15', user_id),
    (franchise1_id, 'SUPPLIES', 4200, 'Office and cleaning supplies', '2024-04-20', user_id),
    (franchise1_id, 'MAINTENANCE', 2700, 'Equipment maintenance', '2024-04-25', user_id),
    (franchise1_id, 'INSURANCE', 7000, 'Business insurance premium', '2024-04-30', user_id),
    
    -- May 2024 expenses
    (franchise1_id, 'RENT', 25000, 'Monthly rent payment', '2024-05-05', user_id),
    (franchise1_id, 'UTILITIES', 5500, 'Electricity and water bills', '2024-05-10', user_id),
    (franchise1_id, 'MARKETING', 15000, 'Peak wedding season ads', '2024-05-15', user_id),
    (franchise1_id, 'SUPPLIES', 8000, 'Office and cleaning supplies', '2024-05-20', user_id),
    (franchise1_id, 'MAINTENANCE', 3800, 'Equipment maintenance', '2024-05-25', user_id),
    (franchise1_id, 'STAFF', 12000, 'Additional staff for peak season', '2024-05-31', user_id),
    (franchise1_id, 'TRANSPORT', 10000, 'Increased delivery costs', '2024-05-31', user_id),
    
    -- June 2024 expenses
    (franchise1_id, 'RENT', 25000, 'Monthly rent payment', '2024-06-05', user_id),
    (franchise1_id, 'UTILITIES', 6000, 'Electricity and water bills', '2024-06-10', user_id),
    (franchise1_id, 'MARKETING', 18000, 'Summer wedding campaigns', '2024-06-15', user_id),
    (franchise1_id, 'SUPPLIES', 9500, 'Office and cleaning supplies', '2024-06-20', user_id),
    (franchise1_id, 'MAINTENANCE', 4000, 'Equipment maintenance', '2024-06-25', user_id),
    (franchise1_id, 'STAFF', 15000, 'Peak season staff wages', '2024-06-30', user_id),
    (franchise1_id, 'TRANSPORT', 8000, 'Delivery and logistics', '2024-06-30', user_id),
    
    -- Delhi North expenses (similar pattern with different amounts)
    (franchise2_id, 'RENT', 22000, 'Monthly rent payment', '2024-01-05', user_id),
    (franchise2_id, 'UTILITIES', 3000, 'Electricity and water bills', '2024-01-10', user_id),
    (franchise2_id, 'MARKETING', 7000, 'Social media advertising', '2024-01-15', user_id),
    (franchise2_id, 'SUPPLIES', 3500, 'Office and cleaning supplies', '2024-01-20', user_id),
    (franchise2_id, 'MAINTENANCE', 2700, 'Equipment maintenance', '2024-01-25', user_id),
    
    (franchise2_id, 'RENT', 22000, 'Monthly rent payment', '2024-02-05', user_id),
    (franchise2_id, 'UTILITIES', 3800, 'Electricity and water bills', '2024-02-10', user_id),
    (franchise2_id, 'MARKETING', 10500, 'Valentine season promotion', '2024-02-15', user_id),
    (franchise2_id, 'SUPPLIES', 4800, 'Office and cleaning supplies', '2024-02-20', user_id),
    (franchise2_id, 'MAINTENANCE', 2200, 'Equipment maintenance', '2024-02-25', user_id),
    (franchise2_id, 'STAFF', 6200, 'Part-time staff wages', '2024-02-28', user_id),
    
    -- Bangalore South expenses (similar pattern with different amounts)
    (franchise3_id, 'RENT', 18000, 'Monthly rent payment', '2024-01-05', user_id),
    (franchise3_id, 'UTILITIES', 2500, 'Electricity and water bills', '2024-01-10', user_id),
    (franchise3_id, 'MARKETING', 6000, 'Social media advertising', '2024-01-15', user_id),
    (franchise3_id, 'SUPPLIES', 3000, 'Office and cleaning supplies', '2024-01-20', user_id),
    (franchise3_id, 'MAINTENANCE', 2100, 'Equipment maintenance', '2024-01-25', user_id),
    (franchise3_id, 'MISCELLANEOUS', 1500, 'Other expenses', '2024-01-30', user_id),
    
    (franchise3_id, 'RENT', 18000, 'Monthly rent payment', '2024-02-05', user_id),
    (franchise3_id, 'UTILITIES', 3200, 'Electricity and water bills', '2024-02-10', user_id),
    (franchise3_id, 'MARKETING', 9000, 'Valentine season promotion', '2024-02-15', user_id),
    (franchise3_id, 'SUPPLIES', 4100, 'Office and cleaning supplies', '2024-02-20', user_id),
    (franchise3_id, 'MAINTENANCE', 2000, 'Equipment maintenance', '2024-02-25', user_id),
    (franchise3_id, 'STAFF', 6000, 'Part-time staff wages', '2024-02-28', user_id);

END $$;

-- Create views for easy analytics querying
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

CREATE OR REPLACE VIEW expense_analysis AS
SELECT 
    e.franchise_id,
    f.name as franchise_name,
    DATE_TRUNC('month', e.expense_date) as month,
    e.category_name,
    SUM(e.amount) as total_amount,
    COUNT(*) as transaction_count,
    AVG(e.amount) as avg_amount
FROM expenses e
JOIN franchises f ON e.franchise_id = f.id
GROUP BY e.franchise_id, f.name, DATE_TRUNC('month', e.expense_date), e.category_name
ORDER BY month DESC, f.name, e.category_name;

-- Create function to check if table exists
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

-- Enable RLS on new tables
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view expense categories" ON expense_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage expense categories" ON expense_categories FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('super_admin', 'admin')
    )
);

CREATE POLICY "Users can view expenses for their franchise" ON expenses FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'super_admin' OR users.franchise_id = expenses.franchise_id)
    )
);

CREATE POLICY "Users can manage expenses for their franchise" ON expenses FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'super_admin' OR users.franchise_id = expenses.franchise_id)
    )
);

CREATE POLICY "Users can view analytics for their franchise" ON analytics_summary FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'super_admin' OR users.franchise_id = analytics_summary.franchise_id)
    )
);

CREATE POLICY "Admins can manage analytics" ON analytics_summary FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('super_admin', 'admin')
    )
);

-- Grant permissions
GRANT SELECT ON expense_categories TO authenticated;
GRANT SELECT ON expenses TO authenticated;
GRANT SELECT ON analytics_summary TO authenticated;
GRANT SELECT ON monthly_analytics TO authenticated;
GRANT SELECT ON expense_analysis TO authenticated;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_table_exists(TEXT) TO authenticated;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analytics_summary_updated_at BEFORE UPDATE ON analytics_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
