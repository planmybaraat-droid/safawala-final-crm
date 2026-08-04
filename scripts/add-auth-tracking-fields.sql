-- Add authentication tracking fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON bookings(created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_franchise_id ON bookings(franchise_id);

-- Update existing bookings to have a default franchise
UPDATE bookings 
SET franchise_id = '00000000-0000-0000-0000-000000000001'
WHERE franchise_id IS NULL;
