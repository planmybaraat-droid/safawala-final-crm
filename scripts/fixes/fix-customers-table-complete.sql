-- ============================================
-- COMPREHENSIVE FIX: Add ALL missing columns to customers table
-- This ensures the customers table matches what the API expects
-- ============================================

-- Step 0: Create function to generate customer codes
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    counter INTEGER;
BEGIN
    -- Get the current count of customers and add 1
    SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 5) AS INTEGER)), 0) + 1
    INTO counter
    FROM customers
    WHERE customer_code ~ '^CUS-[0-9]+$';
    
    -- Format as CUS-XXXX
    new_code := 'CUS-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Step 0.1: Create trigger to auto-generate customer_code
CREATE OR REPLACE FUNCTION auto_generate_customer_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
        NEW.customer_code := generate_customer_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_customer_code_trigger ON customers;
CREATE TRIGGER set_customer_code_trigger
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_customer_code();

-- Step 1: Add created_by column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE customers ADD COLUMN created_by UUID REFERENCES users(id);
        RAISE NOTICE '✅ Added created_by column';
    ELSE
        RAISE NOTICE 'ℹ️  created_by column already exists';
    END IF;
END $$;

-- Step 2: Add updated_by column (if needed for future)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE customers ADD COLUMN updated_by UUID REFERENCES users(id);
        RAISE NOTICE '✅ Added updated_by column';
    ELSE
        RAISE NOTICE 'ℹ️  updated_by column already exists';
    END IF;
END $$;

-- Step 3: Ensure all expected columns exist
DO $$ 
BEGIN
    -- name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'name') THEN
        ALTER TABLE customers ADD COLUMN name VARCHAR(255) NOT NULL;
    END IF;
    
    -- phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'phone') THEN
        ALTER TABLE customers ADD COLUMN phone VARCHAR(20);
    END IF;
    
    -- email column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'email') THEN
        ALTER TABLE customers ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'address') THEN
        ALTER TABLE customers ADD COLUMN address TEXT;
    END IF;
    
    -- city column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'city') THEN
        ALTER TABLE customers ADD COLUMN city VARCHAR(100);
    END IF;
    
    -- state column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'state') THEN
        ALTER TABLE customers ADD COLUMN state VARCHAR(100);
    END IF;
    
    -- pincode column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'pincode') THEN
        ALTER TABLE customers ADD COLUMN pincode VARCHAR(10);
    END IF;
    
    -- notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'notes') THEN
        ALTER TABLE customers ADD COLUMN notes TEXT;
    END IF;
    
    -- franchise_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'franchise_id') THEN
        ALTER TABLE customers ADD COLUMN franchise_id UUID REFERENCES franchises(id);
    END IF;
    
    RAISE NOTICE '✅ All standard columns verified';
END $$;

-- Step 4: Set created_by for existing customers (optional)
UPDATE customers c
SET created_by = (
    SELECT u.id 
    FROM users u 
    WHERE u.franchise_id = c.franchise_id 
    AND u.role IN ('franchise_admin', 'super_admin')
    ORDER BY u.created_at ASC 
    LIMIT 1
)
WHERE c.created_by IS NULL AND c.franchise_id IS NOT NULL;

-- Step 5: Show current customers table structure
SELECT 
    '========== CUSTOMERS TABLE STRUCTURE ==========' as info,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 6: Count customers by franchise
SELECT 
    '========== CUSTOMERS BY FRANCHISE ==========' as info,
    f.name as franchise_name,
    f.code,
    COUNT(c.id) as customer_count
FROM franchises f
LEFT JOIN customers c ON c.franchise_id = f.id
GROUP BY f.id, f.name, f.code
ORDER BY customer_count DESC;

-- Step 7: Show mysafawale@gmail.com franchise customers
SELECT 
    '========== YOUR CUSTOMERS ==========' as info,
    c.id,
    c.name,
    c.phone,
    c.email,
    u.name as created_by_name,
    c.created_at::date as created_date
FROM customers c
JOIN users admin ON admin.franchise_id = c.franchise_id
LEFT JOIN users u ON u.id = c.created_by
WHERE admin.email = 'mysafawale@gmail.com'
ORDER BY c.created_at DESC
LIMIT 10;
