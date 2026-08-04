"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, PieChart, Download, Filter, RefreshCw } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { DateRange } from "react-day-picker"
import { subDays, format } from "date-fns"
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts"

// Color palette for charts
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
  "#8DD1E1",
  "#D084D0",
  "#87D068",
  "#FFB347",
]

interface FinancialData {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  revenueBreakdown: Array<{ name: string; value: number; color: string }>
  expenseBreakdown: Array<{ name: string; value: number; color: string }>
  paymentMethods: Array<{ name: string; value: number; percentage: number; color: string }>
  monthlyTrends: Array<{ month: string; income: number; expenses: number; profit: number }>
  franchiseComparison: Array<{ franchise: string; revenue: number; expenses: number; profit: number }>
}

export default function FinancialsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    revenueBreakdown: [],
    expenseBreakdown: [],
    paymentMethods: [],
    monthlyTrends: [],
    franchiseComparison: [],
  })
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [selectedFranchise, setSelectedFranchise] = useState<string>("all")
  const [franchises, setFranchises] = useState<Array<{ id: string; name: string }>>([])
  const [filtersChanged, setFiltersChanged] = useState(false)

  useEffect(() => {
    fetchFranchises()
    fetchFinancialData()
  }, [])

  useEffect(() => {
    setFiltersChanged(true)
  }, [dateRange, selectedFranchise])

  const fetchFranchises = async () => {
    try {
      const { data, error } = await supabase.from("franchises").select("id, name").eq("is_active", true).order("name")

      if (error) throw error
      setFranchises(data || [])
    } catch (error) {
      console.error("Error fetching franchises:", error)
      toast.error("Failed to load franchises")
    }
  }

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      setRefreshing(true)

      // Build date filter
      const fromDate = dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : format(subDays(new Date(), 30), "yyyy-MM-dd")
      const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")

      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          financial_categories!inner(name, type),
          franchises!inner(name)
        `)
        .gte("transaction_date", fromDate)
        .lte("transaction_date", toDate)

      // Add franchise filter if selected
      if (selectedFranchise !== "all") {
        query = query.eq("franchise_id", selectedFranchise)
      }

      const { data: transactions, error } = await query

      if (error) throw error

      // Process the data
      const incomeTransactions = transactions?.filter((t) => t.type === "income") || []
      const expenseTransactions = transactions?.filter((t) => t.type === "expense") || []

      // Calculate totals
      const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
      const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
      const netProfit = totalIncome - totalExpenses
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

      // Process revenue breakdown
      const revenueMap = new Map()
      incomeTransactions.forEach((t) => {
        const category = t.financial_categories.name
        revenueMap.set(category, (revenueMap.get(category) || 0) + Number(t.amount))
      })

      const revenueBreakdown = Array.from(revenueMap.entries())
        .map(([name, value], index) => ({
          name,
          value: Number(value),
          color: COLORS[index % COLORS.length],
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)

      // Process expense breakdown
      const expenseMap = new Map()
      expenseTransactions.forEach((t) => {
        const category = t.financial_categories.name
        expenseMap.set(category, (expenseMap.get(category) || 0) + Number(t.amount))
      })

      const expenseBreakdown = Array.from(expenseMap.entries())
        .map(([name, value], index) => ({
          name,
          value: Number(value),
          color: COLORS[index % COLORS.length],
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)

      const paymentMap = new Map()
      let totalPayments = 0
      transactions?.forEach((t) => {
        // Use reference_number as payment method indicator or create default categories
        const method = t.reference_number
          ? t.reference_number.startsWith("UPI")
            ? "UPI"
            : t.reference_number.startsWith("CARD")
              ? "Card"
              : t.reference_number.startsWith("CASH")
                ? "Cash"
                : t.reference_number.startsWith("BANK")
                  ? "Bank Transfer"
                  : "Other"
          : "Cash" // Default to Cash if no reference number

        const amount = Number(t.amount)
        paymentMap.set(method, (paymentMap.get(method) || 0) + amount)
        totalPayments += amount
      })

      const paymentMethods = Array.from(paymentMap.entries())
        .map(([name, value], index) => ({
          name,
          value: Number(value),
          percentage: totalPayments > 0 ? Number(((Number(value) / totalPayments) * 100).toFixed(1)) : 0,
          color: COLORS[index % COLORS.length],
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)

      // Generate monthly trends
      const monthlyMap = new Map()
      transactions?.forEach((t) => {
        const month = format(new Date(t.transaction_date), "MMM yyyy")
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { income: 0, expenses: 0 })
        }
        const monthData = monthlyMap.get(month)
        if (t.type === "income") {
          monthData.income += Number(t.amount)
        } else {
          monthData.expenses += Number(t.amount)
        }
      })

      const monthlyTrends = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month,
          income: Math.round(data.income),
          expenses: Math.round(data.expenses),
          profit: Math.round(data.income - data.expenses),
        }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

      // Generate franchise comparison
      const franchiseMap = new Map()
      transactions?.forEach((t) => {
        const franchise = t.franchises.name
        if (!franchiseMap.has(franchise)) {
          franchiseMap.set(franchise, { revenue: 0, expenses: 0 })
        }
        const franchiseData = franchiseMap.get(franchise)
        if (t.type === "income") {
          franchiseData.revenue += Number(t.amount)
        } else {
          franchiseData.expenses += Number(t.amount)
        }
      })

      const franchiseComparison = Array.from(franchiseMap.entries())
        .map(([franchise, data]) => ({
          franchise,
          revenue: Math.round(data.revenue),
          expenses: Math.round(data.expenses),
          profit: Math.round(data.revenue - data.expenses),
        }))
        .sort((a, b) => b.revenue - a.revenue)

      setFinancialData({
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
        revenueBreakdown,
        expenseBreakdown,
        paymentMethods,
        monthlyTrends,
        franchiseComparison,
      })

      setFiltersChanged(false)
      toast.success("Financial data loaded successfully")
    } catch (error) {
      console.error("Error fetching financial data:", error)
      toast.error("Failed to load financial data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleApplyFilters = () => {
    fetchFinancialData()
  }

  const handleRefresh = () => {
    fetchFinancialData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p style={{ color: data.payload.color }}>{formatCurrency(data.value)}</p>
          {data.payload.percentage && <p className="text-sm text-muted-foreground">{data.payload.percentage}%</p>}
        </div>
      )
    }
    return null
  }

  if (loading && !refreshing) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading financial data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
            <p className="text-muted-foreground">Monitor your business financial performance with real-time data</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
              </div>
              <div className="w-full sm:w-48">
                <label className="text-sm font-medium mb-2 block">Franchise</label>
                <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Franchises" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Franchises</SelectItem>
                    {franchises.map((franchise) => (
                      <SelectItem key={franchise.id} value={franchise.id}>
                        {franchise.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleApplyFilters}
                disabled={!filtersChanged || refreshing}
                className="w-full sm:w-auto"
              >
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
                {filtersChanged && (
                  <Badge variant="secondary" className="ml-2">
                    New
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(financialData.totalIncome)}</div>
              <p className="text-xs text-muted-foreground">
                From {financialData.revenueBreakdown.length} income categories
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(financialData.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">
                From {financialData.expenseBreakdown.length} expense categories
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${financialData.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(financialData.netProfit)}
              </div>
              <p className="text-xs text-muted-foreground">
                {financialData.netProfit >= 0 ? "Profit" : "Loss"} for selected period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <PieChart className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${financialData.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {financialData.profitMargin.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {financialData.profitMargin >= 15
                  ? "Excellent"
                  : financialData.profitMargin >= 10
                    ? "Good"
                    : "Needs improvement"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
            <TabsTrigger value="franchise">Franchise</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Breakdown Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>Income distribution by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {financialData.revenueBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={financialData.revenueBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {financialData.revenueBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No revenue data available for selected period
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Methods Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Transaction distribution by payment type</CardDescription>
                </CardHeader>
                <CardContent>
                  {financialData.paymentMethods.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={financialData.paymentMethods}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name} ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {financialData.paymentMethods.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No payment data available for selected period
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Analysis Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Trends</CardTitle>
                  <CardDescription>Revenue performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {financialData.monthlyTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={financialData.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="income" fill="#00C49F" name="Income" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No monthly data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Revenue Categories</CardTitle>
                  <CardDescription>Highest earning categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {financialData.revenueBreakdown.slice(0, 6).map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(category.value)}</div>
                          <div className="text-sm text-muted-foreground">
                            {((category.value / financialData.totalIncome) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Expense Distribution</CardTitle>
                  <CardDescription>Expense breakdown by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {financialData.expenseBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={financialData.expenseBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {financialData.expenseBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No expense data available for selected period
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Expense Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Expense Categories</CardTitle>
                  <CardDescription>Highest spending categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {financialData.expenseBreakdown.slice(0, 6).map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(category.value)}</div>
                          <div className="text-sm text-muted-foreground">
                            {((category.value / financialData.totalExpenses) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cash-flow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Trends</CardTitle>
                <CardDescription>Income vs Expenses over time</CardDescription>
              </CardHeader>
              <CardContent>
                {financialData.monthlyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={financialData.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#00C49F" name="Income" strokeWidth={2} />
                      <Line type="monotone" dataKey="expenses" stroke="#FF8042" name="Expenses" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="#0088FE" name="Profit" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    No cash flow data available for selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="franchise" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Franchise Performance Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Franchise Performance</CardTitle>
                  <CardDescription>Revenue and expenses by franchise</CardDescription>
                </CardHeader>
                <CardContent>
                  {financialData.franchiseComparison.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={financialData.franchiseComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="franchise" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#00C49F" name="Revenue" />
                        <Bar dataKey="expenses" fill="#FF8042" name="Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No franchise data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Franchise Profit Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Franchise Profit Comparison</CardTitle>
                  <CardDescription>Net profit by franchise location</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {financialData.franchiseComparison.map((franchise, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{franchise.franchise}</div>
                          <div className="text-sm text-muted-foreground">
                            Revenue: {formatCurrency(franchise.revenue)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${franchise.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(franchise.profit)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {franchise.revenue > 0 ? ((franchise.profit / franchise.revenue) * 100).toFixed(1) : 0}%
                            margin
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
