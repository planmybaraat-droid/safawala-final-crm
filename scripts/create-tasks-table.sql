-- Create tasks table for task management system
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_franchise_id ON tasks(franchise_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample tasks for demonstration
INSERT INTO tasks (title, description, assigned_to, assigned_by, due_date, priority, status) 
SELECT 
  'Sample Task: ' || (CASE WHEN random() < 0.3 THEN 'Prepare wedding decorations' 
                           WHEN random() < 0.6 THEN 'Contact customer for booking confirmation'
                           ELSE 'Update inventory records' END),
  'This is a sample task description. Please complete this task by the due date.',
  u1.id,
  u2.id,
  NOW() + INTERVAL '1 day' + (random() * INTERVAL '7 days'),
  (CASE WHEN random() < 0.3 THEN 'high' 
        WHEN random() < 0.6 THEN 'medium' 
        ELSE 'low' END)::VARCHAR,
  'pending'
FROM users u1 
CROSS JOIN users u2 
WHERE u1.role = 'staff' 
  AND u2.role IN ('super_admin', 'franchise_admin')
  AND u1.id != u2.id
LIMIT 5
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON tasks TO anon;
