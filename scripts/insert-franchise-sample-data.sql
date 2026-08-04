-- Insert sample franchises
INSERT INTO franchises (name, code, address, city, state, pincode, phone, email, owner_name, manager_name, gst_number, pan_number, monthly_target, commission_rate, security_deposit, agreement_start_date, agreement_end_date) VALUES
('Safawala Mumbai Central', 'MUM001', '123 Wedding Street, Dadar West', 'Mumbai', 'Maharashtra', '400028', '+91-9876543210', 'mumbai@safawala.com', 'Rajesh Kumar', 'Amit Patel', '27AAAAA0000A1Z5', 'AAAAA0000A', 500000.00, 15.00, 100000.00, '2024-01-01', '2026-12-31'),
('Safawala Delhi North', 'DEL001', '456 Celebration Avenue, Karol Bagh', 'Delhi', 'Delhi', '110005', '+91-9876543211', 'delhi@safawala.com', 'Priya Sharma', 'Vikash Singh', '07BBBBB1111B2Z6', 'BBBBB1111B', 400000.00, 12.00, 80000.00, '2024-02-01', '2026-12-31'),
('Safawala Bangalore South', 'BLR001', '789 Royal Road, Jayanagar 4th Block', 'Bangalore', 'Karnataka', '560041', '+91-9876543212', 'bangalore@safawala.com', 'Suresh Reddy', 'Meera Nair', '29CCCCC2222C3Z7', 'CCCCC2222C', 350000.00, 10.00, 75000.00, '2024-03-01', '2026-12-31'),
('Safawala Pune West', 'PUN001', '321 Marriage Mall, Shivaji Nagar', 'Pune', 'Maharashtra', '411005', '+91-9876543213', 'pune@safawala.com', 'Ganesh Patil', 'Sunita Joshi', '27DDDDD3333D4Z8', 'DDDDD3333D', 300000.00, 8.00, 60000.00, '2024-04-01', '2026-12-31'),
('Safawala Chennai East', 'CHE001', '654 Celebration Center, T. Nagar', 'Chennai', 'Tamil Nadu', '600017', '+91-9876543214', 'chennai@safawala.com', 'Ravi Krishnan', 'Lakshmi Devi', '33EEEEE4444E5Z9', 'EEEEE4444E', 280000.00, 7.00, 50000.00, '2024-05-01', '2026-12-31');

-- Insert sample users for each franchise
INSERT INTO users (email, password_hash, name, phone, role, franchise_id, salary, joining_date, emergency_contact, address, permissions) VALUES
-- Super Admin
('admin@safawala.com', '$2b$10$example_hash_admin', 'Super Admin', '+91-9999999999', 'super_admin', NULL, 100000.00, '2024-01-01', '+91-9999999998', 'Head Office, Mumbai', '{"dashboard": true, "bookings": true, "customers": true, "inventory": true, "sales": true, "laundry": true, "purchases": true, "expenses": true, "deliveries": true, "reports": true, "financials": true, "invoices": true, "franchises": true, "staff": true, "settings": true}'),

-- Mumbai Franchise
('mumbai.admin@safawala.com', '$2b$10$example_hash_mumbai', 'Amit Patel', '+91-9876543210', 'franchise_admin', (SELECT id FROM franchises WHERE code = 'MUM001'), 60000.00, '2024-01-01', '+91-9876543220', 'Dadar, Mumbai', '{"dashboard": true, "bookings": true, "customers": true, "inventory": true, "sales": true, "laundry": true, "purchases": true, "expenses": true, "deliveries": true, "reports": true, "financials": true, "invoices": true, "staff": true}'),
('mumbai.staff1@safawala.com', '$2b$10$example_hash_staff1', 'Rohit Sharma', '+91-9876543221', 'staff', (SELECT id FROM franchises WHERE code = 'MUM001'), 25000.00, '2024-01-15', '+91-9876543231', 'Andheri, Mumbai', '{"dashboard": true, "bookings": true, "customers": true, "inventory": true, "sales": true, "laundry": true, "deliveries": true}'),
('mumbai.staff2@safawala.com', '$2b$10$example_hash_staff2', 'Sneha Patil', '+91-9876543222', 'staff', (SELECT id FROM franchises WHERE code = 'MUM001'), 22000.00, '2024-02-01', '+91-9876543232', 'Bandra, Mumbai', '{"dashboard": true, "bookings": true, "customers": true, "inventory": true, "sales": true}'),

