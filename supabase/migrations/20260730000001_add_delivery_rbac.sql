-- Delivery department RBAC. Safe to run repeatedly after the base RBAC migration.
-- The application never trusts the client-side role; API handlers resolve these
-- assignments server-side on every request.

insert into public.roles (code, name, description)
values ('delivery_staff', 'Delivery Staff', 'Dispatch, delivery status and handover operations')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.permissions (code, name, module, action)
values
  ('delivery.view', 'View delivery orders', 'delivery', 'view'),
  ('delivery.update', 'Update dispatch and delivery status', 'delivery', 'update')
on conflict (code) do update set name = excluded.name, module = excluded.module, action = excluded.action;

-- Administrators retain access; delivery staff receive only the two delivery permissions.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.code in ('super_admin', 'franchise_admin')
  and p.code in ('delivery.view', 'delivery.update')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.code = 'delivery_staff'
  and p.code in ('delivery.view', 'delivery.update')
on conflict do nothing;

-- Note: this migration originally also set role = 'delivery_staff' on the
-- delivery@safawala.com row, but users_role_check only allows
-- super_admin/franchise_admin/staff/readonly — 'delivery_staff' violates it.
-- department = 'delivery' (already set at account creation) is sufficient:
-- the user_roles bootstrap below matches on department, not the role column.

-- Bootstrap all delivery users, including future users created with department=delivery.
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from public.users u
join public.roles r on r.code = 'delivery_staff'
where u.role = 'delivery_staff' or lower(coalesce(u.department, '')) = 'delivery'
on conflict do nothing;

create index if not exists users_department_active_idx
  on public.users(department, is_active);
