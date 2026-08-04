"use client"

import { useState, useEffect } from 'react'
import '@/styles/select-overrides.css'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Plus, Search, MoreHorizontal, Edit, Trash2, UserCheck, UserX, Mail, Phone, Eye, EyeOff, Shield, Settings } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { UserPermissions } from '@/lib/types'

interface User {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'franchise_admin' | 'staff' | 'readonly'
  franchise_id: string
  is_active: boolean
  permissions?: UserPermissions
  created_at: string
  franchise?: {
    name: string
    code: string
  }
}

interface Franchise {
  id: string
  name: string
  code: string
}

interface NewUserData {
  name: string
  email: string
  password: string
  role: 'super_admin' | 'franchise_admin' | 'staff' | 'readonly'
  franchise_id: string
  permissions: UserPermissions
}

// Default permissions based on role
const getDefaultPermissions = (role: 'super_admin' | 'franchise_admin' | 'staff' | 'readonly'): UserPermissions => {
  switch (role) {
    case 'super_admin':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: true,
        vendors: true,
        quotes: true,
        invoices: true,
        invoice_payment_access: true,
        laundry: true,
        expenses: true,
        deliveries: true,
        productArchive: true,
        payroll: true,
        attendance: true,
        reports: true,
        financials: true,
        franchises: true,
        staff: true,
        integrations: true,
        settings: true
      }
    case 'franchise_admin':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: true,
        vendors: true,
        quotes: true,
        invoices: true,
        invoice_payment_access: true,
        laundry: true,
        expenses: true,
        deliveries: true,
        productArchive: true,
        payroll: true,
        attendance: true,
        reports: true,
        financials: true,
        franchises: false, // Only super_admin
        staff: true,
        integrations: false, // Only super_admin
        settings: true
      }
    case 'staff':
      return {
        dashboard: true,
        bookings: true,
        customers: true,
        inventory: true,
        packages: false,
        vendors: false,
        quotes: true,
        invoices: true,
        invoice_payment_access: false,
        laundry: true,
        expenses: false,
        deliveries: true,
        productArchive: false,
        payroll: false,
        attendance: true,
        reports: false,
        financials: false,
        franchises: false, // Only super_admin
        staff: false,
        integrations: false, // Only super_admin
        settings: false
      }
    default: // readonly
      return {
        dashboard: true,
        bookings: false,
        customers: true,
        inventory: false,
        packages: false,
        vendors: false,
        quotes: false,
        invoices: false,
        invoice_payment_access: false,
        laundry: false,
        expenses: false,
        deliveries: false,
        productArchive: false,
        payroll: false,
        attendance: true,
        reports: true,
        financials: false,
        franchises: false, // Only super_admin
        staff: false,
        integrations: false, // Only super_admin
        settings: false
      }
  }
}

// Permission categories for better organization
const permissionCategories = {
  main: {
    title: 'Main Navigation',
    permissions: ['dashboard', 'bookings', 'customers', 'inventory', 'packages', 'vendors']
  },
  business: {
    title: 'Business Operations',
    permissions: ['quotes', 'invoices', 'laundry', 'expenses', 'deliveries', 'productArchive', 'payroll', 'attendance']
  },
  analytics: {
    title: 'Analytics & Reports',
    permissions: ['reports', 'financials']
  },
  admin: {
    title: 'Administration',
    permissions: ['franchises', 'staff', 'integrations', 'settings']
  }
}

// Permission labels
const permissionLabels: Record<keyof UserPermissions, string> = {
  dashboard: 'Dashboard',
  bookings: 'Bookings',
  customers: 'Customers',
  inventory: 'Inventory',
  packages: 'Packages',
  vendors: 'Vendors',
  quotes: 'Quotes',
  invoices: 'Invoices',
  invoice_payment_access: 'Invoice Payment & Discounts',
  laundry: 'Laundry',
  expenses: 'Expenses',
  deliveries: 'Deliveries & Returns',
  productArchive: 'Product Archive',
  payroll: 'Payroll',
  attendance: 'Attendance',
  reports: 'Reports',
  financials: 'Financials',
  franchises: 'Franchises',
  staff: 'Staff',
  integrations: 'Integrations',
  settings: 'Settings'
}

