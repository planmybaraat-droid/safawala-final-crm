"use client"

import { DialogDescription } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Plus,
  Search,
  Download,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Info,
  RefreshCw,
  ArrowLeft,
  User,
  Calendar,
  Package,
  Shield,
  Share2,
  Eye,
  Pencil,
  CalendarIcon,
  Save,
  Loader2,
} from "lucide-react"
import { QuoteService } from "@/lib/services/quote-service"
import { BookingService } from "@/lib/services/booking-service"
import { ConvertQuoteDialog } from "@/components/quotes/convert-quote-dialog"
import { useToast } from "@/hooks/use-toast"
import type { Quote, User as UserType } from "@/lib/types"
import { downloadQuotePDF, type PDFDesignType } from "@/lib/pdf/generate-quote-pdf"
import { useRouter, useSearchParams } from "next/navigation"
import { BookingTypeDialog } from "@/components/quotes/booking-type-dialog"
import { getCurrentUser } from "@/lib/auth"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

interface QuoteStats {
  total: number
  generated: number
  sent: number
  accepted: number
  rejected: number
  converted: number
  expired: number
}

interface QuoteTemplate {
  id: string
  name: string
  description: string
  style: "modern" | "classic" | "minimal" | "elegant" | "corporate" | "creative" | "premium"
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  layout: "standard" | "compact" | "detailed" | "summary"
}

const defaultQuoteTemplates: QuoteTemplate[] = [
  {
    id: "modern-blue",
    name: "Modern Blue",
    description: "Clean and professional with blue accents",
    style: "modern",
    colors: { primary: "#2563eb", secondary: "#64748b", accent: "#0ea5e9" },
    layout: "standard",
  },
  {
    id: "classic-gold",
    name: "Classic Gold",
    description: "Traditional wedding theme with gold highlights",
    style: "classic",
    colors: { primary: "#d97706", secondary: "#78716c", accent: "#f59e0b" },
    layout: "detailed",
  },
  {
    id: "minimal-gray",
    name: "Minimal Gray",
    description: "Simple and clean with minimal design",
    style: "minimal",
    colors: { primary: "#374151", secondary: "#9ca3af", accent: "#6b7280" },
    layout: "compact",
  },
  {
    id: "elegant-purple",
    name: "Elegant Purple",
    description: "Sophisticated purple theme for premium events",
    style: "elegant",
    colors: { primary: "#7c3aed", secondary: "#a78bfa", accent: "#8b5cf6" },
    layout: "detailed",
  },
  {
    id: "corporate-navy",
    name: "Corporate Navy",
    description: "Professional navy blue for business events",
    style: "corporate",
    colors: { primary: "#1e40af", secondary: "#64748b", accent: "#3b82f6" },
    layout: "standard",
  },
  {
    id: "creative-teal",
    name: "Creative Teal",
    description: "Vibrant and creative with teal accents",
    style: "creative",
    colors: { primary: "#0d9488", secondary: "#6b7280", accent: "#14b8a6" },
    layout: "summary",
  },
  {
    id: "premium-rose",
    name: "Premium Rose Gold",
    description: "Luxury rose gold theme for high-end events",
    style: "premium",
    colors: { primary: "#e11d48", secondary: "#9ca3af", accent: "#f43f5e" },
    layout: "detailed",
  },
]

function QuotesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<UserType | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([])
  const [stats, setStats] = useState<QuoteStats>({
    total: 0,
    generated: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    converted: 0,
    expired: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [showQuoteDetails, setShowQuoteDetails] = useState(false)
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate>(defaultQuoteTemplates[0])
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<QuoteTemplate | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showBookingTypeDialog, setShowBookingTypeDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [pdfDesign, setPdfDesign] = useState<PDFDesignType>("classic")
  const [isExporting, setIsExporting] = useState(false)
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null)
  
  
  
  // Edit quote form state
  const [editFormData, setEditFormData] = useState({
    event_type: "",
    event_participant: "",
    payment_type: "",
    event_date: "",
    event_time: "",
    delivery_date: "",
    delivery_time: "",
    return_date: "",
    return_time: "",
    venue_address: "",
    groom_name: "",
    groom_whatsapp: "",
    groom_address: "",
    bride_name: "",
    bride_whatsapp: "",
    bride_address: "",
    notes: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  const demoQuoteData = {
    id: "QT001",
    customer: {
      name: "John & Jane Doe",
      email: "john.doe@email.com",
      phone: "+91 98765 43210",
      address: "123 Wedding Street, Mumbai, Maharashtra 400001",
    },
    event: {
      type: "Wedding Reception",
      date: "2024-12-15",
      venue: "Grand Ballroom, Hotel Paradise",
      guests: 200,
    },
    items: [
      { name: "Round Tables (10 seater)", quantity: 20, rate: 500, amount: 10000 },
      { name: "Chiavari Chairs", quantity: 200, rate: 50, amount: 10000 },
      { name: "Stage Decoration", quantity: 1, rate: 15000, amount: 15000 },
      { name: "Lighting Setup", quantity: 1, rate: 8000, amount: 8000 },
      { name: "Sound System", quantity: 1, rate: 5000, amount: 5000 },
    ],
    subtotal: 48000,
    tax: 8640,
    discount: 3640,
    total: 53000,
    validUntil: "2024-11-30",
  }

  const { toast } = useToast()

  // Initial load and auto-refresh
  useEffect(() => {
    loadQuotes()
    loadStats()

    const interval = setInterval(() => {
      loadQuotes()
      loadStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Watch for URL changes (e.g., redirect from create page with refresh param)
  useEffect(() => {
    const refreshParam = searchParams?.get('refresh')
    if (refreshParam) {
      console.log('🔄 Refresh triggered from URL param')
      loadQuotes()
      loadStats()
    }
  }, [searchParams])

  useEffect(() => {
    filterQuotes()
  }, [quotes, searchTerm, statusFilter, dateFilter])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      const data = await QuoteService.getAll()
      console.log("📥 QUOTES PAGE - Loaded", data.length, "quotes")
      console.log("📊 Status breakdown:", data.reduce((acc: any, q) => { acc[q.status] = (acc[q.status] || 0) + 1; return acc }, {}))
      setQuotes(data)
    } catch (error) {
      console.error("Error loading quotes:", error)
      toast({
        title: "Error",
        description: "Failed to load quotes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await QuoteService.getStats()
      setStats(statsData)
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const filterQuotes = () => {
    let filtered = quotes

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (quote) =>
          quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.customer_phone?.includes(searchTerm) ||
          quote.groom_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.bride_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((quote) => quote.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter((quote) => new Date(quote.created_at).toDateString() === filterDate.toDateString())
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          filtered = filtered.filter((quote) => new Date(quote.created_at) >= filterDate)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          filtered = filtered.filter((quote) => new Date(quote.created_at) >= filterDate)
          break
        case "quarter":
          filterDate.setMonth(now.getMonth() - 3)
          filtered = filtered.filter((quote) => new Date(quote.created_at) >= filterDate)
          break
      }
    }

    console.log("🔍 FILTER RESULT:", filtered.length, "quotes after filtering (statusFilter:", statusFilter, ")")
    console.log("Filtered status breakdown:", filtered.reduce((acc: any, q) => { acc[q.status] = (acc[q.status] || 0) + 1; return acc }, {}))
    setFilteredQuotes(filtered)
  }





  const handleStatusUpdate = async (quoteId: string, newStatus: string) => {
    try {
      if (newStatus === "accepted") {
        // Find the quote to convert
        const quote = quotes.find((q) => q.id === quoteId)
        if (quote) {
          // Create booking from quote
          const bookingId = await BookingService.createFromQuote(quote)

          toast({
            title: "Success",
            description: `Quote accepted and converted to booking! Booking ID: ${bookingId.slice(0, 8)}...`,
          })
        }
      }

      await QuoteService.updateStatus(quoteId, newStatus)

      if (newStatus !== "accepted") {
        toast({
          title: "Success",
          description: "Quote status updated successfully",
        })
      }

      await loadQuotes()
      await loadStats()
    } catch (error) {
      console.error("Error updating quote status:", error)
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive",
      })
    }
  }

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return

    try {
      await QuoteService.delete(quoteId)
      await loadQuotes()
      await loadStats()
      toast({
        title: "Success",
        description: "Quote deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete quote",
        variant: "destructive",
      })
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      await Promise.all(selectedQuotes.map((id) => QuoteService.updateStatus(id, newStatus)))
      await loadQuotes()
      await loadStats()
      setSelectedQuotes([])
      toast({
        title: "Success",
        description: `Updated ${selectedQuotes.length} quotes to ${newStatus}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quotes",
        variant: "destructive",
      })
    }
  }

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      setDownloadingPdfId(quote.id)
      
      // Use new compact PDF API
      const response = await fetch(`/api/quotes/download-pdf?id=${quote.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }
      
      // Get the PDF blob
      const blob = await response.blob()
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${quote.quote_number || 'quote'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Quote PDF downloaded successfully",
      })
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast({
        title: "Error",
        description: "Failed to download quote PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloadingPdfId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      generated: { label: "Generated", variant: "secondary" as const, icon: FileText },
      quote: { label: "Generated", variant: "secondary" as const, icon: FileText },
      rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
      converted: { label: "Converted", variant: "default" as const, icon: CheckCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.generated
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
    }).format(amount)
  }

  const exportQuotes = async () => {
    setIsExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      const csvContent = [
        ["Quote Number", "Customer", "Phone", "Event Date", "Total Amount", "Status", "Created Date"].join(","),
        ...filteredQuotes.map((quote) =>
          [
            quote.quote_number,
            quote.customer_name || "",
            quote.customer_phone || "",
            quote.event_date || "",
            quote.total_amount,
            quote.status,
            new Date(quote.created_at).toLocaleDateString(),
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `quotes-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Success",
        description: `Exported ${filteredQuotes.length} quotes to CSV`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Error",
        description: "Failed to export quotes",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const exportToCSV = async () => {
    setIsExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      const csvContent = [
        ["Quote Number", "Customer", "Phone", "Event Date", "Total Amount", "Status", "Created Date"].join(","),
        ...filteredQuotes.map((quote) =>
          [
            quote.quote_number,
            quote.customer_name || "",
            quote.customer_phone || "",
            quote.event_date || "",
            quote.total_amount,
            quote.status,
            new Date(quote.created_at).toLocaleDateString(),
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `quotes-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Success",
        description: `Exported ${filteredQuotes.length} quotes to CSV`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Error",
        description: "Failed to export quotes",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleTemplateSelect = (template: QuoteTemplate) => {
    setSelectedTemplate(template)
    setShowTemplateSelector(false)
    toast({
      title: "Template Selected",
      description: `${template.name} template will be used for new quotes`,
    })
  }

  const handleTemplatePreview = (template: QuoteTemplate) => {
    setPreviewTemplate(template)
    setShowTemplatePreview(true)
  }

  // Redirect to appropriate create page with edit parameter
  const handleEditQuote = (quote: Quote) => {
    if (quote.booking_type === 'package') {
      router.push(`/book-package?edit=${quote.id}`)
      return
    }

    router.push(`/create-invoice?edit=${quote.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <TooltipProvider>
          {/* Header */}

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Quote Management</h1>
              <p className="text-muted-foreground">Generate and manage customer quotes</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={quotes.length === 0 || isExporting}>
              {isExporting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadQuotes()
                toast({
                  title: "Refreshed",
                  description: "Quote data has been refreshed",
                })
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            {/* PDF Design Selector */}
            <Select value={pdfDesign} onValueChange={(value: PDFDesignType) => setPdfDesign(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Classic PDF
                  </div>
                </SelectItem>
                <SelectItem value="modern">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Modern PDF
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowBookingTypeDialog(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              New Quote
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <div className="flex items-center space-x-1">
                <CardTitle className="text-xs font-medium">Total Quotes</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total number of quotes generated across all statuses</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <FileText className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-lg font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <div className="flex items-center space-x-1">
                <CardTitle className="text-xs font-medium">Generated</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Quotes that have been created but not yet sent to customers</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Clock className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-lg font-bold">{stats.generated}</div>
            </CardContent>
          </Card>
          <Card className="p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <div className="flex items-center space-x-1">
                <CardTitle className="text-xs font-medium">Converted</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Quotes that have been converted to confirmed bookings</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CheckCircle className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-lg font-bold">{stats.converted}</div>
            </CardContent>
          </Card>
          <Card className="p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <div className="flex items-center space-x-1">
                <CardTitle className="text-xs font-medium">Rejected</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Quotes declined by customers - no further action required</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <XCircle className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-lg font-bold">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-3">
          <CardHeader className="p-0 pb-2">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-sm">Filters</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter quotes by customer name, quote number, status, or date range</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search quotes, customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 pr-7 h-8 text-sm"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-8 w-8 p-0"
                      onClick={() => setSearchTerm("")}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="quote">Generated</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotes Table */}
        <Card className="p-3">
          <CardHeader className="p-0 pb-2">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-sm">Quotes ({filteredQuotes.length})</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Complete list of quotes with customer details, amounts, and status management</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription className="text-xs">All generated quotes with customer details and status</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="text-xs">Quote #</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Event</TableHead>
                    <TableHead className="text-xs">
                      <div className="flex items-center space-x-1">
                        <span>Amount</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total quote amount including taxes and security deposit</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableHead>
                    <TableHead className="text-xs">
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Quote status: Generated → Sent → Accepted/Rejected</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
                          <div className="text-sm font-medium">No quotes found</div>
                          <div className="text-xs text-muted-foreground">
                            {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                              ? "Try adjusting your filters or search term"
                              : "Create your first quote to get started"}
                          </div>
                          {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setSearchTerm("")
                                setStatusFilter("all")
                                setDateFilter("all")
                              }}
                            >
                              Clear Filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotes.map((quote) => (
                    <TableRow key={quote.id} className="h-12">
                      <TableCell className="font-medium text-xs">{quote.quote_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-xs">{quote.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{quote.customer_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={quote.booking_type === 'package' ? 'default' : 'secondary'} className="text-xs">
                          {quote.booking_type === 'package' 
                            ? '📦 Package (Rent)' 
                            : `🛍️ Product (${quote.booking_subtype === 'sale' ? 'Sale' : 'Rent'})`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-xs">{quote.event_type}</div>
                          <div className="text-xs text-muted-foreground">
                            {quote.event_date ? new Date(quote.event_date).toLocaleDateString() : "No date"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs">{formatCurrency(quote.total_amount)}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell className="text-xs">{new Date(quote.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedQuote(quote)
                              setShowViewDialog(true)
                            }}
                            title="View Quote Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              handleEditQuote(quote)
                            }}
                            title="Edit Quote"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadPDF(quote)}
                            title="Download PDF"
                            disabled={downloadingPdfId === quote.id}
                          >
                            {downloadingPdfId === quote.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <ConvertQuoteDialog 
                            quote={quote}
                            onSuccess={(bookingId) => {
                              // Refresh quotes and optionally redirect to booking
                              loadQuotes()
                              toast({
                                title: "Success",
                                description: "Quote converted to booking successfully",
                              })
                            }}
                            trigger={
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Convert to Booking"
                                disabled={quote.status !== "accepted" && quote.status !== "sent"}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Quote</DialogTitle>
              <DialogDescription>Select a template to start with</DialogDescription>
            </DialogHeader>
            {/* Template selection UI here */}
            <Button onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
          </DialogContent>
        </Dialog>

        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Quote Details - {selectedQuote?.quote_number}
              </DialogTitle>
              <DialogDescription>Complete information for this quote</DialogDescription>
            </DialogHeader>
            {selectedQuote && (
              <div className="space-y-6">
                {/* Customer Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {selectedQuote.customer_name || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span> {selectedQuote.customer_phone || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">WhatsApp:</span> {selectedQuote.customer_whatsapp || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {selectedQuote.customer_email || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Address:</span> {selectedQuote.customer_address || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">City:</span> {selectedQuote.customer_city || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">State:</span> {selectedQuote.customer_state || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Pincode:</span> {selectedQuote.customer_pincode || "N/A"}
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
                        <span className="font-medium">Event Type:</span> {selectedQuote.event_type || "N/A"}
                      </div>
                      {selectedQuote.event_participant && (
                        <div>
                          <span className="font-medium">Event Participant:</span> {selectedQuote.event_participant}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Event Date:</span>{" "}
                        {selectedQuote.event_date ? new Date(selectedQuote.event_date).toLocaleDateString() : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Event Time:</span>{" "}
                        {selectedQuote.event_date ? new Date(selectedQuote.event_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : "N/A"}
                      </div>
                      {selectedQuote.groom_name && (
                        <>
                          <div>
                            <span className="font-medium">Groom Name:</span> {selectedQuote.groom_name}
                          </div>
                          {selectedQuote.groom_whatsapp && (
                            <div>
                              <span className="font-medium">Groom WhatsApp:</span> {selectedQuote.groom_whatsapp}
                            </div>
                          )}
                          {selectedQuote.groom_address && (
                            <div>
                              <span className="font-medium">Groom Address:</span> {selectedQuote.groom_address}
                            </div>
                          )}
                        </>
                      )}
                      {selectedQuote.bride_name && (
                        <>
                          <div>
                            <span className="font-medium">Bride Name:</span> {selectedQuote.bride_name}
                          </div>
                          {selectedQuote.bride_whatsapp && (
                            <div>
                              <span className="font-medium">Bride WhatsApp:</span> {selectedQuote.bride_whatsapp}
                            </div>
                          )}
                          {selectedQuote.bride_address && (
                            <div>
                              <span className="font-medium">Bride Address:</span> {selectedQuote.bride_address}
                            </div>
                          )}
                        </>
                      )}
                      <div>
                        <span className="font-medium">Venue:</span> {selectedQuote.venue_name || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Venue Address:</span> {selectedQuote.venue_address || "N/A"}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Quote & Delivery Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Quote Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Quote #:</span> {selectedQuote.quote_number}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>{" "}
                        <Badge variant={selectedQuote.booking_type === 'package' ? 'default' : 'secondary'}>
                          {selectedQuote.booking_type === 'package' 
                            ? '📦 Package (Rent)' 
                            : `🛍️ Product (${selectedQuote.booking_subtype === 'sale' ? 'Sale' : 'Rent'})`}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> {getStatusBadge(selectedQuote.status)}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{" "}
                        {new Date(selectedQuote.created_at).toLocaleDateString()}
                      </div>
                      {selectedQuote.payment_type && (
                        <div>
                          <span className="font-medium">Payment Type:</span>{" "}
                          <Badge variant="outline">
                            {selectedQuote.payment_type === 'full' ? 'Full Payment' : 
                             selectedQuote.payment_type === 'advance' ? 'Advance Payment' : 
                             selectedQuote.payment_type === 'partial' ? 'Partial Payment' : 
                             selectedQuote.payment_type}
                          </Badge>
                        </div>
                      )}
                      {selectedQuote.amount_paid !== undefined && selectedQuote.amount_paid > 0 && (
                        <div>
                          <span className="font-medium">Amount Paid:</span> ₹{selectedQuote.amount_paid.toLocaleString()}
                        </div>
                      )}
                      {selectedQuote.pending_amount !== undefined && selectedQuote.pending_amount > 0 && (
                        <div>
                          <span className="font-medium">Pending Amount:</span> ₹{selectedQuote.pending_amount.toLocaleString()}
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
                        {selectedQuote.delivery_date ? new Date(selectedQuote.delivery_date).toLocaleDateString() : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Delivery Time:</span>{" "}
                        {selectedQuote.delivery_date ? new Date(selectedQuote.delivery_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Return Date:</span>{" "}
                        {selectedQuote.return_date ? new Date(selectedQuote.return_date).toLocaleDateString() : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Return Time:</span>{" "}
                        {selectedQuote.return_date ? new Date(selectedQuote.return_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : "N/A"}
                      </div>
                      {selectedQuote.special_instructions && (
                        <div>
                          <span className="font-medium">Special Instructions:</span>
                          <p className="text-muted-foreground mt-1">{selectedQuote.special_instructions}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Quote Items */}
                {selectedQuote.quote_items && selectedQuote.quote_items.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Quote Items
                    </h3>
                    <div className="space-y-4">
                      {selectedQuote.quote_items.map((item: any, index: number) => (
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
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">Qty: <span className="font-medium text-foreground">{item.quantity}</span></span>
                              <span className="text-muted-foreground">Unit Price: <span className="font-medium text-foreground">{formatCurrency(item.unit_price)}</span></span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Total</div>
                              <div className="text-lg font-bold text-green-700">{formatCurrency(item.total_price)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Financial Breakdown */}
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">💰 Price Breakdown</h4>
                      
                      {/* Items Subtotal */}
                      <div className="flex justify-between text-sm">
                        <span>Items Subtotal</span>
                        <span className="font-medium">₹{(selectedQuote.subtotal_amount || selectedQuote.total_amount).toLocaleString()}</span>
                      </div>

                      {/* Distance Charges (if applicable for package) */}
                      {selectedQuote.distance_amount && selectedQuote.distance_amount > 0 && (
                        <div className="flex justify-between text-sm text-blue-600">
                          <span className="flex items-center gap-1">
                            <span>📍 Distance Charges</span>
                            {selectedQuote.distance_km && <span className="text-xs text-gray-500">({selectedQuote.distance_km} km)</span>}
                          </span>
                          <span className="font-medium">₹{selectedQuote.distance_amount.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Manual Discount */}
                      {selectedQuote.discount_amount && selectedQuote.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount (40%)</span>
                          <span className="font-medium">-₹{selectedQuote.discount_amount.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Coupon Discount */}
                      {selectedQuote.coupon_code && selectedQuote.coupon_discount && selectedQuote.coupon_discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Coupon ({selectedQuote.coupon_code})</span>
                          <span className="font-medium">-₹{selectedQuote.coupon_discount.toLocaleString()}</span>
                        </div>
                      )}

                      {/* After Discounts Line */}
                      {((selectedQuote.discount_amount && selectedQuote.discount_amount > 0) || 
                        (selectedQuote.coupon_discount && selectedQuote.coupon_discount > 0)) && (
                        <div className="flex justify-between text-sm font-medium border-t pt-2">
                          <span>After Discounts</span>
                          <span>₹{(
                            (selectedQuote.subtotal_amount || selectedQuote.total_amount) + 
                            (selectedQuote.distance_amount || 0) - 
                            (selectedQuote.discount_amount || 0) - 
                            (selectedQuote.coupon_discount || 0)
                          ).toLocaleString()}</span>
                        </div>
                      )}

                      {/* GST */}
                      <div className="flex justify-between text-sm">
                        <span>GST (5%)</span>
                        <span className="font-medium">₹{(selectedQuote.tax_amount || 0).toLocaleString()}</span>
                      </div>

                      {/* Security Deposit - Refundable */}
                      {selectedQuote.security_deposit && selectedQuote.security_deposit > 0 && (
                        <div className="flex justify-between text-sm text-blue-600 font-medium">
                          <span className="flex items-center gap-1">
                            🔒 Security Deposit (Refundable)
                          </span>
                          <span>₹{selectedQuote.security_deposit.toLocaleString()}</span>
                        </div>
                      )}
                      
                      {/* Grand Total */}
                      <div className="flex justify-between font-bold text-base border-t pt-2 bg-green-50 p-2 rounded">
                        <span>Grand Total</span>
                        <span className="text-green-700 text-lg">₹{selectedQuote.total_amount.toLocaleString()}</span>
                      </div>

                      {/* Grand Total with Security Deposit */}
                      {selectedQuote.security_deposit && selectedQuote.security_deposit > 0 && (
                        <div className="flex justify-between text-base font-bold bg-purple-50 p-2 rounded border-2 border-purple-200">
                          <span>💎 Total with Security Deposit:</span>
                          <span className="text-purple-700 text-lg">
                            ₹{(selectedQuote.total_amount + selectedQuote.security_deposit).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {/* Payment Method */}
                      {selectedQuote.payment_method && (
                        <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                          <span>💳 Payment Method:</span>
                          <span className="font-medium text-blue-700">{selectedQuote.payment_method}</span>
                        </div>
                      )}

                      {/* Payment Type Badge */}
                      {selectedQuote.payment_type && (
                        <div className="flex justify-between text-sm bg-purple-50 p-2 rounded">
                          <span>💰 Payment Type:</span>
                          <Badge variant="outline" className="ml-2">
                            {selectedQuote.payment_type === 'full' ? '100% Full Payment' : 
                             selectedQuote.payment_type === 'advance' ? '50% Advance Payment' : 
                             selectedQuote.payment_type === 'partial' ? 'Partial Payment' : 
                             selectedQuote.payment_type}
                          </Badge>
                        </div>
                      )}

                      {/* Payment Breakdown Section */}
                      {(selectedQuote.amount_paid !== undefined && selectedQuote.amount_paid > 0) || 
                       (selectedQuote.pending_amount !== undefined && selectedQuote.pending_amount > 0) || 
                       selectedQuote.payment_type ? (
                        <div className="pt-3 mt-3 border-t space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">💰 Payment Breakdown</h4>
                          
                          {/* Amount Paid */}
                          {selectedQuote.amount_paid !== undefined && selectedQuote.amount_paid > 0 && (
                            <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                              <span>✅ Amount Paid:</span>
                              <span className="font-medium text-green-700">{formatCurrency(selectedQuote.amount_paid)}</span>
                            </div>
                          )}

                          {/* Balance Due */}
                          {(() => {
                            const balanceDue = selectedQuote.total_amount - (selectedQuote.amount_paid || 0)
                            return balanceDue > 0 ? (
                              <div className="flex justify-between text-sm bg-yellow-50 p-2 rounded">
                                <span>⏳ Balance Due:</span>
                                <span className="font-medium text-yellow-700">{formatCurrency(balanceDue)}</span>
                              </div>
                            ) : null
                          })()}

                          {/* Amount Payable Now - For Advance/Partial */}
                          {selectedQuote.payment_type && ['advance', 'partial'].includes(selectedQuote.payment_type) && 
                           (!selectedQuote.amount_paid || selectedQuote.amount_paid === 0) && (
                            <div className="flex justify-between text-sm bg-orange-50 p-2 rounded border border-orange-200">
                              <span className="font-semibold">💳 Amount Payable Now:</span>
                              <span className="font-bold text-orange-700">
                                {formatCurrency(
                                  selectedQuote.payment_type === 'advance' 
                                    ? Math.round(selectedQuote.total_amount * 0.3) // 30% advance
                                    : Math.round(selectedQuote.total_amount * 0.5) // 50% partial
                                )}
                              </span>
                            </div>
                          )}

                          {/* Amount to be Paid on Delivery */}
                          {selectedQuote.payment_type === 'partial' && selectedQuote.amount_paid && selectedQuote.amount_paid > 0 && (
                            <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                              <span>🚚 Amount to be Paid on Delivery:</span>
                              <span className="font-medium text-blue-700">
                                {formatCurrency(selectedQuote.total_amount - selectedQuote.amount_paid)}
                              </span>
                            </div>
                          )}

                          {/* Final Settlement Amount (after return) */}
                          {selectedQuote.security_deposit && selectedQuote.security_deposit > 0 && 
                           selectedQuote.amount_paid && selectedQuote.amount_paid >= selectedQuote.total_amount && (
                            <div className="flex justify-between text-sm bg-emerald-50 p-2 rounded border border-emerald-200">
                              <span className="font-semibold">🎉 Security Deposit Refund (After Return):</span>
                              <span className="font-bold text-emerald-700">
                                {formatCurrency(selectedQuote.security_deposit)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </Card>
                )}

                {/* Notes and Terms */}
                {(selectedQuote.notes || selectedQuote.terms_conditions) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedQuote.notes && (
                      <Card className="p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Notes
                        </h3>
                        <p className="text-sm text-muted-foreground">{selectedQuote.notes}</p>
                      </Card>
                    )}

                    {selectedQuote.terms_conditions && (
                      <Card className="p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Terms & Conditions
                        </h3>
                        <p className="text-sm text-muted-foreground">{selectedQuote.terms_conditions}</p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDownloadPDF(selectedQuote)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      disabled={downloadingPdfId === selectedQuote?.id}
                    >
                      {downloadingPdfId === selectedQuote?.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Copy quote link or share functionality
                        navigator.clipboard.writeText(`Quote #${selectedQuote.quote_number}`)
                        toast({
                          title: "Copied",
                          description: "Quote number copied to clipboard",
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

        {/* Booking Type Selection Dialog */}
        <BookingTypeDialog
          open={showBookingTypeDialog}
          onOpenChange={setShowBookingTypeDialog}
          title="Create New Quote"
          description="Select the booking type for your quote"
          mode="quote"
        />
      </TooltipProvider>
      </div>
    </div>
  )
}

export default function QuotesPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showBookingTypeDialog, setShowBookingTypeDialog] = useState(false)
  const [pdfDesign, setPdfDesign] = useState<PDFDesignType>("classic")
  const [isExporting, setIsExporting] = useState(false)
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    generated: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    converted: 0,
    expired: 0,
  })
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate>(defaultQuoteTemplates[0])
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<QuoteTemplate | null>(null)
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  
  // Edit quote form state
  const [editFormData, setEditFormData] = useState({
    event_type: "",
    event_participant: "",
    payment_type: "",
    event_date: "",
    event_time: "",
    delivery_date: "",
    delivery_time: "",
    return_date: "",
    return_time: "",
    venue_address: "",
    groom_name: "",
    groom_whatsapp: "",
    groom_address: "",
    bride_name: "",
    bride_whatsapp: "",
    bride_address: "",
    notes: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  // Confirmation dialogs state
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedQuoteForAction, setSelectedQuoteForAction] = useState<Quote | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    const initUser = async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    }
    initUser()
    
    loadQuotes()
    loadStats()

    const interval = setInterval(() => {
      loadQuotes()
      loadStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterQuotes()
  }, [quotes, searchTerm, statusFilter, dateFilter])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      const data = await QuoteService.getAll()
      console.log("📥 QUOTES PAGE - Loaded", data.length, "quotes")
      console.log("📊 Status breakdown:", data.reduce((acc: any, q) => { acc[q.status] = (acc[q.status] || 0) + 1; return acc }, {}))
      setQuotes(data)
    } catch (error) {
      console.error("Error loading quotes:", error)
      toast({
        title: "Error",
        description: "Failed to load quotes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await QuoteService.getStats()
      setStats(statsData)
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const filterQuotes = () => {
    let filtered = quotes

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (quote) =>
          quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.customer_phone?.includes(searchTerm) ||
          quote.groom_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.bride_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((quote) => quote.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter((quote) => new Date(quote.created_at).toDateString() === filterDate.toDateString())
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          filtered = filtered.filter((quote) => new Date(quote.created_at) >= filterDate)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          filtered = filtered.filter((quote) => new Date(quote.created_at) >= filterDate)
          break
        case "quarter":
          filterDate.setMonth(now.getMonth() - 3)
          filtered = filtered.filter((quote) => new Date(quote.created_at) >= filterDate)
          break
      }
    }

    console.log("🔍 FILTER RESULT:", filtered.length, "quotes after filtering (statusFilter:", statusFilter, ")")
    console.log("Filtered status breakdown:", filtered.reduce((acc: any, q) => { acc[q.status] = (acc[q.status] || 0) + 1; return acc }, {}))
    setFilteredQuotes(filtered)
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedQuotes = filteredQuotes.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, dateFilter])

  const handleStatusUpdate = async (quoteId: string, newStatus: string) => {
    try {
      if (newStatus === "accepted") {
        // Find the quote to convert
        const quote = quotes.find((q) => q.id === quoteId)
        if (quote) {
          // Create booking from quote
          const bookingId = await BookingService.createFromQuote(quote)

          toast({
            title: "Success",
            description: `Quote accepted and converted to booking! Booking ID: ${bookingId.slice(0, 8)}...`,
          })
        }
      }

      await QuoteService.updateStatus(quoteId, newStatus)

      if (newStatus !== "accepted") {
        toast({
          title: "Success",
          description: "Quote status updated successfully",
        })
      }

      await loadQuotes()
      await loadStats()
    } catch (error) {
      console.error("Error updating quote status:", error)
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive",
      })
    }
  }

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return

    try {
      await QuoteService.delete(quoteId)
      await loadQuotes()
      await loadStats()
      toast({
        title: "Success",
        description: "Quote deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete quote",
        variant: "destructive",
      })
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      await Promise.all(selectedQuotes.map((id) => QuoteService.updateStatus(id, newStatus)))
      await loadQuotes()
      await loadStats()
      setSelectedQuotes([])
      toast({
        title: "Success",
        description: `Updated ${selectedQuotes.length} quotes to ${newStatus}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quotes",
        variant: "destructive",
      })
    }
  }

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      setDownloadingPdfId(quote.id)
      
      // Use new compact PDF API
      const response = await fetch(`/api/quotes/download-pdf?id=${quote.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }
      
      // Get the PDF blob
      const blob = await response.blob()
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${quote.quote_number || 'quote'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Quote PDF downloaded successfully",
      })
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast({
        title: "Error",
        description: "Failed to download quote PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloadingPdfId(null)
    }
  }

  // Reject quote - open confirmation dialog
  const handleRejectQuote = (quote: Quote) => {
    setSelectedQuoteForAction(quote)
    setShowRejectDialog(true)
  }

  // Confirm reject quote
  const confirmRejectQuote = async () => {
    if (!selectedQuoteForAction) return

    try {
      // Determine which table to update
      const table = selectedQuoteForAction.booking_type === 'package' ? 'package_bookings' : 'product_orders'
      
      const { error } = await supabase
        .from(table)
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedQuoteForAction.id)

      if (error) throw error

      toast({
        title: "Quote Rejected",
        description: `Quote ${selectedQuoteForAction.quote_number} has been marked as rejected`,
      })

      setShowRejectDialog(false)
      setSelectedQuoteForAction(null)
      await loadQuotes() // Refresh quotes list
    } catch (error) {
      console.error("Error rejecting quote:", error)
      toast({
        title: "Error",
        description: "Failed to reject quote. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Convert quote to booking - open confirmation dialog
  const handleConvertQuote = (quote: Quote) => {
    setSelectedQuoteForAction(quote)
    setShowConvertDialog(true)
  }

  // Confirm convert quote to booking
  const confirmConvertQuote = async () => {
    if (!selectedQuoteForAction) return

    try {
      // Call convert API
      const response = await fetch("/api/quotes/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quote_id: selectedQuoteForAction.id,
          booking_type: selectedQuoteForAction.booking_type || "product"
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to convert quote")
      }

      const result = await response.json()
      
      toast({
        title: "Success!",
        description: result.invoice_number 
          ? `Booking ${result.booking_number} created with invoice ${result.invoice_number}`
          : `Quote converted to booking ${result.booking_number}`,
      })

      setShowConvertDialog(false)
      setSelectedQuoteForAction(null)
      await loadQuotes() // Refresh quotes list
    } catch (error) {
      console.error("Error converting quote:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert quote",
        variant: "destructive"
      })
    }
  }

  // Save edited quote
  const handleSaveQuote = async () => {
    if (!selectedQuote) return

    try {
      setIsSaving(true)
      
      // Combine date and time into ISO strings
      const eventDate = editFormData.event_date && editFormData.event_time
        ? new Date(`${editFormData.event_date}T${editFormData.event_time}`).toISOString()
        : null
      
      const deliveryDate = editFormData.delivery_date && editFormData.delivery_time
        ? new Date(`${editFormData.delivery_date}T${editFormData.delivery_time}`).toISOString()
        : null
      
      const returnDate = editFormData.return_date && editFormData.return_time
        ? new Date(`${editFormData.return_date}T${editFormData.return_time}`).toISOString()
        : null

      // Determine which table to update
      const table = selectedQuote.booking_type === 'package' ? 'package_bookings' : 'product_orders'
      
      // Prepare update data
      const updateData: any = {
        event_type: editFormData.event_type,
        event_participant: editFormData.event_participant,
        payment_type: editFormData.payment_type,
        event_date: eventDate,
        delivery_date: deliveryDate,
        return_date: returnDate,
        venue_address: editFormData.venue_address,
        groom_name: editFormData.groom_name,
        groom_whatsapp: editFormData.groom_whatsapp,
        groom_address: editFormData.groom_address,
        bride_name: editFormData.bride_name,
        bride_whatsapp: editFormData.bride_whatsapp,
        bride_address: editFormData.bride_address,
        notes: editFormData.notes,
        updated_at: new Date().toISOString(),
      }

      // Update the database
      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', selectedQuote.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Quote updated successfully",
      })

      setShowEditDialog(false)
      await loadQuotes() // Refresh quotes list
    } catch (error) {
      console.error("Error updating quote:", error)
      toast({
        title: "Error",
        description: "Failed to update quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

const getStatusBadge = (status: string) => {
    const statusConfig = {
      generated: { label: "Generated", variant: "secondary" as const, icon: FileText },
      quote: { label: "Generated", variant: "secondary" as const, icon: FileText },
      rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
      converted: { label: "Converted", variant: "default" as const, icon: CheckCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.generated
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
    }).format(amount)
  }

  const exportQuotes = () => {
    const csvContent = [
      ["Quote Number", "Customer", "Phone", "Event Date", "Total Amount", "Status", "Created Date"].join(","),
      ...filteredQuotes.map((quote) =>
        [
          quote.quote_number,
          quote.customer_name || "",
          quote.customer_phone || "",
          quote.event_date || "",
          quote.total_amount,
          quote.status,
          new Date(quote.created_at).toLocaleDateString(),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `quotes-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToCSV = () => {
    const csvContent = [
      ["Quote Number", "Customer", "Phone", "Event Date", "Total Amount", "Status", "Created Date"].join(","),
      ...filteredQuotes.map((quote) =>
        [
          quote.quote_number,
          quote.customer_name || "",
          quote.customer_phone || "",
          quote.event_date || "",
          quote.total_amount,
          quote.status,
          new Date(quote.created_at).toLocaleDateString(),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `quotes-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleTemplateSelect = (template: QuoteTemplate) => {
    setSelectedTemplate(template)
    setShowTemplateSelector(false)
    toast({
      title: "Template Selected",
      description: `${template.name} template will be used for new quotes`,
    })
  }

  const handleTemplatePreview = (template: QuoteTemplate) => {
    setPreviewTemplate(template)
    setShowTemplatePreview(true)
  }

  const handleEditQuote = (quote: Quote) => {
    if (quote.booking_type === 'package') {
      router.push(`/book-package?edit=${quote.id}`)
      return
    }

    router.push(`/create-invoice?edit=${quote.id}`)
  }

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
      {/* Header */}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quote Management</h1>
            <p className="text-muted-foreground">Generate and manage customer quotes</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadQuotes()
              toast({
                title: "Refreshed",
                description: "Quote data has been refreshed",
              })
            }}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-3 w-3 mr-1" />
                New Quote
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push('/quotes/new')}>
                <FileText className="h-4 w-4 mr-2" />
                Product Quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/book-package')}>
                <Package className="h-4 w-4 mr-2" />
                Package Quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/create-invoice')}>
                <Package className="h-4 w-4 mr-2" />
                Create Booking
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <div className="flex items-center space-x-1">
              <CardTitle className="text-xs font-medium">Total Quotes</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total number of quotes generated across all statuses</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <FileText className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-lg font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <div className="flex items-center space-x-1">
              <CardTitle className="text-xs font-medium">Generated</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Quotes that have been created but not yet sent to customers</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Clock className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-lg font-bold">{stats.generated}</div>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <div className="flex items-center space-x-1">
              <CardTitle className="text-xs font-medium">Converted</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Quotes that have been converted to confirmed bookings</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <CheckCircle className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-lg font-bold">{stats.converted}</div>
          </CardContent>
        </Card>
        <Card className="p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <div className="flex items-center space-x-1">
              <CardTitle className="text-xs font-medium">Rejected</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Quotes declined by customers - no further action required</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <XCircle className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-lg font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <CardHeader className="p-0 pb-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-sm">Filters</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Filter quotes by customer name, quote number, status, or date range</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search quotes, customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="quote">Generated</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline" size="sm" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Download className="h-3 w-3 mr-1" />
                )}
                {isExporting ? "Exporting..." : "Export"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="p-3">
        <CardHeader className="p-0 pb-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-sm">
              Quotes (Showing {startIndex + 1}-{Math.min(endIndex, filteredQuotes.length)} of {filteredQuotes.length})
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Complete list of quotes with customer details, amounts, and status management</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CardDescription className="text-xs">All generated quotes with customer details and status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="text-xs">Quote #</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Event</TableHead>
                  <TableHead className="text-xs">
                    <div className="flex items-center space-x-1">
                      <span>Amount</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Total quote amount including taxes and security deposit</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead className="text-xs">
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Quote status: Generated → Sent → Accepted/Rejected</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedQuotes.map((quote) => (
                  <TableRow key={quote.id} className="h-12">
                    <TableCell className="font-medium text-xs">{quote.quote_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-xs">{quote.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{quote.customer_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={quote.booking_type === 'package' ? 'default' : 'secondary'} className="text-xs">
                        {quote.booking_type === 'package' 
                          ? '📦 Package (Rent)' 
                          : `🛍️ Product (${quote.booking_subtype === 'sale' ? 'Sale' : 'Rent'})`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-xs">{quote.event_type}</div>
                        <div className="text-xs text-muted-foreground">
                          {quote.event_date ? new Date(quote.event_date).toLocaleDateString() : "No date"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs">{formatCurrency(quote.total_amount)}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell className="text-xs">{new Date(quote.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedQuote(quote)
                            setShowViewDialog(true)
                          }}
                          title="View Quote Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditQuote(quote)}
                          title="Edit Quote"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadPDF(quote)}
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleConvertQuote(quote)}
                          title="Convert to Booking"
                          disabled={quote.status === "converted" || quote.status === "rejected"}
                          className={quote.status === "converted" || quote.status === "rejected" ? "opacity-50 cursor-not-allowed" : "hover:text-green-600"}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRejectQuote(quote)}
                          title="Reject Quote"
                          disabled={quote.status === "rejected"}
                          className={quote.status === "rejected" ? "opacity-50 cursor-not-allowed" : "hover:text-red-600"}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        
        {/* Pagination Controls */}
        {filteredQuotes.length > 0 && (
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredQuotes.length)} of{" "}
                  {filteredQuotes.length} quotes
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
        )}
      </Card>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Quote</DialogTitle>
            <DialogDescription>Select a template to start with</DialogDescription>
          </DialogHeader>
          {/* Template selection UI here */}
          <Button onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quote Details - {selectedQuote?.quote_number}
            </DialogTitle>
            <DialogDescription>Complete information for this quote</DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {selectedQuote.customer_name || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {selectedQuote.customer_phone || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">WhatsApp:</span> {selectedQuote.customer_whatsapp || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedQuote.customer_email || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Address:</span> {selectedQuote.customer_address || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">City:</span> {selectedQuote.customer_city || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">State:</span> {selectedQuote.customer_state || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Pincode:</span> {selectedQuote.customer_pincode || "N/A"}
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
                      <span className="font-medium">Event Type:</span> {selectedQuote.event_type || "N/A"}
                    </div>
                    {selectedQuote.event_participant && (
                      <div>
                        <span className="font-medium">Event Participant:</span> {selectedQuote.event_participant}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Event Date:</span>{" "}
                      {selectedQuote.event_date ? new Date(selectedQuote.event_date).toLocaleDateString() : "N/A"}
                    </div>
                    {selectedQuote.groom_name && (
                      <>
                        <div>
                          <span className="font-medium">Groom Name:</span> {selectedQuote.groom_name}
                        </div>
                        {selectedQuote.groom_whatsapp && (
                          <div>
                            <span className="font-medium">Groom WhatsApp:</span> {selectedQuote.groom_whatsapp}
                          </div>
                        )}
                        {selectedQuote.groom_address && (
                          <div>
                            <span className="font-medium">Groom Address:</span> {selectedQuote.groom_address}
                          </div>
                        )}
                      </>
                    )}
                    {selectedQuote.bride_name && (
                      <>
                        <div>
                          <span className="font-medium">Bride Name:</span> {selectedQuote.bride_name}
                        </div>
                        {selectedQuote.bride_whatsapp && (
                          <div>
                            <span className="font-medium">Bride WhatsApp:</span> {selectedQuote.bride_whatsapp}
                          </div>
                        )}
                        {selectedQuote.bride_address && (
                          <div>
                            <span className="font-medium">Bride Address:</span> {selectedQuote.bride_address}
                          </div>
                        )}
                      </>
                    )}
                    {selectedQuote.venue_name && (
                      <div>
                        <span className="font-medium">Venue:</span> {selectedQuote.venue_name}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Venue Address:</span> {selectedQuote.venue_address || "N/A"}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Quote & Delivery Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Quote Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Quote #:</span> {selectedQuote.quote_number}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>{" "}
                      <Badge variant={selectedQuote.booking_type === 'package' ? 'default' : 'secondary'}>
                        {selectedQuote.booking_type === 'package' 
                          ? '📦 Package (Rent)' 
                          : `🛍️ Product (${selectedQuote.booking_subtype === 'sale' ? 'Sale' : 'Rent'})`}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {getStatusBadge(selectedQuote.status)}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(selectedQuote.created_at).toLocaleDateString()}
                    </div>
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
                      {selectedQuote.delivery_date ? new Date(selectedQuote.delivery_date).toLocaleDateString() : "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Return Date:</span>{" "}
                      {selectedQuote.return_date ? new Date(selectedQuote.return_date).toLocaleDateString() : "N/A"}
                    </div>
                    {selectedQuote.special_instructions && (
                      <div>
                        <span className="font-medium">Special Instructions:</span>
                        <p className="text-muted-foreground mt-1">{selectedQuote.special_instructions}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Quote Items */}
              {selectedQuote.quote_items && selectedQuote.quote_items.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Quote Items
                  </h3>
                  <div className="space-y-4">
                    {selectedQuote.quote_items.map((item: any, index: number) => (
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
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-blue-600 text-white font-semibold">
                                  {item.variant_name}
                                </Badge>
                                {item.extra_safas > 0 && (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
                                    +{item.extra_safas} Extra Safas
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Variant Inclusions with Checkmarks */}
                            {item.variant_inclusions && item.variant_inclusions.length > 0 ? (
                              <div className="mt-3 bg-white/70 p-3 rounded-md">
                                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                  <span className="text-green-600">✓</span> Package Inclusions:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {item.variant_inclusions.map((inclusion: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs">
                                      <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span>
                                      <span className="text-gray-700">
                                        <span className="font-medium">{inclusion.product_name}</span>
                                        {inclusion.quantity > 1 && <span className="text-gray-500"> × {inclusion.quantity}</span>}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-gray-600 italic bg-white/50 p-2 rounded">
                                Standard package inclusions apply
                              </div>
                            )}
                          </div>
                        )}

                        {/* Price Details */}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">Qty: <span className="font-medium text-foreground">{item.quantity}</span></span>
                            <span className="text-muted-foreground">Unit Price: <span className="font-medium text-foreground">{formatCurrency(item.unit_price)}</span></span>
                            {/* Show item-level security deposit if present */}
                            {(item.package_security_deposit > 0 || item.product_security_deposit > 0) && (
                              <span className="text-amber-700 text-xs">
                                🔒 Deposit: <span className="font-medium">{formatCurrency(item.package_security_deposit || item.product_security_deposit)}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Total</div>
                            <div className="text-lg font-bold text-green-700">{formatCurrency(item.total_price)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Financial Breakdown - Enhanced Layout */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-base text-gray-800 mb-3 flex items-center gap-2">
                      💰 Price Breakdown
                    </h4>
                    
                    {/* Main Calculation Card */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 space-y-2 border border-gray-200">
                      {/* Items Subtotal */}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Items Subtotal</span>
                        <span className="font-medium">₹{(selectedQuote.subtotal_amount || selectedQuote.total_amount).toLocaleString()}</span>
                      </div>

                      {/* Distance Charges (if applicable for package) */}
                      {selectedQuote.distance_amount && selectedQuote.distance_amount > 0 && (
                        <div className="flex justify-between text-sm text-blue-600">
                          <span className="flex items-center gap-1">
                            <span>📍 Distance Charges</span>
                            {selectedQuote.distance_km && <span className="text-xs text-gray-500">({selectedQuote.distance_km} km)</span>}
                          </span>
                          <span className="font-medium">₹{selectedQuote.distance_amount.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Manual Discount */}
                      {selectedQuote.discount_amount && selectedQuote.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span className="font-medium">-₹{selectedQuote.discount_amount.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Coupon Discount */}
                      {selectedQuote.coupon_code && selectedQuote.coupon_discount && selectedQuote.coupon_discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Coupon ({selectedQuote.coupon_code})</span>
                          <span className="font-medium">-₹{selectedQuote.coupon_discount.toLocaleString()}</span>
                        </div>
                      )}

                      {/* After Discounts Line */}
                      {((selectedQuote.discount_amount && selectedQuote.discount_amount > 0) || 
                        (selectedQuote.coupon_discount && selectedQuote.coupon_discount > 0)) && (
                        <div className="flex justify-between text-sm font-medium border-t pt-2 mt-1">
                          <span>After Discounts</span>
                          <span>₹{(
                            (selectedQuote.subtotal_amount || selectedQuote.total_amount) + 
                            (selectedQuote.distance_amount || 0) - 
                            (selectedQuote.discount_amount || 0) - 
                            (selectedQuote.coupon_discount || 0)
                          ).toLocaleString()}</span>
                        </div>
                      )}

                      {/* GST */}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">GST (5%)</span>
                        <span className="font-medium">₹{(selectedQuote.tax_amount || 0).toLocaleString()}</span>
                      </div>
                      
                      {/* Grand Total */}
                      <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                        <span>Grand Total</span>
                        <span className="text-lg">₹{selectedQuote.total_amount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Payment Breakdown - For Advance/Partial */}
                    {selectedQuote.payment_type && selectedQuote.payment_type !== 'full' && selectedQuote.payment_type !== '' && (
                      <>
                        <div className="h-px bg-gray-300 my-3" />
                        <div className="space-y-2">
                          {(() => {
                            const grandTotal = selectedQuote.total_amount
                            const deposit = selectedQuote.security_deposit || 0
                            
                            let packageNow = 0
                            let packageLater = 0
                            
                            if (selectedQuote.payment_type === 'advance') {
                              packageNow = grandTotal * 0.5
                              packageLater = grandTotal * 0.5
                            } else if (selectedQuote.payment_type === 'partial') {
                              packageNow = selectedQuote.custom_amount || 0
                              packageLater = grandTotal - packageNow
                            }
                            
                            const payableNow = packageNow + deposit
                            const remaining = packageLater
                            
                            return (
                              <>
                                {/* Package Payment Split */}
                                <div className="flex justify-between text-xs text-gray-600">
                                  <span>Package now</span>
                                  <span>₹{packageNow.toLocaleString()}</span>
                                </div>
                                {deposit > 0 && (
                                  <div className="flex justify-between text-xs text-amber-700">
                                    <span>+ Security Deposit</span>
                                    <span>₹{deposit.toLocaleString()}</span>
                                  </div>
                                )}
                                
                                {/* Payable Now - Highlighted */}
                                <div className="flex justify-between bg-green-100 border-2 border-green-300 rounded-lg p-3 mt-2">
                                  <span className="font-semibold text-green-800">💵 Payable Now</span>
                                  <span className="font-bold text-green-800 text-lg">₹{payableNow.toLocaleString()}</span>
                                </div>
                                
                                <div className="h-px bg-gray-200 my-2" />
                                
                                {/* Package Later */}
                                <div className="flex justify-between text-xs text-gray-600">
                                  <span>Package later</span>
                                  <span>₹{packageLater.toLocaleString()}</span>
                                </div>
                                
                                {/* Remaining */}
                                <div className="flex justify-between text-sm text-gray-700">
                                  <span>Remaining</span>
                                  <span className="font-semibold">₹{remaining.toLocaleString()}</span>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </>
                    )}

                    {/* Full Payment or Default Display */}
                    {(selectedQuote.payment_type === 'full' || !selectedQuote.payment_type) && (
                      <>
                        <div className="h-px bg-gray-300 my-3" />
                        {(() => {
                          const grandTotal = selectedQuote.total_amount
                          const deposit = selectedQuote.security_deposit || 0
                          const totalPayable = grandTotal + deposit
                          
                          return (
                            <>
                              {deposit > 0 && (
                                <div className="space-y-1 mb-2">
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Package total</span>
                                    <span>₹{grandTotal.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-amber-700">
                                    <span>+ Security Deposit</span>
                                    <span>₹{deposit.toLocaleString()}</span>
                                  </div>
                                </div>
                              )}
                              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-green-800">💵 Payable Now</span>
                                  <span className="font-bold text-green-800 text-lg">
                                    ₹{totalPayable.toLocaleString()}
                                  </span>
                                </div>
                                {deposit > 0 && (
                                  <p className="text-xs text-green-700 mt-1">
                                    Includes ₹{deposit.toLocaleString()} refundable security deposit
                                  </p>
                                )}
                              </div>
                            </>
                          )
                        })()}
                      </>
                    )}

                    {/* Payment Method & Type */}
                    <div className="mt-4 pt-3 border-t space-y-2">
                      {selectedQuote.payment_method && (
                        <div className="flex justify-between items-center text-sm bg-blue-50 p-2 rounded">
                          <span className="text-blue-800">💳 Payment Method:</span>
                          <span className="font-semibold text-blue-700">{selectedQuote.payment_method}</span>
                        </div>
                      )}

                      {selectedQuote.payment_type && (
                        <div className="flex justify-between items-center text-sm bg-purple-50 p-2 rounded">
                          <span className="text-purple-800">💰 Payment Type:</span>
                          <Badge variant="outline" className="bg-purple-100 border-purple-300 text-purple-800">
                            {selectedQuote.payment_type === 'full' ? '100% Full Payment' : 
                             selectedQuote.payment_type === 'advance' ? '50% Advance Payment' : 
                             selectedQuote.payment_type === 'partial' ? `Partial Payment (₹${(selectedQuote.custom_amount || 0).toLocaleString()})` : 
                             selectedQuote.payment_type}
                          </Badge>
                        </div>
                      )}

                      {selectedQuote.sales_staff_name && (
                        <div className="flex justify-between items-center text-sm bg-indigo-50 p-2 rounded">
                          <span className="text-indigo-800">👤 Sales Closed By:</span>
                          <span className="font-semibold text-indigo-700">{selectedQuote.sales_staff_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Notes and Terms */}
              {(selectedQuote.notes || selectedQuote.terms_conditions) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedQuote.notes && (
                    <Card className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notes
                      </h3>
                      <p className="text-sm text-muted-foreground">{selectedQuote.notes}</p>
                    </Card>
                  )}

                  {selectedQuote.terms_conditions && (
                    <Card className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Terms & Conditions
                      </h3>
                      <p className="text-sm text-muted-foreground">{selectedQuote.terms_conditions}</p>
                    </Card>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end items-center pt-4 border-t gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPDF(selectedQuote)}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button onClick={() => setShowViewDialog(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Quote Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Quote - {selectedQuote?.quote_number}
            </DialogTitle>
            <DialogDescription>
              Update event and wedding details for this quote
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-6">
              {/* Customer Information (Read-only) */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Customer Name</Label>
                      <p className="text-sm font-medium mt-1">{selectedQuote.customer_name || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone Number</Label>
                      <p className="text-sm font-medium mt-1">{selectedQuote.customer_phone || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                      <p className="text-sm font-medium mt-1">{selectedQuote.customer_whatsapp || selectedQuote.customer_phone || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p className="text-sm font-medium mt-1">{selectedQuote.customer_email || "N/A"}</p>
                    </div>
                    {selectedQuote.customer_address && (
                      <div className="md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <p className="text-sm font-medium mt-1">{selectedQuote.customer_address}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sales Information */}
              {selectedQuote.sales_staff_name && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Sales Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Sales Staff</Label>
                        <p className="text-sm font-semibold mt-1 text-blue-700">{selectedQuote.sales_staff_name}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Role</Label>
                        <p className="text-sm font-medium mt-1">Sales Representative</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Event & Wedding Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event & Wedding Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Row 1: Event Type, Event Participant, Payment Type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs">Event Type</Label>
                      <Select
                        value={editFormData.event_type}
                        onValueChange={(v) =>
                          setEditFormData({ ...editFormData, event_type: v })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Wedding">Wedding</SelectItem>
                          <SelectItem value="Engagement">Engagement</SelectItem>
                          <SelectItem value="Reception">Reception</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Event Participant</Label>
                      <Select
                        value={editFormData.event_participant}
                        onValueChange={(v) =>
                          setEditFormData({ ...editFormData, event_participant: v })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Groom">Groom Only</SelectItem>
                          <SelectItem value="Bride">Bride Only</SelectItem>
                          <SelectItem value="Both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Payment Type</Label>
                      <Select
                        value={editFormData.payment_type}
                        onValueChange={(v) =>
                          setEditFormData({ ...editFormData, payment_type: v })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Payment</SelectItem>
                          <SelectItem value="advance">Advance Payment</SelectItem>
                          <SelectItem value="partial">Partial Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 2: Event Date & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Event Date *</Label>
                      <Input
                        type="date"
                        value={editFormData.event_date}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, event_date: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Event Time</Label>
                      <Input
                        type="time"
                        value={editFormData.event_time}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, event_time: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Row 3: Delivery Date & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Delivery Date</Label>
                      <Input
                        type="date"
                        value={editFormData.delivery_date}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, delivery_date: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Delivery Time</Label>
                      <Input
                        type="time"
                        value={editFormData.delivery_time}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, delivery_time: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Row 4: Return Date & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Return Date</Label>
                      <Input
                        type="date"
                        value={editFormData.return_date}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, return_date: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Return Time</Label>
                      <Input
                        type="time"
                        value={editFormData.return_time}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, return_time: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Venue Address */}
                  <div>
                    <Label className="text-xs">Venue Address</Label>
                    <Textarea
                      rows={2}
                      value={editFormData.venue_address}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, venue_address: e.target.value })
                      }
                      className="mt-1"
                      placeholder="Enter venue address"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Groom Information - Show only if Groom or Both */}
              {(editFormData.event_participant === "Groom" || editFormData.event_participant === "Both") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Groom Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Groom Name</Label>
                        <Input
                          value={editFormData.groom_name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, groom_name: e.target.value })
                          }
                          className="mt-1"
                          placeholder="Enter groom's full name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Additional WhatsApp Number</Label>
                        <Input
                          value={editFormData.groom_whatsapp}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, groom_whatsapp: e.target.value })
                          }
                          className="mt-1"
                          placeholder="WhatsApp number"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Home Address</Label>
                      <Textarea
                        rows={2}
                        value={editFormData.groom_address}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, groom_address: e.target.value })
                        }
                        className="mt-1"
                        placeholder="Full address with locality and pin code"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bride Information - Show only if Bride or Both */}
              {(editFormData.event_participant === "Bride" || editFormData.event_participant === "Both") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Bride Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Bride Name</Label>
                        <Input
                          value={editFormData.bride_name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, bride_name: e.target.value })
                          }
                          className="mt-1"
                          placeholder="Enter bride's full name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Additional WhatsApp Number</Label>
                        <Input
                          value={editFormData.bride_whatsapp}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, bride_whatsapp: e.target.value })
                          }
                          className="mt-1"
                          placeholder="WhatsApp number"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Home Address</Label>
                      <Textarea
                        rows={2}
                        value={editFormData.bride_address}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, bride_address: e.target.value })
                        }
                        className="mt-1"
                        placeholder="Full address with locality and pin code"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    rows={3}
                    value={editFormData.notes}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, notes: e.target.value })
                    }
                    placeholder="Any special instructions or requirements"
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveQuote}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to Booking Confirmation Dialog */}
      <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert Quote to Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to convert Quote{" "}
              <strong>{selectedQuoteForAction?.quote_number}</strong> to a booking?
              <br /><br />
              This will create a new booking and update the quote status to converted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConvertDialog(false)
              setSelectedQuoteForAction(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmConvertQuote}
              className="bg-green-600 hover:bg-green-700"
            >
              Convert to Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Quote Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject Quote{" "}
              <strong>{selectedQuoteForAction?.quote_number}</strong>?
              <br /><br />
              This will mark the quote as rejected. You can still edit it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRejectDialog(false)
              setSelectedQuoteForAction(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRejectQuote}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </div>
    </DashboardLayout>
  )
}
