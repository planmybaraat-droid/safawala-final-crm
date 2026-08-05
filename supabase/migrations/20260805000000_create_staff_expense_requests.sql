-- Warehouse advance/expense workflow.
-- Staff submit expenses; an administrator reviews them before the ledger is charged.

create table if not exists public.staff_expense_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ledger_id uuid references public.staff_ledgers(id) on delete set null,
  franchise_id uuid references public.franchises(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null check (category in ('transport','packing','purchase','repair','laundry','food','other')),
  order_reference text,
  vendor_name text,
  expense_date date not null default current_date,
  notes text,
  receipt_url text,
  receipt_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','reimbursed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  ledger_transaction_id uuid references public.staff_ledger_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_expense_requests_user_created_idx
  on public.staff_expense_requests(user_id, created_at desc);
create index if not exists staff_expense_requests_franchise_status_idx
  on public.staff_expense_requests(franchise_id, status, created_at desc);

alter table public.staff_expense_requests enable row level security;

-- Requests are intentionally accessed through permission-checked server APIs.
-- The service role bypasses RLS; browser clients receive no direct table grants.
