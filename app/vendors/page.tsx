"use client"

import { useState, useEffect, useMemo } from "react"
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
import { RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { Plus } from "lucide-react" // Import Plus component
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

      const response = await fetch(`/api/vendors?status=${statusFilter}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
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
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Vendor Management</h1>
            <p className="text-sm text-muted-foreground">Manage your business vendors and suppliers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
                <DialogDescription>Create a new vendor profile for your business</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Vendor Name *</Label>
                    <Input
                      id="name"
                      value={newVendor.name}
                      onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                      placeholder="Enter vendor name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={newVendor.contact_person}
                      onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                      placeholder="Enter contact person name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={newVendor.phone}
                      onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newVendor.email}
                      onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={newVendor.address}
                    onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                    placeholder="Enter vendor address"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newVendor.notes}
                    onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
                    placeholder="Additional notes about the vendor"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setIsVendorDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateVendor}>Create Vendor</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Card className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Card className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Vendors</CardTitle>
            <Card className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveVendors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-32">
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
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === 'inactive' ? 'Inactive Vendors' : statusFilter === 'active' ? 'Active Vendors' : 'Vendors'} ({filteredVendors.length})
          </CardTitle>
          <CardDescription>Manage your vendor relationships and contact information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {vendor.contact_person || "No contact person"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <div className="h-3 w-3 mr-1" />
                          {vendor.phone}
                        </div>
                        <div className="flex items-center text-sm">
                          <div className="h-3 w-3 mr-1" />
                          {vendor.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>₹{vendor.pricing_per_item}</TableCell>
                    <TableCell>
                      <div className="ml-2">
                        <Badge variant={vendor.is_active ? "default" : "secondary"}>
                          {vendor.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Button variant="ghost" size="sm" onClick={() => handleViewVendor(vendor)}>
                          View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingVendor(vendor)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVendorWithConfirmation(vendor)}>
                          Delete
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
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredVendors.length)} of {filteredVendors.length} vendors
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

      {statusFilter === 'all' && inactiveVendors > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Inactive Vendors ({inactiveVendors})</CardTitle>
            <CardDescription>These vendors are currently deactivated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vendors.filter(v => !v.is_active).map(vendor => (
                <div key={vendor.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <div className="font-medium">{vendor.name}</div>
                    <div className="text-sm text-muted-foreground">{vendor.contact_person || 'No contact person'} • {vendor.phone}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Inactive</Badge>
                    <Button size="sm" variant="outline" onClick={() => handleReactivateVendor(vendor.id)}>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>Update vendor information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editingVendor && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Vendor Name *</Label>
                    <Input
                      id="edit-name"
                      value={editingVendor.name}
                      onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                      placeholder="Enter vendor name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-contact_person">Contact Person</Label>
                    <Input
                      id="edit-contact_person"
                      value={editingVendor.contact_person}
                      onChange={(e) => setEditingVendor({ ...editingVendor, contact_person: e.target.value })}
                      placeholder="Enter contact person name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Phone *</Label>
                    <Input
                      id="edit-phone"
                      value={editingVendor.phone}
                      onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingVendor.email}
                      onChange={(e) => setEditingVendor({ ...editingVendor, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-address">Address</Label>
                    <Textarea
                      id="edit-address"
                      value={editingVendor.address}
                      onChange={(e) => setEditingVendor({ ...editingVendor, address: e.target.value })}
                      placeholder="Enter vendor address"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={editingVendor.notes}
                      onChange={(e) => setEditingVendor({ ...editingVendor, notes: e.target.value })}
                      placeholder="Additional notes about the vendor"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-active"
                    checked={editingVendor.is_active}
                    onCheckedChange={(checked) => setEditingVendor({ ...editingVendor, is_active: checked })}
                  />
                  <Label htmlFor="edit-active" className="text-sm font-medium">
                    Active Status
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    ({editingVendor.is_active ? "Active" : "Inactive"})
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setEditingVendor(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateVendor}>Update Vendor</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Vendor Details Dialog */}
      <Dialog open={!!viewingVendor} onOpenChange={(open) => !open && setViewingVendor(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{viewingVendor?.name} - Vendor Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Vendor Info Cards */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Contact Person</Label>
                <div className="ml-2">{viewingVendor?.contact_person || "Not specified"}</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                <div className="ml-2">{viewingVendor?.phone}</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <div className="ml-2">{viewingVendor?.email || "Not provided"}</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <div className="ml-2">
                  <Badge variant={viewingVendor?.is_active ? "default" : "secondary"}>
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
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
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
            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setViewingVendor(null)}>
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
