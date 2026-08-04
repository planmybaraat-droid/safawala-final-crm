-- Create booking_packages table for package bookings
CREATE TABLE IF NOT EXISTS booking_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  package_id UUID,
  variant_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  extra_safas INTEGER DEFAULT 0,
  products_selected BOOLEAN DEFAULT false,
  selected_products JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_packages_booking_id ON booking_packages(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_packages_package_id ON booking_packages(package_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_booking_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_booking_packages_updated_at
  BEFORE UPDATE ON booking_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_packages_updated_at();
