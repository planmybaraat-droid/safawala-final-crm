-- Banking System Database Schema (Simplified Version)
-- Creates banks table with basic constraints (no regex)

-- Create banks table
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code VARCHAR(11) NOT NULL,
  branch_name TEXT,
  upi_id TEXT,
  qr_file_path TEXT,
  account_type TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  show_on_invoices BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Basic constraints (no regex)
  CONSTRAINT valid_account_type CHECK (account_type IN ('Current', 'Savings', 'Salary', 'Fixed Deposit', 'NRI', 'Other')),
  CONSTRAINT valid_account_number CHECK (LENGTH(account_number) BETWEEN 8 AND 24),
  CONSTRAINT valid_ifsc_code CHECK (LENGTH(ifsc_code) = 11),
  CONSTRAINT valid_bank_name CHECK (LENGTH(bank_name) BETWEEN 2 AND 100),
  CONSTRAINT valid_account_holder CHECK (LENGTH(account_holder) BETWEEN 2 AND 100)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_banks_org_id ON banks (org_id);
CREATE INDEX IF NOT EXISTS idx_banks_is_primary ON banks (org_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_banks_created_at ON banks (created_at);

-- RLS policies
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY banks_org_isolation ON banks
  FOR ALL
  USING (org_id = '00000000-0000-0000-0000-000000000001');

-- Primary account enforcement function
CREATE OR REPLACE FUNCTION ensure_single_primary_bank()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE banks 
    SET is_primary = false, updated_at = NOW()
    WHERE org_id = NEW.org_id 
    AND id != NEW.id 
    AND is_primary = true;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_ensure_single_primary_bank ON banks;
CREATE TRIGGER trigger_ensure_single_primary_bank
  BEFORE INSERT OR UPDATE ON banks
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_bank();

-- Insert sample data
INSERT INTO banks (
  bank_name, 
  account_holder, 
  account_number, 
  ifsc_code, 
  branch_name, 
  upi_id, 
  account_type, 
  is_primary, 
  show_on_invoices
) VALUES 
(
  'HDFC Bank',
  'Safawala Rental Services',
  '123456789012',
  'HDFC0001234',
  'Mumbai Main Branch',
  'safawala@hdfc',
  'Current',
  true,
  true
),
(
  'State Bank of India',
  'Safawala Rental Services',
  '987654321098',
  'SBIN0000123',
  'Delhi Branch',
  'safawala@sbi',
  'Savings',
  false,
  false
) ON CONFLICT DO NOTHING;