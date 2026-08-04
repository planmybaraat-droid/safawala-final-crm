-- Recruitment candidates table for HR portal
create table if not exists public.recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  department text not null,
  position text,
  source text default 'direct',
  status text not null default 'applied'
    check (status in ('applied','screening','interview_scheduled','interview_done','offer_made','joined','rejected')),
  interview_date date,
  interview_time text,
  interviewer text,
  joining_date date,
  notes text,
  applied_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Employee KYC documents table
create table if not exists public.employee_kyc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  franchise_id uuid references public.franchises(id) on delete cascade,
  doc_type text not null,
  status text not null default 'pending'
    check (status in ('pending','uploaded','verified','rejected')),
  url text,
  note text,
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, doc_type)
);

-- RLS
alter table public.recruitment_candidates enable row level security;
alter table public.employee_kyc enable row level security;

create policy "franchise recruitment access" on public.recruitment_candidates
  for all using (
    auth.uid() in (
      select id from public.users
      where franchise_id = recruitment_candidates.franchise_id
        or role = 'super_admin'
    )
  );

create policy "franchise kyc access" on public.employee_kyc
  for all using (
    auth.uid() in (
      select id from public.users
      where franchise_id = employee_kyc.franchise_id
        or role = 'super_admin'
    )
  );
