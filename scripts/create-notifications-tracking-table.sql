-- Create notifications tracking table for WATI message logging
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  recipient VARCHAR(20) NOT NULL,
  template_name VARCHAR(100),
  data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Insert sample notification types for reference
INSERT INTO notifications (type, recipient, template_name, data, status, sent_at) VALUES
('booking_created', '919725295692', 'booking_confirmation', '{"booking_id": "DEMO001", "customer_name": "Demo Customer"}', 'sent', NOW()),
('task_assigned', '919725295692', 'task_assignment', '{"task_title": "Demo Task", "assignee_name": "Demo Staff"}', 'sent', NOW()),
('payment_received', '919725295692', 'payment_confirmation', '{"amount": 5000, "booking_id": "DEMO001"}', 'sent', NOW())
ON CONFLICT DO NOTHING;

-- Enable RLS (but create permissive policy for now)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (can be restricted later)
CREATE POLICY "Allow all operations on notifications" ON notifications
FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE notifications IS 'Tracks all WhatsApp notifications sent via WATI integration';
