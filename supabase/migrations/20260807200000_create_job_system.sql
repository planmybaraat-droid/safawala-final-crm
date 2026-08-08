-- Migration: Create unified Job tracking system (replaces work_orders for new bookings)
-- Booking -> Warehouse -> QC -> Delivery -> Travels -> Styling -> Returns (styling) -> Accounts
-- Old work_orders/work_order_tasks tables are left untouched and unused by new code.

CREATE SEQUENCE IF NOT EXISTS job_number_seq START 1;

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number VARCHAR(50) UNIQUE NOT NULL,
    booking_id UUID NOT NULL,
    booking_source VARCHAR(50) NOT NULL DEFAULT 'product_orders',
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    department VARCHAR(50) NOT NULL CHECK (department IN
        ('booking', 'warehouse', 'qc', 'delivery', 'travels', 'styling', 'accounts')),
    status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    checklist JSONB DEFAULT '[]'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, department)
);

CREATE TABLE IF NOT EXISTS job_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('delivery', 'styling')),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, role, user_id)
);

CREATE TABLE IF NOT EXISTS job_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('delivery', 'styling')),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, role)
);

CREATE INDEX IF NOT EXISTS idx_jobs_booking_id ON jobs(booking_id);
CREATE INDEX IF NOT EXISTS idx_jobs_franchise_id ON jobs(franchise_id);
CREATE INDEX IF NOT EXISTS idx_job_tasks_job_id ON job_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_job_tasks_department ON job_tasks(department);
CREATE INDEX IF NOT EXISTS idx_job_tasks_status ON job_tasks(status);
CREATE INDEX IF NOT EXISTS idx_job_interests_job_id ON job_interests(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id ON job_assignments(job_id);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_all_access" ON jobs;
CREATE POLICY "jobs_all_access" ON jobs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "job_tasks_all_access" ON job_tasks;
CREATE POLICY "job_tasks_all_access" ON job_tasks FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "job_interests_all_access" ON job_interests;
CREATE POLICY "job_interests_all_access" ON job_interests FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "job_assignments_all_access" ON job_assignments;
CREATE POLICY "job_assignments_all_access" ON job_assignments FOR ALL USING (true) WITH CHECK (true);

-- Idempotent RPC: creates a Job + all 8 department tasks for a confirmed booking.
-- Safe to call more than once for the same booking_id (ON CONFLICT DO NOTHING).
CREATE OR REPLACE FUNCTION create_job_for_booking(
    p_booking_id UUID,
    p_booking_source TEXT,
    p_franchise_id UUID
) RETURNS UUID AS $$
DECLARE
    v_job_id UUID;
    v_job_number TEXT;
BEGIN
    SELECT id INTO v_job_id FROM jobs WHERE booking_id = p_booking_id AND booking_source = p_booking_source;
    IF v_job_id IS NOT NULL THEN
        RETURN v_job_id;
    END IF;

    v_job_number := 'JOB-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('job_number_seq')::TEXT, 4, '0');

    INSERT INTO jobs (job_number, booking_id, booking_source, franchise_id, status)
    VALUES (v_job_number, p_booking_id, p_booking_source, p_franchise_id, 'active')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_job_id;

    IF v_job_id IS NULL THEN
        SELECT id INTO v_job_id FROM jobs WHERE booking_id = p_booking_id AND booking_source = p_booking_source;
        RETURN v_job_id;
    END IF;

    INSERT INTO job_tasks (job_id, department, status, completed_at)
    VALUES (v_job_id, 'booking', 'completed', NOW())
    ON CONFLICT (job_id, department) DO NOTHING;

    INSERT INTO job_tasks (job_id, department, status)
    SELECT v_job_id, d, 'waiting'
    FROM unnest(ARRAY['warehouse', 'qc', 'delivery', 'travels', 'styling', 'accounts']) AS d
    ON CONFLICT (job_id, department) DO NOTHING;

    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
