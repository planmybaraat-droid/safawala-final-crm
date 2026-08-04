-- Additional Payroll Schema (salary configuration & run tracking)

CREATE TABLE IF NOT EXISTS salary_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  basic_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  hra DECIMAL(10,2) DEFAULT 0,
  transport_allowance DECIMAL(10,2) DEFAULT 0,
  medical_allowance DECIMAL(10,2) DEFAULT 0,
  other_allowances DECIMAL(10,2) DEFAULT 0,
  overtime_rate DECIMAL(10,2) DEFAULT 0, -- per overtime hour
  bonus_rate DECIMAL(10,2) DEFAULT 0, -- optional performance bonus per month
  pf_rate DECIMAL(5,2) DEFAULT 0,      -- percentage of basic
  esi_rate DECIMAL(5,2) DEFAULT 0,     -- percentage of gross
  tax_rate DECIMAL(5,2) DEFAULT 0,     -- percentage of taxable (simplified)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_config_user_active ON salary_configurations(user_id, is_active);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  payroll_month DATE NOT NULL, -- first day of month
  status VARCHAR(20) CHECK (status IN ('draft','calculating','completed','locked','failed')) DEFAULT 'draft',
  initiated_by UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(franchise_id, payroll_month)
);

CREATE TABLE IF NOT EXISTS payroll_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  working_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  leave_days INTEGER DEFAULT 0,
  payable_days DECIMAL(6,2) DEFAULT 0,
  total_hours DECIMAL(8,2) DEFAULT 0,
  overtime_hours DECIMAL(8,2) DEFAULT 0,
  basic_salary DECIMAL(10,2) DEFAULT 0,
  hra DECIMAL(10,2) DEFAULT 0,
  transport_allowance DECIMAL(10,2) DEFAULT 0,
  medical_allowance DECIMAL(10,2) DEFAULT 0,
  other_allowances DECIMAL(10,2) DEFAULT 0,
  overtime_amount DECIMAL(10,2) DEFAULT 0,
  bonus DECIMAL(10,2) DEFAULT 0,
  gross_salary DECIMAL(12,2) DEFAULT 0,
  pf_deduction DECIMAL(10,2) DEFAULT 0,
  esi_deduction DECIMAL(10,2) DEFAULT 0,
  tax_deduction DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payroll_run_id, user_id)
);

-- Manual / automated adjustments (bonuses, deductions, advance recoveries)
CREATE TABLE IF NOT EXISTS salary_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  payroll_month DATE NOT NULL, -- applies to month (first day convention)
  type VARCHAR(30) CHECK (type IN ('bonus','deduction','advance_recovery','overtime_manual','allowance','other')) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_adjustments_user_month ON salary_adjustments(user_id, payroll_month);
ALTER TABLE salary_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY salary_adjustments_select ON salary_adjustments FOR SELECT USING (true);
CREATE POLICY salary_adjustments_mod ON salary_adjustments FOR INSERT WITH CHECK (true);
CREATE POLICY salary_adjustments_upd ON salary_adjustments FOR UPDATE USING (true) WITH CHECK (true);

-- Simple RLS placeholders (adjust with actual roles + auth.uid())
ALTER TABLE salary_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_config_select ON salary_configurations FOR SELECT USING (true);
CREATE POLICY salary_config_mod ON salary_configurations FOR INSERT WITH CHECK (true);
CREATE POLICY salary_config_upd ON salary_configurations FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY payroll_runs_select ON payroll_runs FOR SELECT USING (true);
CREATE POLICY payroll_runs_mod ON payroll_runs FOR INSERT WITH CHECK (true);
CREATE POLICY payroll_runs_upd ON payroll_runs FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY payroll_line_items_select ON payroll_line_items FOR SELECT USING (true);
CREATE POLICY payroll_line_items_mod ON payroll_line_items FOR INSERT WITH CHECK (true);
CREATE POLICY payroll_line_items_upd ON payroll_line_items FOR UPDATE USING (true) WITH CHECK (true);

-- Future: tighten RLS to franchise ownership and role-based edits.
