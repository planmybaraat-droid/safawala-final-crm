"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  Download,
  Eye,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  ArrowLeft,
  User,
  Calendar,
  Package,
  Shield,
  Share2,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  MessageCircle,
} from "lucide-react"
import { InvoiceService } from "@/lib/services/invoice-service"
import { useToast } from "@/hooks/use-toast"
import { sendInvoiceViaWhatsApp } from "@/lib/send-invoice-whatsapp"
import type { Invoice } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { archiveInvoice, restoreInvoice } from "@/lib/invoices"

interface InvoiceStats {
  total: number
  paid: number
  partially_paid: number
  overdue: number
  total_revenue: number
}

const formatTime12h = (time: string): string => {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  if (isNaN(h) || isNaN(m)) return time
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`
}

export default function InvoicesPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <InvoicesPageContent />
        </div>
      </div>
    </DashboardLayout>
  )
}

function InvoicesPageContent() {
  const router = useRouter()
  const { toast } = useToast()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0,
    paid: 0,
    partially_paid: 0,
    overdue: 0,
    total_revenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false)
  const [archivedInvoices, setArchivedInvoices] = useState<Invoice[]>([])
  const [showArchivedSection, setShowArchivedSection] = useState(false)

  useEffect(() => {
    loadInvoices()
    loadStats()
    fetchArchivedInvoices()

    const interval = setInterval(() => {
      loadInvoices()
      loadStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchTerm, statusFilter, dateFilter])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, dateFilter])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const data = await InvoiceService.getAll()
      setInvoices(data)
    } catch (error) {
      console.error("Error loading invoices:", error)
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await InvoiceService.getStats()
      setStats(statsData)
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const fetchArchivedInvoices = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("product_orders")
        .select("*")
        .eq("is_archived", true)
        .order("created_at", { ascending: false })
        .limit(10)

      if (data) {
        setArchivedInvoices(data as Invoice[])
        console.log(`[Invoices] Loaded ${data.length} archived invoices`)
      }
    } catch (error) {
      console.error("[Invoices] Error fetching archived invoices:", error)
    }
  }

  const filterInvoices = () => {
    let filtered = invoices

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.customer_phone?.includes(searchTerm) ||
          invoice.groom_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.bride_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.payment_status === statusFilter)
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter(
            (invoice) => new Date(invoice.created_at).toDateString() === filterDate.toDateString(),
          )
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          filtered = filtered.filter((invoice) => new Date(invoice.created_at) >= filterDate)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          filtered = filtered.filter((invoice) => new Date(invoice.created_at) >= filterDate)
          break
        case "quarter":
          filterDate.setMonth(now.getMonth() - 3)
          filtered = filtered.filter((invoice) => new Date(invoice.created_at) >= filterDate)
          break
      }
    }

    setFilteredInvoices(filtered)
  }

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredInvoices, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)

  const handleDeleteInvoice = async (invoiceId: string) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete invoice")
      }

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      })

      setShowDeleteConfirm(false)
      setDeletingInvoiceId(null)
      loadInvoices()
    } catch (error) {
      console.error("Error deleting invoice:", error)
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleArchiveInvoice = async (invoiceId: string) => {
    try {
      const response = await archiveInvoice(invoiceId)

      if (!response.success) {
        throw new Error(response.error || 'Failed to archive invoice')
      }

      toast({
        title: "Archived",
        description: "Invoice archived successfully",
      })

      loadInvoices()
      fetchArchivedInvoices()
    } catch (error) {
      console.error("Error archiving invoice:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to archive invoice",
        variant: "destructive",
      })
    }
  }

  const handleRestoreInvoice = async (invoiceId: string) => {
    try {
      const response = await restoreInvoice(invoiceId)

      if (!response.success) {
        throw new Error(response.error || 'Failed to restore invoice')
      }

      toast({
        title: "Restored",
        description: "Invoice restored successfully",
      })

      loadInvoices()
      fetchArchivedInvoices()
    } catch (error) {
      console.error("Error restoring invoice:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restore invoice",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: "Paid", variant: "default" as const, icon: CheckCircle },
      partial: { label: "Partial", variant: "secondary" as const, icon: Clock },
      overdue: { label: "Overdue", variant: "destructive" as const, icon: AlertCircle },
      pending: { label: "Pending", variant: "outline" as const, icon: Clock },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
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

  return (
    <div className="space-y-6">
      {typeof window !== 'undefined' && (window as any).__INVOICE_SCHEMA_ERROR__ && (
        <div className="border border-red-300 bg-red-50 text-sm text-red-800 rounded-md p-4 space-y-2">
          <p className="font-semibold">Database schema missing for invoices.</p>
          <p>
            The tables <code>product_orders</code> / <code>package_bookings</code> or the column <code>is_quote</code> are not present.
            Run the migrations <code>MIGRATION_SPLIT_PRODUCT_AND_PACKAGE_BOOKINGS.sql</code> and <code>ADD_QUOTE_SUPPORT.sql</code> in your Supabase SQL Editor.
          </p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Open Supabase Dashboard → SQL</li>
            <li>Paste contents of <code>MIGRATION_SPLIT_PRODUCT_AND_PACKAGE_BOOKINGS.sql</code> and run</li>
            <li>Then run <code>ADD_QUOTE_SUPPORT.sql</code></li>
            <li>Reload this page</li>
          </ol>
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>Reload After Migration</Button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => router.push("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">View and manage invoices for confirmed bookings and orders</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push('/create-invoice')}>
              <Package className="h-4 w-4 mr-2" />
              Create Booking
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partial</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.partially_paid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total_revenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Invoices</CardTitle>
          <CardDescription>Search and filter your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number, customer name, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadInvoices}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No invoices found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Invoices are automatically generated when quotes are converted or when orders are placed.
              </p>
              <Button onClick={() => router.push("/quotes")}>View Quotes</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Event Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{invoice.customer_name}</span>
                          <span className="text-sm text-muted-foreground">{invoice.customer_phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {invoice.groom_name && invoice.bride_name ? (
                            <>
                              <span className="text-sm">
                                {invoice.groom_name} & {invoice.bride_name}
                              </span>
                              <span className="text-xs text-muted-foreground">{invoice.event_type || "Wedding"}</span>
                            </>
                          ) : (
                            <span className="text-sm">{invoice.invoice_type === "package_booking" ? "Package Booking" : "Product Order"}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.created_at)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(invoice.paid_amount || 0)}</TableCell>
                      <TableCell className="text-orange-600">{formatCurrency(invoice.pending_amount || 0)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.payment_status || "pending")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setShowViewDialog(true)
                            }}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              toast({ title: "Sending...", description: "Sending invoice on WhatsApp" })
                              const result = await sendInvoiceViaWhatsApp({
                                orderId: invoice.id,
                                orderType: invoice.invoice_type === "package_booking" ? "package_booking" : "product_order",
                              })
                              if (result.success) {
                                toast({ title: "Sent!", description: "Invoice sent on WhatsApp" })
                              } else {
                                toast({ title: "Error", description: result.error || "Could not send", variant: "destructive" })
                              }
                            }}
                            title="Send on WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/create-invoice?mode=edit&id=${invoice.id}`)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchiveInvoice(invoice.id)}
                            title="Archive"
                          >
                            <Archive className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {filteredInvoices.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of{" "}
                  {filteredInvoices.length} invoices
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Items per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Archived Invoices Section */}
      {archivedInvoices.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                <div>
                  <CardTitle>Archived Invoices</CardTitle>
                  <CardDescription>{archivedInvoices.length} archived invoice(s)</CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchivedSection(!showArchivedSection)}
              >
                {showArchivedSection ? "Hide" : "Show"} Archived
              </Button>
            </div>
          </CardHeader>
          {showArchivedSection && (
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.customer_name}</TableCell>
                        <TableCell>{formatCurrency(invoice.total_amount || 0)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.payment_status || "pending")}</TableCell>
                        <TableCell>
                          {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setShowViewDialog(true)
                              }}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreInvoice(invoice.id)}
                              title="Restore"
                            >
                              <RotateCcw className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingInvoiceId(invoice.id)
                                setShowDeleteConfirm(true)
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
      
      {/* View Invoice Dialog - Complete (Matches Quotes) */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details - {selectedInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>Complete information for this invoice</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Customer & Event Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {selectedInvoice.customer_name || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {selectedInvoice.customer_phone || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">WhatsApp:</span> {(selectedInvoice.customer as any)?.whatsapp || selectedInvoice.customer_phone || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedInvoice.customer_email || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Address:</span> {selectedInvoice.customer_address || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">City:</span> {selectedInvoice.customer_city || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">State:</span> {selectedInvoice.customer_state || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Pincode:</span> {selectedInvoice.customer_pincode || "N/A"}
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Event Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Event Type:</span> {selectedInvoice.event_type || "N/A"}
                    </div>
                    {selectedInvoice.participant && (
                      <div>
                        <span className="font-medium">Event Participant:</span> {selectedInvoice.participant}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Event Date:</span>{" "}
                      {selectedInvoice.event_date ? new Date(selectedInvoice.event_date).toLocaleDateString() : "N/A"}
                    </div>
                    {selectedInvoice.event_time && (
                      <div>
                        <span className="font-medium">Event Time:</span> {formatTime12h(selectedInvoice.event_time)}
                      </div>
                    )}
                    {selectedInvoice.groom_name && (
                      <>
                        <div>
                          <span className="font-medium">Groom Name:</span> {selectedInvoice.groom_name}
                        </div>
                        {(selectedInvoice as any).groom_whatsapp && (
                          <div>
                            <span className="font-medium">Groom WhatsApp:</span> {(selectedInvoice as any).groom_whatsapp}
                          </div>
                        )}
                        {(selectedInvoice as any).groom_address && (
                          <div>
                            <span className="font-medium">Groom Address:</span> {(selectedInvoice as any).groom_address}
                          </div>
                        )}
                      </>
                    )}
                    {selectedInvoice.bride_name && (
                      <>
                        <div>
                          <span className="font-medium">Bride Name:</span> {selectedInvoice.bride_name}
                        </div>
                        {(selectedInvoice as any).bride_whatsapp && (
                          <div>
                            <span className="font-medium">Bride WhatsApp:</span> {(selectedInvoice as any).bride_whatsapp}
                          </div>
                        )}
                        {(selectedInvoice as any).bride_address && (
                          <div>
                            <span className="font-medium">Bride Address:</span> {(selectedInvoice as any).bride_address}
                          </div>
                        )}
                      </>
                    )}
                    {(selectedInvoice as any).venue_name && (
                      <div>
                        <span className="font-medium">Venue:</span> {(selectedInvoice as any).venue_name}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Venue Address:</span> {selectedInvoice.venue_address || "N/A"}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Invoice & Delivery Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Invoice Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Invoice #:</span> {selectedInvoice.invoice_number}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>{" "}
                      <Badge variant={selectedInvoice.invoice_type === 'package_booking' ? 'default' : 'secondary'}>
                        {selectedInvoice.invoice_type === 'package_booking' 
                          ? '📦 Package (Rent)' 
                          : `🛍️ Product (${(selectedInvoice as any).booking_subtype === 'sale' ? 'Sale' : 'Rent'})`}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {getStatusBadge(selectedInvoice.payment_status || "pending")}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(selectedInvoice.created_at).toLocaleDateString()}
                    </div>
                    {(selectedInvoice as any).payment_method && (
                      <div>
                        <span className="font-medium">Payment Type:</span>{" "}
                        <Badge variant="outline">
                          {(selectedInvoice as any).payment_method === 'full' ? 'Full Payment' : 
                           (selectedInvoice as any).payment_method === 'advance' ? 'Advance Payment' : 
                           (selectedInvoice as any).payment_method === 'partial' ? 'Partial Payment' : 
                           (selectedInvoice as any).payment_method}
                        </Badge>
                      </div>
                    )}
                    {selectedInvoice.paid_amount !== undefined && selectedInvoice.paid_amount > 0 && (
                      <div>
                        <span className="font-medium">Amount Paid:</span> {formatCurrency(selectedInvoice.paid_amount)}
                      </div>
                    )}
                    {selectedInvoice.pending_amount !== undefined && selectedInvoice.pending_amount > 0 && (
                      <div>
                        <span className="font-medium">Pending Amount:</span> {formatCurrency(selectedInvoice.pending_amount)}
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Delivery Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Delivery Date:</span>{" "}
                      {selectedInvoice.delivery_date ? new Date(selectedInvoice.delivery_date).toLocaleDateString() : "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Delivery Time:</span>{" "}
                      {(selectedInvoice as any).delivery_time ? formatTime12h((selectedInvoice as any).delivery_time) : (selectedInvoice.delivery_date ? new Date(selectedInvoice.delivery_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : "N/A")}
                    </div>
                    <div>
                      <span className="font-medium">Return Date:</span>{" "}
                      {selectedInvoice.return_date ? new Date(selectedInvoice.return_date).toLocaleDateString() : "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Return Time:</span>{" "}
                      {(selectedInvoice as any).return_time ? formatTime12h((selectedInvoice as any).return_time) : (selectedInvoice.return_date ? new Date(selectedInvoice.return_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : "N/A")}
                    </div>
                    {(selectedInvoice as any).special_instructions && (
                      <div>
                        <span className="font-medium">Special Instructions:</span>
                        <p className="text-muted-foreground mt-1">{(selectedInvoice as any).special_instructions}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Invoice Items */}
              {(selectedInvoice as any).invoice_items && (selectedInvoice as any).invoice_items.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Invoice Items
                  </h3>
                  <div className="space-y-4">
                    {(selectedInvoice as any).invoice_items.map((item: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        {/* Category Badge */}
                        {item.category && (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs font-semibold">
                              {item.category}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Package/Product Name */}
                        <div>
                          <h4 className="font-bold text-lg">{item.product_name || item.package_name}</h4>
                          {item.package_description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.package_description}</p>
                          )}
                        </div>

                        {/* Variant Information */}
                        {item.variant_name && (
                          <div className="bg-blue-50 p-3 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-blue-700">
                                Variant: {item.variant_name}
                              </span>
                              {item.extra_safas > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  +{item.extra_safas} Extra Safas
                                </Badge>
                              )}
                            </div>
                            
                            {/* Variant Inclusions */}
                            {item.variant_inclusions && item.variant_inclusions.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-600 mb-1">Inclusions:</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {item.variant_inclusions.map((inclusion: any, idx: number) => (
                                    <div key={idx} className="flex items-center text-xs text-gray-700">
                                      <span className="mr-1">•</span>
                                      <span>{inclusion.product_name} × {inclusion.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Price Details */}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="text-sm text-gray-600">
                            <span>Quantity: {item.quantity || 1}</span>
                            {item.unit_price && (
                              <span className="ml-3">Unit Price: {formatCurrency(item.unit_price)}</span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Line Total</div>
                            <div className="font-bold text-lg">{formatCurrency(item.total_price || item.price || 0)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Financial Summary - Full Featured */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  💰 Financial Summary
                </h3>
                <div className="space-y-2">
                  {/* Items Subtotal */}
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Items Subtotal:</span>
                    <span className="font-medium">{formatCurrency(selectedInvoice.subtotal_amount || 0)}</span>
                  </div>

                  {/* Distance Charges (if applicable for package) */}
                  {(selectedInvoice as any).distance_amount && (selectedInvoice as any).distance_amount > 0 && (
                    <div className="flex justify-between items-center py-2 border-b text-blue-600">
                      <span className="text-sm flex items-center gap-1">
                        <span>📍 Distance Charges</span>
                        {(selectedInvoice as any).distance_km && <span className="text-xs text-gray-500">({(selectedInvoice as any).distance_km} km)</span>}
                      </span>
                      <span className="font-medium">{formatCurrency((selectedInvoice as any).distance_amount)}</span>
                    </div>
                  )}

                  {/* Manual Discount */}
                  {selectedInvoice.discount_amount && selectedInvoice.discount_amount > 0 && (
                    <div className="flex justify-between items-center py-2 border-b text-green-600">
                      <span className="text-sm">Discount{(selectedInvoice as any).discount_percentage ? ` (${(selectedInvoice as any).discount_percentage}%)` : ''}:</span>
                      <span className="font-medium">-{formatCurrency(selectedInvoice.discount_amount)}</span>
                    </div>
                  )}

                  {/* Coupon Discount */}
                  {(selectedInvoice as any).coupon_code && (selectedInvoice as any).coupon_discount && (selectedInvoice as any).coupon_discount > 0 && (
                    <div className="flex justify-between items-center py-2 border-b text-green-600">
                      <span className="text-sm">Coupon ({(selectedInvoice as any).coupon_code}):</span>
                      <span className="font-medium">-{formatCurrency((selectedInvoice as any).coupon_discount)}</span>
                    </div>
                  )}

                  {/* After Discounts Line */}
                  {((selectedInvoice.discount_amount && selectedInvoice.discount_amount > 0) || 
                    ((selectedInvoice as any).coupon_discount && (selectedInvoice as any).coupon_discount > 0)) && (
                    <div className="flex justify-between items-center py-2 border-b font-medium">
                      <span className="text-sm">After Discounts:</span>
                      <span>{formatCurrency(
                        (selectedInvoice.subtotal_amount || selectedInvoice.total_amount) + 
                        ((selectedInvoice as any).distance_amount || 0) - 
                        (selectedInvoice.discount_amount || 0) - 
                        ((selectedInvoice as any).coupon_discount || 0)
                      )}</span>
                    </div>
                  )}

                  {/* Tax/GST with dynamic percentage */}
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">GST ({(selectedInvoice as any).gst_percentage || 5}%):</span>
                    <span className="font-medium">{formatCurrency(selectedInvoice.tax_amount || 0)}</span>
                  </div>

                  {/* Security Deposit */}
                  {selectedInvoice.security_deposit && selectedInvoice.security_deposit > 0 && (
                    <div className="flex justify-between items-center py-2 border-b text-blue-600 font-medium">
                      <span className="text-sm flex items-center gap-1">
                        🔒 Security Deposit (Refundable)
                      </span>
                      <span>{formatCurrency(selectedInvoice.security_deposit)}</span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="flex justify-between items-center py-3 bg-green-50 px-3 rounded font-bold">
                    <span>Grand Total:</span>
                    <span className="text-green-700 text-lg">{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>

                  {/* Total with Deposit */}
                  {selectedInvoice.security_deposit && selectedInvoice.security_deposit > 0 && (
                    <div className="flex justify-between items-center py-3 bg-purple-50 px-3 rounded border-2 border-purple-200 font-bold">
                      <span>💎 Total with Security Deposit:</span>
                      <span className="text-purple-700 text-lg">
                        {formatCurrency(selectedInvoice.total_amount + selectedInvoice.security_deposit)}
                      </span>
                    </div>
                  )}

                  {/* Payment Breakdown */}
                  <div className="pt-3 mt-3 border-t space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">💳 Payment Status</h4>
                    
                    {selectedInvoice.paid_amount !== undefined && selectedInvoice.paid_amount > 0 && (
                      <div className="flex justify-between items-center py-2 bg-green-50 px-3 rounded">
                        <span className="text-sm">✅ Amount Paid:</span>
                        <span className="font-medium text-green-700">{formatCurrency(selectedInvoice.paid_amount)}</span>
                      </div>
                    )}

                    {selectedInvoice.pending_amount !== undefined && selectedInvoice.pending_amount > 0 && (
                      <div className="flex justify-between items-center py-2 bg-orange-50 px-3 rounded">
                        <span className="text-sm">⏳ Balance Due:</span>
                        <span className="font-medium text-orange-700">{formatCurrency(selectedInvoice.pending_amount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Notes */}
              {selectedInvoice.notes && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Download PDF functionality
                    }}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    disabled={sendingWhatsApp}
                    onClick={async () => {
                      if (!selectedInvoice) return
                      setSendingWhatsApp(true)
                      const result = await sendInvoiceViaWhatsApp({
                        orderId: selectedInvoice.id,
                        orderType: selectedInvoice.invoice_type === "package_booking" ? "package_booking" : "product_order",
                      })
                      setSendingWhatsApp(false)
                      if (result.success) {
                        toast({ title: "Sent!", description: `Invoice sent on WhatsApp to customer` })
                      } else {
                        toast({ title: "WhatsApp Error", description: result.error || "Could not send invoice", variant: "destructive" })
                      }
                    }}
                    className="text-green-700 border-green-300 hover:bg-green-50"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {sendingWhatsApp ? "Sending..." : "Send on WhatsApp"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`Invoice #${selectedInvoice.invoice_number}`)
                      toast({
                        title: "Copied",
                        description: "Invoice number copied to clipboard",
                      })
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
                <Button onClick={() => setShowViewDialog(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingInvoiceId) {
                  handleDeleteInvoice(deletingInvoiceId)
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
