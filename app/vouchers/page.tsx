"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Trash2, Printer, Eye, Pencil, Check, RefreshCw, AlertTriangle, Phone, Calendar, ArrowLeft } from 'lucide-react'
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { createPortal } from "react-dom"

interface Voucher {
  id: string
  voucher_number: string
  voucher_date: string
  voucher_type: 'expense' | 'customer_payment'
  account_name: string
  amount: number
  payment_mode: string
  particulars: string | null
  narration: string | null
  amount_in_words: string | null
  receiver_name: string | null
  prepared_by: string | null
  booking_id: string | null
  booking_number: string | null
  franchise_id: string | null
  created_at: string
}

// Convert number to Indian Rupees words
function amountToWords(num: number): string {
  if (num === 0) return "INR Zero Only"
  if (isNaN(num)) return ""

  const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const double = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  
  function convert(n: number): string {
    let word = ""
    if (n < 20) {
      word = single[n]
    } else if (n < 100) {
      word = double[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + single[n % 10] : "")
    } else if (n < 1000) {
      word = convert(Math.floor(n / 100)) + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "")
    } else if (n < 100000) {
      word = convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "")
    } else if (n < 10000000) {
      word = convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "")
    } else {
      word = convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "")
    }
    return word.trim()
  }

  const parts = num.toFixed(2).split(".")
  const rupees = parseInt(parts[0])
  const paisa = parseInt(parts[1])

  let result = "INR " + convert(rupees)
  if (paisa > 0) {
    result += " and " + convert(paisa) + " Paisa"
  }
  result += " Only"
  return result
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(false)
  const [dbSetupLoading, setDbSetupLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [companySettings, setCompanySettings] = useState<any>(null)
  
  // Filters
  const [typeFilter, setTypeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [viewingVoucher, setViewingVoucher] = useState<Voucher | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Booking search dropdown
  const [allBookings, setAllBookings] = useState<any[]>([])
  const [bookingSearchTerm, setBookingSearchTerm] = useState("")
  const [showBookingDropdown, setShowBookingDropdown] = useState(false)
  const [bookingsLoading, setBookingsLoading] = useState(false)

  // Form states
  const [voucherType, setVoucherType] = useState<'expense' | 'customer_payment'>('expense')
  const [voucherNumber, setVoucherNumber] = useState("")
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0])
  const [accountName, setAccountName] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMode, setPaymentMode] = useState("Cash")
  const [particulars, setParticulars] = useState("")
  const [narration, setNarration] = useState("")
  const [amountInWords, setAmountInWords] = useState("")
  const [receiverName, setReceiverName] = useState("")
  const [preparedBy, setPreparedBy] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)

  const [mounted, setMounted] = useState(false)

  // Load user & settings
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("safawala_user")
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
        setPreparedBy(user.name || "")
        loadCompanySettings(user.franchise_id)
      } else {
        fetch('/api/auth/user')
          .then(res => res.ok ? res.json() : null)
          .then(user => {
            if (user) {
              setCurrentUser(user)
              setPreparedBy(user.name || "")
              loadCompanySettings(user.franchise_id)
            } else {
              loadCompanySettings()
            }
          })
          .catch(err => {
            console.error('Failed to load user info:', err)
            loadCompanySettings()
          })
      }
    } catch (error) {
      console.error("Failed to load user data:", error)
      loadCompanySettings()
    } finally {
      setMounted(true)
    }
  }, [])

  // Load company settings
  const loadCompanySettings = async (userFranchiseId?: string) => {
    try {
      let apiUrl = '/api/settings/all'
      if (userFranchiseId) {
        apiUrl += `?franchise_id=${encodeURIComponent(userFranchiseId)}`
      }
      const response = await fetch(apiUrl, { cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        setCompanySettings(data.merged || data.company)
      }
    } catch (error) {
      console.error("Failed to load company settings:", error)
    }
  }

  // Fetch Bookings list for dropdown association
  const fetchBookings = async () => {
    setBookingsLoading(true)
    try {
      const res = await fetch('/api/bookings', { credentials: 'include' })
      if (res.ok) {
        const result = await res.json()
        const mapped = (result.data || []).map((b: any) => ({
          id: b.id,
          booking_number: b.booking_number || b.order_number || b.package_number || b.sale_number || 'N/A',
          customer_name: b.customer?.name || b.customer_name || 'Walk-in Customer'
        }))
        setAllBookings(mapped)
      }
    } catch (e) {
      console.error("Failed to fetch bookings:", e)
    } finally {
      setBookingsLoading(false)
    }
  }

  // Auto-generate words when amount changes
  useEffect(() => {
    const val = parseFloat(amount)
    if (!isNaN(val) && val > 0) {
      setAmountInWords(amountToWords(val))
    } else {
      setAmountInWords("")
    }
  }, [amount])

  // Fetch Vouchers
  const fetchVouchers = async () => {
    setLoading(true)
    setDbError(false)
    try {
      const res = await fetch('/api/vouchers')
      if (!res.ok) {
        throw new Error('Database fetch failed')
      }
      const data = await res.json()
      if (data.success) {
        setVouchers(data.data || [])
      } else {
        throw new Error(data.error || 'Failed to load vouchers')
      }
    } catch (error) {
      console.error("Fetch vouchers error:", error)
      setDbError(true)
      toast.error("Failed to load vouchers. The database tables might not be created yet.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVouchers()
  }, [])

  // Auto-setup database table if missing
  const handleSetupDatabase = async () => {
    setDbSetupLoading(true)
    try {
      const res = await fetch('/api/vouchers/setup')
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("Database table created successfully!")
        fetchVouchers()
      } else {
        throw new Error(data.details || data.error || "Failed to setup database")
      }
    } catch (error: any) {
      console.error("Database setup error:", error)
      toast.error(error.message || "Failed to create database tables")
    } finally {
      setDbSetupLoading(false)
    }
  }

  // Open creation dialog
  const handleOpenAdd = () => {
    setVoucherType('expense')
    setVoucherDate(new Date().toISOString().split("T")[0])
    setVoucherNumber(`VOU-${Date.now().toString(36).toUpperCase()}`)
    setAccountName("")
    setAmount("")
    setPaymentMode("Cash")
    setParticulars("")
    setNarration("")
    setAmountInWords("")
    setReceiverName("")
    setPreparedBy(currentUser?.name || "")
    setSelectedBooking(null)
    setBookingSearchTerm("")
    setEditingVoucher(null)
    fetchBookings()
    setShowAddDialog(true)
  }

  // Open editing dialog
  const handleOpenEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    setVoucherType(voucher.voucher_type)
    setVoucherDate(voucher.voucher_date)
    setVoucherNumber(voucher.voucher_number)
    setAccountName(voucher.account_name)
    setAmount(String(voucher.amount))
    setPaymentMode(voucher.payment_mode)
    setParticulars(voucher.particulars || "")
    setNarration(voucher.narration || "")
    setAmountInWords(voucher.amount_in_words || "")
    setReceiverName(voucher.receiver_name || "")
    setPreparedBy(voucher.prepared_by || "")
    
    if (voucher.booking_id) {
      setSelectedBooking({
        id: voucher.booking_id,
        booking_number: voucher.booking_number,
        customer_name: voucher.account_name
      })
      setBookingSearchTerm(voucher.booking_number || "")
    } else {
      setSelectedBooking(null)
      setBookingSearchTerm("")
    }
    
    fetchBookings()
    setShowAddDialog(true)
  }

  // Submit form (Save / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!accountName.trim()) {
      toast.error("Account/Particulars Name is required.")
      return
    }

    const amtVal = parseFloat(amount)
    if (isNaN(amtVal) || amtVal <= 0) {
      toast.error("Please provide a valid amount.")
      return
    }

    const payload = {
      voucher_number: voucherNumber,
      voucher_date: voucherDate,
      voucher_type: voucherType,
      account_name: accountName,
      amount: amtVal,
      payment_mode: paymentMode,
      particulars: particulars || null,
      narration: narration || null,
      amount_in_words: amountInWords || null,
      receiver_name: receiverName || null,
      prepared_by: preparedBy || currentUser?.name || "Staff",
      booking_id: selectedBooking?.id || null,
      booking_number: selectedBooking?.booking_number || null
    }

    try {
      const url = editingVoucher ? `/api/vouchers/${editingVoucher.id}` : '/api/vouchers'
      const method = editingVoucher ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(editingVoucher ? "Voucher updated successfully" : "Voucher created successfully")
        setShowAddDialog(false)
        fetchVouchers()
      } else {
        throw new Error(data.error || "Failed to save voucher")
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to save voucher")
    }
  }

  // Delete voucher
  const handleDelete = async () => {
    if (!showDeleteConfirm) return
    try {
      const res = await fetch(`/api/vouchers/${showDeleteConfirm}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("Voucher deleted successfully")
        setVouchers(prev => prev.filter(v => v.id !== showDeleteConfirm))
        setShowDeleteConfirm(null)
      } else {
        throw new Error(data.error || "Failed to delete voucher")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete voucher")
    }
  }

  // Print trigger
  const handlePrint = (voucher: Voucher) => {
    setViewingVoucher(voucher)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  // Filtered list
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(voucher => {
      const matchesSearch = 
        voucher.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voucher.voucher_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (voucher.booking_number && voucher.booking_number.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesType = typeFilter === 'all' || voucher.voucher_type === typeFilter
      
      const matchesDateFrom = !dateFrom || new Date(voucher.voucher_date) >= new Date(dateFrom)
      const matchesDateTo = !dateTo || new Date(voucher.voucher_date) <= new Date(dateTo)

      return matchesSearch && matchesType && matchesDateFrom && matchesDateTo
    })
  }, [vouchers, searchTerm, typeFilter, dateFrom, dateTo])

  // Filtered bookings search list
  const filteredBookingsList = useMemo(() => {
    if (!bookingSearchTerm) return allBookings.slice(0, 5)
    return allBookings.filter(b => 
      b.booking_number.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
      b.customer_name.toLowerCase().includes(bookingSearchTerm.toLowerCase())
    ).slice(0, 10)
  }, [allBookings, bookingSearchTerm])

  // Format currency
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(amt)
  }

  return (
    <DashboardLayout>
      <style jsx global>{`
        @media print {
          body > *:not(#print-root-voucher) {
            display: none !important;
          }
          
          #print-root-voucher {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background-color: white !important;
            color: black !important;
            padding: 24px !important;
            font-size: 13px;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          /* Clean print styles */
          .print-border {
            border: 1px solid #1a1a1a !important;
          }
          .print-border-b {
            border-bottom: 1px solid #1a1a1a !important;
          }
          .print-border-t {
            border-top: 1px solid #1a1a1a !important;
          }
          .print-bg {
            background-color: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="space-y-6 no-print">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-gray-900 tracking-tight">Payment & Receipt Vouchers</h1>
            <p className="text-muted-foreground text-sm">Create, print, and track company expense vouchers and customer payment receipts</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchVouchers} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {!dbError && (
              <Button onClick={handleOpenAdd} size="sm" className="bg-[#102516] hover:bg-[#1a3a26] text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Voucher
              </Button>
            )}
          </div>
        </div>

        {dbError ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              <div>
                <CardTitle className="text-lg text-amber-900">Database Table Missing</CardTitle>
                <CardDescription className="text-amber-800">
                  The `vouchers` database table could not be found.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-800">
                You can provision the table now using the built-in configuration utility. This executes the required DDL setup on your database.
              </p>
              <Button 
                onClick={handleSetupDatabase} 
                disabled={dbSetupLoading} 
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {dbSetupLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Setting Up Table...
                  </>
                ) : (
                  "Setup Vouchers Table"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Toolbar Filters */}
            <Card className="shadow-sm border-[#102516]/10">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-1">
                  <Label htmlFor="search" className="text-xs font-semibold text-gray-700">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by account/particulars, voucher no, booking no..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10 border-gray-200 focus:border-[#102516]"
                    />
                  </div>
                </div>

                <div className="w-full md:w-48 space-y-1">
                  <Label htmlFor="type" className="text-xs font-semibold text-gray-700">Voucher Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger id="type" className="h-10 border-gray-200">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vouchers</SelectItem>
                      <SelectItem value="expense">Payment Voucher (Expense)</SelectItem>
                      <SelectItem value="customer_payment">Receipt Voucher (Customer Payment)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-44 space-y-1">
                  <Label htmlFor="date-from" className="text-xs font-semibold text-gray-700">From Date</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 border-gray-200"
                  />
                </div>

                <div className="w-full md:w-44 space-y-1">
                  <Label htmlFor="date-to" className="text-xs font-semibold text-gray-700">To Date</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 border-gray-200"
                  />
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSearchTerm("")
                    setTypeFilter("all")
                    setDateFrom("")
                    setDateTo("")
                  }}
                  className="h-10 text-muted-foreground hover:text-gray-900 border border-dashed border-gray-200"
                >
                  Reset
                </Button>
              </CardContent>
            </Card>

            {/* List Table */}
            <Card className="shadow-sm border-[#102516]/10 overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-12 text-center text-muted-foreground">Loading vouchers...</div>
                ) : filteredVouchers.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No vouchers found. Click "New Voucher" to create one.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50/75 border-b">
                        <TableRow>
                          <TableHead className="font-semibold text-gray-900">Voucher No.</TableHead>
                          <TableHead className="font-semibold text-gray-900">Date</TableHead>
                          <TableHead className="font-semibold text-gray-900">Type</TableHead>
                          <TableHead className="font-semibold text-gray-900">Particulars / Account Name</TableHead>
                          <TableHead className="font-semibold text-gray-900">Mode</TableHead>
                          <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVouchers.map((voucher) => (
                          <TableRow key={voucher.id} className="hover:bg-gray-50/45">
                            <TableCell className="font-medium font-mono text-xs">{voucher.voucher_number}</TableCell>
                            <TableCell className="text-gray-600 text-xs">
                              {new Date(voucher.voucher_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                voucher.voucher_type === 'expense'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {voucher.voucher_type === 'expense' ? 'Payment (Expense)' : 'Receipt (Payment)'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-gray-900 text-sm">
                              {voucher.account_name}
                              {voucher.booking_number && (
                                <span className="block text-[10px] text-gray-500 font-mono">Booking: {voucher.booking_number}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-600 text-xs font-semibold">{voucher.payment_mode}</TableCell>
                            <TableCell className="font-bold text-gray-900 text-sm">{formatCurrency(voucher.amount)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setViewingVoucher(voucher)} 
                                  className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  title="View Voucher Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handlePrint(voucher)} 
                                  className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                  title="Print Voucher"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleOpenEdit(voucher)} 
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                  title="Edit Voucher"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setShowDeleteConfirm(voucher.id)} 
                                  className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  title="Delete Voucher"
                                >
                                  <Trash2 className="h-4 w-4" />
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
          </>
        )}
      </div>

      {/* CREATE / EDIT VOUCHER DIALOG */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-[#102516]/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-semibold text-[#102516]">
              {editingVoucher ? "Edit Voucher Details" : "Create New Voucher"}
            </DialogTitle>
            <DialogDescription>
              Select voucher type, enter amount, payment mode, particulars, narration and receiver info.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="voucher-type" className="text-xs font-semibold text-gray-700">Voucher Type *</Label>
                <Select 
                  value={voucherType} 
                  onValueChange={(val: any) => {
                    setVoucherType(val)
                    // Auto-adjust default number prefix
                    const prefix = val === 'expense' ? 'PV' : 'RV'
                    setVoucherNumber(`${prefix}-${Date.now().toString(36).toUpperCase()}`)
                  }}
                  disabled={!!editingVoucher}
                >
                  <SelectTrigger id="voucher-type" className="border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Payment Voucher (Expense)</SelectItem>
                    <SelectItem value="customer_payment">Receipt Voucher (Customer Payment)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="voucher-number" className="text-xs font-semibold text-gray-700">Voucher Number</Label>
                <Input
                  id="voucher-number"
                  placeholder="Auto-generated if blank"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  className="border-gray-200 focus:border-[#102516] font-mono text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="voucher-date" className="text-xs font-semibold text-gray-700">Voucher Date *</Label>
                <Input
                  id="voucher-date"
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  required
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment-mode" className="text-xs font-semibold text-gray-700">Payment Mode *</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger id="payment-mode" className="border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI / QR Payment">UPI / QR Payment</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Debit / Credit Card">Debit / Credit Card</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-semibold text-gray-700">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="border-gray-200 focus:border-[#102516] font-semibold text-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="booking-select" className="text-xs font-semibold text-gray-700">Associate Booking (Optional)</Label>
                <div className="relative">
                  <Input
                    id="booking-select"
                    placeholder="Search Booking No. or customer..."
                    value={bookingSearchTerm}
                    onChange={(e) => {
                      setBookingSearchTerm(e.target.value)
                      setShowBookingDropdown(true)
                    }}
                    onFocus={() => setShowBookingDropdown(true)}
                    className="border-gray-200 focus:border-[#102516]"
                  />
                  {showBookingDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {bookingsLoading ? (
                        <div className="p-3 text-xs text-muted-foreground">Loading bookings...</div>
                      ) : filteredBookingsList.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground">No bookings found</div>
                      ) : (
                        filteredBookingsList.map((b) => (
                          <div
                            key={b.id}
                            className="p-2 text-xs hover:bg-gray-100 cursor-pointer flex flex-col border-b last:border-b-0"
                            onClick={() => {
                              setSelectedBooking(b)
                              setBookingSearchTerm(b.booking_number)
                              // If Customer Payment, pre-fill account/party name
                              if (voucherType === 'customer_payment' && !accountName) {
                                setAccountName(b.customer_name)
                              }
                              setShowBookingDropdown(false)
                            }}
                          >
                            <span className="font-semibold text-gray-800">{b.booking_number}</span>
                            <span className="text-gray-500 text-[10px]">{b.customer_name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {selectedBooking && (
                    <div className="mt-1 flex items-center justify-between bg-gray-50 border rounded px-2.5 py-1 text-xs">
                      <span className="font-mono text-[10px] text-gray-600">Selected: {selectedBooking.booking_number}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                        onClick={() => {
                          setSelectedBooking(null)
                          setBookingSearchTerm("")
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="account-name" className="text-xs font-semibold text-gray-700">
                  {voucherType === 'expense' ? 'Debit Account (Particulars) *' : 'Received From (Customer Name) *'}
                </Label>
                <Input
                  id="account-name"
                  placeholder={voucherType === 'expense' ? 'e.g. Petrol Expense, Laundry Charges, Rent' : 'Customer name or account'}
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                  className="border-gray-200 focus:border-[#102516] font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount-words" className="text-xs font-semibold text-gray-700">Amount in Words (Auto-generated)</Label>
              <Input
                id="amount-words"
                placeholder="e.g. INR Two Hundred Only"
                value={amountInWords}
                onChange={(e) => setAmountInWords(e.target.value)}
                className="border-gray-200 bg-gray-50/70"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="narration" className="text-xs font-semibold text-gray-700">On Account of (Narration)</Label>
              <Textarea
                id="narration"
                placeholder="Enter voucher description, details, or notes..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="border-gray-200 focus:border-[#102516] h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="receiver-name" className="text-xs font-semibold text-gray-700">Receiver's Name (for signature label)</Label>
                <Input
                  id="receiver-name"
                  placeholder="Enter receiver's name"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prepared-by" className="text-xs font-semibold text-gray-700">Prepared By</Label>
                <Input
                  id="prepared-by"
                  placeholder="Enter preparer's name"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#102516] hover:bg-[#1a3a26] text-white">
                <Check className="h-4 w-4 mr-2" />
                {editingVoucher ? "Update Voucher" : "Save Voucher"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW & PRINT VOUCHER DIALOG */}
      <Dialog open={!!viewingVoucher} onOpenChange={(open) => !open && setViewingVoucher(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-gray-200 p-6 print:p-0">
          {viewingVoucher && (
            <div>
              {/* Dialog Control buttons */}
              <div className="flex items-center justify-between border-b pb-4 mb-6 print:hidden">
                <div>
                  <h3 className="text-lg font-serif font-semibold text-gray-900">Voucher Printing Layout</h3>
                  <p className="text-xs text-muted-foreground">Verify the details below, then trigger the printer.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handlePrint(viewingVoucher)} 
                    className="bg-[#102516] hover:bg-[#1a3a26] text-white"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Voucher
                  </Button>
                  <Button variant="outline" onClick={() => setViewingVoucher(null)}>
                    Close
                  </Button>
                </div>
              </div>

              {/* ========== HIGH-FIDELITY PRINT WRAPPER ========== */}
              <div id="print-voucher" className="bg-white text-black p-6 border print-border rounded-md shadow-sm print:shadow-none print:border-0 font-sans">
                
                {/* Header Branding */}
                <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-4 print:border-b">
                  <div className="flex items-center gap-3">
                    <img 
                      src={companySettings?.logo_url || "/safawalalogo.png"} 
                      alt="Company Logo" 
                      className="h-16 w-auto object-contain" 
                    />
                    <div>
                      <h1 className="text-xl font-bold tracking-wider text-gray-900">{companySettings?.company_name || "MySafawale.Com"}</h1>
                      <p className="text-[10px] text-gray-600 font-medium">Premium Wedding Turbans & Accessories</p>
                      <p className="text-[9px] text-gray-500 max-w-sm mt-1">
                        {companySettings?.address ? (
                          <>
                            {companySettings.address}
                            {companySettings.city ? `, ${companySettings.city}` : ''}
                            {companySettings.state ? `, ${companySettings.state}` : ''}
                            {companySettings.zip_code ? ` - ${companySettings.zip_code}` : ''}
                          </>
                        ) : (
                          "Studio-SB 25, 26, Windsor Plaza, RC Dutt Road, Near Paras Pan, Alkapuri, Vadodara, Gujarat 390007"
                        )}
                        <br />
                        State Name : Gujarat, Code : 24
                        {companySettings?.phone && <span className="block mt-0.5 font-semibold text-gray-700">Contact : {companySettings.phone}</span>}
                        {companySettings?.email && <span className="block text-gray-600">E-Mail : {companySettings.email}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="text-sm font-bold text-gray-900 tracking-wide border-2 border-gray-900 px-3 py-1 uppercase rounded bg-gray-50 print-bg">
                      {viewingVoucher.voucher_type === 'expense' ? 'Payment Voucher' : 'Receipt Voucher'}
                    </div>
                    <div className="mt-4 text-[10px] space-y-0.5 text-gray-700 text-left font-mono">
                      <div><span className="text-gray-500 font-sans">No. :</span> <strong className="text-gray-900 font-semibold">{viewingVoucher.voucher_number}</strong></div>
                      <div><span className="text-gray-500 font-sans">Dated :</span> <strong className="text-gray-900 font-semibold">
                        {new Date(viewingVoucher.voucher_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </strong></div>
                    </div>
                  </div>
                </div>

                {/* Particulars Grid/Table */}
                <div className="border border-gray-900 print-border rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 print-bg border-b border-gray-900 print-border-b font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                        <th className="p-3">Particulars</th>
                        <th className="p-3 w-36 text-right border-l border-gray-900">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="min-h-[140px] align-top">
                        <td className="p-4 space-y-3 min-h-[140px] block">
                          <div>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase block">Account / Ledger:</span>
                            <span className="text-sm font-bold text-gray-900 font-serif">{viewingVoucher.account_name}</span>
                          </div>
                          {viewingVoucher.particulars && (
                            <div className="pt-2">
                              <span className="text-[10px] text-gray-400 font-semibold uppercase block">Itemized Particulars:</span>
                              <p className="text-gray-700 text-xs font-mono whitespace-pre-wrap">{viewingVoucher.particulars}</p>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right border-l border-gray-900 text-sm font-bold text-gray-900 align-top">
                          {formatCurrency(viewingVoucher.amount)}
                        </td>
                      </tr>
                      
                      {/* Total Amount Row */}
                      <tr className="border-t border-gray-900 print-border-t bg-gray-50 print-bg font-bold">
                        <td className="p-3 text-right text-gray-700">Total Amount:</td>
                        <td className="p-3 text-right text-[#102516] text-base border-l border-gray-900">
                          {formatCurrency(viewingVoucher.amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Details Section */}
                <div className="mt-4 border border-gray-300 rounded p-4 space-y-3.5 text-xs">
                  <div className="grid grid-cols-4 gap-2">
                    <span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">Through :</span>
                    <span className="col-span-3 font-semibold text-gray-900 border-b pb-0.5">{viewingVoucher.payment_mode}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">On Account of :</span>
                    <span className="col-span-3 text-gray-800 font-medium border-b pb-0.5 leading-relaxed">{viewingVoucher.narration || '-'}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">Amount (in words) :</span>
                    <span className="col-span-3 font-serif font-bold text-gray-900 border-b pb-0.5 italic">{viewingVoucher.amount_in_words || amountToWords(viewingVoucher.amount)}</span>
                  </div>
                </div>

                {/* Signatures Section */}
                <div className="grid grid-cols-3 gap-6 pt-12 mt-12 border-t border-dashed">
                  {/* Receiver Signature */}
                  <div className="flex flex-col items-center justify-end text-center">
                    {viewingVoucher.receiver_name ? (
                      <span className="text-sm font-serif font-semibold text-gray-800 pb-2">{viewingVoucher.receiver_name}</span>
                    ) : (
                      <div className="h-10"></div>
                    )}
                    <div className="w-40 border-b border-gray-400 mb-1.5"></div>
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">Receiver's Signature</span>
                  </div>

                  {/* Prepared By */}
                  <div className="flex flex-col items-center justify-end text-center">
                    <span className="text-xs font-semibold text-gray-900 pb-2">
                      {viewingVoucher.prepared_by || 'Staff'}
                      <span className="block text-[8px] font-sans text-gray-500 mt-0.5">
                        {new Date(viewingVoucher.voucher_date).toLocaleDateString('en-IN')}
                      </span>
                    </span>
                    <div className="w-40 border-b border-gray-400 mb-1.5"></div>
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">Prepared by</span>
                  </div>

                  {/* Authorised Signatory */}
                  <div className="flex flex-col items-center justify-end text-center">
                    {companySettings?.signature_url ? (
                      <div className="h-12 w-32 flex items-center justify-center mb-1">
                        <img 
                          src={companySettings.signature_url} 
                          alt="Authorized Signature" 
                          className="max-h-12 max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-12"></div>
                    )}
                    <div className="w-40 border-b border-gray-400 mb-1.5"></div>
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">Authorised Signatory</span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Voucher</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this voucher record? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* React Portal for Print - Direct child of body to bypass modal overlays during printing */}
      {mounted && viewingVoucher && createPortal(
        <div id="print-root-voucher" className="hidden print:block bg-white text-black p-6 font-sans">
          
          {/* Header Branding */}
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <img 
                src={companySettings?.logo_url || "/safawalalogo.png"} 
                alt="Company Logo" 
                className="h-16 w-auto object-contain" 
              />
              <div>
                <h1 className="text-xl font-bold tracking-wider text-gray-900">{companySettings?.company_name || "MySafawale.Com"}</h1>
                <p className="text-[10px] text-gray-600 font-medium">Premium Wedding Turbans & Accessories</p>
                <p className="text-[9px] text-gray-500 max-w-sm mt-1">
                  {companySettings?.address ? (
                    <>
                      {companySettings.address}
                      {companySettings.city ? `, ${companySettings.city}` : ''}
                      {companySettings.state ? `, ${companySettings.state}` : ''}
                      {companySettings.zip_code ? ` - ${companySettings.zip_code}` : ''}
                    </>
                  ) : (
                    "Studio-SB 25, 26, Windsor Plaza, RC Dutt Road, Near Paras Pan, Alkapuri, Vadodara, Gujarat 390007"
                  )}
                  <br />
                  State Name : Gujarat, Code : 24
                  {companySettings?.phone && <span className="block mt-0.5 font-semibold text-gray-700">Contact : {companySettings.phone}</span>}
                  {companySettings?.email && <span className="block text-gray-600">E-Mail : {companySettings.email}</span>}
                </p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="text-sm font-bold text-gray-900 tracking-wide border-2 border-gray-900 px-3 py-1 uppercase rounded bg-gray-50 print-bg">
                {viewingVoucher.voucher_type === 'expense' ? 'Payment Voucher' : 'Receipt Voucher'}
              </div>
              <div className="mt-4 text-[10px] space-y-0.5 text-gray-700 text-left font-mono font-semibold">
                <div><span className="text-gray-500 font-sans">No. :</span> <strong className="text-gray-900">{viewingVoucher.voucher_number}</strong></div>
                <div><span className="text-gray-500 font-sans">Dated :</span> <strong className="text-gray-900">
                  {new Date(viewingVoucher.voucher_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </strong></div>
              </div>
            </div>
          </div>

          {/* Particulars Grid/Table */}
          <div className="border border-gray-900 print-border rounded overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 print-bg border-b border-gray-900 print-border-b font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Particulars</th>
                  <th className="p-3 w-36 text-right border-l border-gray-900">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="min-h-[140px] align-top">
                  <td className="p-4 space-y-3 min-h-[140px] block">
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase block">Account / Ledger:</span>
                      <span className="text-sm font-bold text-gray-900 font-serif">{viewingVoucher.account_name}</span>
                    </div>
                    {viewingVoucher.particulars && (
                      <div className="pt-2">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase block">Itemized Particulars:</span>
                        <p className="text-gray-700 text-xs font-mono whitespace-pre-wrap">{viewingVoucher.particulars}</p>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right border-l border-gray-900 text-sm font-bold text-gray-900 align-top">
                    {formatCurrency(viewingVoucher.amount)}
                  </td>
                </tr>
                
                {/* Total Amount Row */}
                <tr className="border-t border-gray-900 print-border-t bg-gray-50 print-bg font-bold">
                  <td className="p-3 text-right text-gray-700">Total Amount:</td>
                  <td className="p-3 text-right text-[#102516] text-base border-l border-gray-900">
                    {formatCurrency(viewingVoucher.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Details Section */}
          <div className="mt-4 border border-gray-300 rounded p-4 space-y-3.5 text-xs">
            <div className="grid grid-cols-4 gap-2">
              <span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">Through :</span>
              <span className="col-span-3 font-semibold text-gray-900 border-b pb-0.5">{viewingVoucher.payment_mode}</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">On Account of :</span>
              <span className="col-span-3 text-gray-800 font-medium border-b pb-0.5 leading-relaxed">{viewingVoucher.narration || '-'}</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <span className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">Amount (in words) :</span>
              <span className="col-span-3 font-serif font-bold text-gray-900 border-b pb-0.5 italic">{viewingVoucher.amount_in_words || amountToWords(viewingVoucher.amount)}</span>
            </div>
          </div>

          {/* Signatures Section */}
          <div className="grid grid-cols-3 gap-6 pt-12 mt-12 border-t border-dashed font-sans">
            {/* Receiver Signature */}
            <div className="flex flex-col items-center justify-end text-center">
              {viewingVoucher.receiver_name ? (
                <span className="text-sm font-serif font-semibold text-gray-800 pb-2">{viewingVoucher.receiver_name}</span>
              ) : (
                <div className="h-10"></div>
              )}
              <div className="w-40 border-b border-gray-400 mb-1.5"></div>
              <span className="text-[10px] font-semibold text-gray-700 uppercase">Receiver's Signature</span>
            </div>

            {/* Prepared By */}
            <div className="flex flex-col items-center justify-end text-center">
              <span className="text-xs font-semibold text-gray-900 pb-2">
                {viewingVoucher.prepared_by || 'Staff'}
                <span className="block text-[8px] font-sans text-gray-500 mt-0.5">
                  {new Date(viewingVoucher.voucher_date).toLocaleDateString('en-IN')}
                </span>
              </span>
              <div className="w-40 border-b border-gray-400 mb-1.5"></div>
              <span className="text-[10px] font-semibold text-gray-700 uppercase">Prepared by</span>
            </div>

            {/* Authorised Signatory */}
            <div className="flex flex-col items-center justify-end text-center">
              {companySettings?.signature_url ? (
                <div className="h-12 w-32 flex items-center justify-center mb-1">
                  <img 
                    src={companySettings.signature_url} 
                    alt="Authorized Signature" 
                    className="max-h-12 max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-12"></div>
              )}
              <div className="w-40 border-b border-gray-400 mb-1.5"></div>
              <span className="text-[10px] font-semibold text-gray-700 uppercase">Authorised Signatory</span>
            </div>
          </div>

        </div>,
        document.body
      )}
    </DashboardLayout>
  )
}
