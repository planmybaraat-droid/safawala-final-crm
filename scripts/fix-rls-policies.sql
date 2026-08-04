-- Disable RLS for testing (enable later for production)
ALTER TABLE franchises DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON franchises TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON booking_items TO authenticated;
GRANT ALL ON payments TO authenticated;
GRANT ALL ON expenses TO authenticated;

-- Grant permissions to anon users (for testing)
GRANT SELECT, INSERT, UPDATE, DELETE ON franchises TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON booking_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO anon;
