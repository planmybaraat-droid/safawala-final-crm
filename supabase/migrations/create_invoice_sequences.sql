-- Create invoice_sequences table
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID NOT NULL UNIQUE,
  prefix TEXT NOT NULL DEFAULT 'ORD',
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_franchise FOREIGN KEY (franchise_id) REFERENCES franchises (id) ON DELETE CASCADE
);

-- Create index on franchise_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_sequences_franchise_id ON invoice_sequences (franchise_id);

-- Add comment
COMMENT ON TABLE invoice_sequences IS 'Stores the last used invoice number per franchise for auto-incrementing invoice numbers';
