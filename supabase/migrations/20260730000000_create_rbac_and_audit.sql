-- Enterprise RBAC foundation for department portals.
-- Authorization is kept in relational tables; do not use user_metadata for access decisions.

-- Older installations may not have a department column yet. Keep the
-- migration additive so the warehouse portal can enforce its department scope.
alter table if exists public.users
  add column if not exists department text;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  module text not null,
  action text not null check (action in ('view','create','update','delete','export','manage')),
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  user_email text,
  franchise_id uuid references public.franchises(id) on delete set null,
  module text not null,
  action text not null,
  resource_type text,
  resource_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists role_permissions_permission_idx on public.role_permissions(permission_id);
create index if not exists user_roles_role_idx on public.user_roles(role_id);
create index if not exists audit_logs_user_created_idx on public.audit_logs(user_id, created_at desc);
create index if not exists audit_logs_module_created_idx on public.audit_logs(module, created_at desc);
create index if not exists work_orders_franchise_created_idx on public.work_orders(franchise_id, created_at desc);
create index if not exists work_order_tasks_department_assignee_idx on public.work_order_tasks(department, assigned_to, status);
create index if not exists products_franchise_active_idx on public.products(franchise_id, is_active, name);

insert into public.roles (code, name, description) values
  ('super_admin', 'Super Admin', 'Global administration'),
  ('franchise_admin', 'Franchise Admin', 'Full access within a franchise'),
  ('warehouse_staff', 'Warehouse Staff', 'Picking, packing and stock operations'),
  ('qc_staff', 'QC Staff', 'Quality inspection and release to delivery'),
  ('readonly', 'Read Only', 'Read-only access')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.permissions (code, name, module, action) values
  ('warehouse.view', 'View warehouse', 'warehouse', 'view'),
  ('warehouse.update', 'Update warehouse', 'warehouse', 'update'),
  ('warehouse.create', 'Create warehouse records', 'warehouse', 'create'),
  ('warehouse.delete', 'Delete warehouse records', 'warehouse', 'delete'),
  ('warehouse.export', 'Export warehouse data', 'warehouse', 'export'),
  ('qc.view', 'View quality control work', 'qc', 'view'),
  ('qc.update', 'Perform quality checks', 'qc', 'update'),
  ('users.manage', 'Manage users', 'admin', 'manage'),
  ('roles.manage', 'Manage roles', 'admin', 'manage'),
  ('permissions.manage', 'Manage permissions', 'admin', 'manage'),
  ('settings.manage', 'Manage settings', 'admin', 'manage')
on conflict (code) do update set name = excluded.name, module = excluded.module, action = excluded.action;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.code in ('super_admin', 'franchise_admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r join public.permissions p on p.code in ('warehouse.view', 'warehouse.update')
where r.code = 'warehouse_staff'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r join public.permissions p on p.code in ('qc.view', 'qc.update')
where r.code = 'qc_staff'
on conflict do nothing;

-- Bootstrap relational assignments from the existing role column. This is idempotent.
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from public.users u join public.roles r on r.code = case
  when u.role = 'warehouse_staff' or coalesce(u.department, '') = 'warehouse' then 'warehouse_staff'
  when u.role = 'qc_staff' or coalesce(u.department, '') = 'qc' then 'qc_staff'
  when u.role in ('super_admin', 'franchise_admin', 'readonly') then u.role
  else null
end
where r.id is not null
on conflict do nothing;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;

-- Relational permission lookups are read-only for signed-in users; writes stay server-side.
drop policy if exists "authenticated can read roles" on public.roles;
create policy "authenticated can read roles" on public.roles for select to authenticated using (true);
drop policy if exists "authenticated can read permissions" on public.permissions;
create policy "authenticated can read permissions" on public.permissions for select to authenticated using (true);
drop policy if exists "authenticated can read role permissions" on public.role_permissions;
create policy "authenticated can read role permissions" on public.role_permissions for select to authenticated using (true);
drop policy if exists "users can read own role assignments" on public.user_roles;
create policy "users can read own role assignments" on public.user_roles for select to authenticated using (user_id = auth.uid());
drop policy if exists "users can read own audit logs" on public.audit_logs;
create policy "users can read own audit logs" on public.audit_logs for select to authenticated using (user_id = auth.uid());

-- Keep the authorization helper outside the exposed API schema and execute it only as a lookup.
create schema if not exists private;
create or replace function private.user_has_permission(permission_code text)
returns boolean
language sql
security definer
set search_path = public, private
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid() and p.code = permission_code
  )
  or exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'super_admin' and u.is_active = true
  );
$$;
revoke all on function private.user_has_permission(text) from public;
grant execute on function private.user_has_permission(text) to authenticated;

-- API clients can read their own effective permission rows, but cannot mutate the model.
grant select on public.roles, public.permissions, public.role_permissions, public.user_roles to authenticated;
