-- Add KYC fields and lead_id relation to public.customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected'));
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS aadhar_number text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pan_number text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_document_url text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_notes text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id);
