-- Add more test franchises for staff management testing

-- Check if we already have franchises, if not add some
DO $$
BEGIN
    -- Add a few more franchises for testing if the table is empty or has only the default one
    IF (SELECT COUNT(*) FROM franchises WHERE is_active = true) <= 1 THEN
        INSERT INTO franchises (id, name, code, address, city, state, pincode, phone, owner_name, is_active) VALUES
        ('franchise-001', 'Delhi Central Franchise', 'DEL001', '456 Connaught Place', 'New Delhi', 'Delhi', '110001', '+91-9876543211', 'Rajesh Kumar', true),
        ('franchise-002', 'Mumbai South Franchise', 'MUM002', '789 Bandra West', 'Mumbai', 'Maharashtra', '400050', '+91-9876543212', 'Priya Sharma', true),
        ('franchise-003', 'Bangalore Tech Franchise', 'BLR003', '321 Koramangala', 'Bangalore', 'Karnataka', '560034', '+91-9876543213', 'Arun Reddy', true),
        ('franchise-004', 'Chennai Marina Franchise', 'CHN004', '654 Marina Beach Road', 'Chennai', 'Tamil Nadu', '600001', '+91-9876543214', 'Lakshmi Iyer', true),
        ('franchise-005', 'Pune Camp Franchise', 'PUN005', '987 Camp Area', 'Pune', 'Maharashtra', '411001', '+91-9876543215', 'Vikram Patil', true);
        
        RAISE NOTICE 'Added 5 test franchises for staff management testing';
    ELSE
        RAISE NOTICE 'Franchises already exist, skipping test data insertion';
    END IF;
END $$;