import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const { authContext } = authResult
    const franchiseId = authContext!.user.franchise_id
    const isSuperAdmin = authContext!.user.role === 'super_admin'
    const supabase = createClient()
    const daysParam = Number(request.nextUrl.searchParams.get("days") || 0)
    const rangeStart = daysParam > 0
      ? new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000).toISOString()
      : null

    console.log(`[Dashboard Stats API] Fetching stats for franchise: ${franchiseId}, isSuperAdmin: ${isSuperAdmin}`)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Fetch from BOTH package_bookings and product_orders (the actual booking sources)
    let packageQuery = supabase
      .from("package_bookings")
      .select("id, franchise_id, status, total_amount, amount_paid, created_at, event_date, delivery_date, package_number", { count: 'exact' })
      .eq('is_quote', false)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    let productQuery = supabase
      .from("product_orders")
      .select("id, franchise_id, status, total_amount, amount_paid, created_at, event_date, delivery_date, order_number, booking_type", { count: 'exact' })
      .or('is_quote.is.null,is_quote.eq.false')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    // Apply franchise filter
    if (!isSuperAdmin && franchiseId) {
      packageQuery = packageQuery.eq("franchise_id", franchiseId)
      productQuery = productQuery.eq("franchise_id", franchiseId)
      console.log(`[Dashboard Stats API] Applied franchise filter: ${franchiseId}`)
    } else {
      console.log(`[Dashboard Stats API] Super admin mode - showing all stats`)
    }
    if (rangeStart) {
      packageQuery = packageQuery.gte("created_at", rangeStart)
      productQuery = productQuery.gte("created_at", rangeStart)
    }

    // Fetch both in parallel
    const [packageRes, productRes] = await Promise.all([packageQuery, productQuery])

    if (packageRes.error && productRes.error) {
      console.error("Error fetching bookings:", packageRes.error || productRes.error)
      return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
    }

    // Combine data from both sources
    const packageBookings = Array.isArray(packageRes.data) ? packageRes.data : []
    const productBookings = Array.isArray(productRes.data) ? productRes.data : []
    const bookings = [...packageBookings, ...productBookings]
    
    console.log(`[Dashboard Stats API] Fetched ${packageBookings.length} package bookings + ${productBookings.length} product orders = ${bookings.length} total`)

    // Parallel queries for other data
    const [customersResult, productsResult] = await Promise.all([
      isSuperAdmin || !franchiseId
        ? supabase.from("customers").select("id", { count: 'exact', head: true })
        : supabase.from("customers").select("id", { count: 'exact', head: true }).eq("franchise_id", franchiseId),
      isSuperAdmin || !franchiseId
        ? supabase.from("products").select("id, stock_available, reorder_level")
        : supabase.from("products").select("id, stock_available, reorder_level").eq("franchise_id", franchiseId)
    ])

    const totalCustomers = customersResult.count || 0
    const productsData = productsResult.data || []
    const activeBookings = bookings.filter((b: any) => 
      ['confirmed', 'delivered'].includes(b.status)
    ).length

    const totalRevenue = bookings.reduce((sum: number, booking: any) => 
      sum + (booking.total_amount || 0), 0
    )

    const thisMonthBookings = bookings.filter((b: any) => 
      new Date(b.created_at) >= startOfMonth
    ).length

    const lastMonthBookings = bookings.filter((b: any) => {
      const date = new Date(b.created_at)
      return date >= startOfLastMonth && date <= endOfLastMonth
    }).length

    const monthlyGrowth = lastMonthBookings > 0 
      ? ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100 
      : 0

    const lowStockItems = productsData.filter((p: any) => 
      (p.stock_available || 0) <= (p.reorder_level || 5)
    ).length

    // Calculate additional metrics
    const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed').length
    const quotesCount = bookings.filter((b: any) => b.status === 'quote').length
    const conversionRate = quotesCount > 0 ? ((confirmedBookings / (confirmedBookings + quotesCount)) * 100) : 0
    
    const bookingsCount = bookings.length || 0
    const avgBookingValue = bookingsCount > 0 ? totalRevenue / bookingsCount : 0

    // Revenue by month (last 6 months)
    const revenueByMonth = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthRevenue = bookings
        .filter((b: any) => {
          const date = new Date(b.created_at)
          return date >= monthDate && date <= monthEnd
        })
        .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0)
      
      revenueByMonth.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        revenue: monthRevenue
      })
    }

    // Bookings by type/source
    const bookingsByType = {
      package: packageBookings.length,
      product: productBookings.length
    }

    // Rental vs Sale split — package bookings are always rental bundles;
    // product orders carry an explicit booking_type ('rental' | 'sale', defaults to rental)
    const saleBookingsCount = productBookings.filter((b: any) => b.booking_type === 'sale').length
    const rentalBookingsCount = packageBookings.length + (productBookings.length - saleBookingsCount)

    // Revenue for the current calendar year
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const yearRevenue = bookings
      .filter((b: any) => new Date(b.created_at) >= startOfYear)
      .reduce((sum: number, b: any) => sum + (Number(b.total_amount) || 0), 0)

    // Pending actions
    const pendingPayments = bookings.filter((b: any) => b.status === 'pending_payment').length
    const pendingDeliveries = bookings.filter((b: any) => b.status === 'confirmed').length
    const pendingReturns = bookings.filter((b: any) => b.status === 'delivered').length
    const overdueTasks = 0 // Can be enhanced with actual due date logic

    // Calculate payment reminders (bookings with pending balance and upcoming events)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const bookingsWithPendingPayments = bookings
      .filter((b: any) => {
        const totalAmount = Number(b.total_amount) || 0
        const amountPaid = Number(b.amount_paid) || 0
        const pendingAmount = totalAmount - amountPaid
        return pendingAmount > 0 && b.event_date
      })
      .map((b: any) => {
        const eventDate = new Date(b.event_date)
        eventDate.setHours(0, 0, 0, 0)
        const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: b.id,
          bookingNumber: b.package_number || b.order_number,
          eventDate: b.event_date,
          daysUntilEvent,
          totalAmount: Number(b.total_amount) || 0,
          amountPaid: Number(b.amount_paid) || 0,
          pendingAmount: (Number(b.total_amount) || 0) - (Number(b.amount_paid) || 0),
          status: b.status
        }
      })
      .filter((b: any) => b.daysUntilEvent >= 0 && b.daysUntilEvent <= 30) // Next 30 days
      .sort((a: any, b: any) => a.daysUntilEvent - b.daysUntilEvent)

    // Group payment reminders by urgency
    const paymentReminders = {
      urgent: bookingsWithPendingPayments.filter((b: any) => b.daysUntilEvent <= 1).length,   // 1 day or less
      soon: bookingsWithPendingPayments.filter((b: any) => b.daysUntilEvent > 1 && b.daysUntilEvent <= 3).length,   // 2-3 days
      upcoming: bookingsWithPendingPayments.filter((b: any) => b.daysUntilEvent > 3 && b.daysUntilEvent <= 7).length, // 4-7 days
      later: bookingsWithPendingPayments.filter((b: any) => b.daysUntilEvent > 7 && b.daysUntilEvent <= 10).length,  // 8-10 days
      total: bookingsWithPendingPayments.length,
      totalPendingAmount: bookingsWithPendingPayments.reduce((sum: number, b: any) => sum + b.pendingAmount, 0),
      list: bookingsWithPendingPayments.slice(0, 10) // Top 10 most urgent
    }

    // Upcoming deliveries (confirmed bookings with delivery dates)
    const upcomingDeliveries = bookings
      .filter((b: any) => b.status === 'confirmed' && b.delivery_date)
      .map((b: any) => {
        const deliveryDate = new Date(b.delivery_date)
        deliveryDate.setHours(0, 0, 0, 0)
        const daysUntilDelivery = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: b.id,
          bookingNumber: b.package_number || b.order_number,
          deliveryDate: b.delivery_date,
          daysUntilDelivery,
          status: b.status
        }
      })
      .filter((b: any) => b.daysUntilDelivery >= 0 && b.daysUntilDelivery <= 14) // Next 14 days
      .sort((a: any, b: any) => a.daysUntilDelivery - b.daysUntilDelivery)

    const deliveryReminders = {
      today: upcomingDeliveries.filter((b: any) => b.daysUntilDelivery === 0).length,
      tomorrow: upcomingDeliveries.filter((b: any) => b.daysUntilDelivery === 1).length,
      thisWeek: upcomingDeliveries.filter((b: any) => b.daysUntilDelivery > 1 && b.daysUntilDelivery <= 7).length,
      total: upcomingDeliveries.length,
      list: upcomingDeliveries.slice(0, 10) // Top 10 most urgent
    }

    // Calculate Owner Executive KPIs (Ronak Dave)
    let newLeadsCount = 0
    let ordersInPackingCount = 0
    let ordersInDispatchCount = 0
    let materialNotReturnedCount = 0
    let staffPerformanceData: any[] = []

    try {
      // 1. New Leads: Quotes in generated or sent status
      const { count: leadsCount } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .in("status", ["generated", "sent"])
      newLeadsCount = leadsCount || 0

      // 2. Orders in Packing: active tasks in packing
      const { count: packingCount } = await supabase
        .from("work_order_tasks")
        .select("id", { count: "exact", head: true })
        .eq("department", "packing")
        .eq("status", "active")
      ordersInPackingCount = packingCount || 0

      // 3. Orders in Dispatch: active tasks in dispatch
      const { count: dispatchCount } = await supabase
        .from("work_order_tasks")
        .select("id", { count: "exact", head: true })
        .eq("department", "dispatch")
        .eq("status", "active")
      ordersInDispatchCount = dispatchCount || 0

      // 4. Material Not Returned: active tasks in returns
      const { count: returnCount } = await supabase
        .from("work_order_tasks")
        .select("id", { count: "exact", head: true })
        .eq("department", "returns")
        .eq("status", "active")
      materialNotReturnedCount = returnCount || 0

      // 5. Staff Performance: completed tasks grouped by staff
      const { data: performanceRes } = await supabase
        .from("work_order_tasks")
        .select("assigned_to")
        .eq("status", "completed")
      
      if (performanceRes && performanceRes.length > 0) {
        const staffIds = [...new Set(performanceRes.map((r: any) => r.assigned_to).filter(Boolean))]
        let usersMap = new Map()
        if (staffIds.length > 0) {
          const { data: usersData } = await supabase
            .from("users")
            .select("id, name")
            .in("id", staffIds)
          usersData?.forEach((u: any) => usersMap.set(u.id, u.name))
        }

        const counts: Record<string, number> = {}
        for (const item of performanceRes) {
          const name = item.assigned_to ? (usersMap.get(item.assigned_to) || "Staff Member") : "System/Unassigned"
          counts[name] = (counts[name] || 0) + 1
        }
        staffPerformanceData = Object.entries(counts).map(([name, completedCount]) => ({
          name,
          completedCount
        })).sort((a, b) => b.completedCount - a.completedCount)
      }
    } catch (err) {
      console.warn("[Dashboard Stats] Failed to query owner KPIs:", err)
    }

    // Active leads (leads table) not yet converted — separate from the quotes-based newLeads KPI
    let activeLeadsCount = 0
    try {
      let leadsQuery = supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .neq("status", "converted")
      if (!isSuperAdmin && franchiseId) leadsQuery = leadsQuery.eq("franchise_id", franchiseId)
      const { count: leadsCountResult } = await leadsQuery
      activeLeadsCount = leadsCountResult || 0
    } catch (err) {
      console.warn("[Dashboard Stats] Failed to query active leads:", err)
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    const eventsTodayCount = bookings.filter((b: any) => 
      b.status === 'confirmed' && b.event_date && b.event_date === todayStr
    ).length

    const pendingPaymentsAmount = bookings
      .filter((b: any) => b.status !== 'cancelled')
      .reduce((sum: number, b: any) => sum + Math.max(0, (Number(b.total_amount) || 0) - (Number(b.amount_paid) || 0)), 0)

    const pendingPaymentCount = bookings.filter((b: any) =>
      b.status !== "cancelled" && (Number(b.total_amount) || 0) > (Number(b.amount_paid) || 0)
    ).length
    const completedBookings = bookings.filter((b: any) => ["completed", "order_complete", "returned"].includes(b.status)).length
    const recentOrders = [...bookings]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)

    const franchiseIds = [...new Set(bookings.map((b: any) => b.franchise_id).filter(Boolean))]
    const franchiseMap = new Map<string, any>()
    if (franchiseIds.length > 0) {
      const { data: franchiseRows } = await supabase
        .from("franchises")
        .select("id, name, code, commission_rate")
        .in("id", franchiseIds)
      franchiseRows?.forEach((row: any) => franchiseMap.set(row.id, row))
    }
    const performanceMap = new Map<string, { name: string; code: string; commissionRate: number; revenue: number; bookings: number; commission: number }>()
    for (const booking of bookings) {
      const id = booking.franchise_id || "unassigned"
      const franchise = franchiseMap.get(id)
      const current = performanceMap.get(id) || {
        name: franchise?.name || "Unassigned",
        code: franchise?.code || "—",
        commissionRate: Number(franchise?.commission_rate) || 0,
        revenue: 0,
        bookings: 0,
        commission: 0,
      }
      const revenue = Number(booking.total_amount) || 0
      current.revenue += revenue
      current.bookings += 1
      current.commission += revenue * (current.commissionRate / 100)
      performanceMap.set(id, current)
    }
    const franchisePerformance = [...performanceMap.values()].sort((a, b) => b.revenue - a.revenue)

    let expenseBreakdown: Array<{ name: string; value: number }> = []
    try {
      let expenseQuery = supabase
        .from("financial_transactions")
        .select("amount, transaction_date, category:financial_categories(name)")
        .eq("type", "expense")
      if (rangeStart) expenseQuery = expenseQuery.gte("transaction_date", rangeStart.slice(0, 10))
      if (!isSuperAdmin && franchiseId) expenseQuery = expenseQuery.eq("franchise_id", franchiseId)
      const { data: expenseRows } = await expenseQuery
      const expenseMap = new Map<string, number>()
      for (const row of expenseRows || []) {
        const category = Array.isArray(row.category) ? row.category[0] : row.category
        const name = category?.name || "Uncategorized"
        expenseMap.set(name, (expenseMap.get(name) || 0) + (Number(row.amount) || 0))
      }
      expenseBreakdown = [...expenseMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    } catch (error) {
      console.warn("[Dashboard Stats] Failed to load expense breakdown:", error)
    }

    const stats = {
      totalBookings: bookingsCount,
      activeBookings,
      totalCustomers,
      totalRevenue,
      monthRevenue: revenueByMonth[revenueByMonth.length - 1]?.revenue || 0,
      yearRevenue,
      rentalBookingsCount,
      saleBookingsCount,
      activeLeadsCount,
      completedBookings,
      todayBookings: bookings.filter((b: any) => String(b.created_at || "").startsWith(todayStr)).length,
      pendingPaymentCount,
      monthlyGrowth: Math.round(monthlyGrowth),
      lowStockItems,
      conversionRate: Math.round(conversionRate),
      avgBookingValue: Math.round(avgBookingValue),
      revenueByMonth,
      franchisePerformance,
      expenseBreakdown,
      recentOrders,
      commissionEarned: Math.round(franchisePerformance.reduce((sum, row) => sum + row.commission, 0)),
      bookingsByType: bookingsByType,
      pendingActions: {
        payments: pendingPayments,
        deliveries: pendingDeliveries,
        returns: pendingReturns,
        overdue: overdueTasks
      },
      paymentReminders,
      deliveryReminders,
      ownerKPIs: {
        newLeads: newLeadsCount,
        confirmedOrders: confirmedBookings,
        ordersInPacking: ordersInPackingCount,
        ordersInDispatch: ordersInDispatchCount,
        eventsToday: eventsTodayCount,
        pendingPayments: Math.round(pendingPaymentsAmount),
        materialNotReturned: materialNotReturnedCount,
        staffPerformance: staffPerformanceData
      }
    }

    console.log(`[Dashboard Stats API] Returning stats:`, stats)
    return NextResponse.json(
      { success: true, data: stats },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
        }
      }
    )
  } catch (error) {
    console.error("[Dashboard Stats API] Error:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
