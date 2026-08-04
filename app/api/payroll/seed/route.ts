import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateRequest } from '@/lib/auth-middleware'

// Simple demo seed: creates salary configs & some adjustments and attendance if missing
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }
    const user = auth.user!

    // For demo we scope to user's franchise unless super_admin
    const franchiseId = user.role === 'super_admin' ? user.franchise_id : user.franchise_id

    // Fetch a few employees (including user if staff)
    const { data: employees, error: empErr } = await supabase
      .from('users')
      .select('id, name, role, franchise_id')
      .eq('franchise_id', franchiseId)
      .in('role', ['staff','franchise_admin'])
      .limit(5)
    if (empErr) throw empErr

    if (!employees || employees.length === 0) {
      return NextResponse.json({ warning: 'No staff users to seed' })
    }

    const month = new Date().toISOString().slice(0,7)
    const daysInMonth = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate()

    // Salary configs (basic + allowances + random overtime rate) if not present
    let createdConfigs = 0
    for (const emp of employees) {
      const { data: existingCfg } = await supabase.from('salary_configurations').select('id').eq('user_id', emp.id).eq('is_active', true).maybeSingle()
      if (!existingCfg) {
        const { error: insErr } = await supabase.from('salary_configurations').insert({
          user_id: emp.id,
          franchise_id: emp.franchise_id,
            basic_salary: 30000 + Math.floor(Math.random()*10000),
          hra: 5000,
          transport_allowance: 1500,
          medical_allowance: 1000,
          other_allowances: 800,
          overtime_rate: 250,
          bonus_rate: 0,
          pf_rate: 12,
          esi_rate: 0,
          tax_rate: 5,
        })
        if (insErr) throw insErr
        createdConfigs++
      }
    }

    // Attendance seeding: create present records for first 5 working days if absent
    let createdAttendance = 0
    for (let d=1; d<=5; d++) {
      const date = `${month}-${String(d).padStart(2,'0')}`
      for (const emp of employees) {
        const { data: existing } = await supabase.from('attendance_records').select('id').eq('user_id', emp.id).eq('date', date).maybeSingle()
        if (!existing) {
          const checkIn = new Date(`${date}T09:05:00Z`)
          const checkOut = new Date(`${date}T18:05:00Z`)
          const { error: attErr } = await supabase.from('attendance_records').insert({
            user_id: emp.id,
            franchise_id: emp.franchise_id,
            date,
            check_in_time: checkIn.toISOString(),
            check_out_time: checkOut.toISOString(),
            status: 'present'
          })
          if (attErr) throw attErr
          createdAttendance++
        }
      }
    }

    // Adjustments: add one bonus and one deduction for first employee
    let createdAdjustments = 0
    const first = employees[0]
    if (first) {
      const payrollMonthDate = month + '-01'
      const { data: existingAdj } = await supabase.from('salary_adjustments').select('id').eq('user_id', first.id).eq('payroll_month', payrollMonthDate)
      if (!existingAdj || existingAdj.length < 2) {
        const { error: adjErr } = await supabase.from('salary_adjustments').insert([
          { user_id: first.id, franchise_id: first.franchise_id, payroll_month: payrollMonthDate, type: 'bonus', amount: 1500, note: 'Performance bonus' },
          { user_id: first.id, franchise_id: first.franchise_id, payroll_month: payrollMonthDate, type: 'deduction', amount: 500, note: 'Late penalty' }
        ])
        if (adjErr) throw adjErr
        createdAdjustments += 2
      }
    }

    return NextResponse.json({
      status: 'ok',
      created: { configs: createdConfigs, attendance: createdAttendance, adjustments: createdAdjustments },
      employees: employees.length,
      month,
      daysInMonth
    })
  } catch (e:any) {
    console.error('[payroll/seed] error', e)
    return NextResponse.json({ error: e.message || 'Seed failed' }, { status: 500 })
  }
}
