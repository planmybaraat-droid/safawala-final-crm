-- Fix franchises table schema to match the expected structure

DO $$ 
BEGIN
    -- Add code column if it doesn't exist (without NOT NULL constraint initially)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'code') THEN
        ALTER TABLE franchises ADD COLUMN code VARCHAR(50);
    END IF;
    
    -- Add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'city') THEN
        ALTER TABLE franchises ADD COLUMN city VARCHAR(100);
    END IF;
    
    -- Add state column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'state') THEN
        ALTER TABLE franchises ADD COLUMN state VARCHAR(100);
    END IF;
    
    -- Add pincode column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'pincode') THEN
        ALTER TABLE franchises ADD COLUMN pincode VARCHAR(10);
    END IF;
    
    -- Add owner_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'owner_name') THEN
        ALTER TABLE franchises ADD COLUMN owner_name VARCHAR(255);
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'franchises' AND column_name = 'is_active') THEN
        ALTER TABLE franchises ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Generate franchise codes for existing franchises without codes using a subquery approach
WITH numbered_franchises AS (
    SELECT id, name, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
    FROM franchises 
    WHERE code IS NULL
)
UPDATE franchises 
SET code = UPPER(SUBSTRING(nf.name FROM 1 FOR 3)) || LPAD(nf.row_num::TEXT, 3, '0')
FROM numbered_franchises nf
WHERE franchises.id = nf.id;

-- Now add the UNIQUE constraint after populating the codes
DO $$
BEGIN
    -- Check if the unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'franchises' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%code%'
    ) THEN
        ALTER TABLE franchises ADD CONSTRAINT franchises_code_unique UNIQUE (code);
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'franchises' 
ORDER BY ordinal_position;
