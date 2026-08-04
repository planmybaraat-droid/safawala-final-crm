-- REMOVE payment_type completely - we only use payment_method
-- Run this in Supabase SQL Editor

-- ========== PRODUCT_ORDERS ==========
-- First drop the constraint
ALTER TABLE product_orders DROP CONSTRAINT IF EXISTS product_orders_payment_type_check;

-- Then drop the column completely
ALTER TABLE product_orders DROP COLUMN IF EXISTS payment_type;

-- Fix payment_method constraint  
ALTER TABLE product_orders DROP CONSTRAINT IF EXISTS product_orders_payment_method_check;
ALTER TABLE product_orders ALTER COLUMN payment_method DROP NOT NULL;
ALTER TABLE product_orders ALTER COLUMN payment_method SET DEFAULT 'Cash / Offline Payment';

-- ========== PACKAGE_BOOKINGS ==========
-- First drop the constraint
ALTER TABLE package_bookings DROP CONSTRAINT IF EXISTS package_bookings_payment_type_check;

-- Then drop the column completely
ALTER TABLE package_bookings DROP COLUMN IF EXISTS payment_type;

-- Fix payment_method constraint
ALTER TABLE package_bookings DROP CONSTRAINT IF EXISTS package_bookings_payment_method_check;
ALTER TABLE package_bookings ALTER COLUMN payment_method DROP NOT NULL;
ALTER TABLE package_bookings ALTER COLUMN payment_method SET DEFAULT 'Cash / Offline Payment';

SELECT 'payment_type REMOVED completely! Only payment_method is used now.' as status;
