-- Add area column to customers table to support pincode lookup functionality
ALTER TABLE customers ADD COLUMN IF NOT EXISTS area character varying;

-- Add comment to document the column purpose
COMMENT ON COLUMN customers.area IS 'Area/locality derived from pincode lookup for better address management';
