-- Create comprehensive chat system database schema
-- Chat System Database Schema for Safawala CRM
-- Creates tables for team chat and task management

-- Chat messages table for direct and broadcast messaging
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'task_notification', 'system', 'file')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table for assignment and tracking
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON chat_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set completed_at when task is completed
CREATE OR REPLACE FUNCTION update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_task_completion ON tasks;
CREATE TRIGGER trigger_update_task_completion
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_completed_at();

-- Enable Row Level Security (RLS)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON chat_messages;
CREATE POLICY "Users can view messages they sent or received" ON chat_messages
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        recipient_id = auth.uid() OR 
        recipient_id IS NULL
    );

DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
CREATE POLICY "Users can send messages" ON chat_messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- RLS policies for tasks
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON tasks;
CREATE POLICY "Users can view tasks assigned to them or created by them" ON tasks
    FOR SELECT USING (
        assigned_to = auth.uid() OR 
        assigned_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks" ON tasks
    FOR INSERT WITH CHECK (assigned_by = auth.uid());

DROP POLICY IF EXISTS "Users can update tasks assigned to them or created by them" ON tasks;
CREATE POLICY "Users can update tasks assigned to them or created by them" ON tasks
    FOR UPDATE USING (
        assigned_to = auth.uid() OR 
        assigned_by = auth.uid()
    );

-- Grant necessary permissions
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert sample welcome message
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get first admin user
    SELECT id INTO admin_user_id FROM users 
    WHERE role IN ('super_admin', 'franchise_admin') 
    AND is_active = true 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Insert welcome message
        INSERT INTO chat_messages (sender_id, recipient_id, content, message_type)
        VALUES (admin_user_id, NULL, 'Welcome to the Safawala CRM team chat! 👋 Use this system to communicate with your team and manage tasks efficiently.', 'system')
        ON CONFLICT DO NOTHING;
        
        -- Insert sample task
        INSERT INTO tasks (title, description, assigned_to, assigned_by, priority, due_date)
        SELECT 
            'Complete system setup and training',
            'Familiarize yourself with the CRM system features and complete the initial setup process.',
            u.id,
            admin_user_id,
            'medium',
            NOW() + INTERVAL '7 days'
        FROM users u
        WHERE u.role = 'staff' AND u.is_active = true
        LIMIT 1
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
