CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('laundry', 'dry_cleaning', 'both', 'catering', 'decoration', 'photography', 'transportation', 'other')),
  pricing_per_item DECIMAL(10,2),
  payment_terms VARCHAR(100),
  credit_limit DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  tax_id VARCHAR(50),
  bank_account VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  franchise_id UUID REFERENCES franchises(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_service_type ON vendors(service_type);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_franchise_id ON vendors(franchise_id);
CREATE INDEX IF NOT EXISTS idx_vendors_created_by ON vendors(created_by);

-- Create vendor transactions table for tracking payments and orders
CREATE TABLE IF NOT EXISTS vendor_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'order', 'credit', 'debit')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for vendor transactions
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_vendor_id ON vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_type ON vendor_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_date ON vendor_transactions(transaction_date);

-- Create vendor services table for detailed service offerings
CREATE TABLE IF NOT EXISTS vendor_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  service_name VARCHAR(255) NOT NULL,
  service_description TEXT,
  price_per_unit DECIMAL(10,2),
  unit_type VARCHAR(50) DEFAULT 'piece',
  minimum_quantity INTEGER DEFAULT 1,
  turnaround_time_hours INTEGER,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vendor services
CREATE INDEX IF NOT EXISTS idx_vendor_services_vendor_id ON vendor_services(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_services_available ON vendor_services(is_available);

-- Insert sample vendors data
INSERT INTO vendors (name, contact_person, phone, email, address, service_type, pricing_per_item, payment_terms, notes, rating) VALUES
('Clean & Fresh Laundry', 'Rajesh Kumar', '+91-9876543210', 'rajesh@cleanfresh.com', '123 Main Street, Mumbai, Maharashtra', 'laundry', 15.00, 'Net 30', 'Reliable laundry service with quick turnaround', 4),
('Premium Dry Cleaners', 'Priya Sharma', '+91-9876543211', 'priya@premiumdry.com', '456 Business District, Delhi', 'dry_cleaning', 50.00, 'Net 15', 'Specializes in formal wear and delicate fabrics', 5),
('Royal Catering Services', 'Mohammed Ali', '+91-9876543212', 'ali@royalcatering.com', '789 Food Street, Bangalore', 'catering', 200.00, 'Advance 50%', 'Full-service catering for weddings and events', 4),
('Elegant Decorations', 'Sunita Patel', '+91-9876543213', 'sunita@elegantdeco.com', '321 Design Avenue, Pune', 'decoration', 5000.00, 'Advance 30%', 'Wedding and event decoration specialists', 5),
('Capture Moments Photography', 'Arjun Singh', '+91-9876543214', 'arjun@capturemoments.com', '654 Studio Lane, Chennai', 'photography', 15000.00, 'Advance 40%', 'Professional wedding and event photography', 4);

-- Insert sample vendor services
INSERT INTO vendor_services (vendor_id, service_name, service_description, price_per_unit, unit_type, turnaround_time_hours) VALUES
((SELECT id FROM vendors WHERE name = 'Clean & Fresh Laundry' LIMIT 1), 'Regular Wash', 'Standard washing and drying service', 15.00, 'piece', 24),
((SELECT id FROM vendors WHERE name = 'Clean & Fresh Laundry' LIMIT 1), 'Express Wash', 'Same day washing service', 25.00, 'piece', 6),
((SELECT id FROM vendors WHERE name = 'Premium Dry Cleaners' LIMIT 1), 'Suit Dry Cleaning', 'Professional suit cleaning', 150.00, 'piece', 48),
((SELECT id FROM vendors WHERE name = 'Premium Dry Cleaners' LIMIT 1), 'Saree Dry Cleaning', 'Delicate saree cleaning', 100.00, 'piece', 72),
((SELECT id FROM vendors WHERE name = 'Royal Catering Services' LIMIT 1), 'Wedding Catering', 'Full wedding meal service', 500.00, 'person', 0);

-- Create function to update vendor balance
CREATE OR REPLACE FUNCTION update_vendor_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'credit' OR NEW.transaction_type = 'order' THEN
    UPDATE vendors 
    SET current_balance = current_balance + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.vendor_id;
  ELSIF NEW.transaction_type = 'debit' OR NEW.transaction_type = 'payment' THEN
    UPDATE vendors 
    SET current_balance = current_balance - NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.vendor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update vendor balance
CREATE TRIGGER trigger_update_vendor_balance
  AFTER INSERT ON vendor_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_balance();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating timestamps
CREATE TRIGGER trigger_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_vendor_transactions_updated_at
  BEFORE UPDATE ON vendor_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_vendor_services_updated_at
  BEFORE UPDATE ON vendor_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
