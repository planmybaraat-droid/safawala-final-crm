-- MAKE PACKAGE CATEGORIES FRANCHISE-SPECIFIC
-- This adds franchise_id to packages_categories and migrates existing data

-- Step 1: Add franchise_id column to packages_categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'packages_categories' AND column_name = 'franchise_id'
  ) THEN
    ALTER TABLE packages_categories 
    ADD COLUMN franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added franchise_id column to packages_categories';
  ELSE
    RAISE NOTICE 'franchise_id column already exists';
  END IF;
END $$;

-- Step 2: Get the main/HQ franchise ID (first franchise or one named headquarters)
DO $$
DECLARE
  hq_franchise_id UUID;
BEGIN
  -- Try to find HQ franchise by name
  SELECT id INTO hq_franchise_id 
  FROM franchises 
  WHERE LOWER(name) LIKE '%headquarter%' OR LOWER(name) LIKE '%main%' OR LOWER(name) LIKE '%hq%'
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If not found, get the first franchise
  IF hq_franchise_id IS NULL THEN
    SELECT id INTO hq_franchise_id 
    FROM franchises 
    ORDER BY created_at ASC 
    LIMIT 1;
  END IF;
  
  -- Update existing categories to belong to HQ franchise
  IF hq_franchise_id IS NOT NULL THEN
    UPDATE packages_categories 
    SET franchise_id = hq_franchise_id 
    WHERE franchise_id IS NULL;
    
    RAISE NOTICE 'Assigned existing categories to franchise: %', hq_franchise_id;
  ELSE
    RAISE WARNING 'No franchise found! Please create a franchise first.';
  END IF;
END $$;

-- Step 3: Make franchise_id NOT NULL (after migration)
ALTER TABLE packages_categories 
ALTER COLUMN franchise_id SET NOT NULL;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_packages_categories_franchise_id 
ON packages_categories(franchise_id);

-- Step 5: Add RLS policies for packages_categories
ALTER TABLE packages_categories ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "super_admin_all_packages_categories" ON packages_categories;
DROP POLICY IF EXISTS "franchise_users_own_packages_categories" ON packages_categories;
DROP POLICY IF EXISTS "Allow all on packages_categories" ON packages_categories;

-- Policy 1: Super admins see all categories
CREATE POLICY "super_admin_all_packages_categories" ON packages_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
    AND users.is_active = true
  )
);

-- Policy 2: Franchise users see only their franchise's categories
CREATE POLICY "franchise_users_own_packages_categories" ON packages_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.franchise_id = packages_categories.franchise_id
    AND users.is_active = true
  )
);

-- Step 6: Update the unique constraint on name to be franchise-specific
-- Drop old unique constraint
ALTER TABLE packages_categories 
DROP CONSTRAINT IF EXISTS packages_categories_name_key;

-- Add new unique constraint: name must be unique per franchise
ALTER TABLE packages_categories 
ADD CONSTRAINT packages_categories_name_franchise_key 
UNIQUE (name, franchise_id);

-- Step 7: Verification
SELECT 
  'VERIFICATION RESULTS' AS status,
  (SELECT COUNT(*) FROM packages_categories) AS total_categories,
  (SELECT COUNT(DISTINCT franchise_id) FROM packages_categories) AS franchises_with_categories,
  (SELECT COUNT(*) FROM packages_categories WHERE franchise_id IS NULL) AS categories_without_franchise;

-- Show category distribution by franchise
SELECT 
  f.name AS franchise_name,
  COUNT(pc.id) AS category_count,
  STRING_AGG(pc.name, ', ') AS category_names
FROM franchises f
LEFT JOIN packages_categories pc ON pc.franchise_id = f.id
WHERE f.is_active = true
GROUP BY f.id, f.name
ORDER BY category_count DESC;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'packages_categories'
ORDER BY policyname;

SELECT '✅ PACKAGE CATEGORIES ARE NOW FRANCHISE-SPECIFIC' AS status;
