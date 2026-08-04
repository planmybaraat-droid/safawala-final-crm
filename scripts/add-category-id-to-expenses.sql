-- Add category_id column to expenses table and create expense_categories table

-- First, create expense_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color for UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default expense categories
INSERT INTO expense_categories (name, description, color) VALUES
    ('Office Supplies', 'Stationery, equipment, and office materials', '#3B82F6'),
    ('Travel', 'Business travel, accommodation, and transportation', '#10B981'),
    ('Marketing', 'Advertising, promotions, and marketing campaigns', '#F59E0B'),
    ('Utilities', 'Electricity, water, internet, and phone bills', '#EF4444'),
    ('Equipment', 'Machinery, tools, and equipment purchases', '#8B5CF6'),
    ('Professional Services', 'Legal, accounting, and consulting fees', '#06B6D4'),
    ('Maintenance', 'Repairs, cleaning, and maintenance services', '#84CC16'),
    ('Insurance', 'Business insurance premiums and coverage', '#F97316'),
    ('Training', 'Employee training and development programs', '#EC4899'),
    ('Miscellaneous', 'Other business-related expenses', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Add category_id column to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);

-- Update existing expenses to have a default category (Miscellaneous)
UPDATE expenses 
SET category_id = (SELECT id FROM expense_categories WHERE name = 'Miscellaneous' LIMIT 1)
WHERE category_id IS NULL;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expense_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_categories_updated_at
    BEFORE UPDATE ON expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_expense_categories_updated_at();

-- Disable RLS for demo purposes (can be enabled later with proper policies)
ALTER TABLE expense_categories DISABLE ROW LEVEL SECURITY;
