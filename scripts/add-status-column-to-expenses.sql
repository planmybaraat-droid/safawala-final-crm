-- Add missing status column to expenses table
-- This fixes the error: Could not find the 'status' column of 'expenses' in the schema cache

-- Add status column to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'pending';

-- Add other potentially needed columns for expense management
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS priority character varying DEFAULT 'medium';

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS tags text[];

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS approval_date date;

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

-- Update existing records to have a default status
UPDATE expenses 
SET status = 'approved' 
WHERE status IS NULL AND approved_by IS NOT NULL;

UPDATE expenses 
SET status = 'pending' 
WHERE status IS NULL;

-- Add check constraint for valid status values
ALTER TABLE expenses 
ADD CONSTRAINT IF NOT EXISTS chk_expenses_status 
CHECK (status IN ('pending', 'approved', 'rejected', 'draft'));

-- Add check constraint for valid priority values
ALTER TABLE expenses 
ADD CONSTRAINT IF NOT EXISTS chk_expenses_priority 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Add some sample data for testing if table is empty
INSERT INTO expenses (
    id,
    franchise_id,
    amount,
    expense_date,
    description,
    vendor_name,
    category_id,
    status,
    priority,
    created_by,
    expense_number
) 
SELECT 
    gen_random_uuid(),
    f.id,
    250.00,
    CURRENT_DATE,
    'Office supplies purchase',
    'ABC Suppliers',
    ec.id,
    'approved',
    'medium',
    u.id,
    'EXP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-001'
FROM franchises f
CROSS JOIN expense_categories ec
CROSS JOIN users u
WHERE f.is_active = true 
  AND ec.is_active = true 
  AND u.role IN ('super_admin', 'franchise_owner')
  AND NOT EXISTS (SELECT 1 FROM expenses)
LIMIT 1;

COMMENT ON COLUMN expenses.status IS 'Status of the expense: pending, approved, rejected, draft';
COMMENT ON COLUMN expenses.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN expenses.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN expenses.approval_date IS 'Date when expense was approved';
COMMENT ON COLUMN expenses.rejection_reason IS 'Reason for rejection if status is rejected';
