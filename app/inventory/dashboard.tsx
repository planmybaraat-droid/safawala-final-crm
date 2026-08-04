'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Package, Plus, Search, RefreshCw, AlertTriangle, CheckCircle,
  BarChart3, IndianRupee, ArrowUpDown, Boxes, Download, Upload,
  BookOpen, Trash2, Edit2, Check, X, ShieldAlert
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProductCard } from '@/components/inventory/product-card'
import { ProductEditorModal } from '@/components/inventory/product-editor-modal'
import { BarcodePrintDialog } from '@/components/inventory/barcode-print-dialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface User {
  id: string
  email: string
  role: string
  franchise_id: string
  franchise_name?: string | null
  franchise_code?: string | null
}

interface Product {
  id: string
  name: string
  description?: string
  size?: string
  color?: string
  material?: string
  category_id?: string
  subcategory_id?: string
  category_name?: string
  category?: string
  subcategory?: string
  price: number
  regular_price?: number
  rental_price: number
  cost_price: number
  security_deposit: number
  stock_total: number
  stock_available: number
  stock_booked: number
  stock_damaged: number
  stock_in_laundry: number
  reorder_level: number
  barcode?: string
  image_url?: string
  franchise_id?: string
  is_active: boolean
  _variation_count?: number
  created_at?: string
  updated_at?: string
  product_code?: string
}

function useAnimatedCount(target: number, duration: number = 600) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) { setCount(0); return }
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

