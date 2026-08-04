-- Create banks table without account_type field
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001', -- reference to tenant/company
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  account_number TEXT NOT NULL, -- store as string
  ifsc_code VARCHAR(11) NOT NULL,
  branch_name TEXT,
  upi_id TEXT,
  qr_file_path TEXT, -- storage path / public url
  is_primary BOOLEAN DEFAULT false,
  show_on_invoices BOOLEAN DEFAULT false,
  show_on_quotes BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints (removed account_type)
  CONSTRAINT valid_account_number CHECK (LENGTH(account_number) BETWEEN 8 AND 24),
  CONSTRAINT valid_ifsc_code CHECK (ifsc_code ~ '^[A-Z][A-Z][A-Z][A-Z]0[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]$'),
  CONSTRAINT valid_upi_id CHECK (upi_id IS NULL OR upi_id ~ '^[a-zA-Z0-9._-]+@[a-zA-Z]+$'),
  CONSTRAINT valid_bank_name CHECK (LENGTH(bank_name) BETWEEN 2 AND 100),
  CONSTRAINT valid_account_holder CHECK (LENGTH(account_holder) BETWEEN 2 AND 100)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_banks_org_id ON banks(org_id);
CREATE INDEX IF NOT EXISTS idx_banks_primary ON banks(org_id, is_primary) WHERE is_primary = true;

-- Trigger to ensure only one primary bank per organization
CREATE OR REPLACE FUNCTION enforce_single_primary_bank()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Set all other banks for this org to non-primary
    UPDATE banks 
    SET is_primary = false 
    WHERE org_id = NEW.org_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for primary bank enforcement
DROP TRIGGER IF EXISTS enforce_primary_bank_trigger ON banks;
CREATE TRIGGER enforce_primary_bank_trigger
  BEFORE INSERT OR UPDATE ON banks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_bank();

-- Auto-update timestamp on updates
CREATE OR REPLACE FUNCTION update_banks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_banks_timestamp ON banks;
CREATE TRIGGER update_banks_timestamp
  BEFORE UPDATE ON banks
  FOR EACH ROW
  EXECUTE FUNCTION update_banks_updated_at();

-- Enable Row Level Security
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (if needed for multi-tenant)
CREATE POLICY banks_access_policy ON banks
  USING (org_id = current_setting('app.current_org_id', true)::UUID);

-- Grant permissions
GRANT ALL ON banks TO authenticated;
GRANT ALL ON banks TO service_role; 