-- Delhi Franchise
('delhi.admin@safawala.com', '$2b$10$example_hash_delhi', 'Vikash Singh', '+91-9876543211', 'franchise_admin', (SELECT id FROM franchises WHERE code = 'DEL001'), 55000.00, '2024-02-01', '+91-9876543223', 'Karol Bagh, Delhi', '{"dashboard": true, "bookings": true, "customers": true, "inventory": true, "sales": true, "laundry": true, "purchases": true, "expenses": true, "deliveries": true, "reports": true, "financials": true, "invoices": true, "staff": true}'),
('delhi.staff1@safawala.com', '$2b$10$example_hash_dstaff1', 'Arjun Gupta', '+91-9876543224', 'staff', (SELECT id FROM franchises WHERE code = 'DEL001'), 24000.00, '2024-02-15', '+91-9876543234', 'Lajpat Nagar, Delhi', '{"dashboard": true, "bookings": true, "customers": true, "inventory": true, "sales": true, "laundry": true}'),

-- Bangalore Franchise
('bangalore.admin@safawala.com', '$2b$10$example_hash_bangalore', 'Meera Nair', '+91-9876543212', 'franchise_admin', (SELECT id FROM franchises WHERE code = 'BLR001'), 50000.00, '2024-03-01', '+91-9876543225', 'Jayanagar, Bangalore', '{"dashboard": true, "bookings": true, "customers": true, "inventory": true, "sales": true, "laundry": true, "purchases": true, "expenses": true, "deliveries": true, "reports": true, "financials": true, "invoices": true, "staff": true}'),
('bangalore.staff1@safawala.com', '$2b$10$example_hash_bstaff1', 'Karthik Reddy', '+91-9876543226', 'staff', (SELECT id FROM franchises WHERE code = 'BLR001'), 23000.00, '2024-03-15', '+91-9876543236', 'Koramangala, Bangalore', '{"dashboard": true, "bookings": true, "customers": true, "inventory": true, "sales": true}');

-- Insert sample vendors
INSERT INTO vendors (vendor_code, name, phone, email, contact_person, payment_terms, vendor_type, gst_number, address, city, state, pincode) VALUES
('VEN001', 'Premium Laundry Services', '+91-9876543230', 'contact@premiumlaundry.com', 'Suresh Gupta', 15, 'laundry', '27FFFFF5555F6Z1', '123 Laundry Street, Andheri', 'Mumbai', 'Maharashtra', '400058'),
('VEN002', 'Fabric Care Solutions', '+91-9876543231', 'info@fabriccare.com', 'Meera Singh', 30, 'laundry', '07GGGGG6666G7Z2', '456 Care Avenue, Rohini', 'Delhi', 'Delhi', '110085'),
('VEN003', 'Quick Clean Express', '+91-9876543232', 'support@quickclean.com', 'Ravi Verma', 7, 'laundry', '29HHHHH7777H8Z3', '789 Clean Road, Whitefield', 'Bangalore', 'Karnataka', '560066'),
('VEN004', 'Royal Textiles Supplier', '+91-9876543233', 'sales@royaltextiles.com', 'Deepak Shah', 45, 'supplier', '27IIIII8888I9Z4', '321 Textile Market, Dadar', 'Mumbai', 'Maharashtra', '400014'),
('VEN005', 'Golden Accessories Hub', '+91-9876543234', 'orders@goldenaccessories.com', 'Priya Jain', 30, 'supplier', '07JJJJJ9999J0Z5', '654 Accessory Plaza, CP', 'Delhi', 'Delhi', '110001');