// Get visible categories based on current user role
const getVisibleCategories = (currentUserRole: string) => {
  const baseCategories = {
    main: {
      title: 'Main Navigation',
      permissions: ['dashboard', 'bookings', 'customers', 'inventory', 'packages', 'vendors']
    },
    business: {
      title: 'Business Operations',
      permissions: ['quotes', 'invoices', 'invoice_payment_access', 'laundry', 'expenses', 'deliveries', 'productArchive', 'payroll', 'attendance']
    },
    analytics: {
      title: 'Analytics & Reports',
      permissions: ['reports', 'financials']
    },
    admin: {
      title: 'Administration',
      permissions: currentUserRole === 'super_admin' 
        ? ['franchises', 'staff', 'integrations', 'settings']
        : ['staff', 'settings'] // Hide franchises & integrations from non-super-admins
    }
  }
  return baseCategories
}

// Role labels for display
const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  franchise_admin: 'Franchise Admin',
  staff: 'Staff',
  readonly: 'Read Only'
}

// Password handling is now done securely in the API

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([])
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newUserLoading, setNewUserLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [totalUsers, setTotalUsers] = useState(0)
  
  // Current logged-in user
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const isSuperAdmin = currentUser?.role === 'super_admin'

  const [newUserData, setNewUserData] = useState<NewUserData>({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    franchise_id: '',
    permissions: getDefaultPermissions('staff')
  })

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
    fetchFranchises()
  }, [])

  // Sync franchise_id when selectedUser changes (for edit dialog)
  useEffect(() => {
    if (selectedUser && showEditDialog) {
      setNewUserData(prev => ({
        ...prev,
        franchise_id: selectedUser.franchise_id || ''
      }))
    }
  }, [selectedUser, showEditDialog])

  // Set default franchise_id for non-super-admins
  useEffect(() => {
    if (currentUser && !isSuperAdmin && currentUser.franchise_id) {
      setNewUserData(prev => ({
        ...prev,
        franchise_id: currentUser.franchise_id
      }))
    }
  }, [currentUser, isSuperAdmin])

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/user')
      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data)
      }
    } catch {
      return
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/staff')
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      
      const { staff } = await response.json()
      setUsers(staff || [])
    } catch (error) {
      toast.error('Failed to load staff members')
    } finally {
      setLoading(false)
    }
  }

  const fetchFranchises = async () => {
    try {
      const response = await fetch('/api/franchises')
      
      if (!response.ok) {
        throw new Error('Failed to fetch franchises')
      }

      const result = await response.json()
      const data = result.data || []

      setFranchises(data.map((f: any) => ({
        id: f.id,
        name: f.name,
        code: f.code
      })))
    } catch (error) {
      setFranchises([])
      if (isSuperAdmin) {
        toast.error('Unable to load franchises. Please refresh and try again.')
      }
    }
  }

  // Get available roles based on current user's role
  const getAvailableRoles = (): Array<'super_admin' | 'franchise_admin' | 'staff' | 'readonly'> => {
    if (isSuperAdmin) {
      // Super admin can create any role
      return ['super_admin', 'franchise_admin', 'staff', 'readonly']
    } else {
      // Franchise admin can only create franchise_admin, staff, and readonly (NOT super_admin)
      return ['franchise_admin', 'staff', 'readonly']
    }
  }

  const handleInputChange = (field: keyof Omit<NewUserData, 'permissions'>, value: string) => {
    setNewUserData(prev => {
      const updated = {
        ...prev,
        [field]: value
      }
      
      // Update permissions when role changes
      if (field === 'role') {
        updated.permissions = getDefaultPermissions(value as 'super_admin' | 'franchise_admin' | 'staff' | 'readonly')
      }
      
      return updated
    })
  }

  const handlePermissionChange = (permission: keyof UserPermissions, checked: boolean) => {
    setNewUserData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: checked
      }
    }))
  }

  const handleSelectAllPermissions = (category: string, checked: boolean) => {
    const visibleCategories = getVisibleCategories(currentUser?.role || 'staff')
    const categoryPermissions = visibleCategories[category as keyof typeof visibleCategories].permissions
    setNewUserData(prev => {
      const updatedPermissions = { ...prev.permissions }
      categoryPermissions.forEach(permission => {
        updatedPermissions[permission as keyof UserPermissions] = checked
      })
      return {
        ...prev,
        permissions: updatedPermissions
      }
    })
  }

  const handleAddUser = async () => {
    if (!newUserData.name || !newUserData.email || !newUserData.password || !newUserData.franchise_id) {
      toast.error('Please fill in all required fields')
      return
    }

    if (newUserData.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setNewUserLoading(true)
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newUserData.name,
          email: newUserData.email,
          password: newUserData.password,
          role: newUserData.role,
          franchise_id: newUserData.franchise_id,
          permissions: newUserData.permissions,
          is_active: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add staff member')
      }

      const { user } = await response.json()

      setShowAddDialog(false)
      setNewUserData({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        franchise_id: '',
        permissions: getDefaultPermissions('staff')
      })
      toast.success('Staff member added successfully!')
      fetchUsers()
    } catch (error: any) {
      if (error.message.includes('Email already exists')) {
        toast.error('Email already exists. Please use a different email.')
      } else {
        toast.error(error.message || 'Failed to add staff member')
      }
    } finally {
      setNewUserLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser || !newUserData.name || !newUserData.email || !newUserData.franchise_id) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate password if provided
    if (newUserData.password && newUserData.password.length > 0 && newUserData.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setNewUserLoading(true)
    try {
      const updateData: any = {
        name: newUserData.name,
        email: newUserData.email,
        role: newUserData.role,
        franchise_id: newUserData.franchise_id,
        permissions: newUserData.permissions
      }

      // Only include password if provided and not empty
      if (newUserData.password && newUserData.password.trim().length > 0) {
        updateData.password = newUserData.password
      }

      let response = await fetch(`/api/staff/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        // If dynamic route returns HTML/404, fallback to stable endpoint
        let shouldFallback = false
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json') || response.status === 404) {
          shouldFallback = true
          await response.text().catch(() => '')
        }

        if (shouldFallback) {
          response = await fetch('/api/staff/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id: selectedUser.id, ...updateData })
          })
        }

        if (!response.ok) {
          const ct = response.headers.get('content-type')
          if (ct && ct.includes('application/json')) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to update staff member')
          } else {
            await response.text().catch(() => '')
            throw new Error('Server error: Invalid response format. Please refresh and try again.')
          }
        }
      }

      const { user } = await response.json()

      setShowEditDialog(false)
      setSelectedUser(null)
      setNewUserData({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        franchise_id: '',
        permissions: getDefaultPermissions('staff')
      })
      toast.success('Staff member updated successfully!')
      fetchUsers()
    } catch (error: any) {
      if (error.message.includes('Email already in use')) {
        toast.error('Email already exists. Please use a different email.')
      } else {
        toast.error(error.message || 'Failed to update staff member')
      }
    } finally {
      setNewUserLoading(false)
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      const dynamicUrl = `/api/staff/${user.id}/toggle-status`
      let response = await fetch(dynamicUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      // If dynamic route fails (404 or HTML), fallback to stable route
      if (!response.ok) {
        let shouldFallback = false
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          // Likely an HTML 404 page
          shouldFallback = true
          await response.text()
        } else if (response.status === 404) {
          shouldFallback = true
        }

        if (shouldFallback) {
          response = await fetch('/api/staff/toggle-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id: user.id })
          })
        }
      }

      if (!response.ok) {
        // If still not OK, try to parse JSON, otherwise show message
        const contentType2 = response.headers.get('content-type')
        if (contentType2 && contentType2.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update staff status')
        } else {
          await response.text().catch(() => '')
          throw new Error('Server error: Invalid response format. Please refresh and try again.')
        }
      }

      const result = await response.json()
      const updatedUser = result.user

      setUsers(prev => prev.map(u => (u.id === user.id ? updatedUser : u)))
      toast.success(`Staff member ${user.is_active ? 'deactivated' : 'activated'} successfully!`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update staff member status')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      let response = await fetch(`/api/staff/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      if (!response.ok) {
        // If response is HTML (e.g., 404 page), fallback to stable endpoint
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json') || response.status === 404) {
          await response.text().catch(() => '')
          // Fallback to stable endpoint
          response = await fetch('/api/staff/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id: selectedUser.id })
          })
        }
      }

      if (!response.ok) {
        const ct = response.headers.get('content-type')
        if (ct && ct.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete staff member')
        } else {
          await response.text().catch(() => '')
          throw new Error('Server error: Invalid response format. Please refresh and try again.')
        }
      }

      setUsers(prev => prev.filter(user => user.id !== selectedUser.id))
      setShowDeleteDialog(false)
      setSelectedUser(null)
      toast.success('Staff member deleted successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete staff member')
    }
  }

  const openEditDialog = (user: User) => {
    // Super Admin can edit anyone
    if (currentUser?.role === 'super_admin') {
      // Allow edit
    }
    // Franchise Admin can edit their own franchise's staff (but not themselves)
    else if (currentUser?.role === 'franchise_admin' && currentUser?.franchise_id === user.franchise_id && currentUser?.id !== user.id) {
      // Allow edit
    }
    // Everyone else: deny
    else {
      if (currentUser?.id === user.id) {
        toast.error('You cannot edit your own profile. Contact super admin or your franchise admin.')
      } else {
        toast.error('You do not have permission to edit this staff member.')
      }
      return
    }
    
    setSelectedUser(user)
    setNewUserData({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password for security
      role: user.role,
      franchise_id: user.franchise_id || '', // Ensure franchise_id is set
      permissions: user.permissions || getDefaultPermissions(user.role)
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setShowDeleteDialog(true)
  }

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Pagination calculations
  const totalFilteredUsers = filteredUsers.length
  const totalPages = Math.ceil(totalFilteredUsers / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter])

  // Calculate stats
  const totalUsersCount = users.length
  const activeUsers = users.filter(user => user.is_active).length
  const superAdminUsers = users.filter(user => user.role === 'super_admin').length
  const franchiseAdminUsers = users.filter(user => user.role === 'franchise_admin').length
  const staffUsers = users.filter(user => user.role === 'staff').length
  const readonlyUsers = users.filter(user => user.role === 'readonly').length

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive'
      case 'franchise_admin': return 'default'
      case 'staff': return 'secondary'
      case 'readonly': return 'outline'
      default: return 'outline'
    }
  }

  const countActivePermissions = (permissions?: UserPermissions) => {
    if (!permissions) return 0
    return Object.values(permissions).filter(Boolean).length
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading staff members...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-muted-foreground">Manage your team members, roles, and permissions</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Create a new staff member account with custom permissions
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="permissions">Permissions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={newUserData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={newUserData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Enter password (min 8 characters)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="staff-management-select">
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={newUserData.role}
                        onValueChange={(value: 'super_admin' | 'franchise_admin' | 'staff' | 'readonly') => 
                          handleInputChange('role', value)
                        }
                      >
                        <SelectTrigger className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px] max-h-[300px] overflow-auto">
                          {getAvailableRoles().map((role) => (
                            <SelectItem key={role} value={role} className="pl-8 pr-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-900">
                              {roleLabels[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="staff-management-select">
                      <Label htmlFor="franchise">Franchise *</Label>
                      <Select
                        value={newUserData.franchise_id}
                        onValueChange={(value) => handleInputChange('franchise_id', value)}
                        disabled={!isSuperAdmin} // Franchise admins can't change franchise
                      >
                        <SelectTrigger className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                          <SelectValue placeholder="Select franchise">
                            {newUserData.franchise_id && franchises.length > 0 ? (
                              <>
                                {franchises.find(f => f.id === newUserData.franchise_id)?.name || 'Select franchise'}
                                {franchises.find(f => f.id === newUserData.franchise_id)?.code && 
                                  ` (${franchises.find(f => f.id === newUserData.franchise_id)?.code})`
                                }
                              </>
                            ) : (
                              isSuperAdmin ? "Select franchise" : (currentUser?.franchise?.name || "Your Franchise")
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-white border border-gray-200 rounded-md shadow-lg min-w-[250px] max-h-[300px] overflow-auto">
                          {franchises.length === 0 ? (
                            <SelectItem value="no-franchises" disabled className="pl-8 pr-3 py-2 text-gray-500">
                              No franchises available
                            </SelectItem>
                          ) : (
                            franchises.map((franchise) => (
                              <SelectItem key={franchise.id} value={franchise.id} className="pl-8 pr-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-900">
                                {franchise.name} ({franchise.code})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="permissions" className="space-y-6">
                  <div className="text-sm text-muted-foreground">
                    Select which sections this staff member can access. Default permissions are set based on their role.
                  </div>
                  
                  {Object.entries(getVisibleCategories(currentUser?.role || 'staff')).map(([categoryKey, category]) => (
                    <Card key={categoryKey}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{category.title}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`select-all-${categoryKey}`}
                              checked={category.permissions.every(p => 
                                newUserData.permissions[p as keyof UserPermissions]
                              )}
                              onCheckedChange={(checked) => 
                                handleSelectAllPermissions(categoryKey, checked as boolean)
                              }
                            />
                            <Label htmlFor={`select-all-${categoryKey}`} className="text-sm">
                              Select All
                            </Label>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {category.permissions.map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox
                                id={permission}
                                checked={newUserData.permissions[permission as keyof UserPermissions]}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(permission as keyof UserPermissions, checked as boolean)
                                }
                              />
                              <Label htmlFor={permission} className="text-sm">
                                {permissionLabels[permission as keyof UserPermissions]}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false)
                    setNewUserData({
                      name: '',
                      email: '',
                      password: '',
                      role: 'staff',
                      franchise_id: '',
                      permissions: getDefaultPermissions('staff')
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={newUserLoading}
                >
                  {newUserLoading ? 'Adding...' : 'Add Staff Member'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsersCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
              <Badge variant="destructive" className="h-4 w-4 p-0"></Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{superAdminUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Franchise Admins</CardTitle>
              <Badge variant="default" className="h-4 w-4 p-0"></Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{franchiseAdminUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff</CardTitle>
              <Badge variant="secondary" className="h-4 w-4 p-0"></Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staffUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Read Only</CardTitle>
              <Badge variant="outline" className="h-4 w-4 p-0"></Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{readonlyUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Members</CardTitle>
            <CardDescription>
              Manage your team members, their roles, and access permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg max-h-60 overflow-y-auto">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="franchise_admin">Franchise Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="readonly">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Staff List */}
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No staff members found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm || roleFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Get started by adding your first staff member.'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Pagination Info */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <p>
                      Showing {startIndex + 1} to {Math.min(endIndex, totalFilteredUsers)} of {totalFilteredUsers} staff members
                    </p>
                    <p>
                      Page {currentPage} of {totalPages}
                    </p>
                  </div>

                  {paginatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {roleLabels[user.role]}
                          </Badge>
                          {!user.is_active && (
                            <Badge variant="outline" className="text-red-600 border-red-200">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          {user.franchise && (
                            <div className="text-xs text-muted-foreground">
                              {user.franchise.name}
                            </div>
                          )}
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            <span>{countActivePermissions(user.permissions)} permissions</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem 
                          onClick={() => openEditDialog(user)}
                          disabled={
                            // Super admin can edit everyone
                            currentUser?.role === 'super_admin' ? false :
                            // Franchise admin can edit their own franchise's staff (except themselves)
                            currentUser?.role === 'franchise_admin' && currentUser?.franchise_id === user.franchise_id && currentUser?.id !== user.id ? false :
                            // Everyone else: disabled
                            true
                          }
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                          {user.is_active ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(user)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
                }

                {/* Pagination Controls */}
                {filteredUsers.length > 0 && (
                  <div className="mt-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">
                              Showing {startIndex + 1} to {Math.min(endIndex, totalFilteredUsers)} of{" "}
                              {totalFilteredUsers} staff members
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
                  </div>
                )}
              </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update staff member information and permissions
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_name">Full Name *</Label>
                    <Input
                      id="edit_name"
                      value={newUserData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_email">Email Address *</Label>
                    <Input
                      id="edit_email"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit_password">New Password (optional)</Label>
                  <div className="relative">
                    <Input
                      id="edit_password"
                      type={showEditPassword ? "text" : "password"}
                      value={newUserData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Leave blank to keep current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                    >
                      {showEditPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank to keep current password. If changing, must be at least 8 characters.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="staff-management-select">
                    <Label htmlFor="edit_role">Role *</Label>
                    <Select
                      value={newUserData.role}
                      onValueChange={(value: 'super_admin' | 'franchise_admin' | 'staff' | 'readonly') => 
                        handleInputChange('role', value)
                      }
                    >
                      <SelectTrigger className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px] max-h-[300px] overflow-auto">
                        {getAvailableRoles().map((role) => (
                          <SelectItem key={role} value={role} className="pl-8 pr-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-900">
                            {roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="staff-management-select">
                    <Label htmlFor="edit_franchise">Franchise *</Label>
                    <Select
                      value={newUserData.franchise_id}
                      onValueChange={(value) => handleInputChange('franchise_id', value)}
                      disabled={!isSuperAdmin} // Franchise admins can't change franchise
                    >
                      <SelectTrigger className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                        <SelectValue placeholder="Select franchise">
                          {newUserData.franchise_id && franchises.length > 0 ? (
                            <>
                              {franchises.find(f => f.id === newUserData.franchise_id)?.name || 'Select franchise'}
                              {franchises.find(f => f.id === newUserData.franchise_id)?.code && 
                                ` (${franchises.find(f => f.id === newUserData.franchise_id)?.code})`
                              }
                            </>
                          ) : (
                            isSuperAdmin ? "Select franchise" : (currentUser?.franchise?.name || "Your Franchise")
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white border border-gray-200 rounded-md shadow-lg min-w-[250px] max-h-[300px] overflow-auto">
                        {franchises.length === 0 ? (
                          <SelectItem value="no-franchises" disabled className="pl-8 pr-3 py-2 text-gray-500">
                            No franchises available
                          </SelectItem>
                        ) : (
                          franchises.map((franchise) => (
                            <SelectItem key={franchise.id} value={franchise.id} className="pl-8 pr-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-900">
                              {franchise.name} ({franchise.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="permissions" className="space-y-6">
                <div className="text-sm text-muted-foreground">
                  Customize which sections this staff member can access.
                </div>
                
                {Object.entries(getVisibleCategories(currentUser?.role || 'staff')).map(([categoryKey, category]) => (
                  <Card key={categoryKey}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{category.title}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-select-all-${categoryKey}`}
                            checked={category.permissions.every(p => 
                              newUserData.permissions[p as keyof UserPermissions]
                            )}
                            onCheckedChange={(checked) => 
                              handleSelectAllPermissions(categoryKey, checked as boolean)
                            }
                          />
                          <Label htmlFor={`edit-select-all-${categoryKey}`} className="text-sm">
                            Select All
                          </Label>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {category.permissions.map((permission) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${permission}`}
                              checked={newUserData.permissions[permission as keyof UserPermissions]}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(permission as keyof UserPermissions, checked as boolean)
                              }
                            />
                            <Label htmlFor={`edit-${permission}`} className="text-sm">
                              {permissionLabels[permission as keyof UserPermissions]}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false)
                  setNewUserData({
                    name: '',
                    email: '',
                    password: '',
                    role: 'staff',
                    franchise_id: '',
                    permissions: getDefaultPermissions('staff')
                  })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditUser}
                disabled={newUserLoading}
              >
                {newUserLoading ? 'Updating...' : 'Update Staff Member'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the staff member
                {selectedUser && ` "${selectedUser.name}"`} and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
