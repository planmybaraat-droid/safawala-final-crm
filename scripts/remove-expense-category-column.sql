-- Remove the category column and related constraints from expenses table
ALTER TABLE expenses DROP COLUMN IF EXISTS category CASCADE;

-- Drop the expense_categories table if it exists since we're removing category support entirely
DROP TABLE IF EXISTS expense_categories CASCADE;
