-- Disable RLS for chat system to work with mock authentication
-- This allows the chat widget to function with the current user system

-- Disable RLS on chat tables
ALTER TABLE chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can view their own memberships" ON chat_room_members;
DROP POLICY IF EXISTS "Users can join rooms" ON chat_room_members;
DROP POLICY IF EXISTS "Users can view messages in rooms they are members of" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to rooms they are members of" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks assigned to them or created by them" ON tasks;

-- Ensure tables exist and have proper structure
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    room_type VARCHAR(50) DEFAULT 'public',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID,
    reply_to_id UUID REFERENCES chat_messages(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    attachment_url TEXT,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    read_by JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID,
    created_by UUID,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create default rooms if they don't exist
INSERT INTO chat_rooms (id, name, description, room_type, created_by)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'General', 'General discussion for all users', 'public', NULL),
    ('00000000-0000-0000-0000-000000000002', 'Staff Only', 'Private room for staff members', 'private', NULL),
    ('00000000-0000-0000-0000-000000000003', 'Franchise Owners', 'Private room for franchise owners', 'private', NULL),
    ('00000000-0000-0000-0000-000000000004', 'Managers', 'Private room for managers', 'private', NULL)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions to authenticated users
GRANT ALL ON chat_rooms TO authenticated;
GRANT ALL ON chat_room_members TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON tasks TO authenticated;

-- Grant permissions to anon users (for mock auth system)
GRANT ALL ON chat_rooms TO anon;
GRANT ALL ON chat_room_members TO anon;
GRANT ALL ON chat_messages TO anon;
GRANT ALL ON tasks TO anon;

SELECT 'Chat RLS disabled successfully. Chat system should now work with mock authentication.' as result;
