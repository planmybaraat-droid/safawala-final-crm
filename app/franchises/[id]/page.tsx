"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { User, Franchise } from '@/lib/types'
import { ArrowLeft, Edit, Plus, Users, Package, Calendar, DollarSign, TrendingUp, Phone, Mail, MapPin, Building, UserPlus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'

interface FranchiseDetails extends Franchise {
  staff_count: number
  product_count: number
  booking_count: number
  total_revenue: number
  staff: Array<{
    id: string
    name: string
    email: string
    phone?: string
    role: string
    is_active: boolean
    created_at: string
  }>
  recent_bookings: Array<{
    id: string
    booking_number: string
    customer_name: string
    total_amount: number
    status: string
    created_at: string
  }>
  inventory_summary: Array<{
    category: string
    total_items: number
    available_items: number
    booked_items: number
  }>
}

export default function FranchiseDetailsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [franchise, setFranchise] = useState<FranchiseDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false)
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff' as const
  })
  const router = useRouter()
  const params = useParams()
  const franchiseId = params.id as string

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      if (currentUser.role !== 'super_admin') {
        router.push('/dashboard')
        return
      }
      setUser(currentUser)
      await loadFranchiseDetails()
      setLoading(false)
    }

    checkAuth()
  }, [router, franchiseId])

  const loadFranchiseDetails = async () => {
    try {
      // Get franchise basic info
      const { data: franchiseData, error: franchiseError } = await supabase
        .from('franchises')
        .select('*')
        .eq('id', franchiseId)
        .single()

      if (franchiseError) throw franchiseError

      // Get staff
      const { data: staffData } = await supabase
        .from('users')
        .select('id, name, email, phone, role, is_active, created_at')
        .eq('franchise_id', franchiseId)
        .order('created_at', { ascending: false })

      // Get products count
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('franchise_id', franchiseId)

      // Get bookings
      const { data: bookingsData, count: bookingCount } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          total_amount,
          status,
          created_at,
          customer:customers(name)
        `, { count: 'exact' })
        .eq('franchise_id', franchiseId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Get total revenue
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid')
        .in('booking_id', bookingsData?.map(b => b.id) || [])

      // Get inventory summary
      const { data: inventoryData } = await supabase
        .from('products')
        .select('category, stock_total, stock_available, stock_booked')
        .eq('franchise_id', franchiseId)

      const inventorySummary = inventoryData?.reduce((acc, product) => {
        const existing = acc.find(item => item.category === product.category)
        if (existing) {
          existing.total_items += product.stock_total
          existing.available_items += product.stock_available
          existing.booked_items += product.stock_booked
        } else {
          acc.push({
            category: product.category,
            total_items: product.stock_total,
            available_items: product.stock_available,
            booked_items: product.stock_booked
          })
        }
        return acc
      }, [] as Array<{
        category: string
        total_items: number
        available_items: number
        booked_items: number
      }>) || []

      const totalRevenue = paymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0

      const recentBookings = bookingsData?.map(booking => ({
        id: booking.id,
        booking_number: booking.booking_number,
        customer_name: booking.customer?.name || 'Unknown',
        total_amount: booking.total_amount,
        status: booking.status,
        created_at: booking.created_at
      })) || []

      setFranchise({
        ...franchiseData,
        staff_count: staffData?.length || 0,
        product_count: productCount || 0,
        booking_count: bookingCount || 0,
        total_revenue: totalRevenue,
        staff: staffData || [],
        recent_bookings: recentBookings,
        inventory_summary: inventorySummary
      })

    } catch (error) {
      console.error('Error loading franchise details:', error)
      toast({
        title: "Error",
        description: "Failed to load franchise details",
        variant: "destructive",
      })
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const staffData = {
        ...newStaff,
        franchise_id: franchiseId,
        is_active: true
      }

      const { error } = await supabase
        .from('users')
        .insert([staffData])

      if (error) throw error

      toast({
        title: "Success",
        description: "Staff member added successfully",
      })

      setIsAddStaffDialogOpen(false)
      setNewStaff({
        name: '',
        email: '',
        phone: '',
        role: 'staff'
      })
      
      await loadFranchiseDetails()
    } catch (error) {
      console.error('Error adding staff:', error)
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive",
      })
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'franchise_admin': return 'bg-blue-100 text-blue-800'
      case 'staff': return 'bg-green-100 text-green-800'
      case 'readonly': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user || !franchise) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole={user.role} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/franchises">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{franchise.name}</h1>
                  <p className="text-gray-600">Franchise Details & Management</p>
                </div>
              </div>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Franchise
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{franchise.total_revenue.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{franchise.booking_count}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{franchise.staff_count}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{franchise.product_count}</div>
                </CardContent>
              </Card>
            </div>

            {/* Franchise Info */}
            <Card>
              <CardHeader>
                <CardTitle>Franchise Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {franchise.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">{franchise.address}</p>
                        </div>
                      </div>
                    )}
                    
                    {franchise.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">{franchise.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {franchise.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{franchise.email}</p>
                        </div>
                      </div>
                    )}
                    
                    {franchise.gst_number && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">GST Number</p>
                          <p className="font-medium">{franchise.gst_number}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for detailed sections */}
            <Tabs defaultValue="staff" className="space-y-4">
              <TabsList>
                <TabsTrigger value="staff">Staff Management</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="staff" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Staff Members</CardTitle>
                      <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Staff
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Staff Member</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleAddStaff} className="space-y-4">
                            <div>
                              <Label htmlFor="name">Name *</Label>
                              <Input
                                id="name"
                                value={newStaff.name}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="email">Email *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={newStaff.email}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="phone">Phone</Label>
                              <Input
                                id="phone"
                                value={newStaff.phone}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="role">Role *</Label>
                              <Select 
                                value={newStaff.role} 
                                onValueChange={(value) => setNewStaff(prev => ({ ...prev, role: value as any }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="franchise_admin">Franchise Admin</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                  <SelectItem value="readonly">Read Only</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setIsAddStaffDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit">Add Staff</Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {franchise.staff.length > 0 ? (
                        franchise.staff.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium">{member.name}</h4>
                                <Badge className={getRoleColor(member.role)}>
                                  {member.role.replace('_', ' ')}
                                </Badge>
                                <Badge className={member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {member.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>{member.email}</p>
                                {member.phone && <p>{member.phone}</p>}
                                <p>Joined: {new Date(member.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No staff members found</p>
                          <Button 
                            className="mt-4" 
                            onClick={() => setIsAddStaffDialogOpen(true)}
                          >
                            Add First Staff Member
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {franchise.inventory_summary.length > 0 ? (
                        franchise.inventory_summary.map((category, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h4 className="font-medium capitalize">{category.category}</h4>
                              <p className="text-sm text-gray-500">
                                {category.available_items} available of {category.total_items} total
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{category.total_items} items</p>
                              <p className="text-sm text-gray-500">{category.booked_items} booked</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No inventory data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bookings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {franchise.recent_bookings.length > 0 ? (
                        franchise.recent_bookings.map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h4 className="font-medium">{booking.booking_number}</h4>
                              <p className="text-sm text-gray-500">{booking.customer_name}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(booking.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">₹{booking.total_amount.toLocaleString()}</p>
                              <Badge className={getStatusColor(booking.status)}>
                                {booking.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No recent bookings</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <h4 className="font-medium">Revenue Trend</h4>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          ₹{franchise.total_revenue.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">Total revenue generated</p>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          <h4 className="font-medium">Team Performance</h4>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{franchise.staff_count}</p>
                        <p className="text-sm text-gray-500">Active staff members</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
