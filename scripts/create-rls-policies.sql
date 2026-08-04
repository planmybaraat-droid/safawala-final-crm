-- Create RLS policies for production use (run this after demo testing)

-- Policies for franchises table
CREATE POLICY "Super admins can view all franchises" ON franchises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Franchise admins can view their franchise" ON franchises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.franchise_id = franchises.id
        )
    );

-- Policies for users table
CREATE POLICY "Users can view their own record" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Super admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.role = 'super_admin'
        )
    );

-- Policies for products table
CREATE POLICY "Users can view products from their franchise" ON products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'super_admin' OR users.franchise_id = products.franchise_id)
        )
    );

-- Policies for bookings table
CREATE POLICY "Users can view bookings from their franchise" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'super_admin' OR users.franchise_id = bookings.franchise_id)
        )
    );

-- Add similar policies for other tables as needed
-- For now, we'll keep RLS disabled for demo purposes