-- Insert sample customers for each franchise
INSERT INTO customers (customer_code, name, phone, whatsapp, email, address, city, state, pincode, credit_limit, customer_type, franchise_id) VALUES
-- Mumbai customers
('MUM001', 'Rajesh & Priya Wedding', '+91-9876543240', '+91-9876543240', 'rajesh.priya@example.com', '123 Wedding Villa, Juhu', 'Mumbai', 'Maharashtra', '400049', 200000.00, 'premium', (SELECT id FROM franchises WHERE code = 'MUM001')),
('MUM002', 'Amit Kumar Family', '+91-9876543241', '+91-9876543241', 'amit.kumar@example.com', '456 Family Apartment, Bandra', 'Mumbai', 'Maharashtra', '400050', 150000.00, 'regular', (SELECT id FROM franchises WHERE code = 'MUM001')),
('MUM003', 'Sharma Wedding Planners', '+91-9876543242', '+91-9876543242', 'contact@sharmaweddings.com', '789 Event Plaza, Powai', 'Mumbai', 'Maharashtra', '400076', 500000.00, 'vip', (SELECT id FROM franchises WHERE code = 'MUM001')),

-- Delhi customers
('DEL001', 'Vikram & Sunita Engagement', '+91-9876543243', '+91-9876543243', 'vikram.sunita@example.com', '321 Celebration Hall, Lajpat Nagar', 'Delhi', 'Delhi', '110024', 180000.00, 'premium', (SELECT id FROM franchises WHERE code = 'DEL001')),
('DEL002', 'Gupta Family Functions', '+91-9876543244', '+91-9876543244', 'gupta.family@example.com', '654 Function Center, Karol Bagh', 'Delhi', 'Delhi', '110005', 120000.00, 'regular', (SELECT id FROM franchises WHERE code = 'DEL001')),

-- Bangalore customers
('BLR001', 'Ravi & Lakshmi Wedding', '+91-9876543245', '+91-9876543245', 'ravi.lakshmi@example.com', '987 Marriage Hall, Jayanagar', 'Bangalore', 'Karnataka', '560041', 160000.00, 'premium', (SELECT id FROM franchises WHERE code = 'BLR001')),
('BLR002', 'Reddy Celebrations', '+91-9876543246', '+91-9876543246', 'reddy.celebrations@example.com', '147 Event Venue, Koramangala', 'Bangalore', 'Karnataka', '560034', 140000.00, 'regular', (SELECT id FROM franchises WHERE code = 'BLR001'));

-- Insert sample products for each franchise
INSERT INTO products (product_code, barcode, qr_code, name, category, subcategory, brand, size, color, material, price, rental_price, cost_price, security_deposit, stock_total, stock_available, stock_booked, reorder_level, franchise_id) VALUES
-- Mumbai products
('MUM-TUR001', 'BAR-MUM-TUR001', 'QR-MUM-TUR001', 'Royal Red Silk Turban', 'turban', 'Wedding', 'Royal Collection', 'L', 'Red', 'Pure Silk', 8000.00, 800.00, 4000.00, 2000.00, 25, 20, 5, 5, (SELECT id FROM franchises WHERE code = 'MUM001')),
('MUM-SEH001', 'BAR-MUM-SEH001', 'QR-MUM-SEH001', 'Golden Pearl Sehra', 'sehra', 'Bridal', 'Golden Dreams', 'One Size', 'Gold', 'Silk with Pearls', 12000.00, 1200.00, 6000.00, 3000.00, 15, 12, 3, 3, (SELECT id FROM franchises WHERE code = 'MUM001')),
('MUM-KAL001', 'BAR-MUM-KAL001', 'QR-MUM-KAL001', 'Diamond Kalgi Set', 'kalgi', 'Groom', 'Diamond Elite', 'Medium', 'White', 'Silver with Diamonds', 15000.00, 1500.00, 8000.00, 4000.00, 10, 8, 2, 2, (SELECT id FROM franchises WHERE code = 'MUM001')),
('MUM-NEK001', 'BAR-MUM-NEK001', 'QR-MUM-NEK001', 'Maharaja Necklace Set', 'necklace', 'Bridal', 'Maharaja Collection', 'One Size', 'Gold', 'Gold Plated', 25000.00, 2500.00, 12000.00, 6000.00, 8, 6, 2, 2, (SELECT id FROM franchises WHERE code = 'MUM001')),

