-- Chat System Database Schema
-- Creates tables for employee chat and task management system

-- Chat rooms for organizing conversations
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'group' CHECK (type IN ('direct', 'group', 'announcement')),
    description TEXT,
    created_by UUID REFERENCES users(id),
    franchise_id UUID REFERENCES franchises(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'task', 'system')),
    content TEXT NOT NULL,
    attachment_url TEXT,
    reply_to_id UUID REFERENCES chat_messages(id),
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table for task assignment
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    franchise_id UUID REFERENCES franchises(id),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    chat_message_id UUID REFERENCES chat_messages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task reminders for 20-minute alerts
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat room members
CREATE TABLE IF NOT EXISTS chat_room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_muted BOOLEAN DEFAULT false,
    UNIQUE(room_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_reminders_reminder_time ON task_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON chat_room_members(user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default chat rooms for a franchise
CREATE OR REPLACE FUNCTION create_default_chat_rooms(franchise_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Create general chat room
    INSERT INTO chat_rooms (name, type, description, franchise_id)
    VALUES ('General Chat', 'group', 'General discussion for all team members', franchise_uuid);
    
    -- Create announcements room
    INSERT INTO chat_rooms (name, type, description, franchise_id)
    VALUES ('Announcements', 'announcement', 'Important announcements and updates', franchise_uuid);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create task reminders
CREATE OR REPLACE FUNCTION create_task_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Create reminders every 20 minutes for pending tasks
    IF NEW.status = 'pending' AND NEW.due_date IS NOT NULL THEN
        INSERT INTO task_reminders (task_id, user_id, reminder_time)
        VALUES (NEW.id, NEW.assigned_to, NOW() + INTERVAL '20 minutes');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_task_reminders_trigger
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION create_task_reminders();

-- Row Level Security (RLS) policies
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_rooms
CREATE POLICY "Users can view chat rooms in their franchise" ON chat_rooms
    FOR SELECT USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create chat rooms in their franchise" ON chat_rooms
    FOR INSERT WITH CHECK (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

-- RLS policies for chat_messages
CREATE POLICY "Users can view messages in their franchise chat rooms" ON chat_messages
    FOR SELECT USING (
        room_id IN (
            SELECT cr.id FROM chat_rooms cr
            JOIN users u ON u.franchise_id = cr.franchise_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages in their franchise chat rooms" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        room_id IN (
            SELECT cr.id FROM chat_rooms cr
            JOIN users u ON u.franchise_id = cr.franchise_id
            WHERE u.id = auth.uid()
        )
    );

-- RLS policies for tasks
CREATE POLICY "Users can view tasks in their franchise" ON tasks
    FOR SELECT USING (
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        ) OR assigned_to = auth.uid()
    );

CREATE POLICY "Users can create tasks in their franchise" ON tasks
    FOR INSERT WITH CHECK (
        assigned_by = auth.uid() AND
        franchise_id IN (
            SELECT franchise_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their assigned tasks" ON tasks
    FOR UPDATE USING (
        assigned_to = auth.uid() OR assigned_by = auth.uid()
    );

-- Sample data for testing
DO $$
DECLARE
    franchise_uuid UUID;
    general_room_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get first franchise for sample data
    SELECT id INTO franchise_uuid FROM franchises LIMIT 1;
    
    IF franchise_uuid IS NOT NULL THEN
        -- Create default chat rooms
        PERFORM create_default_chat_rooms(franchise_uuid);
        
        -- Get the general room ID
        SELECT id INTO general_room_id FROM chat_rooms 
        WHERE name = 'General Chat' AND franchise_id = franchise_uuid LIMIT 1;
        
        -- Get an admin user
        SELECT id INTO admin_user_id FROM users 
        WHERE franchise_id = franchise_uuid AND role IN ('super_admin', 'franchise_admin') LIMIT 1;
        
        IF general_room_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
            -- Add admin to general room
            INSERT INTO chat_room_members (room_id, user_id, role)
            VALUES (general_room_id, admin_user_id, 'admin')
            ON CONFLICT (room_id, user_id) DO NOTHING;
            
            -- Add a welcome message
            INSERT INTO chat_messages (room_id, sender_id, content, message_type)
            VALUES (general_room_id, admin_user_id, 'Welcome to the team chat! 👋', 'text');
        END IF;
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON chat_rooms TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON task_reminders TO authenticated;
GRANT ALL ON chat_room_members TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
