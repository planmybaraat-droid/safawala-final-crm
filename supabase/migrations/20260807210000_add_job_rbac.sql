-- Job system RBAC: permissions + roles for styling/travels/accounts staff and the
-- shared job.view/job.update permissions used across every department portal.
-- Safe to run repeatedly.

insert into public.roles (code, name, description)
values
  ('stylist', 'Stylist', 'On-site safa styling service and returns check-in'),
  ('travels_staff', 'Travels Staff', 'Ticket and hotel booking for assigned stylists'),
  ('accounts_staff', 'Accounts Staff', 'Final settlement and job closure')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.permissions (code, name, module, action)
values
  ('job.view', 'View jobs', 'job', 'view'),
  ('job.update', 'Update job tasks', 'job', 'update'),
  ('styling.view', 'View styling jobs', 'styling', 'view'),
  ('styling.update', 'Update styling jobs', 'styling', 'update'),
  ('travels.view', 'View travel bookings', 'travels', 'view'),
  ('travels.update', 'Update travel bookings', 'travels', 'update'),
  ('accounts.view', 'View accounts jobs', 'accounts', 'view'),
  ('accounts.update', 'Update accounts jobs', 'accounts', 'update')
on conflict (code) do update set name = excluded.name, module = excluded.module, action = excluded.action;

-- Administrators retain access to all new permissions.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.code in ('super_admin', 'franchise_admin')
  and p.code in ('job.view', 'job.update', 'styling.view', 'styling.update', 'travels.view', 'travels.update', 'accounts.view', 'accounts.update')
on conflict do nothing;

-- Department-scoped staff get job.* plus their own module permissions.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'warehouse_staff' and p.code in ('job.view', 'job.update')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'qc_staff' and p.code in ('job.view', 'job.update')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'delivery_staff' and p.code in ('job.view', 'job.update')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'stylist' and p.code in ('job.view', 'job.update', 'styling.view', 'styling.update')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'travels_staff' and p.code in ('job.view', 'job.update', 'travels.view', 'travels.update')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'accounts_staff' and p.code in ('job.view', 'job.update', 'accounts.view', 'accounts.update')
on conflict do nothing;

-- Bootstrap users whose department already matches these new roles.
insert into public.user_roles (user_id, role_id)
select u.id, r.id from public.users u join public.roles r on r.code = 'stylist'
where u.role = 'stylist' or lower(coalesce(u.department, '')) = 'styling'
on conflict do nothing;

insert into public.user_roles (user_id, role_id)
select u.id, r.id from public.users u join public.roles r on r.code = 'travels_staff'
where u.role = 'travels_staff' or lower(coalesce(u.department, '')) = 'travels'
on conflict do nothing;

insert into public.user_roles (user_id, role_id)
select u.id, r.id from public.users u join public.roles r on r.code = 'accounts_staff'
where u.role = 'accounts_staff' or lower(coalesce(u.department, '')) = 'accounts'
on conflict do nothing;