-- Delhi products
('DEL-TUR001', 'BAR-DEL-TUR001', 'QR-DEL-TUR001', 'Premium White Turban', 'turban', 'Wedding', 'Premium Line', 'XL', 'White', 'Cotton Silk', 6000.00, 600.00, 3000.00, 1500.00, 30, 25, 5, 5, (SELECT id FROM franchises WHERE code = 'DEL001')),
('DEL-SEH001', 'BAR-DEL-SEH001', 'QR-DEL-SEH001', 'Silver Rose Sehra', 'sehra', 'Bridal', 'Silver Collection', 'One Size', 'Silver', 'Silk with Roses', 10000.00, 1000.00, 5000.00, 2500.00, 12, 10, 2, 3, (SELECT id FROM franchises WHERE code = 'DEL001')),
('DEL-BRA001', 'BAR-DEL-BRA001', 'QR-DEL-BRA001', 'Royal Bracelet Set', 'bracelet', 'Groom', 'Royal Collection', 'Adjustable', 'Gold', 'Brass Gold Plated', 8000.00, 800.00, 4000.00, 2000.00, 20, 18, 2, 4, (SELECT id FROM franchises WHERE code = 'DEL001')),

-- Bangalore products
('BLR-TUR001', 'BAR-BLR-TUR001', 'QR-BLR-TUR001', 'South Indian Silk Turban', 'turban', 'Traditional', 'South Silk', 'L', 'Maroon', 'Kanchipuram Silk', 10000.00, 1000.00, 5000.00, 2500.00, 20, 16, 4, 4, (SELECT id FROM franchises WHERE code = 'BLR001')),
('BLR-KAL001', 'BAR-BLR-KAL001', 'QR-BLR-KAL001', 'Traditional Kalgi', 'kalgi', 'Traditional', 'Heritage Collection', 'Large', 'Gold', 'Traditional Brass', 12000.00, 1200.00, 6000.00, 3000.00, 15, 12, 3, 3, (SELECT id FROM franchises WHERE code = 'BLR001')),
('BLR-SHO001', 'BAR-BLR-SHO001', 'QR-BLR-SHO001', 'Groom Leather Shoes', 'shoes', 'Wedding', 'Leather Craft', '9', 'Brown', 'Genuine Leather', 5000.00, 500.00, 2500.00, 1000.00, 25, 22, 3, 5, (SELECT id FROM franchises WHERE code = 'BLR001'));

-- Update customer totals based on sample data
UPDATE customers SET 
    total_bookings = CASE 
        WHEN customer_code = 'MUM001' THEN 3
        WHEN customer_code = 'MUM002' THEN 2
        WHEN customer_code = 'MUM003' THEN 5
        WHEN customer_code = 'DEL001' THEN 2
        WHEN customer_code = 'DEL002' THEN 1
        WHEN customer_code = 'BLR001' THEN 2
        WHEN customer_code = 'BLR002' THEN 1
        ELSE 0
    END,
    total_spent = CASE 
        WHEN customer_code = 'MUM001' THEN 45000.00
        WHEN customer_code = 'MUM002' THEN 28000.00
        WHEN customer_code = 'MUM003' THEN 125000.00
        WHEN customer_code = 'DEL001' THEN 32000.00
        WHEN customer_code = 'DEL002' THEN 15000.00
        WHEN customer_code = 'BLR001' THEN 38000.00
        WHEN customer_code = 'BLR002' THEN 22000.00
        ELSE 0
    END,
    last_booking_date = CASE 
        WHEN customer_code IN ('MUM001', 'DEL001', 'BLR001') THEN CURRENT_DATE - INTERVAL '5 days'
        WHEN customer_code IN ('MUM002', 'DEL002', 'BLR002') THEN CURRENT_DATE - INTERVAL '15 days'
        WHEN customer_code = 'MUM003' THEN CURRENT_DATE - INTERVAL '2 days'
        ELSE NULL
    END;

