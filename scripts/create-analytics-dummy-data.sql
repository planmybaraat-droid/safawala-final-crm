-- Create analytics_summary table with comprehensive dummy data
DROP TABLE IF EXISTS analytics_summary CASCADE;
CREATE TABLE analytics_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID NOT NULL,
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

-- Create expenses table with detailed dummy data
DROP TABLE IF EXISTS expenses CASCADE;
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_analytics_summary_date ON analytics_summary(date);
CREATE INDEX idx_analytics_summary_franchise ON analytics_summary(franchise_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_franchise ON expenses(franchise_id);
CREATE INDEX idx_expenses_category ON expenses(category_name);

-- Get the first franchise ID for dummy data
DO $$
DECLARE
    franchise_uuid UUID;
BEGIN
    -- Get the first franchise ID, or create a default one if none exists
    SELECT id INTO franchise_uuid FROM franchises LIMIT 1;
    
    IF franchise_uuid IS NULL THEN
        INSERT INTO franchises (id, name, address, phone, email, is_active, created_at)
        VALUES (gen_random_uuid(), 'Main Branch', '123 Business Street', '+91-9876543210', 'main@safawala.com', true, NOW())
        RETURNING id INTO franchise_uuid;
    END IF;

    -- Insert 12 months of analytics data
    INSERT INTO analytics_summary (franchise_id, date, total_revenue, total_expenses, total_bookings, total_customers, rental_revenue, sales_revenue) VALUES
    (franchise_uuid, '2024-01-01', 145000, 52000, 15, 15, 110000, 35000),
    (franchise_uuid, '2024-02-01', 165000, 58000, 18, 22, 125000, 40000),
    (franchise_uuid, '2024-03-01', 185000, 62000, 22, 28, 140000, 45000),
    (franchise_uuid, '2024-04-01', 205000, 68000, 25, 35, 155000, 50000),
    (franchise_uuid, '2024-05-01', 225000, 72000, 28, 42, 170000, 55000),
    (franchise_uuid, '2024-06-01', 285000, 85000, 35, 48, 215000, 70000),
    (franchise_uuid, '2024-07-01', 315000, 92000, 42, 52, 240000, 75000),
    (franchise_uuid, '2024-08-01', 345000, 98000, 45, 55, 260000, 85000),
    (franchise_uuid, '2024-09-01', 375000, 105000, 48, 58, 285000, 90000),
    (franchise_uuid, '2024-10-01', 395000, 110000, 52, 60, 300000, 95000),
    (franchise_uuid, '2024-11-01', 415000, 115000, 55, 62, 315000, 100000),
    (franchise_uuid, '2024-12-01', 425000, 120000, 58, 65, 320000, 105000);

    -- Insert detailed expense data across different categories and months
    INSERT INTO expenses (franchise_id, category_name, amount, description, expense_date) VALUES
    -- January 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-01-01'),
    (franchise_uuid, 'UTILITIES', 4500, 'Electricity and water bills', '2024-01-05'),
    (franchise_uuid, 'STAFF', 12000, 'Staff salaries', '2024-01-01'),
    (franchise_uuid, 'MARKETING', 8000, 'Social media advertising', '2024-01-10'),
    (franchise_uuid, 'SUPPLIES', 3500, 'Office supplies and materials', '2024-01-15'),
    (franchise_uuid, 'TRANSPORT', 4000, 'Delivery and transport costs', '2024-01-20'),
    (franchise_uuid, 'MAINTENANCE', 5000, 'Equipment maintenance', '2024-01-25'),
    
    -- February 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-02-01'),
    (franchise_uuid, 'UTILITIES', 4800, 'Electricity and water bills', '2024-02-05'),
    (franchise_uuid, 'STAFF', 13000, 'Staff salaries', '2024-02-01'),
    (franchise_uuid, 'MARKETING', 9000, 'Print and digital marketing', '2024-02-10'),
    (franchise_uuid, 'SUPPLIES', 4000, 'Inventory supplies', '2024-02-15'),
    (franchise_uuid, 'TRANSPORT', 4500, 'Delivery costs', '2024-02-20'),
    (franchise_uuid, 'MAINTENANCE', 7700, 'Store renovation', '2024-02-25'),
    
    -- March 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-03-01'),
    (franchise_uuid, 'UTILITIES', 5000, 'Electricity and water bills', '2024-03-05'),
    (franchise_uuid, 'STAFF', 14000, 'Staff salaries and bonus', '2024-03-01'),
    (franchise_uuid, 'MARKETING', 10000, 'Wedding season marketing', '2024-03-10'),
    (franchise_uuid, 'SUPPLIES', 4500, 'New inventory purchase', '2024-03-15'),
    (franchise_uuid, 'TRANSPORT', 5000, 'Increased delivery volume', '2024-03-20'),
    (franchise_uuid, 'MAINTENANCE', 8500, 'Equipment upgrades', '2024-03-25'),
    
    -- April 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-04-01'),
    (franchise_uuid, 'UTILITIES', 5200, 'Electricity and water bills', '2024-04-05'),
    (franchise_uuid, 'STAFF', 15000, 'Staff salaries', '2024-04-01'),
    (franchise_uuid, 'MARKETING', 11000, 'Spring wedding campaigns', '2024-04-10'),
    (franchise_uuid, 'SUPPLIES', 5000, 'Premium inventory items', '2024-04-15'),
    (franchise_uuid, 'TRANSPORT', 5500, 'Extended delivery areas', '2024-04-20'),
    (franchise_uuid, 'MAINTENANCE', 6300, 'Regular maintenance', '2024-04-25'),
    
    -- May 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-05-01'),
    (franchise_uuid, 'UTILITIES', 5500, 'Electricity and water bills', '2024-05-05'),
    (franchise_uuid, 'STAFF', 16000, 'Staff salaries and incentives', '2024-05-01'),
    (franchise_uuid, 'MARKETING', 12000, 'Peak season advertising', '2024-05-10'),
    (franchise_uuid, 'SUPPLIES', 5500, 'High-demand items', '2024-05-15'),
    (franchise_uuid, 'TRANSPORT', 6000, 'Premium delivery service', '2024-05-20'),
    (franchise_uuid, 'MAINTENANCE', 7000, 'Facility improvements', '2024-05-25'),
    
    -- June 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-06-01'),
    (franchise_uuid, 'UTILITIES', 6000, 'Summer electricity costs', '2024-06-05'),
    (franchise_uuid, 'STAFF', 18000, 'Peak season staff costs', '2024-06-01'),
    (franchise_uuid, 'MARKETING', 15000, 'Wedding season peak marketing', '2024-06-10'),
    (franchise_uuid, 'SUPPLIES', 7000, 'Bulk inventory purchase', '2024-06-15'),
    (franchise_uuid, 'TRANSPORT', 8000, 'High-volume deliveries', '2024-06-20'),
    (franchise_uuid, 'MAINTENANCE', 16000, 'Major equipment overhaul', '2024-06-25'),
    
    -- July 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-07-01'),
    (franchise_uuid, 'UTILITIES', 6500, 'Peak summer costs', '2024-07-05'),
    (franchise_uuid, 'STAFF', 19000, 'Peak season operations', '2024-07-01'),
    (franchise_uuid, 'MARKETING', 16000, 'Monsoon wedding campaigns', '2024-07-10'),
    (franchise_uuid, 'SUPPLIES', 7500, 'Premium collection items', '2024-07-15'),
    (franchise_uuid, 'TRANSPORT', 8500, 'Weather-protected deliveries', '2024-07-20'),
    (franchise_uuid, 'MAINTENANCE', 19500, 'Monsoon-proofing facilities', '2024-07-25'),
    
    -- August 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-08-01'),
    (franchise_uuid, 'UTILITIES', 6800, 'Continued high usage', '2024-08-05'),
    (franchise_uuid, 'STAFF', 20000, 'Festival season preparation', '2024-08-01'),
    (franchise_uuid, 'MARKETING', 17000, 'Festival marketing campaigns', '2024-08-10'),
    (franchise_uuid, 'SUPPLIES', 8000, 'Festival collection inventory', '2024-08-15'),
    (franchise_uuid, 'TRANSPORT', 9000, 'Increased delivery demand', '2024-08-20'),
    (franchise_uuid, 'MAINTENANCE', 22200, 'Pre-festival facility upgrades', '2024-08-25'),
    
    -- September 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-09-01'),
    (franchise_uuid, 'UTILITIES', 7000, 'Festival season power usage', '2024-09-05'),
    (franchise_uuid, 'STAFF', 21000, 'Festival season peak staff', '2024-09-01'),
    (franchise_uuid, 'MARKETING', 18000, 'Ganesh Chaturthi campaigns', '2024-09-10'),
    (franchise_uuid, 'SUPPLIES', 8500, 'Festival special items', '2024-09-15'),
    (franchise_uuid, 'TRANSPORT', 9500, 'Festival rush deliveries', '2024-09-20'),
    (franchise_uuid, 'MAINTENANCE', 26000, 'Equipment capacity expansion', '2024-09-25'),
    
    -- October 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-10-01'),
    (franchise_uuid, 'UTILITIES', 7200, 'Diwali season preparation', '2024-10-05'),
    (franchise_uuid, 'STAFF', 22000, 'Diwali season staffing', '2024-10-01'),
    (franchise_uuid, 'MARKETING', 19000, 'Diwali marketing blitz', '2024-10-10'),
    (franchise_uuid, 'SUPPLIES', 9000, 'Diwali collection items', '2024-10-15'),
    (franchise_uuid, 'TRANSPORT', 10000, 'Peak delivery operations', '2024-10-20'),
    (franchise_uuid, 'MAINTENANCE', 27800, 'Facility optimization', '2024-10-25'),
    
    -- November 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-11-01'),
    (franchise_uuid, 'UTILITIES', 7500, 'Winter season costs', '2024-11-05'),
    (franchise_uuid, 'STAFF', 23000, 'Wedding season peak', '2024-11-01'),
    (franchise_uuid, 'MARKETING', 20000, 'Winter wedding campaigns', '2024-11-10'),
    (franchise_uuid, 'SUPPLIES', 9500, 'Winter wedding collection', '2024-11-15'),
    (franchise_uuid, 'TRANSPORT', 10500, 'Premium winter deliveries', '2024-11-20'),
    (franchise_uuid, 'MAINTENANCE', 30000, 'Year-end facility upgrades', '2024-11-25'),
    
    -- December 2024
    (franchise_uuid, 'RENT', 15000, 'Monthly office rent', '2024-12-01'),
    (franchise_uuid, 'UTILITIES', 8000, 'Year-end high usage', '2024-12-05'),
    (franchise_uuid, 'STAFF', 24000, 'Year-end bonuses and salaries', '2024-12-01'),
    (franchise_uuid, 'MARKETING', 21000, 'New Year and winter campaigns', '2024-12-10'),
    (franchise_uuid, 'SUPPLIES', 10000, 'Year-end inventory restocking', '2024-12-15'),
    (franchise_uuid, 'TRANSPORT', 11000, 'Holiday season deliveries', '2024-12-20'),
    (franchise_uuid, 'MAINTENANCE', 31000, 'Annual maintenance and upgrades', '2024-12-25');

END $$;

-- Verify data insertion
SELECT 
    'Analytics Summary' as table_name,
    COUNT(*) as record_count,
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    SUM(total_revenue) as total_revenue,
    SUM(total_expenses) as total_expenses
FROM analytics_summary
UNION ALL
SELECT 
    'Expenses' as table_name,
    COUNT(*) as record_count,
    MIN(expense_date) as earliest_date,
    MAX(expense_date) as latest_date,
    SUM(amount) as total_amount,
    0 as placeholder
FROM expenses;

-- Show sample data
SELECT 'Recent Analytics Data:' as info;
SELECT date, total_revenue, total_expenses, total_bookings, total_customers 
FROM analytics_summary 
ORDER BY date DESC 
LIMIT 5;

SELECT 'Expense Categories Summary:' as info;
SELECT 
    category_name,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
FROM expenses 
GROUP BY category_name 
ORDER BY total_amount DESC;