function SkeletonCard() {
  return (
    <div className="card-heritage rounded-xl overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gradient-to-br from-[#f9f2e8] to-[#f6e1c3]/40" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#f6e1c3]/60 rounded w-3/4" />
        <div className="h-3 bg-[#f6e1c3]/40 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 bg-[#f6e1c3]/50 rounded-full w-16" />
          <div className="h-5 bg-[#f6e1c3]/50 rounded-full w-12" />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title, value, icon: Icon, color, subtext, prefix = ""
}: {
  title: string
  value: number
  icon: React.ElementType
  color: string
  subtext: string
  prefix?: string
}) {
  const animatedValue = useAnimatedCount(value)
  const colorMap: Record<string, { bg: string; icon: string; text: string; glow: string }> = {
    default: {
      bg: "from-[#fcf7f0] to-[#f9f2e8]",
      icon: "text-[#102516] bg-[#102516]/8",
      text: "text-[#102516]",
      glow: "shadow-[0_8px_25px_rgba(16,37,22,0.08)]",
    },
    green: {
      bg: "from-emerald-50/80 to-[#fcf7f0]",
      icon: "text-emerald-700 bg-emerald-100",
      text: "text-emerald-700",
      glow: "shadow-[0_8px_25px_rgba(16,185,129,0.1)]",
    },
    amber: {
      bg: "from-amber-50/80 to-[#fcf7f0]",
      icon: "text-amber-700 bg-amber-100",
      text: "text-amber-700",
      glow: "shadow-[0_8px_25px_rgba(245,158,11,0.1)]",
    },
    red: {
      bg: "from-red-50/80 to-[#fcf7f0]",
      icon: "text-red-700 bg-red-100",
      text: "text-red-700",
      glow: "shadow-[0_8px_25px_rgba(239,68,68,0.1)]",
    },
    royal: {
      bg: "from-[#f6e1c3]/40 to-[#fcf7f0]",
      icon: "text-[#102516] bg-[#f6e1c3]",
      text: "text-[#102516]",
      glow: "shadow-[0_8px_25px_rgba(16,37,22,0.12)]",
    },
  }
  const c = colorMap[color] || colorMap.default

  return (
    <Card className={`relative overflow-hidden border border-[#102516]/8 bg-gradient-to-br ${c.bg} ${c.glow} hover:translate-y-[-2px] hover:shadow-lg transition-all duration-300 group`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#102516]/30 to-transparent" />
      <div className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#102516]/60 uppercase tracking-wider">{title}</p>
          <p className={`text-2xl font-bold ${c.text} tracking-tight`}>
            {prefix}{animatedValue.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#102516]/50">{subtext}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  )
}

export default function InventoryDashboard() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string; parent_id?: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters persist in localStorage across refreshes until the user resets them
  const FILTERS_STORAGE_KEY = "inventory-filters"
  const [searchTerm, setSearchTerm] = useState("")
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"created_desc" | "stock_desc" | "stock_asc" | "name_asc" | "name_desc" | "price_asc" | "price_desc">("created_desc")
  const [filtersLoaded, setFiltersLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FILTERS_STORAGE_KEY) || "null")
      if (saved) {
        if (typeof saved.searchTerm === "string") setSearchTerm(saved.searchTerm)
        if (saved.stockFilter) setStockFilter(saved.stockFilter)
        if (saved.categoryFilter) setCategoryFilter(saved.categoryFilter)
        if (saved.sortBy) setSortBy(saved.sortBy)
      }
    } catch {}
    // URL param wins over saved filters — lets dashboard cards deep-link straight into a filter,
    // e.g. the "Low Stock Alert" card links to /inventory?stock=low_stock
    const stockParam = searchParams.get('stock')
    if (stockParam === 'low_stock' || stockParam === 'out_of_stock' || stockParam === 'in_stock') {
      setStockFilter(stockParam)
    }
    setFiltersLoaded(true)
  }, [])

  useEffect(() => {
    if (!filtersLoaded) return
    try {
      localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ searchTerm, stockFilter, categoryFilter, sortBy })
      )
    } catch {}
  }, [filtersLoaded, searchTerm, stockFilter, categoryFilter, sortBy])

  const handleResetFilters = () => {
    setSearchTerm("")
    setStockFilter("all")
    setCategoryFilter("all")
    setSortBy("created_desc")
    try { localStorage.removeItem(FILTERS_STORAGE_KEY) } catch {}
  }
  
  const [user, setUser] = useState<User | null>(null)
  const [resolvedFranchiseId, setResolvedFranchiseId] = useState<string | undefined>(undefined)

  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false)
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null)

  // ── Modals & Drawer States ──
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false)
  const [bulkEditorOpen, setBulkEditorOpen] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [catEditingId, setCatEditingId] = useState<string | null>(null)
  const [catEditingName, setCatEditingName] = useState("")
  
  // Editable spreadsheet state for bulk updates
  const [bulkProducts, setBulkProducts] = useState<Product[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)

  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog()

  const normalizeProduct = (p: any): Product => ({
    id: p.id,
    name: p.name || "Unnamed Product",
    description: p.description || "",
    size: p.size || "",
    color: p.color || "",
    material: p.material || "",
    price: typeof p.price === "number" ? p.price : typeof p.sale_price === "number" ? p.sale_price : 0,
    regular_price: typeof p.regular_price === "number" ? p.regular_price : typeof p.price === "number" ? p.price : 0,
    rental_price: typeof p.rental_price === "number" ? p.rental_price : 0,
    cost_price: typeof p.cost_price === "number" ? p.cost_price : 0,
    security_deposit: typeof p.security_deposit === "number" ? p.security_deposit : 0,
    stock_total: typeof p.stock_total === "number" ? p.stock_total : typeof p.stock_available === "number" ? p.stock_available : 0,
    stock_available: typeof p.stock_available === "number" ? p.stock_available : 0,
    stock_booked: typeof p.stock_booked === "number" ? p.stock_booked : 0,
    stock_damaged: typeof p.stock_damaged === "number" ? p.stock_damaged : 0,
    stock_in_laundry: typeof p.stock_in_laundry === "number" ? p.stock_in_laundry : 0,
    reorder_level: typeof p.reorder_level === "number" ? p.reorder_level : 0,
    barcode: p.barcode || p.barcode_number || undefined,
    image_url: p.image_url || undefined,
    franchise_id: p.franchise_id || undefined,
    category_id: p.category_id || undefined,
    subcategory_id: p.subcategory_id || undefined,
    category_name: p.category_name || undefined,
    category: p.category || undefined,
    subcategory: p.subcategory || undefined,
    is_active: p.is_active !== false,
    product_code: p.product_code || p.id?.slice(0, 8) || "CUST",
    created_at: p.created_at || "",
    updated_at: p.updated_at || p.created_at || "",
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    const handleWindowFocus = () => {
      if (typeof document === "undefined") return
      if (document.visibilityState === "visible" && !editorOpen) {
        fetchProducts({ background: true })
      }
    }

    window.addEventListener("focus", handleWindowFocus)
    document.addEventListener("visibilitychange", handleWindowFocus)

    return () => {
      window.removeEventListener("focus", handleWindowFocus)
      document.removeEventListener("visibilitychange", handleWindowFocus)
    }
  }, [editorOpen])

  const fetchProducts = async (options?: { background?: boolean }) => {
    const isBackgroundRefresh = options?.background === true
    try {
      if (!isBackgroundRefresh) {
        setLoading(true)
      }
      const userRes = await fetch("/api/auth/user")
      if (!userRes.ok) throw new Error("Failed to fetch user")
      const currentUser: User = await userRes.json()
      setUser(currentUser)

      if (currentUser.franchise_id) {
        setResolvedFranchiseId(currentUser.franchise_id)
      } else {
        const { data: franchises } = await supabase
          .from("franchises")
          .select("id")
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
        if (franchises && franchises.length > 0) {
          setResolvedFranchiseId(franchises[0].id)
        }
      }

      await fetchCategoriesList(currentUser)

      const prodRes = await fetch(
        `/api/products?limit=3000&active_only=true${currentUser.franchise_id ? `&franchise_id=${encodeURIComponent(currentUser.franchise_id)}` : ""}`,
        { cache: "no-store" }
      )
      const prodJson = prodRes.ok ? await prodRes.json() : { data: [] }
      const activeData = (prodJson.data || []).filter((p: any) => p.is_active !== false)
      const normalized = activeData.map(normalizeProduct)

      try {
        const productIds = normalized.map((p: any) => p.id)
        if (productIds.length > 0) {
          const { data: varCounts } = await supabase
            .from("product_variations")
            .select("product_id")
            .in("product_id", productIds)
            .eq("is_active", true)

          if (varCounts) {
            const countMap: Record<string, number> = {}
            for (const row of varCounts) {
              countMap[row.product_id] = (countMap[row.product_id] || 0) + 1
            }
            for (const p of normalized) {
              ;(p as any)._variation_count = countMap[p.id] || 0
            }
          }
        }
      } catch (varErr) {
        console.debug("Could not fetch variation counts:", varErr)
      }

      setProducts(normalized)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Failed to load products")
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false)
      }
    }
  }

  const fetchCategoriesList = async (currentUser?: User | null) => {
    try {
      let categoriesQuery = supabase
        .from("product_categories")
        .select("id, name, parent_id")
        .eq("is_active", true)

      if (currentUser?.role !== "super_admin" && currentUser?.franchise_id) {
        categoriesQuery = categoriesQuery.eq("franchise_id", currentUser.franchise_id)
      }

      const { data: catData, error: catError } = await categoriesQuery.order("name", { ascending: true })

      if (!catError && catData) {
        setCategories(catData)
      }
    } catch (err) {
      console.error("Categories fetch error:", err)
    }
  }

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const cat of categories) {
      map[cat.id] = cat.name
    }
    return map
  }, [categories])

  const categoryParentMap = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const cat of categories) {
      map[cat.id] = cat.parent_id ?? null
    }
    return map
  }, [categories])

  const categoryOptions = useMemo(() => {
    return categories
      .map((cat) => {
        const parentId = categoryParentMap[cat.id]
        const parentName = parentId ? categoryNameMap[parentId] : null
        return {
          ...cat,
          label: parentName ? `${parentName} / ${cat.name}` : cat.name,
          depth: parentId ? 1 : 0,
        }
      })
      .sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth
        return a.label.localeCompare(b.label)
      })
  }, [categories, categoryNameMap, categoryParentMap])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchProducts()
    setRefreshing(false)
    toast.success("Inventory refreshed")
  }

  const handleExportCSV = () => {
    window.open("/api/inventory/export-csv", "_blank")
  }

  const handleCreateCatalog = () => {
    const selectedCat = categories.find((c: any) => c.id === categoryFilter)
    const catName = selectedCat?.name || "All Products"
    const url = `/api/catalog?category_id=${categoryFilter}&category_name=${encodeURIComponent(catName)}`
    window.open(url, "_blank")
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const text = await file.text()
    const lines = text.split("\n").filter(Boolean)
    if (lines.length < 2) { toast.error("CSV is empty"); return }

    const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim())
    const rows = lines.slice(1).map(line => {
      const values: string[] = []
      let cur = "", inQ = false
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ }
        else if (ch === "," && !inQ) { values.push(cur.trim()); cur = "" }
        else { cur += ch }
      }
      values.push(cur.trim())
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = (values[i] || "").replace(/^"|"$/g, "") })
      return obj
    })

    toast.loading(`Importing ${rows.length} products...`, { id: "import" })
    try {
      const res = await fetch("/api/inventory/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      toast.success(`Done! Created: ${result.created}, Updated: ${result.updated}`, { id: "import" })
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message || "Import failed", { id: "import" })
    }
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setEditorOpen(true)
  }

  const handleDeleteProduct = (productId: string, productName: string) => {
    showConfirmation({
      title: "Delete Product",
      description: `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("products").update({ is_active: false }).eq("id", productId)
          if (error) throw error
          toast.success("Product deleted")
          fetchProducts()
        } catch (error) {
          console.error("Delete error:", error)
          toast.error("Failed to delete product")
        }
      },
    })
  }

  const handleSaveProduct = async (data: any) => {
    const { images, variants, _variation_count, category_name, product_code, ...productData } = data
    let productId = selectedProduct?.id
    const isExistingProduct = Boolean(productId)
    const activeFranchiseId = resolvedFranchiseId || user?.franchise_id || null

    if (productId) {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productData, images }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Update failed (${res.status})`)
      }
    } else {
      const res = await fetch("/api/products/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productData, images, franchiseId: activeFranchiseId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Create failed (${res.status})`)
      }
      const result = await res.json()
      productId = result.id
    }

    if (variants && variants.length > 0 && productId) {
      if (!activeFranchiseId) {
        throw new Error("Franchise context is required before saving product variations")
      }

      for (const variant of variants) {
        if (variant.id) continue
        let imageUrl = variant.image_url

        if (imageUrl && imageUrl.startsWith("data:")) {
          try {
            const base64Data = imageUrl.split(",")[1]
            const buffer = Buffer.from(base64Data, "base64")
            const safeVariationName = (variant.variation_name || "variant").replace(/\s+/g, "_")
            const storagePath = `variants/${activeFranchiseId}/${productId}/${Date.now()}-${safeVariationName}.png`

            await supabase.storage.from("product-images").upload(storagePath, buffer, { upsert: false, contentType: "image/png" })
            const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(storagePath)
            imageUrl = urlData.publicUrl
          } catch (imgError) {
            imageUrl = null
          }
        }

        await fetch(`/api/products/${productId}/variations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variation_name: variant.variation_name,
            color: variant.color,
            design: variant.design,
            material: variant.material,
            size: variant.size,
            sku: variant.sku,
            price_adjustment: variant.price_adjustment || 0,
            rental_price_adjustment: variant.rental_price_adjustment || 0,
            stock_total: variant.stock_total || 0,
            stock_available: variant.stock_available || 0,
            image_url: imageUrl,
          }),
        })
      }
    }

    if (isExistingProduct && productId) {
      // Keep the current grid and scroll position intact after an edit. Replacing the
      // page with the global loading state here caused the browser to jump to the top.
      setProducts((currentProducts) =>
        currentProducts.map((product) => {
          if (product.id !== productId) return product

          const updatedProduct = normalizeProduct({
            ...product,
            ...productData,
            id: productId,
            image_url: images?.find((image: any) => image.is_main)?.url ?? productData.image_url ?? product.image_url,
            updated_at: new Date().toISOString(),
          })

          ;(updatedProduct as any)._variation_count = variants?.length ?? (product as any)._variation_count
          return updatedProduct
        })
      )
    } else {
      // New products still need a full fetch so server-generated fields are included.
      await fetchProducts()
    }
  }

  // ── Category Actions ──
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    try {
      const activeFranchiseId = resolvedFranchiseId || user?.franchise_id || null
      const payload: Record<string, any> = {
        name: newCatName.trim(),
        is_active: true,
      }

      if (user?.role !== "super_admin") {
        if (!activeFranchiseId) {
          throw new Error("Franchise context is required to create a category")
        }
        payload.franchise_id = activeFranchiseId
      }

      const { error } = await supabase
        .from("product_categories")
        .insert([payload])

      if (error) throw error
      toast.success("Category added successfully")
      setNewCatName("")
      fetchCategoriesList()
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message || "Failed to add category")
    }
  }

  const handleUpdateCategory = async (id: string) => {
    if (!catEditingName.trim()) return
    try {
      let query = supabase
        .from("product_categories")
        .update({ name: catEditingName.trim() })
        .eq("id", id)

      if (user?.role !== "super_admin" && user?.franchise_id) {
        query = query.eq("franchise_id", user.franchise_id)
      }

      const { error } = await query

      if (error) throw error
      toast.success("Category updated")
      setCatEditingId(null)
      fetchCategoriesList()
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message || "Failed to update category")
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    showConfirmation({
      title: "Delete Category",
      description: `Delete category "${name}"? Products in this category will become uncategorized.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        try {
          let query = supabase
            .from("product_categories")
            .update({ is_active: false })
            .eq("id", id)

          if (user?.role !== "super_admin" && user?.franchise_id) {
            query = query.eq("franchise_id", user.franchise_id)
          }

          const { error } = await query

          if (error) throw error
          toast.success("Category deleted")
          fetchCategoriesList()
          fetchProducts()
        } catch (err: any) {
          toast.error(err.message || "Failed to delete category")
        }
      }
    })
  }

  // ── Bulk Editor Actions ──
  const handleOpenBulkEditor = () => {
    // Clone visible products for batch editing
    setBulkProducts(JSON.parse(JSON.stringify(filteredProducts)))
    setBulkEditorOpen(true)
  }

  const handleBulkCellChange = (productId: string, field: keyof Product, val: any) => {
    setBulkProducts(prev => prev.map(p => {
      if (p.id !== productId) return p
      const updated = { ...p, [field]: val }
      // Keep stock_available in sync with stock_total if available exceeds total
      if (field === 'stock_total' && updated.stock_available > val) {
        updated.stock_available = val
      }
      return updated
    }))
  }

  const handleSaveBulkChanges = async () => {
    setBulkSaving(true)
    toast.loading("Saving bulk updates...", { id: "bulk-save" })
    try {
      // Find modified products by comparing against current local products
      const updates = bulkProducts.filter(bp => {
        const orig = products.find(p => p.id === bp.id)
        if (!orig) return false
        return bp.name !== orig.name ||
               bp.price !== orig.price ||
               bp.rental_price !== orig.rental_price ||
               bp.stock_total !== orig.stock_total ||
               bp.stock_available !== orig.stock_available ||
               bp.reorder_level !== orig.reorder_level
      })

      if (updates.length === 0) {
        toast.dismiss("bulk-save")
        setBulkEditorOpen(false)
        return
      }

      await Promise.all(updates.map(p => 
        fetch(`/api/products/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: p.name,
            price: Number(p.price) || 0,
            regular_price: Number(p.price) || 0,
            rental_price: Number(p.rental_price) || 0,
            stock_total: Number(p.stock_total) || 0,
            stock_available: Number(p.stock_available) || 0,
            reorder_level: Number(p.reorder_level) || 0,
          })
        })
      ))

      toast.success(`Successfully updated ${updates.length} products!`, { id: "bulk-save" })
      setBulkEditorOpen(false)
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message || "Failed to save bulk changes", { id: "bulk-save" })
    } finally {
      setBulkSaving(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const selectedCategory = categories.find((cat) => cat.id === categoryFilter)
    const selectedCategoryName = selectedCategory?.name?.trim().toLowerCase()

    let filtered = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))

      if (!matchesSearch) return false

      if (categoryFilter !== "all") {
        const productCategoryId = product.category_id?.trim()
        const productSubcategoryId = product.subcategory_id?.trim()
        const productCategoryName = product.category_name?.trim().toLowerCase()
        const legacyCategoryName = product.category?.trim().toLowerCase()
        const legacySubcategoryName = product.subcategory?.trim().toLowerCase()
        const productCategoryParentId = productCategoryId ? categoryParentMap[productCategoryId] : null
        const productSubcategoryParentId = productSubcategoryId ? categoryParentMap[productSubcategoryId] : null
        const matchesCategory =
          productCategoryId === categoryFilter ||
          productSubcategoryId === categoryFilter ||
          productCategoryParentId === categoryFilter ||
          productSubcategoryParentId === categoryFilter ||
          (!!selectedCategoryName && (
            productCategoryName === selectedCategoryName ||
            legacyCategoryName === selectedCategoryName ||
            legacySubcategoryName === selectedCategoryName
          ))

        if (!matchesCategory) return false
      }

      if (stockFilter !== "all") {
        if (stockFilter === "in_stock" && product.stock_available <= product.reorder_level) return false
        if (stockFilter === "low_stock" && (product.stock_available > product.reorder_level || product.stock_available === 0))
          return false
        if (stockFilter === "out_of_stock" && product.stock_available > 0) return false
      }

      return true
    })

    // "Last Added First" uses the most recent of created/updated so edited products surface on top
    const lastActivity = (p: Product) =>
      Math.max(new Date(p.updated_at || 0).getTime(), new Date(p.created_at || 0).getTime())

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "created_desc":
          return lastActivity(b) - lastActivity(a)
        case "stock_desc": return b.stock_available - a.stock_available
        case "stock_asc": return a.stock_available - b.stock_available
        case "name_asc": return a.name.localeCompare(b.name)
        case "name_desc": return b.name.localeCompare(a.name)
        case "price_asc": return a.rental_price - b.rental_price
        case "price_desc": return b.rental_price - a.rental_price
        default: return lastActivity(b) - lastActivity(a)
      }
    })
  }, [products, searchTerm, stockFilter, categoryFilter, sortBy, categories, categoryParentMap])

  const stats = useMemo(() => ({
    total: products.length,
    inStock: products.filter((p) => p.stock_available > p.reorder_level).length,
    lowStock: products.filter((p) => p.stock_available <= p.reorder_level && p.stock_available > 0).length,
    outOfStock: products.filter((p) => p.stock_available <= 0).length,
    inventoryValue: products.reduce((sum, p) => sum + (p.price * p.stock_available), 0),
  }), [products])

  const criticalLowStockProducts = useMemo(() => {
    return products.filter(p => p.stock_available <= p.reorder_level && p.is_active)
  }, [products])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-[#f6e1c3]/60 rounded animate-pulse" />
              <div className="h-4 w-72 bg-[#f6e1c3]/40 rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-24 bg-[#f6e1c3]/50 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4 card-heritage animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-7 w-12 bg-[#f6e1c3]/70 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* ── Critical Low Stock Warning Banner ── */}
        {criticalLowStockProducts.length > 0 && (
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 shadow-sm items-start">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-900">Critical Stock Warning ({criticalLowStockProducts.length} items low)</p>
              <p className="text-xs text-amber-700 mt-1 max-w-4xl">
                The following products are at or below reorder levels: {' '}
                <span className="font-semibold text-amber-900">
                  {criticalLowStockProducts.slice(0, 8).map(p => `${p.name} (${p.stock_available} left)`).join(', ')}
                  {criticalLowStockProducts.length > 8 && `, and ${criticalLowStockProducts.length - 8} more...`}
                </span>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStockFilter("low_stock")
              }}
              className="h-7 text-xs border-amber-200 text-amber-800 bg-white hover:bg-amber-100/50 shrink-0 rounded-lg font-medium"
            >
              Filter Low Items
            </Button>
          </div>
        )}

        {/* Heritage Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#102516]" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Inventory
            </h1>
            <p className="text-[#102516]/60 text-sm">
              Manage products, variations, pricing & barcodes
            </p>
            {user?.franchise_name && (
              <p className="mt-1 text-xs font-medium text-[#102516]/45">
                Active franchise: {user.franchise_name}
                {user.franchise_code ? ` (${user.franchise_code})` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5 border-[#102516]/15 text-[#102516] hover:bg-[#f9f2e8] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {categoryFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateCatalog}
                className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Catalog
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5 border-[#102516]/15 text-[#102516] hover:bg-[#f9f2e8] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
            <label className="cursor-pointer">
              <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-[#102516]/15 text-[#102516] hover:bg-[#f9f2e8] transition-all bg-white font-medium">
                <Upload className="w-3.5 h-3.5" />
                Import
              </span>
            </label>
            <Button
              onClick={() => {
                setSelectedProduct(null)
                setEditorOpen(true)
              }}
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-[#102516] to-[#1a3a26] text-[#fefaf6] hover:shadow-lg transition-all rounded-lg font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Heritage divider line */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#102516]/20 to-transparent" />

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Total Products" value={stats.total} icon={Boxes} color="default" subtext="Active in inventory" />
          <StatCard title="In Stock" value={stats.inStock} icon={CheckCircle} color="green" subtext="Above reorder level" />
          <StatCard title="Low Stock" value={stats.lowStock} icon={AlertTriangle} color="amber" subtext="Below reorder level" />
          <StatCard title="Out of Stock" value={stats.outOfStock} icon={AlertTriangle} color="red" subtext="Needs restocking" />
          <StatCard title="Inventory Value" value={stats.inventoryValue} icon={IndianRupee} color="royal" subtext="Total stock value" prefix="₹" />
        </div>

        {/* Search, Filters & Sort */}
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-48 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#102516]/40" />
              <Input
                placeholder="Search products, barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#102516]/15 bg-[#fefaf6] focus:border-[#102516]/40"
              />
            </div>
          </div>

          <Select value={stockFilter} onValueChange={(value: any) => setStockFilter(value)}>
            <SelectTrigger className="w-40 border-[#102516]/15 bg-[#fefaf6]">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
            <SelectTrigger className="w-40 border-[#102516]/15 bg-[#fefaf6]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryOptions.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.depth > 0 ? `— ${cat.label}` : cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-44 border-[#102516]/15 bg-[#fefaf6]">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-[#102516]/50" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Last Added / Updated</SelectItem>
              <SelectItem value="stock_desc">Stock: High → Low</SelectItem>
              <SelectItem value="stock_asc">Stock: Low → High</SelectItem>
              <SelectItem value="name_asc">Name: A → Z</SelectItem>
              <SelectItem value="name_desc">Name: Z → A</SelectItem>
              <SelectItem value="price_asc">Price: Low → High</SelectItem>
              <SelectItem value="price_desc">Price: High → Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenBulkEditor}
              disabled={filteredProducts.length === 0}
              className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Edit2 className="w-4 h-4" />
              Bulk Editor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCategoryDrawerOpen(true)}
              className="gap-1.5 border-[#102516]/15 text-[#102516] hover:bg-[#f9f2e8]"
            >
              <BarChart3 className="w-4 h-4" />
              Manage Categories
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-[#fcf7f0] border-[#102516]/10 text-[#102516]/70">
            {filteredProducts.length} of {products.length} products
          </Badge>
          {(searchTerm || stockFilter !== "all" || categoryFilter !== "all" || sortBy !== "created_desc") && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#102516]/50 hover:text-[#102516] underline"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card className="card-heritage p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#102516]/5 flex items-center justify-center">
                <Package className="w-8 h-8 text-[#102516]/30" />
              </div>
              <div>
                <p className="text-[#102516]/70 font-medium" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  No products match your filters
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  category_name: product.category_name || (product.category_id ? categoryNameMap[product.category_id] : undefined),
                }}
                onEdit={(p: any) => handleEditProduct(p)}
                onDelete={handleDeleteProduct}
                onGenerateBarcode={(p: any) => {
                  setSelectedProductForBarcode(p)
                  setBarcodeDialogOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Category Manager Drawer Modal ── */}
      <Dialog open={categoryDrawerOpen} onOpenChange={setCategoryDrawerOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#d4a017]" />
              Manage Categories
            </DialogTitle>
            <DialogDescription>Add, update, or delete inventory categories</DialogDescription>
          </DialogHeader>

          {/* Create category Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2 py-2">
            <Input
              placeholder="New Category Name..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              className="flex-1 text-sm border-slate-200"
            />
            <Button type="submit" size="sm" className="bg-[#102516] hover:bg-[#1f4228] text-white">
              Add Category
            </Button>
          </form>

          {/* Categories List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] mt-4 pr-1">
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No categories defined.</p>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  {catEditingId === cat.id ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <Input
                        value={catEditingName}
                        onChange={e => setCatEditingName(e.target.value)}
                        className="h-8 text-sm flex-1 bg-white border-slate-300"
                        autoFocus
                      />
                      <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700" onClick={() => handleUpdateCategory(cat.id)}>
                        <Check className="h-4 w-4 text-white" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 text-slate-400" onClick={() => setCatEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-[#0f1117]">{cat.name}</span>
                      <div className="flex gap-1.5">
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-slate-900"
                          onClick={() => {
                            setCatEditingId(cat.id)
                            setCatEditingName(cat.name)
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Editor Dialog Modal ── */}
      <Dialog open={bulkEditorOpen} onOpenChange={setBulkEditorOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-600" />
              Batch Products Editor
            </DialogTitle>
            <DialogDescription>
              Spreadsheet editing mode for {bulkProducts.length} filtered products. Price changes apply directly.
            </DialogDescription>
          </DialogHeader>

          {/* Spreadsheet-like Table wrapper */}
          <div className="flex-1 overflow-auto border rounded-xl my-4">
            <table className="w-full text-sm border-collapse text-left">
              <thead>
                <tr className="bg-[#f8f9fc] border-b text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider sticky top-0">
                  <th className="px-4 py-3 min-w-[200px]">Product Name</th>
                  <th className="px-3 py-3 w-[130px]">Sale Price (₹)</th>
                  <th className="px-3 py-3 w-[130px]">Rental Price (₹)</th>
                  <th className="px-3 py-3 w-[110px]">Total Stock</th>
                  <th className="px-3 py-3 w-[110px]">Available</th>
                  <th className="px-3 py-3 w-[110px]">Reorder Lvl</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bulkProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-800 flex items-center gap-3 min-w-[340px]">
                      {/* Image Thumbnail with zoom effect on hover */}
                      <div className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-visible shrink-0 group bg-slate-50">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover transition-all duration-200 group-hover:scale-[6.5] group-hover:translate-x-6 group-hover:shadow-2xl group-hover:z-50 rounded-lg origin-left bg-white border border-slate-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center rounded-lg">
                            <Package className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <Input
                        value={p.name}
                        onChange={e => handleBulkCellChange(p.id, 'name', e.target.value)}
                        className="h-8 text-xs border-slate-200 text-slate-800 font-medium flex-1"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        min="0"
                        value={p.price}
                        onChange={e => handleBulkCellChange(p.id, 'price', parseInt(e.target.value) || 0)}
                        className="h-8 text-xs border-slate-200 text-slate-800"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        min="0"
                        value={p.rental_price}
                        onChange={e => handleBulkCellChange(p.id, 'rental_price', parseInt(e.target.value) || 0)}
                        className="h-8 text-xs border-slate-200 text-slate-800"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        min="0"
                        value={p.stock_total}
                        onChange={e => handleBulkCellChange(p.id, 'stock_total', parseInt(e.target.value) || 0)}
                        className="h-8 text-xs border-slate-200 text-slate-800"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        min="0"
                        value={p.stock_available}
                        onChange={e => handleBulkCellChange(p.id, 'stock_available', parseInt(e.target.value) || 0)}
                        className="h-8 text-xs border-slate-200 text-slate-800"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        min="0"
                        value={p.reorder_level}
                        onChange={e => handleBulkCellChange(p.id, 'reorder_level', parseInt(e.target.value) || 0)}
                        className="h-8 text-xs border-slate-200 text-slate-800"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div className="flex gap-2 pt-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setBulkEditorOpen(false)} disabled={bulkSaving}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBulkChanges}
              disabled={bulkSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {bulkSaving ? "Saving..." : "Save Bulk Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor Modal */}
      <ProductEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        product={selectedProduct as any}
        onSave={handleSaveProduct}
        franchiseId={resolvedFranchiseId || user?.franchise_id}
      />

      {/* Barcode Print Dialog */}
      <BarcodePrintDialog
        open={barcodeDialogOpen}
        onOpenChange={setBarcodeDialogOpen}
        product={selectedProductForBarcode as any}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </DashboardLayout>
  )
}
