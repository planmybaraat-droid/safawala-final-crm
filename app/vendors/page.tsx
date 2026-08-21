"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, ArrowLeft, Plus, Search, UsersRound, BriefcaseBusiness, Ban, WalletCards, Phone, Mail, Eye, Pencil, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

interface Vendor {
  id: string
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  pricing_per_item: number
  is_active: boolean
  notes: string
  created_at: string
  updated_at: string
}

interface VendorTransaction {
  id: string
  vendor_id: string
  transaction_type: "payment" | "order" | "refund"
  amount: number
  description: string
  reference_number: string
  transaction_date: string
  status: "pending" | "completed" | "cancelled"
  created_at: string
}

interface NewVendor {
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  pricing_per_item: number
  notes: string
  services: []
}

export default function VendorsPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [newVendor, setNewVendor] = useState<NewVendor>({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "", // ensure address is always a string
    pricing_per_item: 0,
    notes: "",
    services: [],
  })
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null)
  const [vendorTransactions, setVendorTransactions] = useState<VendorTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false)

  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
  } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadVendors()
  }, [statusFilter])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadVendors()
    setRefreshing(false)
  }

  const loadVendors = async () => {
    try {
      console.log("[Vendors] Starting to fetch vendors from API...")

      const response = await fetch(`/api/vendors?status=${statusFilter}&_refresh=${Date.now()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch vendors" }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log("[Vendors] Vendors fetched successfully:", result.vendors?.length || 0, "records")

      setVendors(result.vendors || [])
      
      if (result.warning) {
        console.warn("[Vendors]", result.warning)
      }
    } catch (error: any) {
      console.error("[Vendors] Error loading vendors:", error)
      toast.error(error.message || "Failed to load vendors")
    } finally {
      setLoading(false)
    }
  }

  const loadVendorTransactions = async (vendorId: string) => {
    setLoadingTransactions(true)
    try {
      // Get purchases from this vendor
      const { data: purchases, error: purchasesError } = await supabase
        .from("purchases")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("purchase_date", { ascending: false })

      if (purchasesError) throw purchasesError

      // Get laundry batches from this vendor
      const { data: laundryBatches, error: laundryError } = await supabase
        .from("laundry_batches")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("sent_date", { ascending: false })

      if (laundryError) throw laundryError

      // Convert purchases to transaction format
      const purchaseTransactions: VendorTransaction[] = (purchases || []).map((purchase) => ({
        id: purchase.id,
        vendor_id: vendorId,
        transaction_type: "order" as const,
        amount: purchase.total_amount || 0,
        description: `Purchase Order #${purchase.purchase_number}`,
        reference_number: purchase.purchase_number || purchase.invoice_number || "",
        transaction_date: purchase.purchase_date,
        status:
          purchase.status === "completed" ? "completed" : purchase.status === "cancelled" ? "cancelled" : "pending",
        created_at: purchase.created_at,
      }))

      // Convert laundry batches to transaction format
      const laundryTransactions: VendorTransaction[] = (laundryBatches || []).map((batch) => ({
        id: batch.id,
        vendor_id: vendorId,
        transaction_type: "order" as const,
        amount: batch.total_cost || 0,
        description: `Laundry Batch #${batch.batch_number}`,
        reference_number: batch.batch_number || "",
        transaction_date: batch.sent_date,
        status: batch.status === "completed" ? "completed" : batch.status === "cancelled" ? "cancelled" : "pending",
        created_at: batch.created_at,
      }))

      // Combine and sort all transactions
      const allTransactions = [...purchaseTransactions, ...laundryTransactions].sort(
        (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime(),
      )

      setVendorTransactions(allTransactions)
    } catch (error) {
      console.error("Error loading vendor transactions:", error)
      toast.error("Failed to load vendor transactions")
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleCreateVendor = async () => {
    try {
      const vendorData = {
        name: newVendor.name,
        contact_person: newVendor.contact_person,
        phone: newVendor.phone,
        email: newVendor.email,
        address: newVendor.address,
        pricing_per_item: newVendor.pricing_per_item,
        notes: newVendor.notes,
      }

      console.log("[Vendors] Creating vendor:", vendorData)

      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(vendorData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create vendor" }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log("[Vendors] Vendor created successfully:", result.vendor)

      if (result.warning) {
        console.warn("[Vendors]", result.warning)
      }

      toast.success("Vendor created successfully")
      setIsVendorDialogOpen(false)
      setNewVendor({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        pricing_per_item: 0,
        notes: "",
        services: [],
      })
      loadVendors()
    } catch (error: any) {
      console.error("[Vendors] Error creating vendor:", error)
      toast.error(error.message || "Failed to create vendor")
    }
  }

  const handleUpdateVendor = async () => {
    if (!editingVendor) return

    try {
      const updateData = {
        id: editingVendor.id,
        name: editingVendor.name,
        contact_person: editingVendor.contact_person,
        phone: editingVendor.phone,
        email: editingVendor.email,
        address: editingVendor.address || "",
        pricing_per_item: editingVendor.pricing_per_item,
        notes: editingVendor.notes || "",
        is_active: editingVendor.is_active,
      }

      console.log("[Vendors] Updating vendor:", editingVendor.id, updateData)

      const response = await fetch(`/api/vendors/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update vendor" }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log("[Vendors] Vendor updated successfully:", result.vendor)

      if (result.warning) {
        console.warn("[Vendors]", result.warning)
      }

      toast.success("Vendor updated successfully")
      setEditingVendor(null)
      loadVendors()
    } catch (error: any) {
      console.error("[Vendors] Error updating vendor:", error)
      toast.error(error.message || "Failed to update vendor")
    }
  }

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      console.log("[Vendors] Deleting vendor:", vendorId)

      // Use unified delete endpoint to avoid dynamic route 404s
      const response = await fetch(`/api/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ entity: "vendor", id: vendorId, hard: true })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete vendor" }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

  const result = await response.json()
  console.log("[Vendors] Vendor deleted successfully:", result.message)

      if (result.warning) {
        console.warn("[Vendors]", result.warning)
      }

      toast.success("Vendor permanently deleted")
      setConfirmationDialog(null)
      loadVendors()
    } catch (error: any) {
      console.error("[Vendors] Error deleting vendor:", error)
      toast.error(error.message || "Failed to delete vendor")
    }
  }

  const handleDeactivateVendor = async (vendorId: string) => {
    try {
      console.log("[Vendors] Deactivating vendor:", vendorId)

      const response = await fetch(`/api/vendors/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id: vendorId, is_active: false }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to deactivate vendor" }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log("[Vendors] Vendor deactivated successfully:", result.vendor)

      if (result.warning) {
        console.warn("[Vendors]", result.warning)
      }

      toast.success("Vendor deactivated successfully")
      setConfirmationDialog(null)
      loadVendors()
    } catch (error: any) {
      console.error("[Vendors] Error deactivating vendor:", error)
      toast.error(error.message || "Failed to deactivate vendor")
    }
  }

  const handleReactivateVendor = async (vendorId: string) => {
    try {
      console.log("[Vendors] Reactivating vendor:", vendorId)

      const response = await fetch(`/api/vendors/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id: vendorId, is_active: true }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to reactivate vendor" }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log("[Vendors] Vendor reactivated successfully:", result.vendor)

      if (result.warning) {
        console.warn("[Vendors]", result.warning)
      }

      toast.success("Vendor reactivated successfully")
      loadVendors()
    } catch (error: any) {
      console.error("[Vendors] Error reactivating vendor:", error)
      toast.error(error.message || "Failed to reactivate vendor")
    }
  }

  const handleDeleteVendorWithConfirmation = (vendor: Vendor) => {
    setConfirmationDialog({
      open: true,
      title: "Delete or Deactivate Vendor",
      message: `What would you like to do with "${vendor.name}"?`,
      onConfirm: () => handleDeleteVendor(vendor.id),
      onCancel: () => handleDeactivateVendor(vendor.id),
    })
  }

  const handleViewVendor = async (vendor: Vendor) => {
    setViewingVendor(vendor)
    await loadVendorTransactions(vendor.id)
  }

  const filteredVendors = vendors.filter((vendor) => {
    if (!vendor) return false

    const matchesSearch =
      vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.contact_person || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone?.includes(searchTerm)
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && vendor.is_active) ||
      (statusFilter === "inactive" && !vendor.is_active)

    return matchesSearch && matchesStatus
  })

  const paginatedVendors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredVendors.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredVendors, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage)

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const serviceTypes = ["laundry", "dry_cleaning", "both", "catering", "decoration", "photography", "transportation"]
  const activeVendors = vendors.filter((v) => v.is_active).length
  const inactiveVendors = vendors.filter((v) => !v.is_active).length
  const totalVendors = vendors.length
  const totalSpending = vendors.reduce((sum, vendor) => sum + (Number(vendor.pricing_per_item) || 0), 0)

  const getVendorStats = (vendorId: string) => {
    const transactions = vendorTransactions.filter((t) => t.vendor_id === vendorId)
    const totalPaid = transactions.filter((t) => t.status === "completed").reduce((sum, t) => sum + t.amount, 0)
    const totalOrders = transactions.length
    const pendingPayments = transactions.filter((t) => t.status === "pending").reduce((sum, t) => sum + t.amount, 0)

    return { totalPaid, totalOrders, pendingPayments }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading vendors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen space-y-5 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.10),transparent_32%),linear-gradient(135deg,#fbfaff_0%,#f8fafc_48%,#f4f0ff_100%)] p-4 text-[#120d29] md:p-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[#ded3f2] bg-white/95 p-5 shadow-[0_22px_55px_rgba(64,35,140,0.10)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-2xl border-[#ded3f2] bg-white text-[#4c1d95] shadow-sm hover:bg-[#f6f2ff]"
            title="Go back"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] via-[#6d28d9] to-[#2e1065] text-white shadow-[0_18px_36px_rgba(109,40,217,0.25)]">
            <UsersRound className="h-6 w-6" />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7c3aed]">Suppliers</p>
            <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.035em] text-[#120d29]">Vendor Management</h1>
            <p className="text-sm font-medium text-[#665b7d]">Manage your business vendors and suppliers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="rounded-2xl border-[#ded3f2] bg-white px-4 text-[#4c1d95] shadow-sm hover:bg-[#f6f2ff]" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl bg-[#21143f] px-5 text-white shadow-[0_14px_30px_rgba(33,20,63,0.20)] hover:bg-[#3b1a78]">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[28px] border-[#ded3f2] bg-white p-0 shadow-[0_28px_80px_rgba(33,20,63,0.22)]">
              <DialogHeader className="rounded-t-[28px] border-b border-[#eee7fb] bg-gradient-to-r from-[#fbf8ff] to-white px-6 py-5">
                <DialogTitle className="text-2xl font-extrabold tracking-[-0.03em] text-[#120d29]">Add New Vendor</DialogTitle>
                <DialogDescription className="text-sm font-medium text-[#665b7d]">Create a new vendor profile for your business</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 px-6 py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="text-sm font-semibold text-[#21143f]">Vendor Name *</Label>
                    <Input
                      id="name"
                      className="mt-1.5 h-11 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                      value={newVendor.name}
                      onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                      placeholder="Enter vendor name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_person" className="text-sm font-semibold text-[#21143f]">Contact Person</Label>
                    <Input
                      id="contact_person"
                      className="mt-1.5 h-11 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                      value={newVendor.contact_person}
                      onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                      placeholder="Enter contact person name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="phone" className="text-sm font-semibold text-[#21143f]">Phone *</Label>
                    <Input
                      id="phone"
                      className="mt-1.5 h-11 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                      value={newVendor.phone}
                      onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-[#21143f]">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      className="mt-1.5 h-11 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                      value={newVendor.email}
                      onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm font-semibold text-[#21143f]">Address</Label>
                  <Textarea
                    id="address"
                    className="mt-1.5 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                    value={newVendor.address}
                    onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                    placeholder="Enter vendor address"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-semibold text-[#21143f]">Notes</Label>
                  <Textarea
                    id="notes"
                    className="mt-1.5 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                    value={newVendor.notes}
                    onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
                    placeholder="Additional notes about the vendor"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#eee7fb] bg-[#fbf8ff] px-6 py-4">
                <Button variant="outline" className="rounded-2xl border-[#ded3f2] bg-white px-5 text-[#21143f] hover:bg-[#f6f2ff]" onClick={() => setIsVendorDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="rounded-2xl bg-[#21143f] px-5 text-white hover:bg-[#3b1a78]" onClick={handleCreateVendor}>Create Vendor</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="vendor-stats-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Vendors", value: totalVendors, hint: "All registered vendors", icon: UsersRound },
          { label: "Active Vendors", value: activeVendors, hint: "Currently working", icon: BriefcaseBusiness },
          { label: "Inactive Vendors", value: inactiveVendors, hint: "Not in use", icon: Ban },
          { label: "Total Spending (MTD)", value: `₹${totalSpending.toLocaleString("en-IN")}`, hint: "Across all vendors", icon: WalletCards },
        ].map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} className="vendor-stat-card overflow-hidden rounded-[24px] border-[#ded3f2] bg-white/95 shadow-[0_16px_36px_rgba(64,35,140,0.08)]">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="vendor-stat-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"><Icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="vendor-stat-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b7190]">{label}</p>
                <p className="vendor-stat-value mt-0.5 text-2xl font-extrabold tracking-[-0.03em] text-[#120d29]">{value}</p>
                <p className="vendor-stat-hint text-xs font-medium text-[#7b7190]">{hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-[24px] border border-[#ded3f2] bg-white/90 p-3 shadow-[0_14px_34px_rgba(64,35,140,0.07)] sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A93A2]" />
          <Input
            placeholder="Search vendors by name, contact, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 rounded-2xl border-[#ded3f2] bg-white pl-10 shadow-sm focus-visible:ring-[#7c3aed]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-full rounded-2xl border-[#ded3f2] bg-white shadow-sm sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendors Table */}
      <Card className="overflow-hidden rounded-[28px] border-[#ded3f2] bg-white/95 shadow-[0_20px_50px_rgba(64,35,140,0.10)]">
        <CardHeader className="border-b border-[#eee7fb] bg-gradient-to-r from-[#fbf8ff] to-white px-5 py-4">
          <CardTitle className="text-lg font-extrabold tracking-[-0.02em] text-[#120d29]">
            {statusFilter === 'inactive' ? 'Inactive Vendors' : statusFilter === 'active' ? 'Active Vendors' : 'Vendors'} ({filteredVendors.length})
          </CardTitle>
          <CardDescription className="text-xs font-medium text-[#665b7d]">Manage your vendor relationships and contact information</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4">
            <Table>
              <TableHeader className="bg-[#fbf8ff]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#665b7d]">Vendor</TableHead>
                  <TableHead className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#665b7d]">Contact</TableHead>
                  <TableHead className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#665b7d]">Pricing</TableHead>
                  <TableHead className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#665b7d]">Status</TableHead>
                  <TableHead className="text-right text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#665b7d]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVendors.map((vendor) => (
                  <TableRow key={vendor.id} className="border-[#eee7fb] transition-colors hover:bg-[#fbf8ff]">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#4c1d95] text-sm font-bold text-white shadow-[0_10px_20px_rgba(124,58,237,0.20)]">
                          {(vendor.name || "V").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#120d29]">{vendor.name}</div>
                          <div className="text-xs font-medium text-[#665b7d]">
                            {vendor.contact_person || "No contact person"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-xs font-medium text-[#665b7d]">
                          <Phone className="mr-2 h-3.5 w-3.5 text-[#7c3aed]" />
                          {vendor.phone}
                        </div>
                        <div className="flex items-center text-xs font-medium text-[#665b7d]">
                          <Mail className="mr-2 h-3.5 w-3.5 text-[#7c3aed]" />
                          {vendor.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-[#120d29]">₹{Number(vendor.pricing_per_item || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <div className="ml-2">
                        <Badge className={vendor.is_active ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50" : "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 hover:bg-slate-50"}>
                          {vendor.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-[#ded3f2] bg-white hover:bg-[#f6f2ff]" title="View vendor" onClick={() => handleViewVendor(vendor)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-[#ded3f2] bg-white hover:bg-[#f6f2ff]" title="Edit vendor" onClick={() => setEditingVendor(vendor)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-50" title="Delete vendor" onClick={() => handleDeleteVendorWithConfirmation(vendor)}>
                          <Trash2 className="h-4 w-4" />
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
        {filteredVendors.length > 0 && (
          <CardContent className="border-t border-[#eee7fb] bg-[#fbf8ff] px-5 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-[#665b7d]">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredVendors.length)} of {filteredVendors.length} vendors
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#665b7d]">Items per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-9 w-[78px] rounded-xl border-[#ded3f2] bg-white">
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
                  className="rounded-xl border-[#ded3f2] bg-white text-[#21143f] hover:bg-[#f6f2ff]"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="rounded-full border border-[#ded3f2] bg-white px-3 py-1 text-sm font-semibold text-[#21143f]">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#ded3f2] bg-white text-[#21143f] hover:bg-[#f6f2ff]"
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

      {statusFilter === 'all' && inactiveVendors > 0 && (
        <Card className="mt-4 overflow-hidden rounded-[28px] border-[#ded3f2] bg-white/95 shadow-[0_16px_36px_rgba(64,35,140,0.08)]">
          <CardHeader className="border-b border-[#eee7fb] bg-gradient-to-r from-[#fbf8ff] to-white">
            <CardTitle className="text-lg font-extrabold tracking-[-0.02em] text-[#120d29]">Inactive Vendors ({inactiveVendors})</CardTitle>
            <CardDescription className="text-sm font-medium text-[#665b7d]">These vendors are currently deactivated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vendors.filter(v => !v.is_active).map(vendor => (
                <div key={vendor.id} className="flex items-center justify-between rounded-2xl border border-[#eee7fb] bg-white p-3 shadow-sm">
                  <div>
                    <div className="font-semibold text-[#120d29]">{vendor.name}</div>
                    <div className="text-sm font-medium text-[#665b7d]">{vendor.contact_person || 'No contact person'} • {vendor.phone}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50">Inactive</Badge>
                    <Button size="sm" variant="outline" className="rounded-xl border-[#ded3f2] bg-white text-[#4c1d95] hover:bg-[#f6f2ff]" onClick={() => handleReactivateVendor(vendor.id)}>
                      Reactivate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Vendor Dialog */}
      <Dialog open={!!editingVendor} onOpenChange={(open) => !open && setEditingVendor(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[28px] border-[#ded3f2] bg-white p-0 shadow-[0_28px_80px_rgba(33,20,63,0.22)]">
          <DialogHeader className="rounded-t-[28px] border-b border-[#eee7fb] bg-gradient-to-r from-[#fbf8ff] to-white px-6 py-5">
            <DialogTitle className="text-2xl font-extrabold tracking-[-0.03em] text-[#120d29]">Edit Vendor</DialogTitle>
            <DialogDescription className="text-sm font-medium text-[#665b7d]">Update vendor information</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            {editingVendor && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-name" className="text-sm font-semibold text-[#21143f]">Vendor Name *</Label>
                    <Input
                      id="edit-name"
                      className="mt-1.5 h-11 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                      value={editingVendor.name}
                      onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                      placeholder="Enter vendor name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-contact_person" className="text-sm font-semibold text-[#21143f]">Contact Person</Label>
                    <Input
                      id="edit-contact_person"
                      className="mt-1.5 h-11 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                      value={editingVendor.contact_person}
                      onChange={(e) => setEditingVendor({ ...editingVendor, contact_person: e.target.value })}
                      placeholder="Enter contact person name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone" className="text-sm font-semibold text-[#21143f]">Phone *</Label>
                    <Input
                      id="edit-phone"
                      className="mt-1.5 h-11 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                      value={editingVendor.phone}
                      onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email" className="text-sm font-semibold text-[#21143f]">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      className="mt-1.5 h-11 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                      value={editingVendor.email}
                      onChange={(e) => setEditingVendor({ ...editingVendor, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-address" className="text-sm font-semibold text-[#21143f]">Address</Label>
                    <Textarea
                      id="edit-address"
                      className="mt-1.5 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                      value={editingVendor.address}
                      onChange={(e) => setEditingVendor({ ...editingVendor, address: e.target.value })}
                      placeholder="Enter vendor address"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-notes" className="text-sm font-semibold text-[#21143f]">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      className="mt-1.5 rounded-2xl border-[#ded3f2] bg-white shadow-sm focus-visible:ring-[#7c3aed]"
                      value={editingVendor.notes}
                      onChange={(e) => setEditingVendor({ ...editingVendor, notes: e.target.value })}
                      placeholder="Additional notes about the vendor"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 rounded-2xl border border-[#eee7fb] bg-[#fbf8ff] p-4">
                  <Switch
                    id="edit-active"
                    checked={editingVendor.is_active}
                    onCheckedChange={(checked) => setEditingVendor({ ...editingVendor, is_active: checked })}
                  />
                  <Label htmlFor="edit-active" className="text-sm font-semibold text-[#21143f]">
                    Active Status
                  </Label>
                  <span className="text-sm font-medium text-[#665b7d]">
                    ({editingVendor.is_active ? "Active" : "Inactive"})
                  </span>
                </div>
              </>
            )}
            <div className="-mx-6 -mb-5 flex justify-end gap-2 border-t border-[#eee7fb] bg-[#fbf8ff] px-6 py-4">
              <Button variant="outline" className="rounded-2xl border-[#ded3f2] bg-white px-5 text-[#21143f] hover:bg-[#f6f2ff]" onClick={() => setEditingVendor(null)}>
                Cancel
              </Button>
              <Button className="rounded-2xl bg-[#21143f] px-5 text-white hover:bg-[#3b1a78]" onClick={handleUpdateVendor}>Update Vendor</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Vendor Details Dialog */}
      <Dialog open={!!viewingVendor} onOpenChange={(open) => !open && setViewingVendor(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[28px] border-[#ded3f2] bg-white p-0 shadow-[0_28px_80px_rgba(33,20,63,0.22)]">
          <DialogHeader className="rounded-t-[28px] border-b border-[#eee7fb] bg-gradient-to-r from-[#fbf8ff] to-white px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-2xl font-extrabold tracking-[-0.03em] text-[#120d29]">{viewingVendor?.name} - Vendor Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 px-6 py-5">
            {/* Vendor Info Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#eee7fb] bg-[#fbf8ff] p-4">
                <Label className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b7190]">Contact Person</Label>
                <div className="mt-1 font-semibold text-[#120d29]">{viewingVendor?.contact_person || "Not specified"}</div>
              </div>
              <div className="rounded-2xl border border-[#eee7fb] bg-[#fbf8ff] p-4">
                <Label className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b7190]">Phone</Label>
                <div className="mt-1 font-semibold text-[#120d29]">{viewingVendor?.phone}</div>
              </div>
              <div className="rounded-2xl border border-[#eee7fb] bg-[#fbf8ff] p-4">
                <Label className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b7190]">Email</Label>
                <div className="mt-1 font-semibold text-[#120d29]">{viewingVendor?.email || "Not provided"}</div>
              </div>
              <div className="rounded-2xl border border-[#eee7fb] bg-[#fbf8ff] p-4">
                <Label className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b7190]">Status</Label>
                <div className="mt-2">
                  <Badge className={viewingVendor?.is_active ? "rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50" : "rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50"}>
                    {viewingVendor?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="space-y-4">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <div className="h-5 w-5" />
                  Transaction History
                </div>
                <div className="h-5 w-5" />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading transactions...</span>
                  </div>
                ) : vendorTransactions.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {vendorTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between rounded-2xl border border-[#eee7fb] bg-white p-3 shadow-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className={`ml-2 ${
                                transaction.transaction_type === "payment"
                                  ? "text-green-600"
                                  : transaction.transaction_type === "refund"
                                    ? "text-red-600"
                                    : "text-blue-600"
                              }`}
                            >
                              {transaction.transaction_type.replace("_", " ").toUpperCase()}
                            </div>
                            <div
                              className={`ml-2 ${
                                transaction.status === "completed"
                                  ? "text-green-600"
                                  : transaction.status === "pending"
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {transaction.status.toUpperCase()}
                            </div>
                          </div>
                          <p className="text-sm font-medium mt-1">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.transaction_date).toLocaleDateString()} • Ref:{" "}
                            {transaction.reference_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-medium ${
                              transaction.transaction_type === "payment"
                                ? "text-green-600"
                                : transaction.transaction_type === "refund"
                                  ? "text-red-600"
                                  : "text-blue-600"
                            }`}
                          >
                            {transaction.transaction_type === "refund" ? "-" : ""}₹{transaction.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No transactions found for this vendor</p>
                  </div>
                )}
              </div>
            </div>
            <div className="-mx-6 -mb-5 flex justify-end border-t border-[#eee7fb] bg-[#fbf8ff] px-6 py-4">
              <Button variant="outline" className="rounded-2xl border-[#ded3f2] bg-white px-5 text-[#21143f] hover:bg-[#f6f2ff]" onClick={() => setViewingVendor(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialog?.open || false} onOpenChange={(open) => !open && setConfirmationDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmationDialog?.title}</DialogTitle>
            <DialogDescription>{confirmationDialog?.message}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={confirmationDialog?.onCancel}>
              Deactivate
            </Button>
            <Button variant="destructive" onClick={confirmationDialog?.onConfirm}>
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
