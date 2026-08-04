-- ============================================================
-- CREATE SAMPLE FRANCHISES
-- Run this ONLY if you have no franchises in the database
-- ============================================================

-- First check if franchises exist
DO $$
DECLARE
    franchise_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO franchise_count FROM franchises;
    
    IF franchise_count = 0 THEN
        -- No franchises exist, create samples
        RAISE NOTICE '📝 Creating sample franchises...';
        
        INSERT INTO franchises (name, code, city, state, address, pincode, phone, email, owner_name, manager_name, gst_number, is_active)
        VALUES 
            (
                'Safawala Mumbai Central',
                'MUM001',
                'Mumbai',
                'Maharashtra',
                '123 Main Street, Andheri East',
                '400069',
                '+91 9876543210',
                'mumbai@safawala.com',
                'Rahul Sharma',
                'Amit Patel',
                '27AABCU9603R1ZM',
                true
            ),
            (
                'Safawala Delhi North',
                'DEL001',
                'Delhi',
                'Delhi',
                '456 Ring Road, Rohini Sector 7',
                '110085',
                '+91 9876543211',
                'delhi@safawala.com',
                'Priya Singh',
                'Vikram Verma',
                '07AABCU9603R1ZN',
                true
            ),
            (
                'Safawala Bangalore South',
                'BLR001',
                'Bangalore',
                'Karnataka',
                '789 MG Road, Koramangala',
                '560095',
                '+91 9876543212',
                'bangalore@safawala.com',
                'Deepak Kumar',
                'Anjali Rao',
                '29AABCU9603R1ZO',
                true
            );
        
        RAISE NOTICE '✅ Created 3 sample franchises!';
    ELSE
        RAISE NOTICE '✅ Franchises already exist (%) - skipping creation', franchise_count;
    END IF;
END $$;

-- Verify franchises were created
SELECT 
    '✅ FRANCHISES CREATED' as status,
    COUNT(*) as total_franchises,
    COUNT(*) FILTER (WHERE is_active = true) as active_franchises
FROM franchises;

-- Show all franchises
SELECT 
    code,
    name,
    city || ', ' || state as location,
    owner_name,
    phone,
    is_active,
    created_at
FROM franchises
ORDER BY created_at DESC;
