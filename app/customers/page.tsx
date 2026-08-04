"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useData } from "@/hooks/use-data"
import { getCurrentUser } from "@/lib/auth"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  UserPlus,
  Eye,
  MessageCircle,
  Users,
  Calendar,
  TrendingUp,
  Building2,
  X,
  ShieldCheck,
  FileText
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { User, Customer } from "@/lib/types"
import { TableSkeleton, StatCardSkeleton, PageLoader } from "@/components/ui/skeleton-loader"
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { KYCDialog } from "@/components/customers/kyc-dialog"

export default function CustomersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [kycDialogOpen, setKycDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const router = useRouter()

  const { data: customers = [], loading, error, refresh } = useData<Customer[]>("customers")
  const { data: bookings = [] } = useData("bookings")
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([])

  // Keep localCustomers in sync with the useData hook
  useEffect(() => {
    if (customers) {
      setLocalCustomers(customers)
    }
  }, [customers])

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/")
        return
      }
      setUser(currentUser)
    }
    checkAuth()
  }, [router])

  // Auto-open add customer modal if ?add=true query param is present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get("add") === "true") {
        setCreateDialogOpen(true)
        // Clean up the URL parameter without refreshing the page
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, "", cleanUrl)
      }
    }
  }, [])

  const filteredCustomers = useMemo(() => {
    if (!localCustomers || !Array.isArray(localCustomers)) {
      return []
    }
    
    return localCustomers.filter(
      (customer: Customer) =>
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.customer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [localCustomers, searchTerm])

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredCustomers, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const handleWhatsApp = (customer: Customer) => {
    const phone = customer.whatsapp || customer.phone
    const message = `Hello ${customer.name}, thank you for choosing Safawala Wedding Accessories!`
    const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setViewDialogOpen(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer)
    setEditDialogOpen(true)
  }

  const handleCustomerUpdated = async (updatedCustomer: any) => {
    // Refresh the customer list immediately
    await refresh()
    
    // Update the selected customer in view dialog if it's open
    if (selectedCustomer && updatedCustomer && selectedCustomer.id === updatedCustomer.id) {
      setSelectedCustomer(updatedCustomer)
    }
    
    // Clear edit state
    setCustomerToEdit(null)
  }

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) {
      toast.error("No customer selected for deletion")
      return
    }

    // Validate customer ID
    const customerId = customerToDelete.id
    if (!customerId || typeof customerId !== 'string') {
      toast.error("Invalid customer ID")
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
      return
    }

    try {
      // intentional Raw fetch
      const response = await fetch(`/api/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ entity: 'customer', id: customerId, hard: true })
      })

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = "Failed to delete customer"
        
        // Try to parse error response
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("application/json")) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.message || errorMessage
            
            // Handle specific error cases
            if (response.status === 404) {
              errorMessage = "Customer not found. It may have already been deleted."
            } else if (response.status === 409) {
              errorMessage = errorData.error || "Cannot delete customer with existing bookings or orders."
            } else if (response.status === 401 || response.status === 403) {
              errorMessage = "You don't have permission to delete this customer."
            }
          } catch (parseError) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
        } else {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }

        throw new Error(errorMessage)
      }

      // Parse success response
      let responseData
      try {
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("application/json")) {
          responseData = await response.json()
        }
      } catch (parseError) {
      }

      // Success!
      toast.success(`Customer "${customerToDelete.name}" permanently deleted`)
      
      // Update local state immediately for instant feedback
      setLocalCustomers(prev => prev.filter(c => c.id !== customerId))
      
      // Close dialog and refresh list
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
      refresh()

    } catch (error: any) {
      // Show user-friendly error message
      const errorMessage = error.message || "Failed to delete customer. Please try again."
      toast.error(errorMessage)
      
      // Keep dialog open on error so user can try again or cancel
    }
  }

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading customers: {error}</p>
          <Button onClick={refresh} className="mt-4">
            Retry
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  if (loading) {
    return (
      <DashboardLayout userRole={user.role}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
              <p className="text-muted-foreground">Manage your customer database and relationships</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    disabled
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={8} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user.role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
            <p className="text-muted-foreground">Manage your customer database and relationships</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Array.isArray(localCustomers) ? localCustomers.length : 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Array.isArray(bookings) ? bookings.length : 0}</div>
              <p className="text-xs text-muted-foreground">Customer bookings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                +{Array.isArray(localCustomers) 
                  ? localCustomers.filter(c => {
                      const createdDate = new Date(c.created_at)
                      const now = new Date()
                      return createdDate.getMonth() === now.getMonth() && 
                             createdDate.getFullYear() === now.getFullYear()
                     }).length 
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">New customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Array.isArray(bookings) && Array.isArray(localCustomers)
                  ? new Set(
                      bookings
                        .filter((b: any) => 
                          b.payment_status === 'pending' || b.payment_status === 'partial'
                        )
                        .map((b: any) => b.customer_id)
                    ).size
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">Customers to follow up</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {paginatedCustomers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Address</TableHead>
                    {user.role === "super_admin" && <TableHead>Franchise</TableHead>}
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">KYC Status</TableHead>
                    <TableHead className="text-right w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs text-slate-500 font-medium">
                        {customer.customer_code}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {customer.name}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {customer.phone}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {customer.whatsapp || "-"}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm max-w-xs truncate">
                        {customer.address || "-"}
                      </TableCell>
                      {user.role === "super_admin" && (
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100 text-xs">
                            {customer.franchise?.name || "-"}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge 
                          variant={customer.status === "inactive" ? "destructive" : "default"}
                          className="text-[10px] uppercase font-semibold tracking-wider"
                        >
                          {customer.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={`text-[10px] uppercase font-semibold tracking-wider ${
                            customer.kyc_status === 'verified' 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : customer.kyc_status === 'rejected'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : customer.kyc_status === 'submitted'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {customer.kyc_status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900"
                            onClick={() => handleViewCustomer(customer)}
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900"
                            onClick={() => handleEditCustomer(customer)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {customer.whatsapp && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleWhatsApp(customer)}
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              customer.kyc_status === 'verified'
                                ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                            onClick={() => {
                              setSelectedCustomer(customer)
                              setKycDialogOpen(true)
                            }}
                            title="Verify KYC"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteClick(customer)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-16">
                <UserPlus className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900 mb-1">No customers found</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                  {searchTerm ? "No customers match your search filters." : "Create your customer profile to start tracking bookings."}
                </p>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Customer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {filteredCustomers.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of{" "}
                    {filteredCustomers.length} customers
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{customerToDelete?.name}</strong> and all associated data.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Customer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Customer Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                Customer Details
              </DialogTitle>
              <DialogDescription>
                Complete information about {selectedCustomer?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedCustomer && (
              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Customer Name</label>
                    <p className="text-base font-semibold mt-1">{selectedCustomer.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Customer Code</label>
                    <p className="text-base font-mono mt-1">{selectedCustomer.customer_code || 'N/A'}</p>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-base mt-1 flex items-center gap-2">
                        {selectedCustomer.phone || 'N/A'}
                        {selectedCustomer.phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => window.open(`tel:${selectedCustomer.phone}`)}
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">WhatsApp</label>
                      <p className="text-base mt-1 flex items-center gap-2">
                        {selectedCustomer.whatsapp || selectedCustomer.phone || 'N/A'}
                        {(selectedCustomer.whatsapp || selectedCustomer.phone) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-green-600"
                            onClick={() => handleWhatsApp(selectedCustomer)}
                          >
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-base mt-1">{selectedCustomer.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </h3>
                  <p className="text-base bg-muted p-3 rounded-md">
                    {selectedCustomer.address || 'No address provided'}
                  </p>
                </div>

                {/* Franchise Info */}
                {selectedCustomer.franchise && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Franchise
                    </h3>
                    <Badge variant="secondary" className="text-sm">
                      {selectedCustomer.franchise.name}
                    </Badge>
                  </div>
                )}

                {/* Notes */}
                {selectedCustomer.notes && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Notes</h3>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {typeof selectedCustomer.notes === 'string' ? selectedCustomer.notes : JSON.stringify(selectedCustomer.notes)}
                    </p>
                  </div>
                )}

                {/* KYC Details Section */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-slate-700" />
                    KYC Verification Details
                  </h3>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-semibold">Verification Status</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline"
                            className={`text-[10px] uppercase font-semibold tracking-wider ${
                              selectedCustomer.kyc_status === 'verified' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : selectedCustomer.kyc_status === 'rejected'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : selectedCustomer.kyc_status === 'submitted'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {selectedCustomer.kyc_status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewDialogOpen(false)
                          setKycDialogOpen(true)
                        }}
                        className="h-8 text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-200 rounded-lg gap-1.5"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Update KYC Details</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 text-sm border-t pt-3 border-slate-100">
                      <div>
                        <span className="text-xs text-muted-foreground font-semibold uppercase">Aadhaar Card</span>
                        <p className="font-mono mt-0.5 text-slate-800">
                          {selectedCustomer.aadhar_number 
                            ? selectedCustomer.aadhar_number.replace(/(\d{4})/g, '$1 ').trim() 
                            : 'Not Provided'}
                        </p>
                      </div>
                    </div>

                    {selectedCustomer.kyc_document_url && (
                      <div className="border-t pt-3 border-slate-100">
                        <span className="text-xs text-muted-foreground font-semibold uppercase block mb-1.5">Attached Documents</span>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            try {
                              const docs = JSON.parse(selectedCustomer.kyc_document_url)
                              return Object.entries(docs).map(([key, url]: any) => (
                                <Button
                                  key={key}
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(url, "_blank")}
                                  className="h-7 text-[10px] text-slate-600 rounded-md border-slate-200 hover:bg-slate-50 gap-1"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>{key === 'aadhar_front' ? 'Aadhaar Front' : 'Aadhaar Back'}</span>
                                </Button>
                              ))
                            } catch {
                              return (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(selectedCustomer.kyc_document_url, "_blank")}
                                  className="h-7 text-[10px] text-slate-600 rounded-md border-slate-200 hover:bg-slate-50 gap-1"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>Aadhaar Document</span>
                                </Button>
                              )
                            }
                          })()}
                        </div>
                      </div>
                    )}

                    {selectedCustomer.kyc_notes && (
                      <div className="border-t pt-3 border-slate-100">
                        <span className="text-xs text-muted-foreground font-semibold uppercase block">Audit Notes</span>
                        <p className="text-xs mt-1 text-slate-600 italic bg-white p-2 rounded border border-slate-100 whitespace-pre-wrap">
                          {selectedCustomer.kyc_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking History Section */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-700" />
                    Booking History
                  </h3>
                  {(() => {
                    const customerBookings = Array.isArray(bookings)
                      ? bookings.filter((b: any) => b.customer_id === selectedCustomer.id)
                      : []
                    if (customerBookings.length === 0) {
                      return (
                        <p className="text-xs text-muted-foreground bg-slate-50/30 p-3 rounded-lg border border-dashed border-slate-200 text-center">
                          No bookings found for this customer.
                        </p>
                      )
                    }
                    return (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {customerBookings.map((b: any) => {
                          const paid = b.paid_amount ?? b.amount_paid ?? 0
                          const bal = (b.total_amount || 0) - paid
                          return (
                            <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                              <div>
                                <Link 
                                  href={`/bookings/${b.id}`} 
                                  className="text-xs font-semibold text-blue-600 hover:underline block"
                                  onClick={() => setViewDialogOpen(false)}
                                >
                                  {b.booking_number || `Booking #${b.id.substring(0, 8)}`}
                                </Link>
                                <span className="text-[10px] text-muted-foreground">
                                  Event: {b.event_date ? new Date(b.event_date).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-xs font-semibold text-slate-900">₹{(b.total_amount || 0).toLocaleString()}</p>
                                  {bal > 0 ? (
                                    <p className="text-[9px] text-red-600 font-semibold">Bal: ₹{bal.toLocaleString()}</p>
                                  ) : (
                                    <p className="text-[9px] text-green-600 font-semibold">Paid</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-[8px] uppercase tracking-wider scale-95 px-1.5 py-0.5">
                                  {b.status || 'pending'}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {Array.isArray(bookings) ? bookings.filter((b: any) => b.customer_id === selectedCustomer.id).length : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Bookings</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">Member Since</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    className="flex-1" 
                    variant="default"
                    onClick={() => {
                      setViewDialogOpen(false)
                      handleEditCustomer(selectedCustomer)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Customer
                  </Button>
                  <Button 
                    className="flex-1" 
                    variant="outline"
                    onClick={() => setViewDialogOpen(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Customer Dialog */}
        <CustomerFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onCustomerCreated={handleCustomerUpdated}
          mode="edit"
          customer={customerToEdit}
        />

        {/* Create Customer Dialog */}
        <CustomerFormDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCustomerCreated={refresh}
          mode="create"
        />

        {selectedCustomer && (
          <KYCDialog
            open={kycDialogOpen}
            onOpenChange={setKycDialogOpen}
            customer={selectedCustomer}
            onKYCUpdated={(updatedCust) => {
              handleCustomerUpdated(updatedCust)
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
