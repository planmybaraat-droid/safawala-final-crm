-- Create public.verification_codes table for temporary OTP storage
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS verification_codes_phone_idx ON public.verification_codes(phone);
