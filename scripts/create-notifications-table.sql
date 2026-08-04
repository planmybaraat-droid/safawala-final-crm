-- Create notifications table for real-time notification system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'general',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_franchise_id ON notifications(franchise_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Insert sample notifications
INSERT INTO notifications (type, title, message, priority, action_url, read) VALUES
('booking', 'New Booking Created', 'Wedding booking for John & Jane on Dec 25, 2024 - ₹1,50,000', 'high', '/bookings', false),
('payment', 'Payment Received', '₹50,000 advance payment received for booking #BK001', 'medium', '/bookings', false),
('inventory', 'Low Stock Alert', 'Wedding decorations stock is running low (5 items remaining)', 'high', '/inventory', false),
('quote', 'Quote Accepted', 'Quote #QT005 has been accepted by customer Sarah Wilson', 'medium', '/quotes', false),
('customer', 'New Customer Registered', 'Sarah Wilson has registered as a new customer', 'low', '/customers', true),
('vendor', 'Vendor Payment Due', 'Payment of ₹25,000 due to ABC Decorators', 'high', '/vendors', false),
('expense', 'Expense Approval Required', 'Office supplies expense of ₹5,000 requires approval', 'medium', '/expenses', true),
('booking', 'Booking Confirmed', 'Birthday party booking #BK003 has been confirmed', 'low', '/bookings', true),
('inventory', 'Stock Replenished', 'Sound system inventory has been restocked (20 new items)', 'low', '/inventory', true),
('payment', 'Payment Overdue', 'Payment of ₹75,000 is overdue for booking #BK002', 'high', '/bookings', false);

-- Disable RLS for now to work with current auth system
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;

COMMENT ON TABLE notifications IS 'System notifications for users about bookings, payments, inventory, and other business activities';
