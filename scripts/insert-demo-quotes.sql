-- Insert demo quote data for testing
INSERT INTO quotes (
  quote_number,
  customer_name,
  customer_phone,
  customer_email,
  customer_address,
  event_type,
  event_date,
  event_venue,
  event_guests,
  subtotal,
  gst_amount,
  total_amount,
  status,
  notes,
  created_at,
  updated_at
) VALUES 
(
  'QT20250001',
  'Rajesh Kumar',
  '+91 9876543210',
  'rajesh.kumar@email.com',
  '123 MG Road, Bangalore, Karnataka 560001',
  'Wedding',
  '2025-02-15',
  'Grand Palace Hotel, Bangalore',
  250,
  45000.00,
  8100.00,
  53100.00,
  'generated',
  'Premium wedding package with full decoration',
  NOW(),
  NOW()
),
(
  'QT20250002',
  'Priya Sharma',
  '+91 9876543211',
  'priya.sharma@email.com',
  '456 Brigade Road, Bangalore, Karnataka 560025',
  'Birthday Party',
  '2025-01-25',
  'Leela Palace, Bangalore',
  50,
  15000.00,
  2700.00,
  17700.00,
  'sent',
  'Birthday celebration with balloon decoration',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
(
  'QT20250003',
  'Amit Patel',
  '+91 9876543212',
  'amit.patel@email.com',
  '789 Commercial Street, Bangalore, Karnataka 560001',
  'Corporate Event',
  '2025-03-10',
  'ITC Gardenia, Bangalore',
  100,
  25000.00,
  4500.00,
  29500.00,
  'accepted',
  'Corporate annual day celebration',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '1 day'
),
(
  'QT20250004',
  'Sneha Reddy',
  '+91 9876543213',
  'sneha.reddy@email.com',
  '321 Koramangala, Bangalore, Karnataka 560034',
  'Engagement',
  '2025-01-30',
  'Taj West End, Bangalore',
  80,
  20000.00,
  3600.00,
  23600.00,
  'converted',
  'Engagement ceremony with floral decoration',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '3 days'
),
(
  'QT20250005',
  'Vikram Singh',
  '+91 9876543214',
  'vikram.singh@email.com',
  '654 Indiranagar, Bangalore, Karnataka 560038',
  'Anniversary',
  '2025-01-20',
  'The Oberoi, Bangalore',
  30,
  12000.00,
  2160.00,
  14160.00,
  'expired',
  '25th wedding anniversary celebration',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
);

-- Insert demo quote items
INSERT INTO quote_items (
  quote_id,
  product_name,
  category,
  quantity,
  unit_price,
  total_price,
  description
) VALUES 
-- Items for Quote 1 (Wedding)
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250001'),
  'Wedding Stage Decoration',
  'Decoration',
  1,
  25000.00,
  25000.00,
  'Premium wedding stage with flowers and lighting'
),
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250001'),
  'Mandap Setup',
  'Decoration',
  1,
  15000.00,
  15000.00,
  'Traditional mandap with decorative elements'
),
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250001'),
  'Floral Arrangements',
  'Flowers',
  10,
  500.00,
  5000.00,
  'Fresh flower arrangements for tables'
),

-- Items for Quote 2 (Birthday)
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250002'),
  'Balloon Decoration',
  'Decoration',
  1,
  8000.00,
  8000.00,
  'Colorful balloon arch and arrangements'
),
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250002'),
  'Birthday Backdrop',
  'Decoration',
  1,
  5000.00,
  5000.00,
  'Custom birthday theme backdrop'
),
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250002'),
  'Table Centerpieces',
  'Decoration',
  5,
  400.00,
  2000.00,
  'Birthday themed table centerpieces'
),

-- Items for Quote 3 (Corporate)
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250003'),
  'Corporate Branding Setup',
  'Decoration',
  1,
  15000.00,
  15000.00,
  'Company logo and branding displays'
),
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250003'),
  'Stage Setup',
  'Equipment',
  1,
  8000.00,
  8000.00,
  'Professional stage with sound system'
),
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250003'),
  'Lighting Setup',
  'Equipment',
  1,
  2000.00,
  2000.00,
  'Professional lighting arrangement'
),

-- Items for Quote 4 (Engagement)
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250004'),
  'Engagement Ring Ceremony Setup',
  'Decoration',
  1,
  12000.00,
  12000.00,
  'Elegant engagement ceremony decoration'
),
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250004'),
  'Floral Decoration',
  'Flowers',
  8,
  1000.00,
  8000.00,
  'Premium roses and lilies arrangement'
),

-- Items for Quote 5 (Anniversary)
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250005'),
  'Anniversary Decoration',
  'Decoration',
  1,
  8000.00,
  8000.00,
  'Silver anniversary themed decoration'
),
(
  (SELECT id FROM quotes WHERE quote_number = 'QT20250005'),
  'Photo Display Setup',
  'Equipment',
  1,
  4000.00,
  4000.00,
  'Memory lane photo display arrangement'
);
