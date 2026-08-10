-- Merge the delivery and travels departments into one "Fulfillment" portal.
-- Only the staff-facing department/role is unified — the internal
-- work_order_tasks pipeline stage names ('dispatch', 'travels') are left
-- untouched, they're a separate concern from which portal a user lands in.

ALTER TABLE users DROP CONSTRAINT users_department_check;
ALTER TABLE users ADD CONSTRAINT users_department_check
  CHECK (department IS NULL OR department = ANY (ARRAY['admin','manager','booking','warehouse','qc','delivery','styling','accounts','franchise','hr','travels','fulfillment']::text[]));

UPDATE users SET department = 'fulfillment', updated_at = now() WHERE department IN ('delivery','travels');

UPDATE roles SET name = 'Fulfillment Staff', description = 'Dispatch, delivery status, handover and travel coordination operations' WHERE name = 'Delivery Staff';

-- Kept (not deleted) to avoid touching historical user_roles/audit_logs FKs.
UPDATE roles SET description = description || ' — merged into Fulfillment Staff' WHERE name = 'Travels Staff';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Fulfillment Staff' AND p.code IN ('travels.view','travels.update')
ON CONFLICT DO NOTHING;
