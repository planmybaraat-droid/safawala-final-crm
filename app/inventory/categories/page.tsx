'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, MoreHorizontal, ArrowLeft, Tag, Layers, Package, FolderTree } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface Category {
  id: string
  name: string
  description?: string
  parent_id?: string
  is_active: boolean
  product_count: number
  created_at: string
}

interface SubCategory {
  id: string
  name: string
  description?: string
  parent_id: string
  is_active: boolean
  product_count: number
  created_at: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<SubCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
    is_active: true
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      // Fetch current user to enforce franchise isolation
      const userRes = await fetch('/api/auth/user')
      if (!userRes.ok) throw new Error('Failed to fetch user')
      const user = await userRes.json()
      const isSuperAdmin = user?.role === 'super_admin'
      const franchiseId = user?.franchise_id
      
      // Fetch categories with product counts
      let categoriesQuery = supabase
        .from('product_categories')
        .select('*')
        .is('parent_id', null)
        .order('name')
      
      // Apply franchise isolation for non-super-admins
      if (!isSuperAdmin && franchiseId) {
        categoriesQuery = categoriesQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`)
      }
      
      const { data: categoriesData, error: categoriesError } = await categoriesQuery

      if (categoriesError) throw categoriesError

      // Get product counts separately for main categories
      const categoryCounts = await Promise.all(
        (categoriesData || []).map(async (category: any) => {
          let countQuery = supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)

          if (!isSuperAdmin && franchiseId) {
            countQuery = countQuery.eq('franchise_id', franchiseId)
          }

          const { count } = await countQuery
          
          return {
            ...category,
            product_count: count || 0
          }
        })
      )

      // Fetch subcategories
      let subCategoriesQuery = supabase
        .from('product_categories')
        .select('*')
        .not('parent_id', 'is', null)
        .order('name')
      
      // Apply franchise isolation for non-super-admins
      if (!isSuperAdmin && franchiseId) {
        subCategoriesQuery = subCategoriesQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`)
      }
      
      const { data: subCategoriesData, error: subCategoriesError } = await subCategoriesQuery

      if (subCategoriesError) throw subCategoriesError

      // Get product counts separately for subcategories
      const subCategoryCounts = await Promise.all(
        (subCategoriesData || []).map(async (category: any) => {
          let countQuery = supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)

          if (!isSuperAdmin && franchiseId) {
            countQuery = countQuery.eq('franchise_id', franchiseId)
          }

          const { count } = await countQuery
          
          return {
            ...category,
            product_count: count || 0
          }
        })
      )

      setCategories(categoryCounts)
      setSubCategories(subCategoryCounts)

    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    try {
      // Get current user for franchise_id
      const userRes = await fetch('/api/auth/user')
      if (!userRes.ok) throw new Error('Failed to fetch user')
      const user = await userRes.json()
      const isSuperAdmin = user?.role === 'super_admin'
      const franchiseId = user?.franchise_id

      const { error } = await supabase
        .from('product_categories')
        .insert([{
          name: formData.name,
          description: formData.description,
          parent_id: formData.parent_id || null,
          is_active: formData.is_active,
          // Set franchise_id for non-super-admins, null for super_admin (global categories)
          franchise_id: !isSuperAdmin && franchiseId ? franchiseId : null
        }])

      if (error) throw error

      toast.success('Category added successfully')
      setIsAddDialogOpen(false)
      setFormData({ name: '', description: '', parent_id: '', is_active: true })
      fetchCategories()
    } catch (error) {
      console.error('Error adding category:', error)
      toast.error('Failed to add category')
    }
  }

  const handleEditCategory = async () => {
    if (!selectedCategory) return

    try {
      // Get current user for franchise validation
      const userRes = await fetch('/api/auth/user')
      if (!userRes.ok) throw new Error('Failed to fetch user')
      const user = await userRes.json()
      const isSuperAdmin = user?.role === 'super_admin'
      const franchiseId = user?.franchise_id

      // Build update query with franchise isolation
      let updateQuery = supabase
        .from('product_categories')
        .update({
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active
        })
        .eq('id', selectedCategory.id)
      
      // Non-super-admins can only update their own franchise categories or global categories
      if (!isSuperAdmin && franchiseId) {
        updateQuery = updateQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`)
      }

      const { error } = await updateQuery

      if (error) throw error

      toast.success('Category updated successfully')
      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      setFormData({ name: '', description: '', parent_id: '', is_active: true })
      fetchCategories()
    } catch (error) {
      console.error('Error updating category:', error)
      toast.error('Failed to update category')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    showConfirmation({
      title: 'Delete category?',
      description: 'Are you sure you want to delete this category? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          // Get current user for franchise validation
          const userRes = await fetch('/api/auth/user')
          if (!userRes.ok) throw new Error('Failed to fetch user')
          const user = await userRes.json()
          const isSuperAdmin = user?.role === 'super_admin'
          const franchiseId = user?.franchise_id

          // Build delete query with franchise isolation
          let deleteQuery = supabase
            .from('product_categories')
            .delete()
            .eq('id', id)
          
          // Non-super-admins can only delete their own franchise categories
          if (!isSuperAdmin && franchiseId) {
            deleteQuery = deleteQuery.eq('franchise_id', franchiseId)
          }

          const { error } = await deleteQuery

          if (error) throw error

          toast.success('Category deleted successfully')
          fetchCategories()
        } catch (error) {
          console.error('Error deleting category:', error)
          toast.error('Failed to delete category')
          // Re-throw so the dialog can show error state if it wants
          throw error
        }
      }
    })
  }

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || '',
      is_active: category.is_active
    })
    setIsEditDialogOpen(true)
  }

  const totalCategories = categories.length
  const totalSubCategories = subCategories.length
  const activeCategories = categories.filter(c => c.is_active).length
  // Fix: Don't double-count! Products belong to ONE category_id (could be main or sub)
  // Count all unique products across all categories (main + sub)
  const allCategories = [...categories, ...subCategories]
  const totalProducts = allCategories.reduce((sum, c) => sum + c.product_count, 0)

  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog()

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Skeleton Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-9 w-36 bg-[#f6e1c3]/50 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-7 w-56 bg-[#f6e1c3]/60 rounded animate-pulse" />
                <div className="h-4 w-72 bg-[#f6e1c3]/40 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Skeleton Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="card-heritage p-4 animate-pulse">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-24 bg-[#f6e1c3]/50 rounded" />
                    <div className="h-8 w-8 bg-[#f6e1c3]/40 rounded-lg" />
                  </div>
                  <div className="h-7 w-12 bg-[#f6e1c3]/60 rounded" />
                  <div className="h-3 w-20 bg-[#f6e1c3]/30 rounded" />
                </div>
              </Card>
            ))}
          </div>

          {/* Skeleton Table */}
          <Card className="card-heritage">
            <div className="p-6 space-y-4">
              <div className="h-6 w-40 bg-[#f6e1c3]/50 rounded animate-pulse" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="h-5 flex-1 bg-[#f6e1c3]/40 rounded" />
                    <div className="h-5 w-32 bg-[#f6e1c3]/30 rounded" />
                    <div className="h-5 w-20 bg-[#f6e1c3]/30 rounded" />
                    <div className="h-5 w-16 bg-[#f6e1c3]/30 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Heritage Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/inventory">
              <Button
                variant="outline"
                size="sm"
                className="border-[#102516]/15 text-[#102516] hover:bg-[#f9f2e8] hover:border-[#102516]/30 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1
                className="text-3xl font-bold tracking-tight text-[#102516]"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                Category Management
              </h1>
              <p className="text-[#102516]/60 text-sm" style={{ fontFamily: "var(--font-crimson), serif" }}>
                Organize your products with categories and subcategories
              </p>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-[#102516] to-[#1a3a26] text-[#fefaf6] hover:shadow-lg hover:translate-y-[-1px] transition-all duration-300"
                style={{ fontFamily: "var(--font-cinzel), serif", letterSpacing: "0.5px" }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="border-[#102516]/10">
              <DialogHeader>
                <DialogTitle
                  className="text-[#102516]"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  Add New Category
                </DialogTitle>
                <DialogDescription style={{ fontFamily: "var(--font-crimson), serif" }}>
                  Create a new category or subcategory for your products.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" style={{ fontFamily: "var(--font-crimson), serif" }}>Category Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter category name"
                    className="border-[#102516]/15 focus:border-[#102516]/40"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description" style={{ fontFamily: "var(--font-crimson), serif" }}>Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter category description"
                    className="border-[#102516]/15 focus:border-[#102516]/40"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="parent" style={{ fontFamily: "var(--font-crimson), serif" }}>Parent Category (Optional)</Label>
                  <select
                    id="parent"
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-[#102516]/15 bg-[#fefaf6] px-3 py-2 text-sm ring-offset-background focus:border-[#102516]/40"
                  >
                    <option value="">None (Main Category)</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="border-[#102516]/15 text-[#102516]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCategory}
                  className="bg-gradient-to-r from-[#102516] to-[#1a3a26] text-[#fefaf6]"
                >
                  Add Category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Heritage divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#102516]/20 to-transparent" />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden border-[#102516]/8 bg-gradient-to-br from-[#fcf7f0] to-[#f9f2e8] hover:translate-y-[-2px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#102516]/30 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-[#102516]/60 uppercase tracking-wider" style={{ fontFamily: "var(--font-crimson), serif" }}>
                Main Categories
              </CardTitle>
              <div className="w-9 h-9 rounded-lg bg-[#102516]/8 flex items-center justify-center">
                <Tag className="h-4 w-4 text-[#102516]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#102516]">{totalCategories}</div>
              <p className="text-[10px] text-[#102516]/50" style={{ fontFamily: "var(--font-crimson), serif" }}>
                Primary categories
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-[#102516]/8 bg-gradient-to-br from-[#fcf7f0] to-[#f9f2e8] hover:translate-y-[-2px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#102516]/30 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-[#102516]/60 uppercase tracking-wider" style={{ fontFamily: "var(--font-crimson), serif" }}>
                Subcategories
              </CardTitle>
              <div className="w-9 h-9 rounded-lg bg-[#102516]/8 flex items-center justify-center">
                <FolderTree className="h-4 w-4 text-[#102516]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#102516]">{totalSubCategories}</div>
              <p className="text-[10px] text-[#102516]/50" style={{ fontFamily: "var(--font-crimson), serif" }}>
                Secondary categories
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-[#102516]/8 bg-gradient-to-br from-emerald-50/60 to-[#fcf7f0] hover:translate-y-[-2px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-[#102516]/60 uppercase tracking-wider" style={{ fontFamily: "var(--font-crimson), serif" }}>
                Active Categories
              </CardTitle>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Layers className="h-4 w-4 text-emerald-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">{activeCategories}</div>
              <p className="text-[10px] text-[#102516]/50" style={{ fontFamily: "var(--font-crimson), serif" }}>
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-[#102516]/8 bg-gradient-to-br from-[#f6e1c3]/30 to-[#fcf7f0] hover:translate-y-[-2px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#102516]/30 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-[#102516]/60 uppercase tracking-wider" style={{ fontFamily: "var(--font-crimson), serif" }}>
                Total Products
              </CardTitle>
              <div className="w-9 h-9 rounded-lg bg-[#f6e1c3] flex items-center justify-center">
                <Package className="h-4 w-4 text-[#102516]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#102516]">{totalProducts}</div>
              <p className="text-[10px] text-[#102516]/50" style={{ fontFamily: "var(--font-crimson), serif" }}>
                Across all categories
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Categories Table */}
        <Card className="card-heritage overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#102516] to-[#1a3a26] text-[#fefaf6] rounded-t-xl">
            <CardTitle style={{ fontFamily: "var(--font-playfair), serif" }} className="text-[#fefaf6]">
              Main Categories
            </CardTitle>
            <CardDescription className="text-[#fefaf6]/60" style={{ fontFamily: "var(--font-crimson), serif" }}>
              Primary product categories for your inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f9f2e8]/50 border-b border-[#102516]/8">
                    <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Category Name</TableHead>
                    <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Description</TableHead>
                    <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Products</TableHead>
                    <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Status</TableHead>
                    <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="space-y-3">
                          <div className="w-14 h-14 mx-auto rounded-xl bg-[#102516]/5 flex items-center justify-center">
                            <Tag className="h-7 w-7 text-[#102516]/25" />
                          </div>
                          <p className="text-[#102516]/50" style={{ fontFamily: "var(--font-crimson), serif" }}>
                            No categories found
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow
                        key={category.id}
                        className="border-b border-[#102516]/5 hover:bg-[#f9f2e8]/30 transition-colors"
                      >
                        <TableCell>
                          <div
                            className="font-semibold text-[#102516]"
                            style={{ fontFamily: "var(--font-crimson), serif" }}
                          >
                            {category.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-[#102516]/50" style={{ fontFamily: "var(--font-crimson), serif" }}>
                            {category.description || 'No description'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-[#f6e1c3]/30 border-[#f6e1c3] text-[#102516]/70 text-xs"
                          >
                            {category.product_count} products
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              category.is_active
                                ? 'bg-emerald-50 border-emerald-200/60 text-emerald-700 text-xs'
                                : 'bg-gray-50 border-gray-200 text-gray-500 text-xs'
                            }
                          >
                            {category.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-[#102516]/5"
                              >
                                <MoreHorizontal className="h-4 w-4 text-[#102516]/60" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(category)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteCategory(category.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Subcategories */}
        {subCategories.length > 0 && (
          <Card className="card-heritage overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#1a3a26] to-[#102516] text-[#fefaf6] rounded-t-xl">
              <CardTitle style={{ fontFamily: "var(--font-playfair), serif" }} className="text-[#fefaf6]">
                Subcategories
              </CardTitle>
              <CardDescription className="text-[#fefaf6]/60" style={{ fontFamily: "var(--font-crimson), serif" }}>
                Secondary categories organized under main categories
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-b-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f9f2e8]/50 border-b border-[#102516]/8">
                      <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Subcategory Name</TableHead>
                      <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Parent Category</TableHead>
                      <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Description</TableHead>
                      <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Products</TableHead>
                      <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Status</TableHead>
                      <TableHead className="text-[#102516]/70 font-semibold" style={{ fontFamily: "var(--font-crimson), serif" }}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subCategories.map((subCategory) => {
                      const parentCategory = categories.find(c => c.id === subCategory.parent_id)
                      return (
                        <TableRow
                          key={subCategory.id}
                          className="border-b border-[#102516]/5 hover:bg-[#f9f2e8]/30 transition-colors"
                        >
                          <TableCell>
                            <div className="font-semibold text-[#102516]" style={{ fontFamily: "var(--font-crimson), serif" }}>
                              {subCategory.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-[#102516]/5 border-[#102516]/10 text-[#102516]/70 text-xs"
                            >
                              {parentCategory?.name || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-[#102516]/50" style={{ fontFamily: "var(--font-crimson), serif" }}>
                              {subCategory.description || 'No description'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-[#f6e1c3]/30 border-[#f6e1c3] text-[#102516]/70 text-xs"
                            >
                              {subCategory.product_count} products
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                subCategory.is_active
                                  ? 'bg-emerald-50 border-emerald-200/60 text-emerald-700 text-xs'
                                  : 'bg-gray-50 border-gray-200 text-gray-500 text-xs'
                              }
                            >
                              {subCategory.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#102516]/5">
                                  <MoreHorizontal className="h-4 w-4 text-[#102516]/60" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(subCategory as Category)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteCategory(subCategory.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="border-[#102516]/10">
            <DialogHeader>
              <DialogTitle
                className="text-[#102516]"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                Edit Category
              </DialogTitle>
              <DialogDescription style={{ fontFamily: "var(--font-crimson), serif" }}>
                Update the category information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" style={{ fontFamily: "var(--font-crimson), serif" }}>Category Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter category name"
                  className="border-[#102516]/15 focus:border-[#102516]/40"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description" style={{ fontFamily: "var(--font-crimson), serif" }}>Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter category description"
                  className="border-[#102516]/15 focus:border-[#102516]/40"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-[#102516]/30 text-[#102516] focus:ring-[#102516]/20"
                />
                <Label htmlFor="edit-active" style={{ fontFamily: "var(--font-crimson), serif" }}>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-[#102516]/15 text-[#102516]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditCategory}
                className="bg-gradient-to-r from-[#102516] to-[#1a3a26] text-[#fefaf6]"
              >
                Update Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Global confirmation dialog (used for deletions) */}
        <ConfirmationDialog />
      </div>
    </DashboardLayout>
  )
}
