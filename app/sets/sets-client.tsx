"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, MapPin, ArrowLeft, Crown, Palette, Eye, Layers } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRouter, useSearchParams } from "next/navigation"
// Package icon no longer used after removing Packages tab
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


interface PackageVariant {
  id: string
  name: string
  base_price: number
  extra_safa_price?: number
  missing_safa_penalty?: number
  deposit_amount?: number
  inclusions?: string[]
  is_active: boolean
}

interface PackageType {
  id: string
  name: string
  description: string
  base_price: number
  category_id: string
  franchise_id: string
  is_active: boolean
  display_order: number
  security_deposit: number
  extra_safa_price: number
  // Added optional variants collection to align with usage throughout component
  variants?: PackageVariant[]
}

interface Category {
  id: string
  name: string
  packages?: PackageType[]
  package_variants?: PackageVariant[]
  is_active: boolean
}

interface PackagesClientProps {
  user?: any
  initialCategories?: Category[]
  franchises?: any[]
}

export function PackagesClient({ user, initialCategories, franchises }: PackagesClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [packageForm, setPackageForm] = useState({
    name: "",
    description: "",
    base_price: "0.00",
    security_deposit: "0.00",
    extra_safa_price: "0.00",
    franchise_id: "",
  })

  const [variantForm, setVariantForm] = useState({
    name: "",
    extra_price: "0.00",
    extra_safa_price: "0.00",
    missing_safa_penalty: "0.00",
    deposit_amount: "0.00",
    inclusions: "",
  })

  const [dialogs, setDialogs] = useState({
    createCategory: false,
    createPackage: false,
    createVariant: false,
  })

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null)
  const [editingVariant, setEditingVariant] = useState<PackageVariant | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: "" })

  const [isLoading, setIsLoading] = useState(false)
  const [showPackageDialog, setShowPackageDialog] = useState(false)

  const mockCategories: Category[] = [
    {
      id: "1",
      name: "21 Safas Collection",
      is_active: true,
      packages: [
        {
          id: "1-1",
          name: "Royal Wedding 21 Set",
          description: "Complete 21 safa set for royal wedding ceremonies",
          base_price: 25000,
          is_active: true,
          category_id: "1",
          franchise_id: "1",
          variants: [
            {
              id: "1-1-1",
              name: "Silk Banarasi Premium",
              base_price: 35000,
              inclusions: ["21 Silk Safas", "Gold Kalgis", "Premium Jewelry Set", "Storage Box", "Setup Service"],
              is_active: true,
            },
          ],
          display_order: 1,
          security_deposit: 5000,
          extra_safa_price: 1000,
        },
      ],
    },
  ]

  const [categories, setCategories] = useState<Category[]>(initialCategories || mockCategories)

  // Auto-select first category on load
  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0])
    }
  }, [categories, selectedCategory])

  // Initialize franchise_id for non-super-admins on mount
  useEffect(() => {
    if (user?.role !== "super_admin" && user?.franchise_id) {
      console.log("[v0] Initializing default franchise_id:", user.franchise_id)
      setPackageForm((prev) => ({ ...prev, franchise_id: user.franchise_id }))
    }
  }, [user])

  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c == "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  const handleEditCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
    })
    setEditingCategory(category)
    setDialogs((prev) => ({ ...prev, createCategory: true }))
  }

  const handleCreateCategory = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Creating/updating category:", categoryForm)

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from("packages_categories")
          .update({
            name: categoryForm.name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCategory.id)

        if (error) throw error

        console.log("[v0] Category updated successfully in database")
        setEditingCategory(null)
        toast.success("Category updated successfully!")
      } else {
        // Create new category
        console.log("[v0] Attempting to create new category")
        
        // Check auth session before inserting
        const { data: { session } } = await supabase.auth.getSession()
        console.log("[v0] Auth session check:", {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          accessToken: session?.access_token ? 'EXISTS' : 'MISSING'
        })
        
        if (!session) {
          throw new Error("You are not authenticated. Please log out and log back in.")
        }
        
        // Get franchise_id from user
        const franchiseId = user?.franchise_id
        if (!franchiseId && user?.role !== 'super_admin') {
          throw new Error("No franchise associated with your account. Please contact support.")
        }
        
        const { data, error } = await supabase
          .from("packages_categories")
          .insert({
            name: categoryForm.name,
            franchise_id: franchiseId, // 🔒 FRANCHISE ISOLATION
            is_active: true,
            display_order: categories.length + 1,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          console.error("[v0] Database error details:", error)
          if (error.message.includes("row-level security policy")) {
            throw new Error("Permission denied. You may not have the required permissions to create categories.")
          }
          if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
            throw new Error(`A category with the name "${categoryForm.name}" already exists. Please use a different name.`)
          }
          throw error
        }

        console.log("[v0] Category created successfully in database:", data)
        toast.success("Category created successfully!")
      }

      await refetchData()
    } catch (error) {
      console.error("[v0] Error creating/updating category:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save category. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setCategoryForm({ name: "" })
      setDialogs((prev) => ({ ...prev, createCategory: false }))
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("packages_categories").delete().eq("id", categoryId)

      if (error) throw error

      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId))
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(null)
      }
      toast.success("Category deleted successfully!")
    } catch (error) {
      console.error("[v0] Error deleting category:", error)
      toast.error("Failed to delete category. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePackage = async (packageId: string, packageName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      packageId,
      packageName,
    })
  }

  const confirmDeletePackage = async () => {
    if (!deleteConfirmation.packageId) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/packages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: deleteConfirmation.packageId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to delete package')

      await refetchData()
      toast.success("Package deleted successfully!")
    } catch (error) {
      console.error("Error deleting package:", error)
      toast.error("Failed to delete package. Please try again.")
    } finally {
      setIsLoading(false)
      setDeleteConfirmation({ isOpen: false, packageId: null, packageName: "" })
    }
  }

  const handleCreatePackage = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Creating/updating package:", packageForm)
      console.log("[v0] User data:", user)
      console.log("[v0] Franchises available:", franchises)

      // Validate franchise_id
      if (!packageForm.franchise_id || packageForm.franchise_id === "") {
        // Try one more time to set it from user if missing
        if (user?.franchise_id) {
          console.log("[v0] Franchise was empty, setting from user:", user.franchise_id)
          setPackageForm((prev) => ({ ...prev, franchise_id: user.franchise_id }))
          // Wait a bit for state to update
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Check again after attempt to set
        if (!packageForm.franchise_id || packageForm.franchise_id === "") {
          throw new Error("Please select a franchise before creating the package.")
        }
      }

      if (editingPackage) {
        // Update existing package via API
        const res = await fetch('/api/packages/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: editingPackage.id,
            name: packageForm.name,
            description: packageForm.description,
            base_price: Number.parseFloat(packageForm.base_price),
            security_deposit: Number.parseFloat(packageForm.security_deposit),
            extra_safa_price: Number.parseFloat(packageForm.extra_safa_price),
            franchise_id: packageForm.franchise_id,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to update package')

        console.log("[v0] Package updated successfully via API")
        setEditingPackage(null)
        toast.success("Package updated successfully!")
      } else {
        // Create new package via API
        console.log("[v0] Attempting to create new package via API")
        const res = await fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: packageForm.name,
            description: packageForm.description,
            base_price: Number.parseFloat(packageForm.base_price),
            security_deposit: Number.parseFloat(packageForm.security_deposit),
            extra_safa_price: Number.parseFloat(packageForm.extra_safa_price),
            franchise_id: packageForm.franchise_id,
            is_active: true,
            display_order: (selectedCategory?.packages || []).length + 1,
            category_id: selectedCategory?.id,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to create package')

        console.log("[v0] Package created successfully via API:", json?.data)
        toast.success("Package created successfully!")
      }

      await refetchData()
    } catch (error) {
      console.error("[v0] Error creating/updating package:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save package. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setPackageForm({
        name: "",
        description: "",
        base_price: "0.00",
        security_deposit: "0.00",
        extra_safa_price: "0.00",
        franchise_id: "",
      })
      setDialogs((prev) => ({ ...prev, createPackage: false }))
    }
  }

  const handleCreateVariant = async () => {
    try {
      setIsLoading(true)
      
      if (!selectedCategory) {
        toast.error("Please select a category first")
        return
      }

      if (!variantForm.name.trim()) {
        toast.error("Variant name is required")
        return
      }

      const basePrice = Number.parseFloat(variantForm.extra_price)
      if (isNaN(basePrice) || basePrice < 0) {
        toast.error("Please enter a valid base price")
        return
      }

      const extraSafaPrice = Number.parseFloat(variantForm.extra_safa_price)
      const missingSafaPenalty = Number.parseFloat(variantForm.missing_safa_penalty)
      const depositAmount = Number.parseFloat(variantForm.deposit_amount)

      if (isNaN(extraSafaPrice) || extraSafaPrice < 0) {
        toast.error("Please enter a valid extra safa price")
        return
      }

      if (isNaN(missingSafaPenalty) || missingSafaPenalty < 0) {
        toast.error("Please enter a valid missing safa penalty")
        return
      }

      if (isNaN(depositAmount) || depositAmount < 0) {
        toast.error("Please enter a valid deposit amount")
        return
      }

      const inclusions = variantForm.inclusions
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

      const payload: any = {
        name: variantForm.name.trim(),
        base_price: basePrice,
        extra_safa_price: extraSafaPrice,
        missing_safa_penalty: missingSafaPenalty,
        deposit_amount: depositAmount,
        inclusions,
        category_id: selectedCategory.id,
        package_id: selectedCategory.id,
        franchise_id: user?.franchise_id || null,
        is_active: true,
        display_order: ((selectedCategory.package_variants || []).length) + 1,
      }

      if (editingVariant) {
        // Update variant via API
        console.log("[v0] Updating variant via API:", editingVariant.id)
        const res = await fetch('/api/packages/variants', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: editingVariant.id, ...payload }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to update variant')
        console.log("[v0] Variant updated successfully via API")
        toast.success("Variant updated successfully!")
      } else {
        // Create variant via API
        console.log("[v0] Creating variant via API")
        const res = await fetch('/api/packages/variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to create variant')
        console.log("[v0] Variant created successfully via API:", json?.data)
        toast.success("Variant created successfully!")
      }

      await refetchData()
      
      setVariantForm({ name: "", extra_price: "0.00", extra_safa_price: "0.00", missing_safa_penalty: "0.00", deposit_amount: "0.00", inclusions: "" })
      setEditingVariant(null)
      setDialogs((prev) => ({ ...prev, createVariant: false }))
    } catch (error) {
      console.error("[v0] Error creating/updating variant:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save variant. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditVariant = (variant: PackageVariant) => {
    setEditingVariant(variant)
    setVariantForm({
      name: variant.name,
      extra_price: variant.base_price.toString(),
      extra_safa_price: (variant.extra_safa_price || 0).toString(),
      missing_safa_penalty: (variant.missing_safa_penalty || 0).toString(),
      deposit_amount: (variant.deposit_amount || 0).toString(),
      inclusions: variant.inclusions ? variant.inclusions.join(", ") : "",
    })
    setDialogs((prev) => ({ ...prev, createVariant: true }))
  }

  const handleDeleteVariant = async (variantId: string) => {
  const variant = selectedCategory?.package_variants?.find((v: PackageVariant) => v.id === variantId)
    if (!variant) return
    setPendingVariantDelete({ id: variantId, name: variant.name })
    setShowVariantDeleteDialog(true)
  }

  const [showVariantDeleteDialog, setShowVariantDeleteDialog] = useState(false)
  const [pendingVariantDelete, setPendingVariantDelete] = useState<{id:string,name:string}|null>(null)

  const confirmDeleteVariant = async () => {
    if (!pendingVariantDelete) return
    try {
      setIsLoading(true)
      console.log("[v0] Deleting variant via API:", pendingVariantDelete.id)
      const res = await fetch(`/api/packages/variants?id=${pendingVariantDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to delete variant')
      console.log("[v0] Variant deleted successfully via API")
      toast.success('Variant deleted successfully!')
      await refetchData()
    } catch (e: any) {
      console.error("[v0] Error deleting variant:", e)
      toast.error(e.message || 'Failed to delete variant')
    } finally {
      setIsLoading(false)
      setShowVariantDeleteDialog(false)
      setPendingVariantDelete(null)
    }
  }

  const refetchData = async () => {
    try {
      console.log("[v0] Starting refetchData - fetching categories...")
      
      // Fetch categories with franchise filtering (non-super-admin only sees their franchise)
      let categoriesQuery = supabase
        .from("packages_categories")
        .select("*")
      
      // Categories are global — no franchise filter
      const { data: categoriesData, error: categoriesError } = await categoriesQuery.order("display_order")
      if (categoriesError) throw categoriesError

      // Fetch variants by category_id (franchise filter for non-super-admin)
      let variantsQuery = supabase.from("package_variants").select("*")
      if (user?.role !== "super_admin" && user?.franchise_id) {
        variantsQuery = variantsQuery.eq("franchise_id", user.franchise_id)
      }
      const { data: allVariants, error: variantsError } = await variantsQuery.order("display_order")
      if (variantsError) throw variantsError
      
      console.log("[v0] Variants fetched:", allVariants?.length || 0, "variants")
      console.log("[v0] Sample variant data:", allVariants?.[0])

      const categoriesWithVariants = (categoriesData || []).map((category:any) => {
        const variants = (allVariants || []).filter((v:any) => v.category_id === category.id)
        console.log(`[v0] Category "${category.name}" has ${variants.length} matching variants`)
        return { ...category, package_variants: variants }
      })

      setCategories(categoriesWithVariants)

      if (selectedCategory) {
        const updatedCategory = categoriesWithVariants.find((c:any) => c.id === selectedCategory.id)
        if (updatedCategory) {
          setSelectedCategory(updatedCategory)
        } else if (categoriesWithVariants.length > 0) {
          setSelectedCategory(categoriesWithVariants[0])
        } else {
          setSelectedCategory(null)
        }
      } else if (categoriesWithVariants.length > 0) {
        setSelectedCategory(categoriesWithVariants[0])
      }
    } catch (error) {
      console.error("[v0] Error refetching data:", error)
      toast.error("Failed to refresh data")
    }
  }

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    packageId: string | null
    packageName: string
  }>({
    isOpen: false,
    packageId: null,
    packageName: "",
  })

  useEffect(() => {
    console.log("[v0] Component mounted, fetching real data from Supabase...")
    refetchData()
  }, [])

  return (
    <div className="heritage-container p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="border-brown-300 text-brown-700 hover:bg-brown-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="heritage-header flex-1">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-heritage-dark" />
            <div>
              <h1 className="vintage-title text-3xl font-bold">Safawala Package Management</h1>
              <p className="vintage-subtitle text-sm opacity-80">
                Category-based package system
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-heritage-dark">{categories.length}</div>
            <div className="text-brown-600">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-heritage-dark">
              {categories.reduce((acc, cat) => acc + (cat.package_variants || []).length, 0)}
            </div>
            <div className="text-brown-600">Variants</div>
          </div>
          
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Categories List (Master Pane) */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex justify-between items-center bg-cream-50/50 p-4 rounded-xl border border-brown-100">
            <div>
              <h2 className="vintage-heading text-lg font-bold text-heritage-dark">Safa Categories</h2>
              <p className="text-[11px] text-brown-500">{categories.length} categories active</p>
            </div>
            <Dialog
              open={dialogs.createCategory}
              onOpenChange={(open) => {
                setDialogs((prev) => ({ ...prev, createCategory: open }))
                if (!open) {
                  setEditingCategory(null)
                  setCategoryForm({ name: "" })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="btn-heritage-dark px-3 py-1.5 h-auto text-xs" disabled={isLoading}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="heritage-container">
                <DialogHeader>
                  <DialogTitle className="vintage-heading">
                    {editingCategory ? "Edit Category" : "Create New Category"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      className="input-heritage mt-1"
                      placeholder="e.g., 21 Safas"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateCategory}
                  className="btn-heritage-dark w-full mt-4"
                  disabled={!categoryForm.name.trim() || isLoading}
                >
                  {isLoading ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
            {categories.map((category) => {
              const isSelected = selectedCategory?.id === category.id;
              const variantCount = (category.package_variants || category.packages || []).length;
              return (
                <div
                  key={category.id}
                  onClick={() => setSelectedCategory(category)}
                  className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] ${
                    isSelected
                      ? "bg-gradient-to-r from-cream-100 to-cream-50 border-gold shadow-md"
                      : "bg-white border-brown-100 hover:border-brown-300 hover:bg-cream-50/20"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold rounded-l-xl" />
                  )}
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${
                      isSelected ? "bg-gold/25" : "bg-brown-50 group-hover:bg-brown-100"
                    }`}>
                      <Crown className={`w-5 h-5 ${isSelected ? "text-brown-800" : "text-heritage-dark"}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-brown-900 vintage-heading">{category.name}</h4>
                      <p className="text-[11px] text-brown-500 mt-0.5">{variantCount} variants</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCategory(category);
                      }}
                      disabled={isLoading}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category.id);
                      }}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Pane: Variants List */}
        <div className="md:col-span-8 space-y-4">
          {!selectedCategory ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-brown-200 rounded-2xl bg-cream-50/10 min-h-[400px]">
              <Palette className="w-16 h-16 text-brown-300 mb-4 stroke-1 animate-pulse" />
              <h3 className="vintage-heading text-lg font-semibold text-brown-800 mb-1">Select a Category</h3>
              <p className="text-sm text-brown-500 max-w-sm">
                Choose one of the safa categories from the sidebar to view, add, or edit its variants.
              </p>
            </div>
          ) : (
            <div className="bg-cream-50/20 p-6 rounded-2xl border border-brown-100 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-brown-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-gold/10 text-brown-800 border-gold/30 text-xs">Active Category</Badge>
                  </div>
                  <h3 className="vintage-heading text-2xl font-bold text-heritage-dark mt-1">{selectedCategory.name}</h3>
                  <p className="text-xs text-brown-600">
                    {(selectedCategory.package_variants || []).length} variants configured
                  </p>
                </div>
                <Button
                  onClick={() => setDialogs((prev) => ({ ...prev, createVariant: true }))}
                  className="bg-heritage-dark hover:bg-heritage-dark/90 text-white shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Variant
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(selectedCategory.package_variants || []).map((variant: any) => (
                  <Card key={variant.id} className="card-heritage hover:shadow-md transition-all duration-300 border border-brown-100 hover:border-gold/40 flex flex-col h-full bg-white hover:-translate-y-0.5">
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-base font-bold vintage-heading text-heritage-dark tracking-wide line-clamp-1">{variant.name}</h4>
                          <Badge className="bg-gold text-brown-800 font-bold text-xs px-2.5 py-0.5 border border-gold shadow-sm shrink-0">₹{variant.base_price?.toLocaleString() || "0"}</Badge>
                        </div>
                        <p className="text-xs text-brown-600 mt-2 line-clamp-2 min-h-[32px]">{variant.description || "No description provided."}</p>
                        
                        <div className="grid grid-cols-2 gap-2 mt-4 p-2.5 bg-brown-50/40 rounded-lg text-[11px] border border-brown-100/50">
                          <div>
                            <span className="text-brown-500">Extra Safa: </span>
                            <span className="font-semibold text-brown-800">₹{variant.extra_safa_price || 0}</span>
                          </div>
                          <div>
                            <span className="text-brown-500">Security Dep: </span>
                            <span className="font-semibold text-brown-800">₹{variant.deposit_amount || 0}</span>
                          </div>
                          <div className="col-span-2 mt-1 pt-1 border-t border-brown-100/30">
                            <span className="text-brown-500">Missing Safa Penalty: </span>
                            <span className="font-semibold text-brown-800">₹{variant.missing_safa_penalty || 0}</span>
                          </div>
                        </div>

                        {Array.isArray(variant.inclusions) && variant.inclusions.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-brown-100/30">
                            <h5 className="text-[11px] font-bold text-brown-700 mb-2 uppercase tracking-wider">✨ Inclusions</h5>
                            <div className="flex flex-wrap gap-1.5">
                              {variant.inclusions.map((inc: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-[10px] bg-cream-50/50 text-brown-800 border-brown-200 px-2 py-0.5 shadow-sm">
                                  {inc}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-4 mt-4 border-t border-brown-100/30 flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50/50 bg-blue-50/10 px-3 text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform"
                          onClick={() => handleEditVariant(variant)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-red-200 text-red-700 hover:bg-red-50/50 bg-red-50/10 px-3 text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform"
                          onClick={() => handleDeleteVariant(variant.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {(selectedCategory.package_variants || []).length === 0 && (
                  <div className="col-span-2 text-center py-12 border border-dashed border-brown-100 rounded-xl bg-white">
                    <Palette className="w-10 h-10 mx-auto text-brown-300 mb-2 stroke-1 animate-pulse" />
                    <p className="text-sm font-medium text-brown-600">No variants in this category yet</p>
                    <p className="text-xs text-brown-400 mt-1">Click the Add Variant button to get started.</p>
                  </div>
                )}
              </div>

              {/* Add/Edit Variant Dialog */}
              <Dialog
                open={dialogs.createVariant}
                onOpenChange={(open) => {
                  setDialogs((prev) => ({ ...prev, createVariant: open }))
                  if (!open) {
                    setEditingVariant(null)
                    setVariantForm({ name: "", extra_price: "0.00", extra_safa_price: "0.00", missing_safa_penalty: "0.00", deposit_amount: "0.00", inclusions: "" })
                  }
                }}
              >
                <DialogContent className="sm:max-w-md heritage-container">
                  <DialogHeader>
                    <DialogTitle className="vintage-heading text-heritage-dark">
                      {editingVariant ? "Edit Variant" : "Create New Variant"}
                    </DialogTitle>
                    <DialogDescription className="text-brown-600">
                      {selectedCategory ? `Category: ${selectedCategory.name}` : "Select a category first"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <Label htmlFor="variant-name" className="text-brown-700 font-semibold">Variant Name</Label>
                      <Input
                        id="variant-name"
                        placeholder="E.g. Premium Collection"
                        className="input-heritage mt-1"
                        value={variantForm.name}
                        onChange={(e) => setVariantForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="variant-price" className="text-brown-700 font-semibold">Base Price (₹)</Label>
                      <Input
                        id="variant-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Base price for this variant"
                        className="input-heritage mt-1"
                        value={variantForm.extra_price}
                        onChange={(e) => setVariantForm((prev) => ({ ...prev, extra_price: e.target.value }))}
                      />
                      <p className="text-[10px] text-brown-500 mt-1">This is the base price for the variant.</p>
                    </div>
                    <div>
                      <Label htmlFor="variant-inclusions" className="text-brown-700 font-semibold">Inclusions (comma-separated)</Label>
                      <Textarea
                        id="variant-inclusions"
                        placeholder="E.g. Safa, Kalgi, Necklace, Earrings"
                        className="input-heritage mt-1"
                        value={variantForm.inclusions}
                        onChange={(e) => setVariantForm((prev) => ({ ...prev, inclusions: e.target.value }))}
                      />
                      <p className="text-[10px] text-brown-500 mt-1">Separate each inclusion with a comma</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="extra-safa-price" className="text-brown-700 font-semibold">Extra Safa Price (₹)</Label>
                        <Input
                          id="extra-safa-price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price per extra safa"
                          className="input-heritage mt-1"
                          value={variantForm.extra_safa_price}
                          onChange={(e) => setVariantForm((prev) => ({ ...prev, extra_safa_price: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="missing-safa-penalty" className="text-brown-700 font-semibold">Missing Safa Penalty (₹)</Label>
                        <Input
                          id="missing-safa-penalty"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Penalty for missing safas"
                          className="input-heritage mt-1"
                          value={variantForm.missing_safa_penalty}
                          onChange={(e) => setVariantForm((prev) => ({ ...prev, missing_safa_penalty: e.target.value }))}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="deposit-amount" className="text-brown-700 font-semibold">Security Deposit (₹)</Label>
                        <Input
                          id="deposit-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Deposit amount for this package"
                          className="input-heritage mt-1"
                          value={variantForm.deposit_amount}
                          onChange={(e) => setVariantForm((prev) => ({ ...prev, deposit_amount: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setDialogs((prev) => ({ ...prev, createVariant: false }))}>
                      Cancel
                    </Button>
                    <Button className="btn-heritage-dark" onClick={handleCreateVariant}>
                      {editingVariant ? "Update Variant" : "Create Variant"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <Crown className="w-16 h-16 mx-auto text-brown-400 mb-4" />
          <h3 className="vintage-heading text-xl mb-2">No categories found</h3>
          <p className="text-brown-600 mb-4">Create your first safa category to get started</p>
          <Button
            className="btn-heritage-dark"
            onClick={() => setDialogs((prev) => ({ ...prev, createCategory: true }))}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Category
          </Button>
        </div>
      )}

      <Dialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => !open && setDeleteConfirmation({ isOpen: false, packageId: null, packageName: "" })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <p className="text-sm text-brown-600">
              Are you sure you want to delete "{deleteConfirmation.packageName}"? This action cannot be undone.
            </p>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation({ isOpen: false, packageId: null, packageName: "" })}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeletePackage} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete Package"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={showVariantDeleteDialog}
        title="Delete Variant"
        description={pendingVariantDelete ? `Delete variant "${pendingVariantDelete.name}"? This cannot be undone.` : ''}
        destructive
        confirmLabel="Delete"
        onConfirm={confirmDeleteVariant}
        onCancel={()=>{ setShowVariantDeleteDialog(false); setPendingVariantDelete(null) }}
      />
    </div>
  )
}

export default PackagesClient
