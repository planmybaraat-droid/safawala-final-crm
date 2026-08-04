import { NextRequest, NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function computeInventorySummary(franchiseId?: string | null) {
  const supabase = createClient()
  const base = supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true)
  const withFr = franchiseId ? base.eq('franchise_id', franchiseId) : base
  const { count: totalCount, error: tErr } = await withFr
  if (tErr) throw tErr

  const availCol = 'stock_available'
  const reorderCol = 'reorder_level'

  const inStockQuery = supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gt(availCol, 0)
    .gt(`${availCol}`, 0)
  const inStock = franchiseId ? inStockQuery.eq('franchise_id', franchiseId) : inStockQuery
  // inStock: stock_available > reorder_level
  const { data: inStockData } = await (async () => {
    const { data } = await (franchiseId
      ? supabase.from('products').select(`${availCol}, ${reorderCol}`).eq('is_active', true).eq('franchise_id', franchiseId)
      : supabase.from('products').select(`${availCol}, ${reorderCol}`).eq('is_active', true))
    return { data: data || [] as any[] }
  })()
  const inStockCount = (inStockData || []).filter((p: any) => Number(p[availCol] || 0) > Number(p[reorderCol] || 0)).length

  const { data: lowData } = await (async () => {
    const { data } = await (franchiseId
      ? supabase.from('products').select(`${availCol}, ${reorderCol}`).eq('is_active', true).eq('franchise_id', franchiseId)
      : supabase.from('products').select(`${availCol}, ${reorderCol}`).eq('is_active', true))
    return { data: data || [] as any[] }
  })()
  const lowStockCount = (lowData || []).filter((p: any) => Number(p[availCol] || 0) <= Number(p[reorderCol] || 0) && Number(p[availCol] || 0) > 0).length

  const outQuery = supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lte(availCol, 0)
  const outStock = franchiseId ? outQuery.eq('franchise_id', franchiseId) : outQuery
  const { count: outOfStockCount } = await outStock

  return [
    { name: 'Total Products', value: totalCount || 0 },
    { name: 'In Stock', value: inStockCount },
    { name: 'Low Stock', value: lowStockCount },
    { name: 'Out of Stock', value: outOfStockCount || 0 },
  ]
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const { format, dateRange, franchiseFilter, reportData } = await request.json()
    const userFranchiseId = user.franchise_id
    const isSuperAdmin = user.is_super_admin
    // Enforce franchise isolation: non-super-admins can only export their own franchise
    const effectiveFranchise = isSuperAdmin ? (franchiseFilter || null) : userFranchiseId
    if (franchiseFilter && !AuthMiddleware.canAccessFranchise(user, franchiseFilter)) {
      return NextResponse.json({ error: 'Forbidden: franchise mismatch' }, { status: 403 })
    }

    // Compute inventory summary server-side when we have a franchise context
    let inventorySummary = reportData?.inventory || []
    if (effectiveFranchise) {
      try {
        inventorySummary = await computeInventorySummary(effectiveFranchise)
      } catch (e) {
        console.error('[Export] Inventory summary compute failed, falling back to client data:', e)
      }
    }

    if (format === 'pdf') {
      const doc = new jsPDF()
      
      // Title
      doc.setFontSize(20)
      doc.text('Safawala CRM - Analytics Report', 20, 25)
      
      // Date range
      doc.setFontSize(12)
      doc.text(`Report Period: ${new Date(dateRange.from).toLocaleDateString()} - ${new Date(dateRange.to).toLocaleDateString()}`, 20, 40)
      
      // Revenue Summary
      doc.setFontSize(14)
      doc.text('Revenue Summary', 20, 60)
      
      const revenueTableData = reportData.revenue.map((item: any) => [
        item.name,
        `₹${item.value.toLocaleString()}`
      ])
      
      ;(doc as any).autoTable({
        startY: 70,
        head: [['Period', 'Revenue']],
        body: revenueTableData,
        theme: 'grid'
      })
      
      // Expenses Summary
      let currentY = (doc as any).lastAutoTable.finalY + 20
      doc.text('Expenses Summary', 20, currentY)
      
      const expensesTableData = reportData.expenses.map((item: any) => [
        item.name,
        `₹${item.value.toLocaleString()}`
      ])
      
      ;(doc as any).autoTable({
        startY: currentY + 10,
        head: [['Category', 'Amount']],
        body: expensesTableData,
        theme: 'grid'
      })

      // Inventory Summary
      currentY = (doc as any).lastAutoTable.finalY + 20
      doc.text('Inventory Summary', 20, currentY)
      const inventoryTableData = (inventorySummary || []).map((item: any) => [
        item.name,
        `${item.value.toLocaleString()}`
      ])
      ;(doc as any).autoTable({
        startY: currentY + 10,
        head: [['Metric', 'Count']],
        body: inventoryTableData,
        theme: 'grid'
      })

      const pdfBlob = doc.output('blob')
      
      return new NextResponse(pdfBlob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="report.pdf"'
        }
      })
    }

    if (format === 'excel') {
      // For Excel export, you would typically use a library like xlsx
      // For demo purposes, we'll create a CSV format
      let csvContent = 'Report Type,Name,Value\n'
      
      reportData.revenue.forEach((item: any) => {
        csvContent += `Revenue,${item.name},${item.value}\n`
      })
      
      reportData.expenses.forEach((item: any) => {
        csvContent += `Expenses,${item.name},${item.value}\n`
      })
      
      ;(inventorySummary || []).forEach((item: any) => {
        csvContent += `Inventory,${item.name},${item.value}\n`
      })

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="report.csv"'
        }
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    )
  }
}