-- Insert sample bookings
INSERT INTO bookings (booking_number, customer_id, franchise_id, type, event_type, payment_type, total_amount, discount_amount, tax_amount, security_deposit, amount_paid, pending_amount, status, priority, event_date, delivery_date, pickup_date, groom_name, bride_name, venue_name, venue_address, created_by) VALUES
-- Mumbai bookings
('MUM-REN-001', (SELECT id FROM customers WHERE customer_code = 'MUM001'), (SELECT id FROM franchises WHERE code = 'MUM001'), 'rental', 'wedding', 'advance', 25000.00, 2000.00, 2300.00, 8000.00, 15000.00, 10000.00, 'confirmed', 1, '2024-12-25', '2024-12-24', '2024-12-26', 'Rajesh Kumar', 'Priya Sharma', 'Grand Wedding Hall', '123 Wedding Street, Juhu, Mumbai', (SELECT id FROM users WHERE email = 'mumbai.admin@safawala.com')),
('MUM-REN-002', (SELECT id FROM customers WHERE customer_code = 'MUM002'), (SELECT id FROM franchises WHERE code = 'MUM001'), 'rental', 'engagement', 'full', 18000.00, 1000.00, 1700.00, 5000.00, 18000.00, 0.00, 'delivered', 2, '2024-12-20', '2024-12-19', '2024-12-21', 'Amit Kumar', 'Neha Patel', 'Celebration Banquet', '456 Celebration Road, Bandra, Mumbai', (SELECT id FROM users WHERE email = 'mumbai.staff1@safawala.com')),

-- Delhi bookings
('DEL-REN-001', (SELECT id FROM customers WHERE customer_code = 'DEL001'), (SELECT id FROM franchises WHERE code = 'DEL001'), 'rental', 'engagement', 'advance', 22000.00, 1500.00, 2050.00, 6000.00, 12000.00, 10000.00, 'pending', 1, '2024-12-30', '2024-12-29', '2024-12-31', 'Vikram Singh', 'Sunita Gupta', 'Royal Function Hall', '321 Royal Street, Lajpat Nagar, Delhi', (SELECT id FROM users WHERE email = 'delhi.admin@safawala.com')),

-- Bangalore bookings
('BLR-REN-001', (SELECT id FROM customers WHERE customer_code = 'BLR001'), (SELECT id FROM franchises WHERE code = 'BLR001'), 'rental', 'wedding', 'deposit_only', 28000.00, 2500.00, 2550.00, 10000.00, 10000.00, 18000.00, 'confirmed', 1, '2025-01-15', '2025-01-14', '2025-01-16', 'Ravi Reddy', 'Lakshmi Nair', 'Heritage Wedding Venue', '987 Heritage Road, Jayanagar, Bangalore', (SELECT id FROM users WHERE email = 'bangalore.admin@safawala.com'));

-- Insert sample booking items
INSERT INTO booking_items (booking_id, product_id, quantity, unit_price, discount_percent, total_price, security_deposit, damage_cost, cleaning_required) VALUES
-- Mumbai booking items
((SELECT id FROM bookings WHERE booking_number = 'MUM-REN-001'), (SELECT id FROM products WHERE product_code = 'MUM-TUR001'), 1, 800.00, 10.00, 720.00, 2000.00, 0.00, true),
((SELECT id FROM bookings WHERE booking_number = 'MUM-REN-001'), (SELECT id FROM products WHERE product_code = 'MUM-SEH001'), 1, 1200.00, 10.00, 1080.00, 3000.00, 0.00, true),
((SELECT id FROM bookings WHERE booking_number = 'MUM-REN-001'), (SELECT id FROM products WHERE product_code = 'MUM-KAL001'), 1, 1500.00, 10.00, 1350.00, 4000.00, 0.00, false),

