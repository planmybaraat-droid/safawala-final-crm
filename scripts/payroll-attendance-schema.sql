-- Payroll and Attendance Module Database Schema

-- Shifts table for defining work schedules
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration INTEGER DEFAULT 0, -- in minutes
    working_hours DECIMAL(4,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee profiles (extends users table with employment details)
CREATE TABLE IF NOT EXISTS employee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    department VARCHAR(100),
    designation VARCHAR(100),
    shift_id UUID REFERENCES shifts(id),
    basic_salary DECIMAL(10,2) DEFAULT 0,
    hra DECIMAL(10,2) DEFAULT 0,
    transport_allowance DECIMAL(10,2) DEFAULT 0,
    medical_allowance DECIMAL(10,2) DEFAULT 0,
    other_allowances DECIMAL(10,2) DEFAULT 0,
    pf_deduction DECIMAL(10,2) DEFAULT 0,
    esi_deduction DECIMAL(10,2) DEFAULT 0,
    tax_deduction DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    bank_ifsc VARCHAR(20),
    pan_number VARCHAR(20),
    aadhar_number VARCHAR(20),
    employment_type VARCHAR(20) CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')) DEFAULT 'full_time',
    probation_period INTEGER DEFAULT 90, -- in days
    confirmation_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance records for daily tracking
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_id UUID REFERENCES shifts(id),
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    break_start_time TIMESTAMP WITH TIME ZONE,
    break_end_time TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')) DEFAULT 'absent',
    location_check_in TEXT,
    location_check_out TEXT,
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Leave types
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    max_days_per_year INTEGER DEFAULT 0,
    carry_forward BOOLEAN DEFAULT false,
    is_paid BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
    applied_date DATE DEFAULT CURRENT_DATE,
    approved_by UUID REFERENCES users(id),
    approved_date DATE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll records for salary processing
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    payroll_month DATE NOT NULL, -- First day of the month
    basic_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    hra DECIMAL(10,2) DEFAULT 0,
    transport_allowance DECIMAL(10,2) DEFAULT 0,
    medical_allowance DECIMAL(10,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    bonus DECIMAL(10,2) DEFAULT 0,
    other_allowances DECIMAL(10,2) DEFAULT 0,
    gross_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    pf_deduction DECIMAL(10,2) DEFAULT 0,
    esi_deduction DECIMAL(10,2) DEFAULT 0,
    tax_deduction DECIMAL(10,2) DEFAULT 0,
    loan_deduction DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    working_days INTEGER DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    leave_days INTEGER DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('draft', 'processed', 'paid', 'cancelled')) DEFAULT 'draft',
    payment_date DATE,
    payment_method VARCHAR(50),
    transaction_reference VARCHAR(100),
    notes TEXT,
    generated_by UUID REFERENCES users(id),
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, payroll_month)
);

-- Salary advances
CREATE TABLE IF NOT EXISTS salary_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    request_date DATE DEFAULT CURRENT_DATE,
    approved_date DATE,
    approved_by UUID REFERENCES users(id),
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'recovered')) DEFAULT 'pending',
    recovery_months INTEGER DEFAULT 1,
    monthly_deduction DECIMAL(10,2) DEFAULT 0,
    recovered_amount DECIMAL(10,2) DEFAULT 0,
    remaining_amount DECIMAL(10,2) DEFAULT 0,
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default leave types
INSERT INTO leave_types (franchise_id, name, max_days_per_year, carry_forward, is_paid) 
SELECT id, 'Annual Leave', 21, true, true FROM franchises WHERE is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO leave_types (franchise_id, name, max_days_per_year, carry_forward, is_paid) 
SELECT id, 'Sick Leave', 12, false, true FROM franchises WHERE is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO leave_types (franchise_id, name, max_days_per_year, carry_forward, is_paid) 
SELECT id, 'Casual Leave', 12, false, true FROM franchises WHERE is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO leave_types (franchise_id, name, max_days_per_year, carry_forward, is_paid) 
SELECT id, 'Maternity Leave', 180, false, true FROM franchises WHERE is_active = true
ON CONFLICT DO NOTHING;

-- Insert default shifts
INSERT INTO shifts (franchise_id, name, start_time, end_time, working_hours) 
SELECT id, 'Morning Shift', '09:00:00', '18:00:00', 8.0 FROM franchises WHERE is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO shifts (franchise_id, name, start_time, end_time, working_hours) 
SELECT id, 'Evening Shift', '14:00:00', '23:00:00', 8.0 FROM franchises WHERE is_active = true
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_franchise_date ON attendance_records(franchise_id, date);
CREATE INDEX IF NOT EXISTS idx_payroll_records_user_month ON payroll_records(user_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_payroll_records_franchise_month ON payroll_records(franchise_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_status ON leave_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_user_id ON employee_profiles(user_id);

-- Create functions for automatic calculations
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600;
        
        -- Calculate break time if provided
        IF NEW.break_start_time IS NOT NULL AND NEW.break_end_time IS NOT NULL THEN
            NEW.total_hours = NEW.total_hours - (EXTRACT(EPOCH FROM (NEW.break_end_time - NEW.break_start_time)) / 3600);
        END IF;
        
        -- Calculate overtime (assuming 8 hours is standard)
        IF NEW.total_hours > 8 THEN
            NEW.overtime_hours = NEW.total_hours - 8;
        END IF;
        
        -- Set status based on hours worked
        IF NEW.total_hours >= 8 THEN
            NEW.status = 'present';
        ELSIF NEW.total_hours >= 4 THEN
            NEW.status = 'half_day';
        ELSE
            NEW.status = 'absent';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for attendance calculations
DROP TRIGGER IF EXISTS trigger_calculate_attendance_hours ON attendance_records;
CREATE TRIGGER trigger_calculate_attendance_hours
    BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_attendance_hours();

-- Create function for payroll calculations
CREATE OR REPLACE FUNCTION calculate_payroll_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate gross salary
    NEW.gross_salary = NEW.basic_salary + NEW.hra + NEW.transport_allowance + 
                      NEW.medical_allowance + NEW.overtime_amount + NEW.bonus + NEW.other_allowances;
    
    -- Calculate total deductions
    NEW.total_deductions = NEW.pf_deduction + NEW.esi_deduction + NEW.tax_deduction + 
                          NEW.loan_deduction + NEW.other_deductions;
    
    -- Calculate net salary
    NEW.net_salary = NEW.gross_salary - NEW.total_deductions;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payroll calculations
DROP TRIGGER IF EXISTS trigger_calculate_payroll_amounts ON payroll_records;
CREATE TRIGGER trigger_calculate_payroll_amounts
    BEFORE INSERT OR UPDATE ON payroll_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payroll_amounts();
