-- ============================================
-- FIX: Make customer_code auto-generate with DEFAULT
-- This is more reliable than triggers
-- ============================================

-- Step 1: First, let's make customer_code nullable temporarily
ALTER TABLE customers ALTER COLUMN customer_code DROP NOT NULL;

-- Step 2: Create or replace the function
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

-- Step 3: Create trigger function
CREATE OR REPLACE FUNCTION auto_generate_customer_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
        NEW.customer_code := generate_customer_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Drop existing trigger if any
DROP TRIGGER IF EXISTS set_customer_code_trigger ON customers;

-- Step 5: Create the trigger
CREATE TRIGGER set_customer_code_trigger
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_customer_code();

-- Step 6: Update any existing NULL customer_codes
UPDATE customers 
SET customer_code = 'CUS-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
WHERE customer_code IS NULL;

-- Step 7: Add created_by column if missing
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

-- Step 8: Add updated_by column if missing
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

-- Step 9: Backfill created_by for existing customers
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

-- Step 10: Verify the trigger is working
SELECT 
    '========== TRIGGER VERIFICATION ==========' as info,
    tgname as trigger_name,
    tgtype,
    tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'customers'::regclass
AND tgname = 'set_customer_code_trigger';

-- Step 11: Show table structure
SELECT 
    '========== CUSTOMERS TABLE STRUCTURE ==========' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
AND column_name IN ('customer_code', 'created_by', 'updated_by')
ORDER BY ordinal_position;

-- Step 12: Test the function manually
SELECT 
    '========== TEST FUNCTION ==========' as info,
    generate_customer_code() as next_customer_code;

RAISE NOTICE '✅✅✅ Fix complete! Customer codes will now auto-generate on INSERT';