((SELECT id FROM bookings WHERE booking_number = 'MUM-REN-002'), (SELECT id FROM products WHERE product_code = 'MUM-TUR001'), 1, 800.00, 5.00, 760.00, 2000.00, 0.00, true),
((SELECT id FROM bookings WHERE booking_number = 'MUM-REN-002'), (SELECT id FROM products WHERE product_code = 'MUM-NEK001'), 1, 2500.00, 5.00, 2375.00, 6000.00, 0.00, false),

-- Delhi booking items
((SELECT id FROM bookings WHERE booking_number = 'DEL-REN-001'), (SELECT id FROM products WHERE product_code = 'DEL-TUR001'), 1, 600.00, 8.00, 552.00, 1500.00, 0.00, true),
((SELECT id FROM bookings WHERE booking_number = 'DEL-REN-001'), (SELECT id FROM products WHERE product_code = 'DEL-SEH001'), 1, 1000.00, 8.00, 920.00, 2500.00, 0.00, true),
((SELECT id FROM bookings WHERE booking_number = 'DEL-REN-001'), (SELECT id FROM products WHERE product_code = 'DEL-BRA001'), 2, 800.00, 8.00, 1472.00, 4000.00, 0.00, false),

-- Bangalore booking items
((SELECT id FROM bookings WHERE booking_number = 'BLR-REN-001'), (SELECT id FROM products WHERE product_code = 'BLR-TUR001'), 1, 1000.00, 12.00, 880.00, 2500.00, 0.00, true),
((SELECT id FROM bookings WHERE booking_number = 'BLR-REN-001'), (SELECT id FROM products WHERE product_code = 'BLR-KAL001'), 1, 1200.00, 12.00, 1056.00, 3000.00, 0.00, true),
((SELECT id FROM bookings WHERE booking_number = 'BLR-REN-001'), (SELECT id FROM products WHERE product_code = 'BLR-SHO001'), 2, 500.00, 12.00, 880.00, 2000.00, 0.00, false);

-- Insert sample payments
INSERT INTO payments (payment_number, booking_id, customer_id, amount, payment_method, payment_date, transaction_id, status, created_by) VALUES
('PAY-MUM-001', (SELECT id FROM bookings WHERE booking_number = 'MUM-REN-001'), (SELECT id FROM customers WHERE customer_code = 'MUM001'), 15000.00, 'upi', '2024-12-15', 'UPI-TXN-001', 'paid', (SELECT id FROM users WHERE email = 'mumbai.admin@safawala.com')),
('PAY-MUM-002', (SELECT id FROM bookings WHERE booking_number = 'MUM-REN-002'), (SELECT id FROM customers WHERE customer_code = 'MUM002'), 18000.00, 'bank_transfer', '2024-12-18', 'BANK-TXN-001', 'paid', (SELECT id FROM users WHERE email = 'mumbai.staff1@safawala.com')),
('PAY-DEL-001', (SELECT id FROM bookings WHERE booking_number = 'DEL-REN-001'), (SELECT id FROM customers WHERE customer_code = 'DEL001'), 12000.00, 'cash', '2024-12-20', NULL, 'paid', (SELECT id FROM users WHERE email = 'delhi.admin@safawala.com')),
('PAY-BLR-001', (SELECT id FROM bookings WHERE booking_number = 'BLR-REN-001'), (SELECT id FROM customers WHERE customer_code = 'BLR001'), 10000.00, 'card', '2024-12-22', 'CARD-TXN-001', 'paid', (SELECT id FROM users WHERE email = 'bangalore.admin@safawala.com'));

