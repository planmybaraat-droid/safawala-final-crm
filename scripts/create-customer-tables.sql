-- Script to create or modify tables for customer management system
-- This script will create all necessary tables and relationships

-- 1. Create customer_staff_assignments table (if not exists)
-- This table will track which staff members are assigned to which customers
CREATE TABLE IF NOT EXISTS customer_staff_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  role TEXT NOT NULL,  -- primary, secondary, support
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_customer_staff_role UNIQUE (customer_id, staff_id, role)
);

-- 2. Create customer_notes table (if not exists)
-- This will allow staff to add notes to customer profiles
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL,
  created_by UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Create customer_activity_logs table (if not exists)
-- This will track all interactions with customers
CREATE TABLE IF NOT EXISTS customer_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Add missing columns to customers table if needed
DO $$ 
BEGIN
  -- Add franchise_id column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_name = 'customers' AND column_name = 'franchise_id') THEN
    ALTER TABLE customers ADD COLUMN franchise_id UUID REFERENCES franchises(id);
  END IF;
  
  -- Add assigned_staff_id column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_name = 'customers' AND column_name = 'assigned_staff_id') THEN
    ALTER TABLE customers ADD COLUMN assigned_staff_id UUID REFERENCES users(id);
  END IF;
  
  -- Add last_contact_date column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_name = 'customers' AND column_name = 'last_contact_date') THEN
    ALTER TABLE customers ADD COLUMN last_contact_date TIMESTAMPTZ;
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_name = 'customers' AND column_name = 'status') THEN
    ALTER TABLE customers ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- 5. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to relevant tables
DO $$ 
BEGIN
  -- For customers table
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'customers_updated_at_trigger') THEN
    CREATE TRIGGER customers_updated_at_trigger
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
  END IF;
  
  -- For customer_notes table
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'customer_notes_updated_at_trigger') THEN
    CREATE TRIGGER customer_notes_updated_at_trigger
    BEFORE UPDATE ON customer_notes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
  END IF;
END $$;

-- 6. Create function to generate customer codes
CREATE OR REPLACE FUNCTION generate_customer_code() 
RETURNS text AS $$
DECLARE
  new_code text;
  code_exists integer;
BEGIN
  LOOP
    -- Generate a random code with CUST prefix and 4 random digits
    new_code := 'CUST' || lpad(floor(random() * 10000)::text, 4, '0');
    
    -- Check if this code already exists
    SELECT COUNT(*) INTO code_exists 
    FROM customers 
    WHERE customer_code = new_code;
    
    -- Exit loop if code doesn't exist
    EXIT WHEN code_exists = 0;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;