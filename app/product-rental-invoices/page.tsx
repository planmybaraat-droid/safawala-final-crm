"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Search,
  Archive,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  ArrowLeft,
  Calendar,
  Package,
  Truck,
} from "lucide-react"
import { InvoiceService } from "@/lib/services/invoice-service"
import { useToast } from "@/hooks/use-toast"
import type { Invoice } from "@/lib/types"

interface InvoiceStats {
  total: number
  paid: number
  partially_paid: number
  pending: number
  total_revenue: number
  pending_amount: number
}

const formatTime12h = (time: string): string => {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  if (isNaN(h) || isNaN(m)) return time
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`
}

export default function ProductRentalInvoicesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <ProductRentalInvoicesContent />
      </div>
    </div>
  )
}

function ProductRentalInvoicesContent() {
  const router = useRouter()
  const { toast } = useToast()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0,
    paid: 0,
    partially_paid: 0,
    pending: 0,
    total_revenue: 0,
    pending_amount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [durationFilter, setDurationFilter] = useState("all") // all, short (1-2 days), medium (3-7), long (8+)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  useEffect(() => {
    loadInvoices()
    loadStats()

    const interval = setInterval(() => {
      loadInvoices()
      loadStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchTerm, statusFilter, durationFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, durationFilter])

  const loadInvoices = async () => {
    try {
      const invoiceService = new InvoiceService()
      const allInvoices = await invoiceService.getAll()

      // Filter only product order invoices (rentals)
      const rentalInvoices = allInvoices.filter(
        (inv) => inv.invoice_type === "product_order"
      )
      setInvoices(rentalInvoices)
    } catch (error) {
      console.error("Error loading invoices:", error)
      toast({
        title: "Error",
        description: "Failed to load rental invoices",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const invoiceService = new InvoiceService()
      const allInvoices = await invoiceService.getAll()

      // Filter only product order invoices
      const rentalInvoices = allInvoices.filter(
        (inv) => inv.invoice_type === "product_order"
      )

      const calculatedStats: InvoiceStats = {
        total: rentalInvoices.length,
        paid: rentalInvoices.filter((inv) => inv.payment_status === "paid")
          .length,
        partially_paid: rentalInvoices.filter(
          (inv) => inv.payment_status === "partial"
        ).length,
        pending: rentalInvoices.filter((inv) => inv.payment_status === "pending")
          .length,
        total_revenue: rentalInvoices.reduce(
          (sum, inv) => sum + (inv.paid_amount || 0),
          0
        ),
        pending_amount: rentalInvoices.reduce(
          (sum, inv) => sum + (inv.pending_amount || 0),
          0
        ),
      }

      setStats(calculatedStats)
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const calculateRentalDuration = (
    deliveryDate: string,
    returnDate: string
  ): number => {
    return Math.ceil(
      (new Date(returnDate).getTime() - new Date(deliveryDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  }

  const filterInvoices = () => {
    let filtered = invoices

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (inv) =>
          inv.invoice_number?.toLowerCase().includes(term) ||
          (inv as any).customer_name?.toLowerCase().includes(term) ||
          (inv as any).customer_phone?.toLowerCase().includes(term) ||
          (inv as any).venue_address?.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (inv) => inv.payment_status === statusFilter
      )
    }

    // Duration filter
    if (durationFilter !== "all" && durationFilter) {
      filtered = filtered.filter((inv) => {
        if (!inv.delivery_date || !inv.return_date) return false
        const duration = calculateRentalDuration(
          inv.delivery_date,
          inv.return_date
        )
        if (durationFilter === "short") return duration <= 2
        if (durationFilter === "medium") return duration >= 3 && duration <= 7
        if (durationFilter === "long") return duration >= 8
        return true
      })
    }

    setFilteredInvoices(filtered)
  }

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredInvoices.slice(start, start + itemsPerPage)
  }, [filteredInvoices, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      paid: { label: "Paid", variant: "default" },
      partial: { label: "Partial", variant: "secondary" },
      pending: { label: "Pending", variant: "outline" },
    }

    const config = statusConfig[status] || statusConfig.pending

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const handleArchiveInvoice = async (invoice: Invoice) => {
    if (!confirm("Are you sure you want to archive this invoice?")) return
    
    try {
      const response = await fetch('/api/bookings/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoice.id, type: 'product_order' })
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to archive invoice')
      }
      
      toast({ title: 'Archived', description: 'Invoice archived successfully' })
      await loadInvoices()
      await loadStats()
    } catch (error: any) {
      console.error('Archive error:', error)
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to archive invoice', 
        variant: 'destructive' 
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Rental Invoices
            </h1>
            <p className="text-muted-foreground">
              Manage all product rental invoices and payment tracking
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rentals</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All rental orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.paid}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.total_revenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partial</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.partially_paid}
            </div>
            <p className="text-xs text-muted-foreground">Partial payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.pending_amount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.total_revenue)}
            </div>
            <p className="text-xs text-muted-foreground">Collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Truck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.pending_amount)}
            </div>
            <p className="text-xs text-muted-foreground">To collect</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice #, customer, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={durationFilter} onValueChange={setDurationFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Rental Duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Durations</SelectItem>
                <SelectItem value="short">Short (1-2 days)</SelectItem>
                <SelectItem value="medium">Medium (3-7 days)</SelectItem>
                <SelectItem value="long">Long (8+ days)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                loadInvoices()
                loadStats()
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rental Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading invoices...</div>
          ) : paginatedInvoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {filteredInvoices.length === 0
                  ? "No rental invoices found"
                  : "No results for current filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-semibold">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {(invoice as any).customer_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(invoice as any).customer_phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {invoice.delivery_date
                              ? formatDate(invoice.delivery_date)
                              : "N/A"}
                          </p>
                          {(invoice as any).delivery_time && (
                            <p className="text-xs text-gray-500">
                              {formatTime12h((invoice as any).delivery_time)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {invoice.return_date
                              ? formatDate(invoice.return_date)
                              : "N/A"}
                          </p>
                          {(invoice as any).return_time && (
                            <p className="text-xs text-gray-500">
                              {formatTime12h((invoice as any).return_time)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.delivery_date && invoice.return_date ? (
                          <Badge variant="outline">
                            {calculateRentalDuration(
                              invoice.delivery_date,
                              invoice.return_date
                            )}{" "}
                            days
                          </Badge>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(
                          (invoice as any).total_amount ||
                            (invoice as any).amount_due ||
                            0
                        )}
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {formatCurrency(invoice.paid_amount || 0)}
                      </TableCell>
                      <TableCell className="text-orange-600 font-semibold">
                        {formatCurrency(invoice.pending_amount || 0)}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.payment_status || "pending")}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveInvoice(invoice)}
                          title="Archive Invoice"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredInvoices.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredInvoices.length)}{" "}
                  of {filteredInvoices.length} invoices
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
