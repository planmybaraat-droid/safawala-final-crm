-- Create quotes table to store quote generation details
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  franchise_id UUID REFERENCES franchises(id),
  
  -- Quote details
  type VARCHAR(20) NOT NULL CHECK (type IN ('rental', 'direct_sale')),
  event_type VARCHAR(50) DEFAULT 'wedding',
  event_date DATE,
  delivery_date DATE,
  return_date DATE,
  
  -- Customer details (for new customers who haven't been saved yet)
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_whatsapp VARCHAR(20),
  customer_email VARCHAR(255),
  customer_address TEXT,
  customer_city VARCHAR(100),
  customer_pincode VARCHAR(10),
  customer_state VARCHAR(100),
  
  -- Event details
  event_for VARCHAR(20) CHECK (event_for IN ('groom', 'bride', 'both')),
  groom_name VARCHAR(255),
  bride_name VARCHAR(255),
  venue_name VARCHAR(255),
  venue_address TEXT,
  
  -- Financial details
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  security_deposit DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Quote status and tracking
  status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted')),
  valid_until DATE,
  
  -- Additional information
  special_instructions TEXT,
  notes TEXT,
  
  -- PDF and sharing
  pdf_generated BOOLEAN DEFAULT false,
  pdf_url TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  sales_closed_by_id UUID REFERENCES staff(id),
  
  -- Conversion tracking
  converted_to_booking_id UUID REFERENCES bookings(id),
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Create quote_items table to store individual items in each quote
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  
  -- Item details
  product_name VARCHAR(255) NOT NULL,
  product_code VARCHAR(100),
  category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(10,2) DEFAULT 0,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_franchise_id ON quotes(franchise_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product_id ON quote_items(product_id);

-- Create function to generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  quote_number TEXT;
BEGIN
  -- Get the next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'QT(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM quotes
  WHERE quote_number ~ '^QT\d+$';
  
  -- Format as QT followed by 6-digit number
  quote_number := 'QT' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN quote_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();
