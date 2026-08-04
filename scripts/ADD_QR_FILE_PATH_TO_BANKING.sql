-- Add qr_file_path column to banking_details table
ALTER TABLE banking_details 
ADD COLUMN IF NOT EXISTS qr_file_path TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN banking_details.qr_file_path IS 'URL/path to the QR code image for UPI payments';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'banking_details' 
AND column_name = 'qr_file_path';
