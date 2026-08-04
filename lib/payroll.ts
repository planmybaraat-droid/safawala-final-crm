import { supabase } from '@/lib/supabase'

export interface SalaryConfiguration {
  id: string
  user_id: string
  franchise_id: string
  effective_from: string
  basic_salary: number
  hra: number
  transport_allowance: number
  medical_allowance: number
  other_allowances: number
  overtime_rate: number
  bonus_rate: number
  pf_rate: number
  esi_rate: number
  tax_rate: number
  is_active: boolean
}

export interface PayrollComputationInput {
  month: string // YYYY-MM
  franchiseId?: string | null
  filter?: {
    search?: string
    overtimeOnly?: boolean
    missingConfigOnly?: boolean
    minNet?: number
    maxNet?: number
  }
}

export interface EmployeePayrollLine {
  user_id: string
  employee_name: string
  employee_id: string
  working_days: number
  present_days: number
  absent_days: number
  leave_days: number
  payable_days: number
  total_hours: number
  overtime_hours: number
  basic_salary: number
  hra: number
  transport_allowance: number
  medical_allowance: number
  other_allowances: number
  overtime_amount: number
  bonus: number
  gross_salary: number
  pf_deduction: number
  esi_deduction: number
  tax_deduction: number
  other_deductions: number
  net_salary: number
  missing_config?: boolean
}

export interface PayrollSummaryResult {
  month: string
  start: string
  end: string
  franchiseId?: string | null
  lines: EmployeePayrollLine[]
  totals: {
    gross: number
    net: number
    overtime_hours: number
    overtime_amount: number
  }
  warnings: string[]
}

function firstAndLastDay(month: string) {
  const [y,m] = month.split('-').map(Number)
  const start = new Date(y, m-1, 1)
  const end = new Date(y, m, 0)
  const iso = (d:Date)=> d.toISOString().slice(0,10)
  return { start: iso(start), end: iso(end), workingDays: end.getDate() }
}

