"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { getCurrentUser, canViewReports, canViewFinancials } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { User } from "@/lib/types"
import {
  Download,
  RefreshCw,
  ArrowLeft,
  IndianRupee,
  Package,
  ShoppingBag,
  Users,
  TrendingUp,
  Box,
  Clock,
  AlertCircle,
  Wallet,
  PieChart,
  BarChart3,
} from "lucide-react"
import type { DateRange } from "react-day-picker"
import { subDays, format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { toast } from "@/hooks/use-toast"
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import type { PieLabelRenderProps } from "recharts"

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"]

// Types for data
interface BookingRecord { id: string; total_amount: number | null; amount_paid: number | null; booking_type?: string }
interface ProductRecord { 
  id: string; name: string; stock_total: number | null; stock_available: number | null; 
  stock_booked: number | null; stock_damaged: number | null; reorder_level: number | null;
  usage_count: number | null; rental_price: number | null; sale_price: number | null;
  category_id: string | null; category?: { name: string } | null;
}
interface ExpenseRecord { 
  id: string; subcategory: string | null; amount: number | null; 
  expense_date: string | null; description: string | null; vendor_name: string | null;
  category?: { name: string } | null 
}
interface PkgPendingRecord { id: string; package_number: string; total_amount: number | null; amount_paid: number | null; customer: { name: string; phone: string } | null }
interface ProdPendingRecord { id: string; order_number: string; total_amount: number | null; amount_paid: number | null; customer: { name: string; phone: string } | null }
interface StaffRecord { staff_name: string | null; base_salary: number | null; amount_paid: number | null }
interface UserRecord { name: string | null; email: string }
interface CustomerRecord { id: string; created_at: string }
interface TrendRecord { total_amount: number | null; booking_type?: string }
interface CategoryRecord { id: string; name: string }
interface TopProduct { name: string; usage: number; stock: number; value: number }
interface LowStockProduct { name: string; available: number; reorderLevel: number; status: string }
interface CategoryStock { category: string; products: number; stock: number; value: number }
interface ExpenseDetail { date: string; description: string; amount: number; vendor: string; category: string }
interface MonthlyExpense { month: string; amount: number }
interface VendorExpense { vendor: string; amount: number; count: number }

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  // Stats
  const [bookingStats, setBookingStats] = useState({
    totalRentals: 0, rentalRevenue: 0, rentalCollected: 0, rentalPending: 0,
    totalSales: 0, salesRevenue: 0, salesCollected: 0, salesPending: 0,
  })

  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0, totalStock: 0, available: 0, rented: 0, damaged: 0, lowStock: 0,
    totalValue: 0, inLaundry: 0,
  })

  const [expenseStats, setExpenseStats] = useState<{ category: string; amount: number }[]>([])
  const [pendingPayments, setPendingPayments] = useState<any[]>([])
  const [staffSalary, setStaffSalary] = useState<{ name: string; salary: number; paid: number }[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; rentals: number; sales: number }[]>([])
  const [customerStats, setCustomerStats] = useState({ total: 0, new: 0, withBookings: 0 })

  // Enhanced inventory reports
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [categoryStockData, setCategoryStockData] = useState<CategoryStock[]>([])

  // Enhanced expense reports
  const [expenseDetails, setExpenseDetails] = useState<ExpenseDetail[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([])
  const [vendorExpenses, setVendorExpenses] = useState<VendorExpense[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) { router.push("/"); return }
    if (!canViewReports(currentUser.role)) { router.push("/dashboard"); return }
    setUser(currentUser)
    await loadAllData(currentUser)
    setLoading(false)
  }

  const loadAllData = async (currentUser: User) => {
    setRefreshing(true)
    const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : format(subDays(new Date(), 30), "yyyy-MM-dd")
    const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
    // Super admins see all data (no franchise filter)
    const franchiseId = currentUser.role === "super_admin" ? undefined : currentUser.franchise_id
    

    try {
      await Promise.all([
        loadBookingStats(franchiseId, fromDate, toDate),
        loadInventoryStats(franchiseId),
        loadExpenseStats(franchiseId, fromDate, toDate),
        loadPendingPayments(franchiseId),
        loadStaffSalary(franchiseId),
        loadMonthlyTrend(franchiseId),
        loadCustomerStats(franchiseId, fromDate),
        loadEnhancedInventoryData(franchiseId),
        loadEnhancedExpenseData(franchiseId, fromDate, toDate),
      ])
      toast({ title: "Data Loaded", description: "All reports refreshed" })
    } catch {
      toast({ title: "Error", description: "Failed to load some data", variant: "destructive" })
    } finally {
      setRefreshing(false)
    }
  }

  const loadBookingStats = async (franchiseId: string | undefined, fromDate: string, toDate: string) => {
    // Package Bookings
    let pkgQuery = supabase.from("package_bookings")
      .select("id, total_amount, amount_paid")
      .eq("is_quote", false).eq("is_archived", false)
      .gte("created_at", fromDate).lte("created_at", toDate + "T23:59:59")
    if (franchiseId) pkgQuery = pkgQuery.eq("franchise_id", franchiseId)
    const { data: pkgData } = await pkgQuery

    // Product Orders
    let prodQuery = supabase.from("product_orders")
      .select("id, total_amount, amount_paid, booking_type")
      .or("is_quote.is.null,is_quote.eq.false").eq("is_archived", false)
      .gte("created_at", fromDate).lte("created_at", toDate + "T23:59:59")
    if (franchiseId) prodQuery = prodQuery.eq("franchise_id", franchiseId)
    const { data: prodData } = await prodQuery

    const pkgs = (pkgData || []) as BookingRecord[]
    const rentals = ((prodData || []) as BookingRecord[]).filter(o => o.booking_type !== "sale")
    const sales = ((prodData || []) as BookingRecord[]).filter(o => o.booking_type === "sale")

    const rentalRevenue = pkgs.reduce((s: number, b) => s + (Number(b.total_amount) || 0), 0) + rentals.reduce((s: number, b) => s + (Number(b.total_amount) || 0), 0)
    const rentalCollected = pkgs.reduce((s: number, b) => s + (Number(b.amount_paid) || 0), 0) + rentals.reduce((s: number, b) => s + (Number(b.amount_paid) || 0), 0)
    const salesRevenue = sales.reduce((s: number, b) => s + (Number(b.total_amount) || 0), 0)
    const salesCollected = sales.reduce((s: number, b) => s + (Number(b.amount_paid) || 0), 0)

    setBookingStats({
      totalRentals: pkgs.length + rentals.length, rentalRevenue, rentalCollected, rentalPending: rentalRevenue - rentalCollected,
      totalSales: sales.length, salesRevenue, salesCollected, salesPending: salesRevenue - salesCollected,
    })
  }

  const loadInventoryStats = async (franchiseId: string | undefined) => {
    try {
      // Use same approach as inventory page - direct Supabase query
      let query = supabase
        .from("products")
        .select("id, name, stock_total, stock_available, stock_booked, stock_damaged, stock_in_laundry, reorder_level, usage_count, rental_price, sale_price, category_id, is_active")
        .order("created_at", { ascending: false })
      
      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId)
      }
      
      const { data: products, error } = await query
      
      if (error) {
        return
      }
      
      // Filter active products (is_active !== false) - same as inventory page
      const activeProducts = (products || []).filter((p: any) => p.is_active !== false)
      
      // Get categories
      let catQuery = supabase.from("product_categories").select("id, name")
      if (franchiseId) catQuery = catQuery.eq("franchise_id", franchiseId)
      const { data: categories } = await catQuery
      const categoryMap: Record<string, string> = {}
      ;(categories || []).forEach((c: any) => { categoryMap[c.id] = c.name })
      
      // Calculate stats
      const totalValue = activeProducts.reduce((s: number, p: any) => {
        const price = Number(p.rental_price) || Number(p.sale_price) || 0
        return s + (price * (Number(p.stock_total) || 0))
      }, 0)

      setInventoryStats({
        totalProducts: activeProducts.length,
        totalStock: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_total) || 0), 0),
        available: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_available) || 0), 0),
        rented: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_booked) || 0), 0),
        damaged: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_damaged) || 0), 0),
        lowStock: activeProducts.filter((p: any) => (Number(p.stock_available) || 0) <= (Number(p.reorder_level) || 5)).length,
        totalValue,
        inLaundry: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_in_laundry) || 0), 0),
      })
      
      // Top products by usage
      const topProds = activeProducts
        .filter((p: any) => (Number(p.usage_count) || 0) > 0)
        .sort((a: any, b: any) => (Number(b.usage_count) || 0) - (Number(a.usage_count) || 0))
        .slice(0, 10)
        .map((p: any) => ({
          name: p.name,
          usage: Number(p.usage_count) || 0,
          stock: Number(p.stock_available) || 0,
          value: (Number(p.rental_price) || Number(p.sale_price) || 0) * (Number(p.stock_total) || 0),
        }))
      setTopProducts(topProds)

      // Low stock products
      const lowStockProds = activeProducts
        .filter((p: any) => {
          const available = Number(p.stock_available) || 0
          const reorderLevel = Number(p.reorder_level) || 5
          return available <= reorderLevel
        })
        .sort((a: any, b: any) => (Number(a.stock_available) || 0) - (Number(b.stock_available) || 0))
        .slice(0, 15)
        .map((p: any) => {
          const available = Number(p.stock_available) || 0
          const reorderLevel = Number(p.reorder_level) || 5
          let status = "Low"
          if (available === 0) status = "Out of Stock"
          else if (available <= reorderLevel / 2) status = "Critical"
          return {
            name: p.name,
            available,
            reorderLevel,
            status,
          }
        })
      setLowStockProducts(lowStockProds)

      // Category-wise stock distribution
      const categoryData: Record<string, { products: number; stock: number; value: number }> = {}
      activeProducts.forEach((p: any) => {
        const catName = categoryMap[p.category_id || ""] || "Uncategorized"
        if (!categoryData[catName]) categoryData[catName] = { products: 0, stock: 0, value: 0 }
        categoryData[catName].products += 1
        categoryData[catName].stock += Number(p.stock_total) || 0
        categoryData[catName].value += (Number(p.rental_price) || Number(p.sale_price) || 0) * (Number(p.stock_total) || 0)
      })
      setCategoryStockData(
        Object.entries(categoryData)
          .map(([category, data]) => ({ category, ...data }))
          .sort((a, b) => b.value - a.value)
      )
      
    } catch {
      return
    }
  }

  // Enhanced inventory data loading - now handled by loadInventoryStats API
  const loadEnhancedInventoryData = async (franchiseId: string | undefined) => {
    // Data is now loaded via the /api/reports/inventory endpoint in loadInventoryStats
    // This function is kept for backward compatibility but does nothing
  }

  const loadExpenseStats = async (franchiseId: string | undefined, fromDate: string, toDate: string) => {
    try {
      // Use the same API as expenses page
      const res = await fetch(`/api/expenses?pageSize=1000&dateFrom=${fromDate}&dateTo=${toDate}`, {
        credentials: 'include'
      })
      
      if (!res.ok) {
        return
      }
      
      const result = await res.json()
      const data = result.data || []
      
      // Group by category (subcategory field)
      const expenseByCategory: Record<string, number> = {}
      data.forEach((e: any) => {
        const cat = e.subcategory || "Other"
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(e.amount) || 0)
      })
      
      setExpenseStats(
        Object.entries(expenseByCategory)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)
      )
    } catch {
      return
    }
  }

  const loadPendingPayments = async (franchiseId: string | undefined) => {
    // Get bookings with pending payments
    let pkgQuery = supabase.from("package_bookings")
      .select("id, package_number, total_amount, amount_paid, customer:customers(name, phone)")
      .eq("is_quote", false).eq("is_archived", false)
      .order("created_at", { ascending: false }).limit(20)
    if (franchiseId) pkgQuery = pkgQuery.eq("franchise_id", franchiseId)
    const { data: pkgData } = await pkgQuery

    let prodQuery = supabase.from("product_orders")
      .select("id, order_number, total_amount, amount_paid, customer:customers(name, phone)")
      .or("is_quote.is.null,is_quote.eq.false").eq("is_archived", false)
      .order("created_at", { ascending: false }).limit(20)
    if (franchiseId) prodQuery = prodQuery.eq("franchise_id", franchiseId)
    const { data: prodData } = await prodQuery

    const pending = [
      ...((pkgData || []) as PkgPendingRecord[]).filter(b => (Number(b.total_amount) || 0) > (Number(b.amount_paid) || 0)).map(b => ({
        id: b.id, number: b.package_number, type: "Rental",
        total: Number(b.total_amount) || 0, paid: Number(b.amount_paid) || 0,
        pending: (Number(b.total_amount) || 0) - (Number(b.amount_paid) || 0),
        customer: b.customer?.name || "N/A", phone: b.customer?.phone || "",
      })),
      ...((prodData || []) as ProdPendingRecord[]).filter(b => (Number(b.total_amount) || 0) > (Number(b.amount_paid) || 0)).map(b => ({
        id: b.id, number: b.order_number, type: "Order",
        total: Number(b.total_amount) || 0, paid: Number(b.amount_paid) || 0,
        pending: (Number(b.total_amount) || 0) - (Number(b.amount_paid) || 0),
        customer: b.customer?.name || "N/A", phone: b.customer?.phone || "",
      })),
    ].sort((a, b) => b.pending - a.pending).slice(0, 15)
    
    setPendingPayments(pending)
  }

  const loadStaffSalary = async (franchiseId: string | undefined) => {
    // Try to load from payroll or staff_salaries table
    let query = supabase.from("staff_salaries")
      .select("staff_name, base_salary, amount_paid")
      .order("staff_name")
    if (franchiseId) query = query.eq("franchise_id", franchiseId)
    const { data, error } = await query

    if (!error && data && data.length > 0) {
      setStaffSalary((data as StaffRecord[]).map(s => ({
        name: s.staff_name || "Staff",
        salary: Number(s.base_salary) || 0,
        paid: Number(s.amount_paid) || 0,
      })))
    } else {
      // Fallback: try users table
      let userQuery = supabase.from("users")
        .select("name, email")
        .eq("is_active", true)
        .neq("role", "super_admin")
      if (franchiseId) userQuery = userQuery.eq("franchise_id", franchiseId)
      const { data: users } = await userQuery
      setStaffSalary(((users || []) as UserRecord[]).map(u => ({ name: u.name || u.email, salary: 0, paid: 0 })))
    }
  }

  const loadMonthlyTrend = async (franchiseId: string | undefined) => {
    const trend: { month: string; rentals: number; sales: number }[] = []
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i))
      const monthEnd = endOfMonth(subMonths(new Date(), i))
      const from = format(monthStart, "yyyy-MM-dd")
      const to = format(monthEnd, "yyyy-MM-dd")

      // Package bookings
      let pkgQuery = supabase.from("package_bookings")
        .select("total_amount").eq("is_quote", false).eq("is_archived", false)
        .gte("created_at", from).lte("created_at", to + "T23:59:59")
      if (franchiseId) pkgQuery = pkgQuery.eq("franchise_id", franchiseId)
      const { data: pkgData } = await pkgQuery

      // Product orders
      let prodQuery = supabase.from("product_orders")
        .select("total_amount, booking_type")
        .or("is_quote.is.null,is_quote.eq.false").eq("is_archived", false)
        .gte("created_at", from).lte("created_at", to + "T23:59:59")
      if (franchiseId) prodQuery = prodQuery.eq("franchise_id", franchiseId)
      const { data: prodData } = await prodQuery

      const rentals = ((pkgData || []) as TrendRecord[]).reduce((s: number, b) => s + (Number(b.total_amount) || 0), 0) +
        ((prodData || []) as TrendRecord[]).filter(o => o.booking_type !== "sale").reduce((s: number, b) => s + (Number(b.total_amount) || 0), 0)
      const sales = ((prodData || []) as TrendRecord[]).filter(o => o.booking_type === "sale").reduce((s: number, b) => s + (Number(b.total_amount) || 0), 0)

      trend.push({ month: format(monthStart, "MMM"), rentals, sales })
    }
    setMonthlyTrend(trend)
  }

  const loadCustomerStats = async (franchiseId: string | undefined, fromDate: string) => {
    let query = supabase.from("customers").select("id, created_at")
    if (franchiseId) query = query.eq("franchise_id", franchiseId)
    const { data } = await query

    const customers = (data || []) as CustomerRecord[]
    const newCustomers = customers.filter(c => new Date(c.created_at) >= new Date(fromDate)).length

    setCustomerStats({
      total: customers.length,
      new: newCustomers,
      withBookings: 0, // Would need join query
    })
  }

  // Enhanced expense data loading
  const loadEnhancedExpenseData = async (franchiseId: string | undefined, fromDate: string, toDate: string) => {
    try {
      // Use the same API as expenses page
      const res = await fetch(`/api/expenses?pageSize=1000&dateFrom=${fromDate}&dateTo=${toDate}`, {
        credentials: 'include'
      })
      
      if (!res.ok) {
        return
      }
      
      const result = await res.json()
      const exps = result.data || []

      // Expense details (top 20 recent expenses)
      const details = exps.slice(0, 20).map((e: any) => ({
        date: e.expense_date ? format(new Date(e.expense_date), "dd MMM yyyy") : "N/A",
        description: e.description || "No description",
        amount: Number(e.amount) || 0,
        vendor: e.vendor_name || "N/A",
        category: e.subcategory || "Other",
      }))
      setExpenseDetails(details)

      // Monthly expense trend (last 6 months)
      const monthlyData: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i))
        const monthKey = format(monthStart, "MMM yyyy")
        monthlyData[monthKey] = 0
      }
      exps.forEach((e: any) => {
        if (e.expense_date) {
          const monthKey = format(new Date(e.expense_date), "MMM yyyy")
          if (monthlyData[monthKey] !== undefined) {
            monthlyData[monthKey] += Number(e.amount) || 0
          }
        }
      })
      setMonthlyExpenses(Object.entries(monthlyData).map(([month, amount]) => ({ month, amount })))

      // Vendor-wise expenses
      const vendorData: Record<string, { amount: number; count: number }> = {}
      exps.forEach((e: any) => {
        const vendor = e.vendor_name || "Unknown"
        if (!vendorData[vendor]) vendorData[vendor] = { amount: 0, count: 0 }
        vendorData[vendor].amount += Number(e.amount) || 0
        vendorData[vendor].count += 1
      })
      setVendorExpenses(
        Object.entries(vendorData)
          .map(([vendor, data]) => ({ vendor, ...data }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10)
      )
    } catch {
      return
    }
  }

  const handleRefresh = () => { if (user) loadAllData(user) }

  const handleExport = () => {
    const totalRevenue = bookingStats.rentalRevenue + bookingStats.salesRevenue
    const totalCollected = bookingStats.rentalCollected + bookingStats.salesCollected
    const totalExpenses = expenseStats.reduce((s, e) => s + e.amount, 0)

    const csv = [
      ["SAFAWALA CRM - BUSINESS REPORT"],
      ["Generated:", new Date().toLocaleString()],
      ["Period:", `${dateRange?.from?.toLocaleDateString()} - ${dateRange?.to?.toLocaleDateString()}`],
      [""],
      ["=== BOOKINGS & REVENUE ==="],
      ["", "Orders", "Revenue", "Collected", "Pending"],
      ["Rentals", bookingStats.totalRentals, bookingStats.rentalRevenue, bookingStats.rentalCollected, bookingStats.rentalPending],
      ["Sales", bookingStats.totalSales, bookingStats.salesRevenue, bookingStats.salesCollected, bookingStats.salesPending],
      ["TOTAL", bookingStats.totalRentals + bookingStats.totalSales, totalRevenue, totalCollected, totalRevenue - totalCollected],
      [""],
      ["=== INVENTORY ==="],
      ["Total Products", inventoryStats.totalProducts],
      ["Total Stock", inventoryStats.totalStock],
      ["Available", inventoryStats.available],
      ["Rented Out", inventoryStats.rented],
      ["Damaged", inventoryStats.damaged],
      ["Low Stock Items", inventoryStats.lowStock],
      [""],
      ["=== EXPENSES BY CATEGORY ==="],
      ...expenseStats.map(e => [e.category, e.amount]),
      ["TOTAL EXPENSES", totalExpenses],
      [""],
      ["=== PROFIT SUMMARY ==="],
      ["Total Collected", totalCollected],
      ["Total Expenses", totalExpenses],
      ["Net Profit", totalCollected - totalExpenses],
    ].map(r => r.join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `business-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "Report downloaded" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  const totalRevenue = bookingStats.rentalRevenue + bookingStats.salesRevenue
  const totalCollected = bookingStats.rentalCollected + bookingStats.salesCollected
  const totalPending = bookingStats.rentalPending + bookingStats.salesPending
  const totalExpenses = expenseStats.reduce((s, e) => s + e.amount, 0)
  const netProfit = totalCollected - totalExpenses

  const revenueBreakdown = [
    { name: "Rentals", value: bookingStats.rentalRevenue },
    { name: "Sales", value: bookingStats.salesRevenue },
  ]

  const inventoryBreakdown = [
    { name: "Available", value: inventoryStats.available },
    { name: "Rented", value: inventoryStats.rented },
    { name: "Damaged", value: inventoryStats.damaged },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Business Reports</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <IndianRupee className="h-4 w-4" /> Total Revenue
            </div>
            <p className="text-2xl font-bold text-green-800 mt-1">₹{totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
              <TrendingUp className="h-4 w-4" /> Collected
            </div>
            <p className="text-2xl font-bold text-blue-800 mt-1">₹{totalCollected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
              <Clock className="h-4 w-4" /> Pending
            </div>
            <p className="text-2xl font-bold text-orange-800 mt-1">₹{totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={`${netProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 text-sm font-medium ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              <Wallet className="h-4 w-4" /> Net Profit
            </div>
            <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>
              ₹{netProfit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Revenue Trend (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="rentals" name="Rentals" fill="#3B82F6" />
                    <Bar dataKey="sales" name="Sales" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pie Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" /> Revenue: Rentals vs Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={revenueBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(props: PieLabelRenderProps) => `${props.name || ""}: ${((Number(props.percent) || 0) * 100).toFixed(0)}%`}>
                        {revenueBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm">Rentals: ₹{bookingStats.rentalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-sm">Sales: ₹{bookingStats.salesRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4 text-purple-500" /> Total Customers</span>
                  <span className="font-bold text-lg">{customerStats.total}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="flex items-center gap-2"><Package className="h-4 w-4 text-blue-500" /> Total Rentals</span>
                  <span className="font-bold text-lg">{bookingStats.totalRentals}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-emerald-500" /> Total Sales</span>
                  <span className="font-bold text-lg">{bookingStats.totalSales}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="flex items-center gap-2"><Box className="h-4 w-4 text-orange-500" /> Products</span>
                  <span className="font-bold text-lg">{inventoryStats.totalProducts}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-red-500" /> Total Expenses</span>
                  <span className="font-bold text-lg">₹{totalExpenses.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BOOKINGS TAB */}
        <TabsContent value="bookings" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Rentals Card */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Package className="h-5 w-5" /> RENTALS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span>Total Orders</span>
                    <span className="font-bold text-xl">{bookingStats.totalRentals}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Revenue</span>
                    <span className="font-bold text-xl text-green-600">₹{bookingStats.rentalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Collected</span>
                    <span className="font-bold text-xl text-blue-600">₹{bookingStats.rentalCollected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Pending</span>
                    <span className="font-bold text-xl text-orange-600">₹{bookingStats.rentalPending.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales Card */}
            <Card className="border-2 border-emerald-200">
              <CardHeader className="bg-emerald-50">
                <CardTitle className="flex items-center gap-2 text-emerald-800">
                  <ShoppingBag className="h-5 w-5" /> SALES
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span>Total Orders</span>
                    <span className="font-bold text-xl">{bookingStats.totalSales}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Revenue</span>
                    <span className="font-bold text-xl text-green-600">₹{bookingStats.salesRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Collected</span>
                    <span className="font-bold text-xl text-blue-600">₹{bookingStats.salesCollected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Pending</span>
                    <span className="font-bold text-xl text-orange-600">₹{bookingStats.salesPending.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Bookings Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3">Orders</th>
                    <th className="text-right p-3">Revenue</th>
                    <th className="text-right p-3">Collected</th>
                    <th className="text-right p-3">Pending</th>
                    <th className="text-right p-3">Collection %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-blue-50">
                    <td className="p-3 font-medium">📦 Rentals</td>
                    <td className="p-3 text-right">{bookingStats.totalRentals}</td>
                    <td className="p-3 text-right">₹{bookingStats.rentalRevenue.toLocaleString()}</td>
                    <td className="p-3 text-right text-green-600">₹{bookingStats.rentalCollected.toLocaleString()}</td>
                    <td className="p-3 text-right text-orange-600">₹{bookingStats.rentalPending.toLocaleString()}</td>
                    <td className="p-3 text-right">{bookingStats.rentalRevenue > 0 ? ((bookingStats.rentalCollected / bookingStats.rentalRevenue) * 100).toFixed(0) : 0}%</td>
                  </tr>
                  <tr className="border-b hover:bg-emerald-50">
                    <td className="p-3 font-medium">🛒 Sales</td>
                    <td className="p-3 text-right">{bookingStats.totalSales}</td>
                    <td className="p-3 text-right">₹{bookingStats.salesRevenue.toLocaleString()}</td>
                    <td className="p-3 text-right text-green-600">₹{bookingStats.salesCollected.toLocaleString()}</td>
                    <td className="p-3 text-right text-orange-600">₹{bookingStats.salesPending.toLocaleString()}</td>
                    <td className="p-3 text-right">{bookingStats.salesRevenue > 0 ? ((bookingStats.salesCollected / bookingStats.salesRevenue) * 100).toFixed(0) : 0}%</td>
                  </tr>
                  <tr className="bg-gray-100 font-bold">
                    <td className="p-3">TOTAL</td>
                    <td className="p-3 text-right">{bookingStats.totalRentals + bookingStats.totalSales}</td>
                    <td className="p-3 text-right">₹{totalRevenue.toLocaleString()}</td>
                    <td className="p-3 text-right text-green-600">₹{totalCollected.toLocaleString()}</td>
                    <td className="p-3 text-right text-orange-600">₹{totalPending.toLocaleString()}</td>
                    <td className="p-3 text-right">{totalRevenue > 0 ? ((totalCollected / totalRevenue) * 100).toFixed(0) : 0}%</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-blue-700">Total Products</p>
                <p className="text-2xl font-bold text-blue-800">{inventoryStats.totalProducts}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-green-700">Total Stock</p>
                <p className="text-2xl font-bold text-green-800">{inventoryStats.totalStock}</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-purple-700">Inventory Value</p>
                <p className="text-2xl font-bold text-purple-800">₹{inventoryStats.totalValue.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-orange-700">Low Stock Items</p>
                <p className="text-2xl font-bold text-orange-800">{inventoryStats.lowStock}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Inventory Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" /> Inventory Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-green-700">✅ Available</span>
                    <span className="font-bold text-green-800">{inventoryStats.available}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-700">📦 Rented Out</span>
                    <span className="font-bold text-blue-800">{inventoryStats.rented}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-yellow-700">🧺 In Laundry</span>
                    <span className="font-bold text-yellow-800">{inventoryStats.inLaundry}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-red-700">⚠️ Damaged</span>
                    <span className="font-bold text-red-800">{inventoryStats.damaged}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={inventoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(props: PieLabelRenderProps) => `${props.name || ""}: ${((Number(props.percent) || 0) * 100).toFixed(0)}%`}>
                        <Cell fill="#10B981" />
                        <Cell fill="#3B82F6" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products by Usage */}
          {topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Top Products by Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => v.toLocaleString()} />
                      <Bar dataKey="usage" name="Usage Count" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category-wise Stock Distribution */}
          {categoryStockData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" /> Category-wise Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Category</th>
                        <th className="text-right p-3">Products</th>
                        <th className="text-right p-3">Total Stock</th>
                        <th className="text-right p-3">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryStockData.map((cat, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                              {cat.category}
                            </div>
                          </td>
                          <td className="p-3 text-right">{cat.products}</td>
                          <td className="p-3 text-right">{cat.stock.toLocaleString()}</td>
                          <td className="p-3 text-right font-medium">₹{cat.value.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold">
                        <td className="p-3">TOTAL</td>
                        <td className="p-3 text-right">{categoryStockData.reduce((s, c) => s + c.products, 0)}</td>
                        <td className="p-3 text-right">{categoryStockData.reduce((s, c) => s + c.stock, 0).toLocaleString()}</td>
                        <td className="p-3 text-right">₹{categoryStockData.reduce((s, c) => s + c.value, 0).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Alert */}
          {lowStockProducts.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="bg-orange-50">
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="h-5 w-5" /> Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-orange-50">
                        <th className="text-left p-3">Product</th>
                        <th className="text-right p-3">Available</th>
                        <th className="text-right p-3">Reorder Level</th>
                        <th className="text-center p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockProducts.map((prod, i) => (
                        <tr key={i} className="border-b hover:bg-orange-50/50">
                          <td className="p-3 font-medium">{prod.name}</td>
                          <td className="p-3 text-right font-bold">{prod.available}</td>
                          <td className="p-3 text-right text-gray-600">{prod.reorderLevel}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              prod.status === "Out of Stock" ? "bg-red-100 text-red-700" :
                              prod.status === "Critical" ? "bg-orange-100 text-orange-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {prod.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-red-700">Total Expenses</p>
                <p className="text-2xl font-bold text-red-800">₹{totalExpenses.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-blue-700">Categories</p>
                <p className="text-2xl font-bold text-blue-800">{expenseStats.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-purple-700">Total Transactions</p>
                <p className="text-2xl font-bold text-purple-800">{expenseDetails.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-green-700">Avg per Transaction</p>
                <p className="text-2xl font-bold text-green-800">
                  ₹{expenseDetails.length > 0 ? Math.round(totalExpenses / expenseDetails.length).toLocaleString() : 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Expense Trend */}
          {monthlyExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Monthly Expense Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyExpenses}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                      <Bar dataKey="amount" name="Expenses" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Expense Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" /> Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {expenseStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie data={expenseStats} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={(props: PieLabelRenderProps) => `${props.name || ""}: ${((Number(props.percent) || 0) * 100).toFixed(0)}%`}>
                          {expenseStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                      </RePieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">No expense data</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expense List */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expenseStats.length > 0 ? (
                    <>
                      {expenseStats.map((e, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            {e.category}
                          </span>
                          <span className="font-bold">₹{e.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-2 border-red-200">
                        <span className="font-bold text-red-700">TOTAL EXPENSES</span>
                        <span className="font-bold text-xl text-red-800">₹{totalExpenses.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-8">No expenses recorded</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vendor-wise Expenses */}
          {vendorExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Vendor-wise Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Vendor</th>
                        <th className="text-right p-3">Transactions</th>
                        <th className="text-right p-3">Total Amount</th>
                        <th className="text-right p-3">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorExpenses.map((v, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{v.vendor}</td>
                          <td className="p-3 text-right">{v.count}</td>
                          <td className="p-3 text-right font-bold">₹{v.amount.toLocaleString()}</td>
                          <td className="p-3 text-right text-gray-600">
                            {totalExpenses > 0 ? ((v.amount / totalExpenses) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Expenses Table */}
          {expenseDetails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Recent Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Category</th>
                        <th className="text-left p-3">Vendor</th>
                        <th className="text-right p-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseDetails.map((exp, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm text-gray-600">{exp.date}</td>
                          <td className="p-3">
                            <div className="max-w-xs truncate" title={exp.description}>
                              {exp.description}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                              {exp.category}
                            </span>
                          </td>
                          <td className="p-3 text-sm">{exp.vendor}</td>
                          <td className="p-3 text-right font-bold">₹{exp.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Staff Salary Section */}
          {staffSalary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Staff & Salary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3">Staff Name</th>
                      <th className="text-right p-3">Salary</th>
                      <th className="text-right p-3">Paid</th>
                      <th className="text-right p-3">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffSalary.map((s, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-3">{s.name}</td>
                        <td className="p-3 text-right">₹{s.salary.toLocaleString()}</td>
                        <td className="p-3 text-right text-green-600">₹{s.paid.toLocaleString()}</td>
                        <td className="p-3 text-right text-orange-600">₹{(s.salary - s.paid).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PENDING PAYMENTS TAB */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" /> Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Order #</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Customer</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-right p-3">Paid</th>
                        <th className="text-right p-3">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayments.map((p, i) => (
                        <tr key={i} className="border-b hover:bg-orange-50">
                          <td className="p-3 font-mono text-sm">{p.number}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${p.type === "Rental" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="p-3">
                            <div>{p.customer}</div>
                            <div className="text-xs text-gray-500">{p.phone}</div>
                          </td>
                          <td className="p-3 text-right">₹{p.total.toLocaleString()}</td>
                          <td className="p-3 text-right text-green-600">₹{p.paid.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-orange-600">₹{p.pending.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-orange-100 font-bold">
                        <td colSpan={5} className="p-3 text-right">Total Pending:</td>
                        <td className="p-3 text-right text-orange-700">₹{pendingPayments.reduce((s, p) => s + p.pending, 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg">No pending payments! 🎉</p>
                  <p className="text-sm">All payments are collected</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-green-700">Total Collected</p>
                <p className="text-2xl font-bold text-green-800">₹{totalCollected.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-orange-700">Total Pending</p>
                <p className="text-2xl font-bold text-orange-800">₹{totalPending.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-blue-700">Collection Rate</p>
                <p className="text-2xl font-bold text-blue-800">
                  {totalRevenue > 0 ? ((totalCollected / totalRevenue) * 100).toFixed(0) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