-- Insert sample purchases
INSERT INTO purchases (purchase_number, vendor_id, franchise_id, invoice_number, total_amount, discount_amount, tax_amount, paid_amount, pending_amount, status, purchase_date, due_date, payment_terms, created_by) VALUES
('PUR-MUM-001', (SELECT id FROM vendors WHERE vendor_code = 'VEN004'), (SELECT id FROM franchises WHERE code = 'MUM001'), 'INV-RT-001', 50000.00, 2000.00, 4800.00, 50000.00, 0.00, 'paid', '2024-12-01', '2024-12-31', 30, (SELECT id FROM users WHERE email = 'mumbai.admin@safawala.com')),
('PUR-DEL-001', (SELECT id FROM vendors WHERE vendor_code = 'VEN005'), (SELECT id FROM franchises WHERE code = 'DEL001'), 'INV-GA-001', 35000.00, 1500.00, 3350.00, 20000.00, 15000.00, 'partial', '2024-12-05', '2025-01-05', 30, (SELECT id FROM users WHERE email = 'delhi.admin@safawala.com')),
('PUR-BLR-001', (SELECT id FROM vendors WHERE vendor_code = 'VEN004'), (SELECT id FROM franchises WHERE code = 'BLR001'), 'INV-RT-002', 40000.00, 1800.00, 3820.00, 0.00, 40000.00, 'pending', '2024-12-10', '2025-01-10', 30, (SELECT id FROM users WHERE email = 'bangalore.admin@safawala.com'));

-- Insert sample expenses
INSERT INTO expenses (expense_number, franchise_id, category, subcategory, amount, description, vendor_name, expense_date, payment_method, receipt_number, created_by) VALUES
('EXP-MUM-001', (SELECT id FROM franchises WHERE code = 'MUM001'), 'rent', 'Shop Rent', 25000.00, 'Monthly shop rent for December 2024', 'Property Owner', '2024-12-01', 'bank_transfer', 'RENT-DEC-001', (SELECT id FROM users WHERE email = 'mumbai.admin@safawala.com')),
('EXP-MUM-002', (SELECT id FROM franchises WHERE code = 'MUM001'), 'utilities', 'Electricity', 3500.00, 'Electricity bill for November 2024', 'MSEB', '2024-12-05', 'upi', 'ELEC-NOV-001', (SELECT id FROM users WHERE email = 'mumbai.admin@safawala.com')),
('EXP-DEL-001', (SELECT id FROM franchises WHERE code = 'DEL001'), 'rent', 'Shop Rent', 20000.00, 'Monthly shop rent for December 2024', 'Property Owner', '2024-12-01', 'cheque', 'RENT-DEC-002', (SELECT id FROM users WHERE email = 'delhi.admin@safawala.com')),
('EXP-BLR-001', (SELECT id FROM franchises WHERE code = 'BLR001'), 'salaries', 'Staff Salary', 47000.00, 'Staff salaries for November 2024', 'Staff', '2024-12-01', 'bank_transfer', 'SAL-NOV-001', (SELECT id FROM users WHERE email = 'bangalore.admin@safawala.com'));

-- Insert sample laundry batches
INSERT INTO laundry_batches (batch_number, franchise_id, vendor_id, total_items, total_cost, cost_per_item, status, sent_date, expected_return_date, created_by) VALUES
('LAU-MUM-001', (SELECT id FROM franchises WHERE code = 'MUM001'), (SELECT id FROM vendors WHERE vendor_code = 'VEN001'), 15, 750.00, 50.00, 'completed', '2024-12-10', '2024-12-12', (SELECT id FROM users WHERE email = 'mumbai.staff1@safawala.com')),
('LAU-DEL-001', (SELECT id FROM franchises WHERE code = 'DEL001'), (SELECT id FROM vendors WHERE vendor_code = 'VEN002'), 12, 600.00, 50.00, 'in_process', '2024-12-15', '2024-12-18', (SELECT id FROM users WHERE email = 'delhi.admin@safawala.com')),
('LAU-BLR-001', (SELECT id FROM franchises WHERE code = 'BLR001'), (SELECT id FROM vendors WHERE vendor_code = 'VEN003'), 8, 400.00, 50.00, 'pending', '2024-12-20', '2024-12-22', (SELECT id FROM users WHERE email = 'bangalore.admin@safawala.com'));