export async function computePayroll({ month, franchiseId, filter }: PayrollComputationInput): Promise<PayrollSummaryResult> {
  const { start, end, workingDays } = firstAndLastDay(month)
  const warnings: string[] = []

  // Load attendance within month
  let attendanceQuery = supabase.from('attendance_records').select(`
    user_id, date, status, total_hours, overtime_hours
  `).gte('date', start).lte('date', end)
  if (franchiseId) attendanceQuery = attendanceQuery.eq('franchise_id', franchiseId)
  const { data: attendance, error: attendanceError } = await attendanceQuery
  if (attendanceError) throw attendanceError

  // Load salary configurations (active, effective before end date)
  let salaryQuery = supabase.from('salary_configurations').select('*').eq('is_active', true).lte('effective_from', end)
  if (franchiseId) salaryQuery = salaryQuery.eq('franchise_id', franchiseId)
  const { data: salaryConfigs, error: salaryError } = await salaryQuery
  if (salaryError) throw salaryError
  const configMap: Record<string, SalaryConfiguration> = {}
  ;(salaryConfigs||[]).forEach((c: any) => { configMap[c.user_id] = c as SalaryConfiguration })

  // Load user names
  let userQuery = supabase.from('users').select('id, name').in('id', Array.from(new Set((attendance||[]).map((a:any)=>a.user_id))))
  const { data: usersData } = await userQuery
  const nameMap: Record<string,string> = {}
  ;(usersData||[]).forEach((u:any)=> nameMap[u.id]=u.name)

  // Load salary adjustments for the month (apply to gross/net later)
  let adjustmentsQuery = supabase.from('salary_adjustments').select('*').gte('payroll_month', start).lte('payroll_month', end)
  if (franchiseId) adjustmentsQuery = adjustmentsQuery.eq('franchise_id', franchiseId)
  const { data: adjustments, error: adjustmentsError } = await adjustmentsQuery
  if (adjustmentsError) throw adjustmentsError
  const adjustmentsByUser: Record<string, any[]> = {}
  ;(adjustments||[]).forEach((adj:any)=>{
    if(!adjustmentsByUser[adj.user_id]) adjustmentsByUser[adj.user_id] = []
    adjustmentsByUser[adj.user_id].push(adj)
  })

  // Group attendance by user
  const byUser: Record<string, any[]> = {}
  for (const rec of (attendance||[])) {
    if (!byUser[rec.user_id]) byUser[rec.user_id] = []
    byUser[rec.user_id].push(rec)
  }

  const lines: EmployeePayrollLine[] = []
  for (const userId of Object.keys(byUser)) {
    const records = byUser[userId]
    const presentDays = records.filter(r=> r.status === 'present' || r.status === 'half_day').length // treat half_day toward payable portion
    const halfDays = records.filter(r=> r.status === 'half_day').length
    const leaveDays = records.filter(r=> r.status === 'on_leave').length
    const absentDays = workingDays - (presentDays + leaveDays) // simplistic
    const totalHours = records.reduce((s,r)=> s + (r.total_hours||0), 0)
    const overtimeHours = records.reduce((s,r)=> s + (r.overtime_hours||0), 0)

    const config = configMap[userId]
    let basic = 0, hra=0, ta=0, med=0, other=0, overtimeRate=0, bonusRate=0, pfRate=0, esiRate=0, taxRate=0
    let missing_config = false
    if (config) {
      basic = Number(config.basic_salary)||0
      hra = Number(config.hra)||0
      ta = Number(config.transport_allowance)||0
      med = Number(config.medical_allowance)||0
      other = Number(config.other_allowances)||0
      overtimeRate = Number(config.overtime_rate)||0
      bonusRate = Number(config.bonus_rate)||0
      pfRate = Number(config.pf_rate)||0
      esiRate = Number(config.esi_rate)||0
      taxRate = Number(config.tax_rate)||0
    } else {
      missing_config = true
      warnings.push(`No salary configuration for user ${userId}`)
    }

    // Payable days: full days + half days * 0.5 + paid leave (assuming on_leave is paid for now)
    const payableDays = (presentDays - halfDays) + halfDays * 0.5 + leaveDays
    const perDayBasic = workingDays ? basic / workingDays : 0
    const earnedBasic = perDayBasic * payableDays

    const allowances = hra + ta + med + other
    const overtimeAmount = overtimeHours * overtimeRate
    const bonus = bonusRate // treat as flat monthly for now

    let gross = earnedBasic + allowances + overtimeAmount + bonus

    // Apply adjustments (bonus adds, deduction subtracts, advance_recovery subtracts, allowance adds, overtime_manual adds) before statutory deductions
    const userAdjustments = adjustmentsByUser[userId] || []
    let adjustmentTotal = 0
    for (const adj of userAdjustments) {
      switch (adj.type) {
        case 'bonus':
        case 'allowance':
        case 'overtime_manual':
          adjustmentTotal += Number(adj.amount)||0; break
        case 'deduction':
        case 'advance_recovery':
          adjustmentTotal -= Number(adj.amount)||0; break
        default:
          adjustmentTotal += Number(adj.amount)||0; // treat unknown as addition
      }
    }
    gross += adjustmentTotal

    const pf = pfRate ? earnedBasic * (pfRate/100) : 0
    const esi = esiRate ? gross * (esiRate/100) : 0
    const tax = taxRate ? gross * (taxRate/100) : 0

    const deductions = pf + esi + tax
  const net = gross - deductions

    const line: EmployeePayrollLine = {
      user_id: userId,
      employee_name: nameMap[userId] || 'Unknown',
      employee_id: userId.slice(-6).toUpperCase(),
      working_days: workingDays,
      present_days: presentDays,
      absent_days: absentDays,
      leave_days: leaveDays,
      payable_days: Number(payableDays.toFixed(2)),
      total_hours: Number(totalHours.toFixed(2)),
      overtime_hours: Number(overtimeHours.toFixed(2)),
      basic_salary: Number(earnedBasic.toFixed(2)),
      hra, transport_allowance: ta, medical_allowance: med, other_allowances: other,
      overtime_amount: Number(overtimeAmount.toFixed(2)),
      bonus, gross_salary: Number(gross.toFixed(2)),
      pf_deduction: Number(pf.toFixed(2)), esi_deduction: Number(esi.toFixed(2)), tax_deduction: Number(tax.toFixed(2)),
      other_deductions: 0,
      net_salary: Number(net.toFixed(2)),
      missing_config
    }

    // Apply filters (server-side thinning) if provided
    if (filter) {
      if (filter.overtimeOnly && line.overtime_hours <= 0) continue
      if (filter.missingConfigOnly && !line.missing_config) continue
      if (typeof filter.minNet === 'number' && line.net_salary < filter.minNet) continue
      if (typeof filter.maxNet === 'number' && line.net_salary > filter.maxNet) continue
      if (filter.search) {
        const needle = filter.search.toLowerCase()
        if (!line.employee_name.toLowerCase().includes(needle) && !line.employee_id.toLowerCase().includes(needle)) continue
      }
    }

    lines.push(line)
  }

  const totals = lines.reduce((acc,l)=>{
    acc.gross += l.gross_salary
    acc.net += l.net_salary
    acc.overtime_hours += l.overtime_hours
    acc.overtime_amount += l.overtime_amount
    return acc
  }, { gross:0, net:0, overtime_hours:0, overtime_amount:0 })

  return { month, start, end, franchiseId, lines, totals: {
    gross: Number(totals.gross.toFixed(2)),
    net: Number(totals.net.toFixed(2)),
    overtime_hours: Number(totals.overtime_hours.toFixed(2)),
    overtime_amount: Number(totals.overtime_amount.toFixed(2))
  }, warnings }
}
