-- QC decision is separate from the operational work-order lifecycle.
alter table if exists public.work_orders
  add column if not exists qc_status text not null default 'pending'
    check (qc_status in ('pending', 'pass', 'fail'));
alter table if exists public.work_orders add column if not exists qc_notes text;
alter table if exists public.work_orders add column if not exists qc_checked_by uuid references public.users(id) on delete set null;
alter table if exists public.work_orders add column if not exists qc_checked_at timestamptz;
create index if not exists work_orders_qc_status_idx on public.work_orders(franchise_id, qc_status, created_at desc);
