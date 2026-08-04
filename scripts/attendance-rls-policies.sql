-- Attendance Module RLS & Policy Setup
-- ------------------------------------------------------------
-- This script secures the attendance_records table for use by the
-- Attendance Management UI (app/attendance/page.tsx).
-- Run this in the Supabase SQL editor or via your migration pipeline.
-- It is idempotent: safe to re-run.
-- ------------------------------------------------------------

-- 1. Enable RLS (if not already)
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 2. (Optional) Drop existing policies if you want a clean reset
-- Comment out DROP statements if you already curated policies manually.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'Select own or franchise attendance') THEN
    DROP POLICY "Select own or franchise attendance" ON attendance_records;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'Insert attendance (admin or self)') THEN
    DROP POLICY "Insert attendance (admin or self)" ON attendance_records;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'Update attendance (admin or self same day)') THEN
    DROP POLICY "Update attendance (admin or self same day)" ON attendance_records;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'Delete attendance (super admin)') THEN
    DROP POLICY "Delete attendance (super admin)" ON attendance_records;
  END IF;
END $$;

-- 3. Policies
-- Assumptions:
--   * users table has columns: id (uuid), role (text), franchise_id (uuid)
--   * Roles: super_admin, franchise_admin, staff (and maybe others)
--   * Franchise scoping enforced by comparing attendance_records.franchise_id
--   * Staff may insert/update ONLY their own record; franchise_admin/super_admin can manage all in their franchise or globally

-- Read access: user may read their own record OR records in their franchise OR everything if super_admin
CREATE POLICY "Select own or franchise attendance" ON attendance_records
FOR SELECT USING (
  auth.uid() = user_id
  OR franchise_id = (SELECT u.franchise_id FROM users u WHERE u.id = auth.uid())
  OR (SELECT u.role FROM users u WHERE u.id = auth.uid()) = 'super_admin'
);

-- Insert access: self insert OR franchise/super admin in same franchise OR super_admin global
CREATE POLICY "Insert attendance (admin or self)" ON attendance_records
FOR INSERT WITH CHECK (
  (
    -- Self marking (e.g., quick check-in)
    auth.uid() = user_id
    AND franchise_id = (SELECT u.franchise_id FROM users u WHERE u.id = auth.uid())
  )
  OR (
    -- Franchise admin managing within franchise
    (SELECT u.role FROM users u WHERE u.id = auth.uid()) IN ('franchise_admin','super_admin')
    AND franchise_id = (SELECT u.franchise_id FROM users u WHERE u.id = auth.uid())
  )
  OR (
    -- Global super admin override
    (SELECT u.role FROM users u WHERE u.id = auth.uid()) = 'super_admin'
  )
);

-- Update access: super/franchise admin for franchise OR self (only same day to prevent history tampering)
CREATE POLICY "Update attendance (admin or self same day)" ON attendance_records
FOR UPDATE USING (
  (
    -- Admins in same franchise
    (SELECT u.role FROM users u WHERE u.id = auth.uid()) IN ('franchise_admin','super_admin')
    AND franchise_id = (SELECT u.franchise_id FROM users u WHERE u.id = auth.uid())
  )
  OR (
    -- Super admin global
    (SELECT u.role FROM users u WHERE u.id = auth.uid()) = 'super_admin'
  )
  OR (
    -- Self update same day only
    auth.uid() = user_id AND date = CURRENT_DATE
  )
) WITH CHECK (
  -- Re-validate same conditions for new row
  (
    (SELECT u.role FROM users u WHERE u.id = auth.uid()) IN ('franchise_admin','super_admin')
    AND franchise_id = (SELECT u.franchise_id FROM users u WHERE u.id = auth.uid())
  )
  OR ( (SELECT u.role FROM users u WHERE u.id = auth.uid()) = 'super_admin')
  OR (auth.uid() = user_id AND date = CURRENT_DATE)
);

-- Delete access: only super admin (optional – remove if you do not want deletes at all)
CREATE POLICY "Delete attendance (super admin)" ON attendance_records
FOR DELETE USING (
  (SELECT u.role FROM users u WHERE u.id = auth.uid()) = 'super_admin'
);

-- 4. (Optional) Improved hours calculation trigger (non-destructive alternative function)
-- This version preserves manually set statuses like 'on_leave' and 'late' unless hours logic applies and status was neutral.
-- To adopt: run the function + swap trigger to call calculate_attendance_hours_v2 instead of calculate_attendance_hours.

CREATE OR REPLACE FUNCTION calculate_attendance_hours_v2()
RETURNS TRIGGER AS $$
DECLARE
  shift_start TIMESTAMP WITH TIME ZONE;
  shift_end   TIMESTAMP WITH TIME ZONE;
  shift_len_hours NUMERIC(4,2);
  grace_interval INTERVAL := INTERVAL '15 minutes';
BEGIN
  -- If we have both times, compute total hours
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    NEW.total_hours = ROUND(EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time))/3600::NUMERIC, 2);
    IF NEW.break_start_time IS NOT NULL AND NEW.break_end_time IS NOT NULL THEN
      NEW.total_hours = NEW.total_hours - ROUND(EXTRACT(EPOCH FROM (NEW.break_end_time - NEW.break_start_time))/3600::NUMERIC, 2);
    END IF;
  END IF;

  -- Determine shift baseline if shift_id present
  IF NEW.shift_id IS NOT NULL THEN
    SELECT (date || ' ' || s.start_time)::timestamptz,
           (date || ' ' || s.end_time)::timestamptz,
           s.working_hours
      INTO shift_start, shift_end, shift_len_hours
      FROM shifts s
     WHERE s.id = NEW.shift_id;
  END IF;

  -- Only auto-adjust status if not manually forced to on_leave
  IF NEW.status <> 'on_leave' THEN
    IF NEW.total_hours IS NOT NULL THEN
      IF NEW.total_hours >= COALESCE(shift_len_hours, 8) THEN
        -- Determine lateness only if we have shift start and check in later than start+grace
        IF shift_start IS NOT NULL AND NEW.check_in_time > (shift_start + grace_interval) THEN
          -- If they still worked full hours, we can keep them 'present' or mark 'late_present'; keeping 'present'
          NEW.status = 'late';
        ELSE
          NEW.status = 'present';
        END IF;
      ELSIF NEW.total_hours >= (COALESCE(shift_len_hours, 8) / 2) THEN
        NEW.status = 'half_day';
      ELSE
        -- Very short presence counts as absent unless already on_leave
        NEW.status = 'absent';
      END IF;
    END IF;
  END IF;

  -- Compute overtime if above shift length
  IF NEW.total_hours IS NOT NULL AND NEW.total_hours > COALESCE(shift_len_hours, 8) THEN
    NEW.overtime_hours = ROUND(NEW.total_hours - COALESCE(shift_len_hours, 8), 2);
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Swap trigger to new function (optional)
-- DROP TRIGGER IF EXISTS trigger_calculate_attendance_hours ON attendance_records;
-- CREATE TRIGGER trigger_calculate_attendance_hours
--     BEFORE INSERT OR UPDATE ON attendance_records
--     FOR EACH ROW
--     EXECUTE FUNCTION calculate_attendance_hours_v2();

-- 5. Additional helpful index (if you plan monthly views)
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(date);

-- 6. Sanity query (run manually after executing policies):
-- SELECT id, user_id, franchise_id, date, status FROM attendance_records LIMIT 5;
-- Should return rows only if your auth context (in SQL editor use service role) satisfies a policy.

-- End of script
