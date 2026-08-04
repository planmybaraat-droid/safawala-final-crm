-- Create integration_logs table for tracking sync activities
CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_name ON integration_logs(integration_name);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at);

-- Add RLS policy
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view integration logs" ON integration_logs
    FOR SELECT USING (true);

CREATE POLICY "Users can insert integration logs" ON integration_logs
    FOR INSERT WITH CHECK (true);