-- Insert sample activity logs
INSERT INTO activity_logs (user_id, franchise_id, action, entity_type, entity_id, new_values) VALUES
((SELECT id FROM users WHERE email = 'mumbai.admin@safawala.com'), (SELECT id FROM franchises WHERE code = 'MUM001'), 'CREATE', 'booking', (SELECT id FROM bookings WHERE booking_number = 'MUM-REN-001'), '{"booking_number": "MUM-REN-001", "status": "confirmed"}'),
((SELECT id FROM users WHERE email = 'mumbai.staff1@safawala.com'), (SELECT id FROM franchises WHERE code = 'MUM001'), 'UPDATE', 'booking', (SELECT id FROM bookings WHERE booking_number = 'MUM-REN-002'), '{"status": "delivered"}'),
((SELECT id FROM users WHERE email = 'delhi.admin@safawala.com'), (SELECT id FROM franchises WHERE code = 'DEL001'), 'CREATE', 'customer', (SELECT id FROM customers WHERE customer_code = 'DEL001'), '{"customer_code": "DEL001", "name": "Vikram & Sunita Engagement"}'),
((SELECT id FROM users WHERE email = 'bangalore.admin@safawala.com'), (SELECT id FROM franchises WHERE code = 'BLR001'), 'CREATE', 'product', (SELECT id FROM products WHERE product_code = 'BLR-TUR001'), '{"product_code": "BLR-TUR001", "name": "South Indian Silk Turban"}');

-- Update product stock based on bookings
UPDATE products SET 
    stock_booked = CASE 
        WHEN product_code = 'MUM-TUR001' THEN 2
        WHEN product_code = 'MUM-SEH001' THEN 1
        WHEN product_code = 'MUM-KAL001' THEN 1
        WHEN product_code = 'MUM-NEK001' THEN 1
        WHEN product_code = 'DEL-TUR001' THEN 1
        WHEN product_code = 'DEL-SEH001' THEN 1
        WHEN product_code = 'DEL-BRA001' THEN 2
        WHEN product_code = 'BLR-TUR001' THEN 1
        WHEN product_code = 'BLR-KAL001' THEN 1
        WHEN product_code = 'BLR-SHO001' THEN 2
        ELSE stock_booked
    END,
    stock_available = stock_total - stock_booked - stock_damaged - stock_in_laundry,
    usage_count = CASE 
        WHEN product_code IN ('MUM-TUR001', 'DEL-TUR001', 'BLR-TUR001') THEN 5
        WHEN product_code IN ('MUM-SEH001', 'DEL-SEH001') THEN 3
        WHEN product_code IN ('MUM-KAL001', 'BLR-KAL001') THEN 2
        WHEN product_code IN ('MUM-NEK001', 'DEL-BRA001', 'BLR-SHO001') THEN 4
        ELSE usage_count
    END;

-- Final verification queries
SELECT 'Franchises Created' as table_name, COUNT(*) as count FROM franchises
UNION ALL
SELECT 'Users Created', COUNT(*) FROM users
UNION ALL
SELECT 'Customers Created', COUNT(*) FROM customers
UNION ALL
SELECT 'Vendors Created', COUNT(*) FROM vendors
UNION ALL
SELECT 'Products Created', COUNT(*) FROM products
UNION ALL
SELECT 'Bookings Created', COUNT(*) FROM bookings
UNION ALL
SELECT 'Booking Items Created', COUNT(*) FROM booking_items
UNION ALL
SELECT 'Payments Created', COUNT(*) FROM payments
UNION ALL
SELECT 'Purchases Created', COUNT(*) FROM purchases
UNION ALL
SELECT 'Expenses Created', COUNT(*) FROM expenses
UNION ALL
SELECT 'Laundry Batches Created', COUNT(*) FROM laundry_batches
UNION ALL
SELECT 'Activity Logs Created', COUNT(*) FROM activity_logs;
