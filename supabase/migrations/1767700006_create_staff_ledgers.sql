-- Create staff_ledgers table
CREATE TABLE IF NOT EXISTS public.staff_ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    base_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
    utilized_credit DECIMAL(10, 2) NOT NULL DEFAULT 0,
    credit_limit DECIMAL(10, 2) NOT NULL DEFAULT 25000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create staff_ledger_transactions table
CREATE TABLE IF NOT EXISTS public.staff_ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID REFERENCES public.staff_ledgers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an RLS policy or just enable RLS
ALTER TABLE public.staff_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_ledger_transactions ENABLE ROW LEVEL SECURITY;

-- Temporarily bypass RLS or allow authenticated users to read/write for staff features
CREATE POLICY "Enable read access for all users" ON public.staff_ledgers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.staff_ledgers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.staff_ledgers FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.staff_ledger_transactions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.staff_ledger_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.staff_ledger_transactions FOR UPDATE USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_ledgers_modtime
    BEFORE UPDATE ON public.staff_ledgers
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
