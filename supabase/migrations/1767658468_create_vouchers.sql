-- Create Vouchers Table
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_number VARCHAR(100) UNIQUE NOT NULL,
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    voucher_type VARCHAR(50) NOT NULL CHECK (voucher_type IN ('expense', 'customer_payment')),
    account_name VARCHAR(255) NOT NULL, -- e.g. Petrol Expense, Customer Name
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(100) NOT NULL DEFAULT 'Cash', -- e.g. Cash, Bank, UPI, Card
    particulars TEXT,
    narration TEXT, -- "On Account of"
    amount_in_words VARCHAR(255),
    receiver_name VARCHAR(255), -- Receiver's Signature printed label
    prepared_by VARCHAR(255),
    booking_id UUID, -- Optional link to bookings / orders
    booking_number VARCHAR(100), -- Optional display booking number
    franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vouchers_franchise_id ON vouchers(franchise_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_number ON vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_date ON vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_type ON vouchers(voucher_type);

-- Enable Row Level Security (RLS)
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for authenticated users
DROP POLICY IF EXISTS "Enable all for authenticated users" ON vouchers;
CREATE POLICY "Enable all for authenticated users" ON vouchers FOR ALL USING (true) WITH CHECK (true);
