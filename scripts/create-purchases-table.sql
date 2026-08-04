-- Create purchases table with correct schema
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_contact VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_items table for detailed line items
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchases_franchise_id ON purchases(franchise_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);

-- Insert some sample data
INSERT INTO purchases (franchise_id, vendor_name, vendor_contact, amount, status, purchase_date, due_date, notes)
SELECT 
  f.id,
  'ABC Suppliers',
  '+91 98765 43210',
  15000.00,
  'pending',
  CURRENT_DATE - INTERVAL '5 days',
  CURRENT_DATE + INTERVAL '10 days',
  'Monthly inventory restocking'
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO purchases (franchise_id, vendor_name, vendor_contact, amount, status, purchase_date, due_date, notes)
SELECT 
  f.id,
  'XYZ Trading Co.',
  'xyz@trading.com',
  8500.00,
  'paid',
  CURRENT_DATE - INTERVAL '15 days',
  CURRENT_DATE - INTERVAL '5 days',
  'Equipment purchase'
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO purchases (franchise_id, vendor_name, vendor_contact, amount, status, purchase_date, due_date, notes)
SELECT 
  f.id,
  'Local Mart',
  '+91 87654 32109',
  3200.00,
  'pending',
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '7 days',
  'Office supplies and cleaning materials'
FROM franchises f
LIMIT 1
ON CONFLICT DO NOTHING;
