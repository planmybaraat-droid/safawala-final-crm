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
import { Plus, Search, Trash2, Printer, Eye, Pencil, Check, X, FileText, Calendar, Filter, RefreshCw, AlertTriangle, User, Phone, CheckCircle, Clock } from 'lucide-react'
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { createPortal } from "react-dom"

interface ChallanItem {
  id?: string
  challan_id?: string
  item_details: string
  qty: number
  rate: number
  amount: number
}

interface Challan {
  id: string
  challan_number: string
  challan_date: string
  party_name: string
  mobile_number: string | null
  status: 'active' | 'closed'
  narration: string | null
  prepared_by: string | null
  total_amount: number
  franchise_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  challan_items?: ChallanItem[]
}

export default function ChallansPage() {
  const [challans, setChallans] = useState<Challan[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(false)
  const [dbSetupLoading, setDbSetupLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingChallan, setEditingChallan] = useState<Challan | null>(null)
  const [viewingChallan, setViewingChallan] = useState<Challan | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Form states
  const [partyName, setPartyName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split("T")[0])
  const [challanNumber, setChallanNumber] = useState("")
  const [narration, setNarration] = useState("")
  const [status, setStatus] = useState<'active' | 'closed'>("active")
  const [preparedBy, setPreparedBy] = useState("")
  const [items, setItems] = useState<ChallanItem[]>([{ item_details: "", qty: 1, rate: 0, amount: 0 }])

  const [companySettings, setCompanySettings] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // Load company settings for branding
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

  // Load user from localStorage or API
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("safawala_user")
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
        setPreparedBy(user.name || "")
        loadCompanySettings(user.franchise_id)
      } else {
        // Fallback to fetch from endpoint
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

  // Fetch Challans
  const fetchChallans = async () => {
    setLoading(true)
    setDbError(false)
    try {
      const res = await fetch('/api/challans')
      if (!res.ok) {
        // If the table doesn't exist, we'll hit error code 404/500
        throw new Error('Database fetch failed')
      }
      const data = await res.json()
      if (data.success) {
        setChallans(data.data || [])
      } else {
        throw new Error(data.error || 'Failed to load challans')
      }
    } catch (error) {
      console.error("Fetch error:", error)
      setDbError(true)
      toast.error("Failed to load challans. The database tables might not be created yet.")
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    fetchChallans()
  }, [])

  // Auto-setup database table if missing
  const handleSetupDatabase = async () => {
    setDbSetupLoading(true)
    try {
      const res = await fetch('/api/challans/setup')
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("Database tables created successfully!")
        fetchChallans()
      } else {
        throw new Error(data.details || data.error || "Failed to setup database")
      }
    } catch (error: any) {
      console.error("Database setup error:", error)
      toast.error(error.message || "Failed to create database tables", {
        description: "Please check your network or check migrations."
      })
    } finally {
      setDbSetupLoading(false)
    }
  }

  // Handle item change
  const handleItemChange = (index: number, field: keyof ChallanItem, value: any) => {
    const updatedItems = [...items]
    const item = updatedItems[index]
    
    if (field === 'item_details') {
      item.item_details = value
    } else if (field === 'qty') {
      item.qty = Math.max(1, parseInt(value) || 0)
      item.amount = item.qty * item.rate
    } else if (field === 'rate') {
      item.rate = Math.max(0, parseFloat(value) || 0)
      item.amount = item.qty * item.rate
    }
    setItems(updatedItems)
  }

  // Add Item row
  const addItemRow = () => {
    setItems([...items, { item_details: "", qty: 1, rate: 0, amount: 0 }])
  }

  // Remove Item row
  const removeItemRow = (index: number) => {
    if (items.length === 1) {
      toast.error("At least one item details row is required.")
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  // Grand Total calculation
  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.qty * item.rate), 0)
  }, [items])

  // Open creation dialog
  const handleOpenAdd = () => {
    setPartyName("")
    setMobileNumber("")
    setChallanDate(new Date().toISOString().split("T")[0])
    setChallanNumber(`CHL-${Date.now().toString(36).toUpperCase()}`)
    setNarration("")
    setStatus("active")
    setPreparedBy(currentUser?.name || "")
    setItems([{ item_details: "", qty: 1, rate: 0, amount: 0 }])
    setEditingChallan(null)
    setShowAddDialog(true)
  }

  // Open editing dialog
  const handleOpenEdit = (challan: Challan) => {
    setEditingChallan(challan)
    setPartyName(challan.party_name)
    setMobileNumber(challan.mobile_number || "")
    setChallanDate(challan.challan_date)
    setChallanNumber(challan.challan_number)
    setNarration(challan.narration || "")
    setStatus(challan.status)
    setPreparedBy(challan.prepared_by || "")
    setItems(challan.challan_items && challan.challan_items.length > 0 
      ? challan.challan_items.map(item => ({ ...item }))
      : [{ item_details: "", qty: 1, rate: 0, amount: 0 }]
    )
    setShowAddDialog(true)
  }

  // Toggle status shortcut
  const handleToggleStatus = async (challan: Challan) => {
    const nextStatus = challan.status === 'active' ? 'closed' : 'active'
    try {
      const res = await fetch(`/api/challans/${challan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Challan status changed to ${nextStatus}`)
        // Fast local update
        setChallans(prev => prev.map(c => c.id === challan.id ? { ...c, status: nextStatus } : c))
      } else {
        throw new Error(data.error || 'Failed to update status')
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update challan status")
    }
  }

  // Submit form (Save / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!partyName.trim()) {
      toast.error("Party Name is required.")
      return
    }

    const filteredItems = items.filter(item => item.item_details.trim() !== "")
    if (filteredItems.length === 0) {
      toast.error("Please add at least one item details description.")
      return
    }

    const payload = {
      challan_number: challanNumber,
      challan_date: challanDate,
      party_name: partyName,
      mobile_number: mobileNumber || null,
      status,
      narration: narration || null,
      prepared_by: preparedBy || currentUser?.name || "Staff",
      total_amount: grandTotal,
      items: filteredItems
    }

    try {
      const url = editingChallan ? `/api/challans/${editingChallan.id}` : '/api/challans'
      const method = editingChallan ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(editingChallan ? "Challan updated successfully" : "Challan created successfully")
        setShowAddDialog(false)
        fetchChallans()
      } else {
        throw new Error(data.error || "Failed to save challan")
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to save challan")
    }
  }

  // Delete challan
  const handleDelete = async () => {
    if (!showDeleteConfirm) return
    try {
      const res = await fetch(`/api/challans/${showDeleteConfirm}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("Challan deleted successfully")
        setChallans(prev => prev.filter(c => c.id !== showDeleteConfirm))
        setShowDeleteConfirm(null)
      } else {
        throw new Error(data.error || "Failed to delete challan")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete challan")
    }
  }

  // Print trigger
  const handlePrint = (challan: Challan) => {
    setViewingChallan(challan)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  // Filtered list
  const filteredChallans = useMemo(() => {
    return challans.filter(challan => {
      const matchesSearch = 
        challan.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        challan.challan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (challan.mobile_number && challan.mobile_number.includes(searchTerm))

      const matchesStatus = statusFilter === 'all' || challan.status === statusFilter
      
      const matchesDateFrom = !dateFrom || new Date(challan.challan_date) >= new Date(dateFrom)
      const matchesDateTo = !dateTo || new Date(challan.challan_date) <= new Date(dateTo)

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo
    })
  }, [challans, searchTerm, statusFilter, dateFrom, dateTo])

  // Format currency in INR format
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amt)
  }

  return (
    <DashboardLayout>
      {/* CSS Stylesheet injected for handling high-fidelity bill print */}
      <style jsx global>{`
        @media print {
          body > *:not(#print-root-challan) {
            display: none !important;
          }
          
          #print-root-challan {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background-color: white !important;
            color: black !important;
            padding: 20px !important;
            font-size: 12px;
          }

          /* Remove headers/footers default page count */
          @page {
            size: A4;
            margin: 8mm;
          }

          /* Clean tables for printing */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 15px;
          }

          th, td {
            border: 1px solid #ccc !important;
            padding: 8px !important;
            text-align: left;
          }

          th {
            background-color: #f5f5f5 !important;
            font-weight: bold;
          }
        }
      `}</style>

      {/* Main Page Layout */}
      <div className="space-y-6 no-print">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-gray-900 tracking-tight">Delivery Challans</h1>
            <p className="text-muted-foreground text-sm">Create, view, and print delivery receipts and pickup sheets</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchChallans} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {!dbError && (
              <Button onClick={handleOpenAdd} size="sm" className="bg-[#102516] hover:bg-[#1a3a26] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Challan
              </Button>
            )}
          </div>
        </div>

        {/* Database Missing Error Alert Card */}
        {dbError ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              <div>
                <CardTitle className="text-lg text-amber-900">Database Tables Missing</CardTitle>
                <CardDescription className="text-amber-800">
                  The `challans` database tables could not be found. 
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-800">
                You can auto-provision the tables now using our built-in configuration tool. This runs the DDL setup route in the database automatically.
              </p>
              <Button 
                onClick={handleSetupDatabase} 
                disabled={dbSetupLoading} 
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {dbSetupLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Setting Up Tables...
                  </>
                ) : (
                  "Setup Database Tables"
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
                      placeholder="Search by party name, mobile, or challan no..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10 border-gray-200 focus:border-[#102516] focus:ring-[#102516]"
                    />
                  </div>
                </div>

                <div className="w-full md:w-44 space-y-1">
                  <Label htmlFor="status" className="text-xs font-semibold text-gray-700">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status" className="h-10 border-gray-200">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Challans</SelectItem>
                      <SelectItem value="active">Active (Open)</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
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
                    setStatusFilter("all")
                    setDateFrom("")
                    setDateTo("")
                  }}
                  className="h-10 text-muted-foreground hover:text-gray-900 border border-dashed border-gray-200"
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>

            {/* List Table */}
            <Card className="shadow-sm border-[#102516]/10 overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-12 text-center text-muted-foreground">Loading challans data...</div>
                ) : filteredChallans.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No challans found. Click "Create Challan" to add one.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50/75 border-b">
                        <TableRow>
                          <TableHead className="font-semibold text-gray-900">Challan No.</TableHead>
                          <TableHead className="font-semibold text-gray-900">Date</TableHead>
                          <TableHead className="font-semibold text-gray-900">Party Name</TableHead>
                          <TableHead className="font-semibold text-gray-900">Mobile</TableHead>
                          <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                          <TableHead className="font-semibold text-gray-900">Status</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredChallans.map((challan) => (
                          <TableRow key={challan.id} className="hover:bg-gray-50/45">
                            <TableCell className="font-medium font-mono text-xs">{challan.challan_number}</TableCell>
                            <TableCell className="text-gray-600 text-xs">
                              {new Date(challan.challan_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </TableCell>
                            <TableCell className="font-medium text-gray-900 text-sm">{challan.party_name}</TableCell>
                            <TableCell className="text-gray-600 text-xs">{challan.mobile_number || '-'}</TableCell>
                            <TableCell className="font-medium text-gray-900 text-sm">{formatCurrency(challan.total_amount)}</TableCell>
                            <TableCell>
                              <Badge 
                                onClick={() => handleToggleStatus(challan)}
                                className={`cursor-pointer capitalize hover:opacity-85 text-[10px] px-2 py-0.5 rounded-full ${
                                  challan.status === 'active' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}
                              >
                                {challan.status === 'active' ? 'Active' : 'Closed'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setViewingChallan(challan)} 
                                  className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  title="View Challan Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handlePrint(challan)} 
                                  className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                  title="Print Challan"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleOpenEdit(challan)} 
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                  title="Edit Challan"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setShowDeleteConfirm(challan.id)} 
                                  className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  title="Delete Challan"
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

      {/* CREATE / EDIT CHALLAN DIALOG */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-[#102516]/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-semibold text-[#102516]">
              {editingChallan ? "Edit Delivery Challan" : "Create Delivery Challan"}
            </DialogTitle>
            <DialogDescription>
              Provide party name, mobile, item details, and narration to generate a delivery receipt.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="party-name" className="text-xs font-semibold text-gray-700">Party Name *</Label>
                <Input
                  id="party-name"
                  placeholder="Enter Party Name"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  required
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobile-number" className="text-xs font-semibold text-gray-700">Mobile No.</Label>
                <Input
                  id="mobile-number"
                  placeholder="Enter Mobile No."
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="challan-date" className="text-xs font-semibold text-gray-700">Date *</Label>
                <Input
                  id="challan-date"
                  type="date"
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                  required
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="challan-number" className="text-xs font-semibold text-gray-700">Challan No.</Label>
                <Input
                  id="challan-number"
                  placeholder="Auto-generated if blank"
                  value={challanNumber}
                  onChange={(e) => setChallanNumber(e.target.value)}
                  className="border-gray-200 focus:border-[#102516] font-mono text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status-select" className="text-xs font-semibold text-gray-700">Challan Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger id="status-select" className="border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Open)</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prepared-by" className="text-xs font-semibold text-gray-700">Prepared By</Label>
                <Input
                  id="prepared-by"
                  placeholder="Enter creator name"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="border-gray-200 focus:border-[#102516]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="narration" className="text-xs font-semibold text-gray-700">Narration / Notes</Label>
              <Textarea
                id="narration"
                placeholder="Enter remarks or description..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="border-gray-200 focus:border-[#102516] h-16 resize-none"
              />
            </div>

            {/* DYNAMIC ITEMS ENTRY LIST */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <Label className="text-sm font-serif font-semibold text-[#102516]">Itemized Details</Label>
                <Button 
                  type="button" 
                  onClick={addItemRow} 
                  variant="outline" 
                  size="sm"
                  className="h-8 border-[#102516]/20 text-[#102516] hover:bg-[#102516]/5"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center flex-wrap md:flex-nowrap border-b border-gray-100 pb-2 md:pb-0 md:border-b-0">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <Input
                        placeholder="Item details (e.g. Wedding Safa, Turban Pin...)"
                        value={item.item_details}
                        onChange={(e) => handleItemChange(index, 'item_details', e.target.value)}
                        required
                        className="h-9 text-xs border-gray-200 focus:border-[#102516]"
                      />
                    </div>
                    <div className="w-20 space-y-1">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.qty || ""}
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                        required
                        className="h-9 text-xs border-gray-200 focus:border-[#102516]"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Rate"
                        value={item.rate || ""}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        required
                        className="h-9 text-xs border-gray-200 focus:border-[#102516]"
                      />
                    </div>
                    <div className="w-28 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 h-9 rounded-md flex items-center px-3 select-none">
                      {formatCurrency(item.qty * item.rate)}
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItemRow(index)}
                      className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-600">Grand Total:</span>
                  <span className="text-lg font-bold text-[#102516]">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#102516] hover:bg-[#1a3a26] text-white">
                <Check className="h-4 w-4 mr-2" />
                {editingChallan ? "Update Challan" : "Save Challan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW & PRINT CHALLAN DIALOG (High-Fidelity bill format) */}
      <Dialog open={!!viewingChallan} onOpenChange={(open) => !open && setViewingChallan(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-gray-200 p-6 print:p-0">
          {viewingChallan && (
            <div>
              {/* Print Dialog Actions */}
              <div className="flex items-center justify-between border-b pb-4 mb-6 print:hidden">
                <div>
                  <h3 className="text-lg font-serif font-semibold text-gray-900">Challan Bill Preview</h3>
                  <p className="text-xs text-muted-foreground">Verify the format and click print to generate PDF.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handlePrint(viewingChallan)} 
                    className="bg-[#102516] hover:bg-[#1a3a26] text-white"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Challan
                  </Button>
                  <Button variant="outline" onClick={() => setViewingChallan(null)}>
                    Close
                  </Button>
                </div>
              </div>

              {/* ========== BILL PRINT-ONLY WRAPPER ========== */}
              <div id="print-section" className="bg-white text-black p-4 border rounded-md shadow-sm print:shadow-none print:border-0">
                
                {/* Header Section */}
                <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={companySettings?.logo_url || "/safawalalogo.png"} 
                      alt="Safawala Logo" 
                      className="h-16 w-auto object-contain" 
                    />
                    <div>
                      <h1 className="text-xl font-bold tracking-wider text-gray-900">{companySettings?.company_name || "SAFAWALA"}</h1>
                      <p className="text-[10px] text-gray-600 font-medium">Premium Wedding Turbans & Accessories</p>
                      <p className="text-[9px] text-gray-500 max-w-xs mt-1">
                        {companySettings?.address ? (
                          <>
                            {companySettings.address}
                            {companySettings.city ? `, ${companySettings.city}` : ''}
                            {companySettings.state ? `, ${companySettings.state}` : ''}
                            {companySettings.phone ? ` | Phone: ${companySettings.phone}` : ''}
                          </>
                        ) : (
                          "Sardar Patel Ring Road, Ahmedabad, Gujarat, India."
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-800 tracking-wide border-b pb-0.5 mb-1.5 uppercase">
                      Delivery Challan
                    </div>
                    <div className="text-[10px] space-y-0.5 text-gray-700">
                      <div><span className="text-gray-500">Challan No:</span> <strong className="font-mono text-gray-900">{viewingChallan.challan_number}</strong></div>
                      <div><span className="text-gray-500">Date:</span> <strong className="text-gray-900">
                        {new Date(viewingChallan.challan_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </strong></div>
                      <div><span className="text-gray-500">Challan Status:</span> <strong className="text-gray-900 capitalize">{viewingChallan.status}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Customer Details Box */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 border rounded-lg p-3 text-xs mb-4">
                  <div className="space-y-1">
                    <div className="text-gray-500 font-medium uppercase text-[9px] tracking-wider">Party Details</div>
                    <div className="font-bold text-gray-900 text-sm">{viewingChallan.party_name}</div>
                    {viewingChallan.mobile_number && (
                      <div className="flex items-center gap-1 text-gray-700">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span>{viewingChallan.mobile_number}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-gray-500 font-medium uppercase text-[9px] tracking-wider">Authentication Log</div>
                    <div className="text-gray-700">Prepared By: <span className="font-semibold text-gray-900">{viewingChallan.prepared_by || 'Staff'}</span></div>
                    <div className="text-gray-500 text-[10px]">Printed: {new Date().toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-xs text-left border-collapse my-4">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="p-2 border font-bold text-gray-800 w-12 text-center">S.No</th>
                      <th className="p-2 border font-bold text-gray-800">Item Details / Description</th>
                      <th className="p-2 border font-bold text-gray-800 w-20 text-center">Qty</th>
                      <th className="p-2 border font-bold text-gray-800 w-28 text-right">Rate</th>
                      <th className="p-2 border font-bold text-gray-800 w-32 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingChallan.challan_items && viewingChallan.challan_items.length > 0 ? (
                      viewingChallan.challan_items.map((item, index) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="p-2 border text-center text-gray-600">{index + 1}</td>
                          <td className="p-2 border font-medium text-gray-900">{item.item_details}</td>
                          <td className="p-2 border text-center text-gray-800 font-medium">{item.qty}</td>
                          <td className="p-2 border text-right text-gray-700">{formatCurrency(item.rate)}</td>
                          <td className="p-2 border text-right text-gray-900 font-bold">{formatCurrency(item.qty * item.rate)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 border text-center text-gray-500">No items specified</td>
                      </tr>
                    )}
                    {/* Totals Row */}
                    <tr className="bg-gray-50/50">
                      <td colSpan={3} className="p-2 border"></td>
                      <td className="p-2 border text-right font-bold text-gray-700">Total Amount:</td>
                      <td className="p-2 border text-right font-bold text-[#102516] text-sm">{formatCurrency(viewingChallan.total_amount)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Narration Section */}
                {viewingChallan.narration && (
                  <div className="border rounded-lg p-3 text-xs mb-8">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Narration / Remarks</div>
                    <p className="text-gray-700 whitespace-pre-wrap">{viewingChallan.narration}</p>
                  </div>
                )}

                {/* Signatures Section */}
                <div className="grid grid-cols-3 gap-6 pt-12 mt-12 border-t border-dashed">
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 mb-1"></div>
                    <div className="w-40 border-b border-gray-600 mb-1.5"></div>
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">Receiver Signature</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">(Sign on Delivery)</span>
                  </div>

                  <div className="flex flex-col items-center justify-end pb-0.5">
                    <span className="text-xs font-semibold text-gray-900">{viewingChallan.prepared_by || 'Staff'}</span>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase mt-1">Prepared By</span>
                  </div>

                  <div className="flex flex-col items-center justify-end">
                    {companySettings?.signature_url ? (
                      <div className="h-12 w-32 flex items-center justify-center mb-1">
                        <img 
                          src={companySettings.signature_url} 
                          alt="Authorised Signature" 
                          className="max-h-12 max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-40 border-b border-gray-600 mb-1.5 h-12"></div>
                    )}
                    <span className="text-[10px] font-semibold text-gray-700 uppercase">Authorised Signature</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">(For {companySettings?.company_name || 'Safawala'})</span>
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
            <DialogTitle>Delete Challan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this challan? This action is permanent and cannot be undone. Associated items will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* React Portal for Print - Direct child of body to bypass modal overlays during printing */}
      {mounted && viewingChallan && createPortal(
        <div id="print-root-challan" className="hidden print:block bg-white text-black p-4 font-sans">
          
          {/* Header Section */}
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <img 
                src={companySettings?.logo_url || "/safawalalogo.png"} 
                alt="Safawala Logo" 
                className="h-16 w-auto object-contain" 
              />
              <div>
                <h1 className="text-xl font-bold tracking-wider text-gray-900">{companySettings?.company_name || "SAFAWALA"}</h1>
                <p className="text-[10px] text-gray-600 font-medium">Premium Wedding Turbans & Accessories</p>
                <p className="text-[9px] text-gray-500 max-w-xs mt-1">
                  {companySettings?.address ? (
                    <>
                      {companySettings.address}
                      {companySettings.city ? `, ${companySettings.city}` : ''}
                      {companySettings.state ? `, ${companySettings.state}` : ''}
                      {companySettings.phone ? ` | Phone: ${companySettings.phone}` : ''}
                    </>
                  ) : (
                    "Sardar Patel Ring Road, Ahmedabad, Gujarat, India."
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-800 tracking-wide border-b pb-0.5 mb-1.5 uppercase">
                Delivery Challan
              </div>
              <div className="text-[10px] space-y-0.5 text-gray-700">
                <div><span className="text-gray-500">Challan No:</span> <strong className="font-mono text-gray-900">{viewingChallan.challan_number}</strong></div>
                <div><span className="text-gray-500">Date:</span> <strong className="text-gray-900">
                  {new Date(viewingChallan.challan_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </strong></div>
                <div><span className="text-gray-500">Challan Status:</span> <strong className="text-gray-900 capitalize">{viewingChallan.status}</strong></div>
              </div>
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 border rounded-lg p-3 text-xs mb-4">
            <div className="space-y-1">
              <div className="text-gray-500 font-medium uppercase text-[9px] tracking-wider">Party Details</div>
              <div className="font-bold text-gray-900 text-sm">{viewingChallan.party_name}</div>
              {viewingChallan.mobile_number && (
                <div className="flex items-center gap-1 text-gray-700">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <span>{viewingChallan.mobile_number}</span>
                </div>
              )}
            </div>
            <div className="space-y-1 text-right">
              <div className="text-gray-500 font-medium uppercase text-[9px] tracking-wider">Authentication Log</div>
              <div className="text-gray-700">Prepared By: <span className="font-semibold text-gray-900">{viewingChallan.prepared_by || 'Staff'}</span></div>
              <div className="text-gray-500 text-[10px]">Printed: {new Date().toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-xs text-left border-collapse my-4">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="p-2 border font-bold text-gray-800 w-12 text-center">S.No</th>
                <th className="p-2 border font-bold text-gray-800">Item Details / Description</th>
                <th className="p-2 border font-bold text-gray-800 w-20 text-center">Qty</th>
                <th className="p-2 border font-bold text-gray-800 w-28 text-right">Rate</th>
                <th className="p-2 border font-bold text-gray-800 w-32 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {viewingChallan.challan_items && viewingChallan.challan_items.length > 0 ? (
                viewingChallan.challan_items.map((item, index) => (
                  <tr key={item.id || index} className="border-b">
                    <td className="p-2 border text-center text-gray-600">{index + 1}</td>
                    <td className="p-2 border font-medium text-gray-900">{item.item_details}</td>
                    <td className="p-2 border text-center text-gray-800 font-medium">{item.qty}</td>
                    <td className="p-2 border text-right text-gray-700">{formatCurrency(item.rate)}</td>
                    <td className="p-2 border text-right text-gray-900 font-bold">{formatCurrency(item.qty * item.rate)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 border text-center text-gray-500">No items specified</td>
                </tr>
              )}
              {/* Totals Row */}
              <tr className="bg-gray-50/50">
                <td colSpan={3} className="p-2 border"></td>
                <td className="p-2 border text-right font-bold text-gray-700">Total Amount:</td>
                <td className="p-2 border text-right font-bold text-[#102516] text-sm">{formatCurrency(viewingChallan.total_amount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Narration Section */}
          {viewingChallan.narration && (
            <div className="border rounded-lg p-3 text-xs mb-8">
              <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Narration / Remarks</div>
              <p className="text-gray-700 whitespace-pre-wrap">{viewingChallan.narration}</p>
            </div>
          )}

          {/* Signatures Section */}
          <div className="grid grid-cols-3 gap-6 pt-12 mt-12 border-t border-dashed font-sans">
            <div className="flex flex-col items-center justify-end text-center">
              <div className="h-12 mb-1"></div>
              <div className="w-40 border-b border-gray-600 mb-1.5"></div>
              <span className="text-[10px] font-semibold text-gray-700 uppercase">Receiver Signature</span>
              <span className="text-[9px] text-gray-400 mt-0.5">(Sign on Delivery)</span>
            </div>

            <div className="flex flex-col items-center justify-end pb-0.5 text-center">
              <span className="text-xs font-semibold text-gray-900">{viewingChallan.prepared_by || 'Staff'}</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase mt-1">Prepared By</span>
            </div>

            <div className="flex flex-col items-center justify-end text-center">
              {companySettings?.signature_url ? (
                <div className="h-12 w-32 flex items-center justify-center mb-1">
                  <img 
                    src={companySettings.signature_url} 
                    alt="Authorised Signature" 
                    className="max-h-12 max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-40 border-b border-gray-600 mb-1.5 h-12"></div>
              )}
              <span className="text-[10px] font-semibold text-gray-700 uppercase">Authorised Signature</span>
              <span className="text-[9px] text-gray-400 mt-0.5">(For {companySettings?.company_name || 'Safawala'})</span>
            </div>
          </div>

        </div>,
        document.body
      )}
    </DashboardLayout>
  )
}
