"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Building, Users, DollarSign, Package, Edit, Eye, MapPin, Phone, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface Franchise {
  id: string
  name: string
  location: string
  address: string
  contact_person: string
  phone: string
  email: string
  gst_number?: string
  status: "active" | "inactive"
  created_at: string
  total_bookings?: number
  total_revenue?: number
  total_customers?: number
  total_inventory?: number
}

export default function FranchisesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedFranchise, setSelectedFranchise] = useState<Franchise | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    address: "",
    contact_person: "",
    phone: "",
    email: "",
    gst_number: "",
    pincode: "",
    is_active: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/")
        return
      }
      if (currentUser.role !== "super_admin") {
        router.push("/dashboard")
        return
      }
      setUser(currentUser)
      loadFranchises()
    }

    checkAuth()
  }, [router])

  const loadFranchises = async () => {
    try {
      setLoading(true)

      // Use API route instead of direct Supabase to bypass RLS
      const response = await fetch("/api/franchises", {
        method: "GET",
        credentials: "include", // Include cookies for authentication
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const { data: franchiseData } = await response.json()

      if (!franchiseData) {
        toast({
          title: "Error",
          description: "No franchise data returned",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (!franchiseData || franchiseData.length === 0) {
        setFranchises([])
        setLoading(false)
        return
      }

      const transformedFranchises: Franchise[] = franchiseData.map((franchise: any) => ({
        id: franchise.id,
        name: franchise.name || "Unnamed Franchise",
        location: franchise.city || franchise.state || "Unknown Location",
        address: franchise.address || "No address provided",
        contact_person: franchise.owner_name || franchise.manager_name || "Unknown Contact",
        phone: franchise.phone || "No phone",
        email: franchise.email || "No email",
        gst_number: franchise.gst_number || "",
        status: franchise.is_active ? "active" : "inactive",
        created_at: franchise.created_at || new Date().toISOString(),
        total_bookings: 0,
        total_revenue: 0,
        total_customers: 0,
        total_inventory: 0,
      }))

      setFranchises(transformedFranchises)
      setLoading(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load franchises",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/franchises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          code: formData.name.toUpperCase().replace(/\s+/g, "_"),
          address: formData.address,
          city: formData.location,
          state: formData.location,
          pincode: formData.pincode,
          phone: formData.phone,
          email: formData.email,
          owner_name: formData.contact_person,
          manager_name: formData.contact_person,
          gst_number: formData.gst_number || null,
          is_active: formData.is_active,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create franchise")
      }

      toast({
        title: "Success",
        description: "Franchise created successfully",
      })

      setIsAddDialogOpen(false)
      setFormData({
        name: "",
        location: "",
        address: "",
        contact_person: "",
        phone: "",
        email: "",
        gst_number: "",
        pincode: "",
        is_active: true,
      })

      loadFranchises()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create franchise",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (franchise: Franchise) => {
    setSelectedFranchise(franchise)
    setFormData({
      name: franchise.name,
      location: franchise.location,
      address: franchise.address,
      contact_person: franchise.contact_person,
      phone: franchise.phone,
      email: franchise.email,
      gst_number: franchise.gst_number || "",
      pincode: "000000", // Default pincode since we don't have it in the Franchise interface
      is_active: franchise.status === "active",
    })
    setIsEditDialogOpen(true)
  }

  const handleView = (franchise: Franchise) => {
    setSelectedFranchise(franchise)
    setIsViewDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFranchise) return

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/franchises", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedFranchise.id,
          name: formData.name,
          code: formData.name.toUpperCase().replace(/\s+/g, "_"),
          address: formData.address,
          city: formData.location,
          state: formData.location,
          pincode: formData.pincode,
          phone: formData.phone,
          email: formData.email,
          owner_name: formData.contact_person,
          manager_name: formData.contact_person,
          gst_number: formData.gst_number || null,
          is_active: formData.is_active,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update franchise")
      }

      toast({
        title: "Success",
        description: "Franchise updated successfully",
      })

      setIsEditDialogOpen(false)
      setSelectedFranchise(null)
      setFormData({
        name: "",
        location: "",
        address: "",
        contact_person: "",
        phone: "",
        email: "",
        gst_number: "",
        pincode: "",
        is_active: true,
      })

      loadFranchises()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update franchise",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredFranchises = franchises.filter(
    (franchise) =>
      franchise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      franchise.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      franchise.contact_person.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  const totalFranchises = franchises.length
  const activeFranchises = franchises.filter((f) => f.status === "active").length
  const totalCustomers = franchises.reduce((sum, f) => sum + (f.total_customers || 0), 0)
  const totalRevenue = franchises.reduce((sum, f) => sum + (f.total_revenue || 0), 0)

  return (
    <DashboardLayout userRole={user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Franchise Management</h1>
            <p className="text-muted-foreground">Manage and monitor all franchise locations</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Franchise
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Franchise</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Franchise Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location *</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                        required
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact_person">Contact Person *</Label>
                        <Input
                          id="contact_person"
                          value={formData.contact_person}
                          onChange={(e) => setFormData((prev) => ({ ...prev, contact_person: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="gst_number">GST Number</Label>
                        <Input
                          id="gst_number"
                          value={formData.gst_number}
                          onChange={(e) => setFormData((prev) => ({ ...prev, gst_number: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pincode">Pincode *</Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value }))}
                          required
                          maxLength={6}
                          pattern="[0-9]{6}"
                          placeholder="000000"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Franchise"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Franchises</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFranchises}</div>
              <p className="text-xs text-muted-foreground">{activeFranchises} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-muted-foreground">Across all franchises</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Combined revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Revenue</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{totalFranchises > 0 ? Math.round(totalRevenue / totalFranchises).toLocaleString() : 0}
              </div>
              <p className="text-xs text-muted-foreground">Per franchise</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search franchises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Franchises Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFranchises.map((franchise) => (
            <Card key={franchise.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{franchise.name}</CardTitle>
                  <Badge variant={franchise.status === "active" ? "default" : "secondary"}>{franchise.status}</Badge>
                </div>
                <CardDescription>{franchise.location}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{franchise.address}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{franchise.contact_person}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{franchise.phone}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600 truncate">{franchise.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{franchise.total_customers || 0}</div>
                    <div className="text-xs text-gray-500">Customers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      ₹{(franchise.total_revenue || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{franchise.total_bookings || 0}</div>
                    <div className="text-xs text-gray-500">Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{franchise.total_inventory || 0}</div>
                    <div className="text-xs text-gray-500">Items</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => handleView(franchise)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => handleEdit(franchise)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Franchise</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_name">Franchise Name *</Label>
                    <Input
                      id="edit_name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_location">Location *</Label>
                    <Input
                      id="edit_location"
                      value={formData.location}
                      onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit_address">Address *</Label>
                  <Textarea
                    id="edit_address"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    required
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_contact_person">Contact Person *</Label>
                    <Input
                      id="edit_contact_person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contact_person: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_phone">Phone *</Label>
                    <Input
                      id="edit_phone"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_email">Email *</Label>
                    <Input
                      id="edit_email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_gst_number">GST Number</Label>
                    <Input
                      id="edit_gst_number"
                      value={formData.gst_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, gst_number: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_pincode">Pincode *</Label>
                    <Input
                      id="edit_pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value }))}
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      placeholder="000000"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="edit_is_active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Franchise"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Franchise Details</DialogTitle>
            </DialogHeader>
            {selectedFranchise && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Franchise Name</Label>
                    <p className="text-sm font-medium">{selectedFranchise.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Location</Label>
                    <p className="text-sm font-medium">{selectedFranchise.location}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Address</Label>
                  <p className="text-sm font-medium">{selectedFranchise.address}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Contact Person</Label>
                    <p className="text-sm font-medium">{selectedFranchise.contact_person}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Phone</Label>
                    <p className="text-sm font-medium">{selectedFranchise.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="text-sm font-medium">{selectedFranchise.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">GST Number</Label>
                    <p className="text-sm font-medium">{selectedFranchise.gst_number || "Not provided"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <Badge variant={selectedFranchise.status === "active" ? "default" : "secondary"}>
                      {selectedFranchise.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Created</Label>
                    <p className="text-sm font-medium">{new Date(selectedFranchise.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{selectedFranchise.total_customers || 0}</div>
                    <div className="text-xs text-gray-500">Customers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      ₹{(selectedFranchise.total_revenue || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{selectedFranchise.total_bookings || 0}</div>
                    <div className="text-xs text-gray-500">Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{selectedFranchise.total_inventory || 0}</div>
                    <div className="text-xs text-gray-500">Items</div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {filteredFranchises.length === 0 && (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No franchises found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? "Try adjusting your search terms." : "Get started by adding a new franchise."}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Franchise
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
