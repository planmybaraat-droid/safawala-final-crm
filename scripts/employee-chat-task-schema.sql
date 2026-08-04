-- Employee Chat and Task Management System
-- Updated to work with existing CRM users table instead of separate employees table

-- Chat rooms for group conversations
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) DEFAULT 'group' CHECK (type IN ('direct', 'group', 'broadcast')),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat room participants
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT false,
  UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'task', 'file', 'image', 'system')),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  file_url TEXT,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table for assignment and tracking
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  reminder_interval INTEGER DEFAULT 20, -- minutes
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task comments for updates and communication
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task reminders log
CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reminder_type VARCHAR(20) DEFAULT 'pending' CHECK (reminder_type IN ('pending', 'overdue', 'completed'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Enable RLS (Row Level Security)
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Updated RLS policies to work with existing users table
CREATE POLICY "Users can view chat rooms they participate in" ON chat_rooms FOR SELECT 
USING (id IN (SELECT room_id FROM chat_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can view messages in their chat rooms" ON chat_messages FOR SELECT 
USING (room_id IN (SELECT room_id FROM chat_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can send messages to their chat rooms" ON chat_messages FOR INSERT 
WITH CHECK (room_id IN (SELECT room_id FROM chat_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users can view tasks assigned to them or created by them" ON tasks FOR SELECT 
USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Users can create tasks" ON tasks FOR INSERT WITH CHECK (assigned_by = auth.uid());
CREATE POLICY "Users can update tasks assigned to them" ON tasks FOR UPDATE 
USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_update_task_completion
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_completed_at();

-- Create a general chat room for all users
INSERT INTO chat_rooms (name, type, created_by) 
VALUES ('General Chat', 'group', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Add all active users to general chat
INSERT INTO chat_participants (room_id, user_id)
SELECT 
  (SELECT id FROM chat_rooms WHERE name = 'General Chat' LIMIT 1),
  id
FROM users
WHERE is_active = true
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Sample tasks using existing user roles
INSERT INTO tasks (title, description, assigned_to, assigned_by, priority, due_date)
SELECT 
  'Complete monthly inventory review',
  'Review and update all inventory items for accuracy and stock levels',
  u.id,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  'high',
  NOW() + INTERVAL '3 days'
FROM users u
WHERE u.role = 'staff' AND u.is_active = true
LIMIT 1;

INSERT INTO tasks (title, description, assigned_to, assigned_by, priority, due_date)
SELECT 
  'Prepare franchise performance report',
  'Compile performance data and create comprehensive franchise report',
  u.id,
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  'medium',
  NOW() + INTERVAL '7 days'
FROM users u
WHERE u.role = 'franchise_admin' AND u.is_active = true
LIMIT 1;
