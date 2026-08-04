/**
 * Supabase Function: Auto-generate 11-digit random barcode for new products
 * 
 * This function:
 * 1. Generates a random 11-digit number
 * 2. Ensures it's unique (no duplicates)
 * 3. Is called via trigger when new product is created
 * 4. Assigns the barcode to the product's barcode column
 */

-- Create function to generate random 11-digit barcode
CREATE OR REPLACE FUNCTION generate_random_barcode()
RETURNS varchar(11) AS $$
DECLARE
  new_barcode varchar(11);
  barcode_exists boolean;
BEGIN
  LOOP
    -- Generate random 11-digit number
    new_barcode := LPAD((random() * 99999999999)::bigint::text, 11, '0');
    
    -- Check if barcode already exists
    SELECT EXISTS(SELECT 1 FROM products WHERE barcode = new_barcode) INTO barcode_exists;
    
    -- If unique, exit loop
    IF NOT barcode_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_barcode;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-generate barcode on product insert
CREATE OR REPLACE FUNCTION set_product_barcode()
RETURNS TRIGGER AS $$
BEGIN
  -- If barcode is not provided, generate one
  IF NEW.barcode IS NULL THEN
    NEW.barcode := generate_random_barcode();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_product_barcode ON products;

-- Create trigger
CREATE TRIGGER trigger_set_product_barcode
BEFORE INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION set_product_barcode();

-- Note: This trigger will automatically:
-- 1. When a new product is inserted without a barcode, generate one
-- 2. Generate unique 11-digit random numbers
-- 3. Prevent duplicate barcodes
