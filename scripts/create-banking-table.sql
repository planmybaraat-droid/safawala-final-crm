-- Essential banking_details table for immediate testing
CREATE TABLE IF NOT EXISTS banking_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID,
  bank_name VARCHAR(100) NOT NULL,
  account_holder_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  branch_name VARCHAR(100),
  account_type VARCHAR(20) DEFAULT 'Current',
  is_primary BOOLEAN DEFAULT FALSE,
  show_on_invoice BOOLEAN DEFAULT TRUE,
  upi_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_banking_details_franchise_id ON banking_details(franchise_id);
CREATE INDEX IF NOT EXISTS idx_banking_details_primary ON banking_details(is_primary);

-- Set up RLS policies
ALTER TABLE banking_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view their banking details" ON banking_details FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can manage their banking details" ON banking_details FOR ALL USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger
DROP TRIGGER IF EXISTS update_banking_details_updated_at ON banking_details;
CREATE TRIGGER update_banking_details_updated_at 
  BEFORE UPDATE ON banking_details 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();