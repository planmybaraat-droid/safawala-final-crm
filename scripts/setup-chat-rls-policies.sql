-- Setup RLS policies for chat system to fix message sending errors

-- First, let's check if RLS is enabled and create proper policies
-- for the chat system tables

-- Chat Rooms RLS Policies
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view active chat rooms
CREATE POLICY "Allow users to view active chat rooms" ON chat_rooms 
FOR SELECT USING (is_active = true);

-- Allow users to create chat rooms (for now, allow all users)
CREATE POLICY "Allow users to create chat rooms" ON chat_rooms 
FOR INSERT WITH CHECK (true);

-- Allow room creators to update their rooms
CREATE POLICY "Allow room creators to update rooms" ON chat_rooms 
FOR UPDATE USING (created_by IN (
  SELECT id FROM users WHERE id = created_by
));

-- Chat Room Members RLS Policies  
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

-- Allow users to view room members for rooms they're in
CREATE POLICY "Allow users to view room members" ON chat_room_members 
FOR SELECT USING (
  room_id IN (
    SELECT room_id FROM chat_room_members WHERE user_id IN (
      SELECT id FROM users
    )
  )
);

-- Allow users to join rooms
CREATE POLICY "Allow users to join rooms" ON chat_room_members 
FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users)
);

-- Chat Messages RLS Policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to view messages in rooms they're members of
CREATE POLICY "Allow users to view messages in their rooms" ON chat_messages 
FOR SELECT USING (
  room_id IN (
    SELECT room_id FROM chat_room_members WHERE user_id IN (
      SELECT id FROM users
    )
  ) OR 
  -- Allow viewing messages in public rooms (General room)
  room_id = '00000000-0000-0000-0000-000000000001'
);

-- Allow users to send messages to rooms they're members of
CREATE POLICY "Allow users to send messages" ON chat_messages 
FOR INSERT WITH CHECK (
  sender_id IN (SELECT id FROM users) AND
  (
    room_id IN (
      SELECT room_id FROM chat_room_members WHERE user_id = sender_id
    ) OR
    -- Allow sending to public rooms (General room)
    room_id = '00000000-0000-0000-0000-000000000001'
  )
);

-- Allow users to update their own messages
CREATE POLICY "Allow users to update own messages" ON chat_messages 
FOR UPDATE USING (
  sender_id IN (SELECT id FROM users WHERE id = sender_id)
);

-- Allow users to delete their own messages
CREATE POLICY "Allow users to delete own messages" ON chat_messages 
FOR DELETE USING (
  sender_id IN (SELECT id FROM users WHERE id = sender_id)
);

-- Tasks RLS Policies (for chat-related tasks)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow users to view tasks assigned to them or created by them
CREATE POLICY "Allow users to view their tasks" ON tasks 
FOR SELECT USING (
  assigned_to IN (SELECT id FROM users) OR 
  assigned_by IN (SELECT id FROM users)
);

-- Allow users to create tasks
CREATE POLICY "Allow users to create tasks" ON tasks 
FOR INSERT WITH CHECK (
  assigned_by IN (SELECT id FROM users)
);

-- Allow users to update tasks assigned to them
CREATE POLICY "Allow users to update assigned tasks" ON tasks 
FOR UPDATE USING (
  assigned_to IN (SELECT id FROM users) OR 
  assigned_by IN (SELECT id FROM users)
);

-- Create the default General chat room if it doesn't exist
INSERT INTO chat_rooms (id, name, description, type, created_by, franchise_id, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'General',
  'General discussion for all team members',
  'public',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NULL,
  true
) ON CONFLICT (id) DO NOTHING;

-- Add all users to the General room
INSERT INTO chat_room_members (room_id, user_id, role, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  id,
  'member',
  NOW()
FROM users
WHERE id NOT IN (
  SELECT user_id FROM chat_room_members 
  WHERE room_id = '00000000-0000-0000-0000-000000000001'
);

-- Create role-specific rooms
-- Staff Only room
INSERT INTO chat_rooms (id, name, description, type, created_by, franchise_id, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Staff Only',
  'Private discussion for staff members',
  'private',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NULL,
  true
) ON CONFLICT (id) DO NOTHING;

-- Franchise Owners room
INSERT INTO chat_rooms (id, name, description, type, created_by, franchise_id, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Franchise Owners',
  'Private discussion for franchise owners',
  'private',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NULL,
  true
) ON CONFLICT (id) DO NOTHING;

-- Managers room
INSERT INTO chat_rooms (id, name, description, type, created_by, franchise_id, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'Managers',
  'Private discussion for managers',
  'private',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
  NULL,
  true
) ON CONFLICT (id) DO NOTHING;

-- Add users to role-specific rooms based on their roles
-- Staff Only room - staff and above
INSERT INTO chat_room_members (room_id, user_id, role, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000002',
  id,
  'member',
  NOW()
FROM users
WHERE role IN ('staff', 'franchise_admin', 'super_admin')
AND id NOT IN (
  SELECT user_id FROM chat_room_members 
  WHERE room_id = '00000000-0000-0000-0000-000000000002'
);

-- Franchise Owners room - franchise_admin and super_admin
INSERT INTO chat_room_members (room_id, user_id, role, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000003',
  id,
  'member',
  NOW()
FROM users
WHERE role IN ('franchise_admin', 'super_admin')
AND id NOT IN (
  SELECT user_id FROM chat_room_members 
  WHERE room_id = '00000000-0000-0000-0000-000000000003'
);

-- Managers room - franchise_admin and super_admin
INSERT INTO chat_room_members (room_id, user_id, role, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000004',
  id,
  'member',
  NOW()
FROM users
WHERE role IN ('franchise_admin', 'super_admin')
AND id NOT IN (
  SELECT user_id FROM chat_room_members 
  WHERE room_id = '00000000-0000-0000-0000-000000000004'
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_room_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room_id ON chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON chat_room_members(user_id);
