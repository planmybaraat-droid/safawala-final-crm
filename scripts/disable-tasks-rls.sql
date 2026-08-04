-- Disable RLS for tasks table to allow task creation
-- This script removes RLS restrictions that are preventing task creation

-- Disable RLS on tasks table
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated and anonymous users
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON tasks TO anon;

-- Grant usage on the tasks sequence if it exists
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Create a simple policy that allows all operations (for development)
-- This can be refined later with proper role-based access control
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- Re-enable RLS with the permissive policy
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Ensure the table exists and has proper structure
DO $$
BEGIN
    -- Check if tasks table exists, if not create it
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
        CREATE TABLE tasks (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            assigned_to UUID REFERENCES users(id),
            assigned_by UUID REFERENCES users(id),
            franchise_id UUID REFERENCES franchises(id),
            due_date TIMESTAMP WITH TIME ZONE,
            priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes for better performance
        CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
        CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
        CREATE INDEX idx_tasks_franchise_id ON tasks(franchise_id);
        CREATE INDEX idx_tasks_status ON tasks(status);
        CREATE INDEX idx_tasks_due_date ON tasks(due_date);
        
        -- Create updated_at trigger
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert some sample data for testing (optional)
INSERT INTO tasks (title, description, assigned_by, priority, status) 
VALUES 
    ('Sample Task', 'This is a sample task for testing', 
     (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1), 
     'medium', 'pending')
ON CONFLICT DO NOTHING;
