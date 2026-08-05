-- Migration for Warehouse & Staff Loan Requests
-- Allows staff to apply for loans/advances with EMI repayment schedules;
-- Administrators/Managers review and disburse funds into staff ledgers.

create table if not exists public.staff_loan_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ledger_id uuid references public.staff_ledgers(id) on delete set null,
  franchise_id uuid references public.franchises(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  purpose text not null check (purpose in ('emergency','personal','medical','education','festival','equipment','other')),
  reason text,
  tenure_months integer not null check (tenure_months >= 1 and tenure_months <= 24),
  monthly_emi numeric(12,2) not null check (monthly_emi >= 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','active','repaid')),
  repaid_amount numeric(12,2) not null default 0 check (repaid_amount >= 0),
  disbursed_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_loan_requests_user_created_idx
  on public.staff_loan_requests(user_id, created_at desc);

create index if not exists staff_loan_requests_franchise_status_idx
  on public.staff_loan_requests(franchise_id, status, created_at desc);

alter table public.staff_loan_requests enable row level security;
