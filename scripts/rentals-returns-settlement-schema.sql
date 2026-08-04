-- Rental Returns & Settlement Schema
-- Safe, idempotent migration to support rental return workflow and settlement invoices

-- 0) Helper: Create audit_logs table if not exists (used by AuditLogger and our endpoints)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'audit_logs' AND table_schema = 'public'
  ) THEN
    CREATE TABLE public.audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('CREATE','UPDATE','DELETE','READ')),
      record_id TEXT NOT NULL,
      old_values JSONB,
      new_values JSONB,
      user_id TEXT,
      user_email TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      changes_summary TEXT,
      metadata JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
  END IF;
END $$;

-- 1) Rental Returns tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'rental_returns' AND table_schema = 'public'
  ) THEN
    CREATE TABLE public.rental_returns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
      delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
      processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_rental_returns_booking ON public.rental_returns(booking_id);
    CREATE INDEX IF NOT EXISTS idx_rental_returns_delivery ON public.rental_returns(delivery_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'rental_return_items' AND table_schema = 'public'
  ) THEN
    CREATE TABLE public.rental_return_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      return_id UUID REFERENCES rental_returns(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE SET NULL,
      qty_delivered INTEGER NOT NULL DEFAULT 0,
      qty_returned INTEGER NOT NULL DEFAULT 0,
      qty_damaged INTEGER NOT NULL DEFAULT 0,
      qty_lost INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_rental_return_items_return ON public.rental_return_items(return_id);
    CREATE INDEX IF NOT EXISTS idx_rental_return_items_product ON public.rental_return_items(product_id);
  END IF;
END $$;

-- 2) Alter bookings for settlement fields
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deductions_total'
  ) THEN
    ALTER TABLE bookings ADD COLUMN deductions_total DECIMAL(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'refund_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN refund_amount DECIMAL(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'extra_charge'
  ) THEN
    ALTER TABLE bookings ADD COLUMN extra_charge DECIMAL(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'settled_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN settled_by UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'settled_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN settled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'settlement_locked'
  ) THEN
    ALTER TABLE bookings ADD COLUMN settlement_locked BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'settlement_details'
  ) THEN
    ALTER TABLE bookings ADD COLUMN settlement_details JSONB;
  END IF;
END $$;

-- Ensure deposit_amount exists (added by earlier scripts, but keep idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deposit_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN deposit_amount DECIMAL(12,2) DEFAULT 0;
  END IF;
END $$;

-- 3) Alter products for damage/lost fees
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'damage_fee'
  ) THEN
    ALTER TABLE products ADD COLUMN damage_fee DECIMAL(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'lost_fee'
  ) THEN
    ALTER TABLE products ADD COLUMN lost_fee DECIMAL(12,2) DEFAULT 0;
  END IF;
END $$;

-- 4) Alter invoices to carry PDF URL for settlement invoices
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN pdf_url TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'pdf_generated'
  ) THEN
    ALTER TABLE invoices ADD COLUMN pdf_generated BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 5) Alter financial_transactions to include settlement context
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'invoice_id'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'settlement_reference'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN settlement_reference VARCHAR(100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'subtype'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN subtype VARCHAR(30) CHECK (subtype IN ('deposit_refund','settlement_charge'));
  END IF;
END $$;

-- 6) Storage note (manual): ensure bucket 'invoices' exists with folder 'settlements/'.
-- Use existing storage policies; uploads will be done via service role key.
