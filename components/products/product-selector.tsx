"use client"

/**
 * ProductSelector - Reusable Product Selection Component
 * 
 * Features:
 * - Search & category/subcategory filtering
 * - Image previews with fallback
 * - Variant display (rental/sale pricing)
 * - Stock indicators with reservation tracking
 * - Quantity controls
 * - Availability checking
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Responsive grid layout
 * - Out of stock handling
 * - Barcode scanning auto-add
 */

import { useState, useMemo, useEffect, useRef, KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Package, AlertCircle, Eye, Plus, Scan, Minus, Check, Trash2, Camera, X } from "lucide-react"
import { InventoryAvailabilityPopup } from "@/components/bookings/inventory-availability-popup"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { toast } from "sonner"

export interface Product {
  id: string
  name: string
  category: string
  category_id?: string
  subcategory_id?: string
  rental_price: number
  sale_price: number
  security_deposit: number
  stock_available: number
  reorder_level?: number
  created_at?: string
  updated_at?: string
  image_url?: string
  // Optional barcode fields for search
  barcode?: string | null
  product_code?: string | null
  all_barcode_numbers?: string[]
}

export interface Category {
  id: string
  name: string
  type?: "rental" | "sale" | "both"
}

export interface Subcategory {
  id: string
  name: string
  parent_id: string
}

export interface SelectedItem {
  product_id: string
  quantity: number
  unit_price?: number
}

interface ProductSelectorProps {
  products: Product[]
  categories?: Category[]
  subcategories?: Subcategory[]
  selectedItems?: SelectedItem[]
  bookingType: "rental" | "sale"
  eventDate?: string
  onProductSelect: (product: Product, quantity?: number) => void
  onItemUpdate?: (product_id: string, quantity: number, unit_price: number) => void
  onItemRemove?: (product_id: string) => void
  onCheckAvailability?: (productId: string, productName: string) => void
  onOpenCustomProductDialog?: () => void
  /** Show a stock-aware shortcut for adding extra Safa items in booking Step 2. */
  showAdditionalSafaSection?: boolean
  /** Suppress the inline Additional Safa shortcut even when showAdditionalSafaSection is true —
   *  used when the caller wants to render <AdditionalSafaQuickAdd /> itself, elsewhere on the page. */
  hideAdditionalSafaSection?: boolean
  /** Hide the per-product rental/sale price — for a fixed-price package where showing an
   *  individual item's rental price would be misleading. */
  hidePricing?: boolean
  /** Restrict Barati Safa's visible package choices in the booking flow. */
  limitBaratiSafaPackages?: boolean
  /** Hide the broad all-items filter buttons when a focused catalogue is required. */
  hideAllCategoryOptions?: boolean
  hideAllSubcategoryOptions?: boolean
  defaultCategoryName?: string
  /** Once the default category resolves, also pre-select a subcategory by name (e.g. "Package 3"). */
  defaultSubcategoryName?: string
  /** Lock the category dropdown to defaultCategoryName so the user cannot switch away from it. */
  lockCategorySelect?: boolean
  /** Date-window availability (event date -2 to +2) per product id, keyed by product.id.
   *  When provided, an Available / Limited / Not available badge is shown on each product image. */
  availabilityMap?: Record<string, { stockTotal: number; reserved: number; available: number }>
  className?: string
}

export function ProductSelector({
  products,
  categories = [],
  subcategories = [],
  selectedItems = [],
  bookingType,
  eventDate,
  onProductSelect,
  onItemUpdate,
  onItemRemove,
  onCheckAvailability,
  onOpenCustomProductDialog,
  showAdditionalSafaSection = false,
  hideAdditionalSafaSection = false,
  hidePricing = false,
  limitBaratiSafaPackages = false,
  hideAllCategoryOptions = false,
  hideAllSubcategoryOptions = false,
  defaultCategoryName,
  defaultSubcategoryName,
  lockCategorySelect = false,
  availabilityMap,
  className = "",
}: ProductSelectorProps) {
  const [productSearch, setProductSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all")
  const [sortBy, setSortBy] = useState<"created_desc" | "stock_desc" | "stock_asc" | "name_asc" | "name_desc" | "price_asc" | "price_desc">("created_desc")
  const [additionalSafaPackageId, setAdditionalSafaPackageId] = useState("all")
  const [additionalSafaId, setAdditionalSafaId] = useState("")
  const [additionalSafaQty, setAdditionalSafaQty] = useState(1)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [barcodeInput, setBarcodeInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  // Per-card quantity state: productId -> qty (string to allow empty while typing)
  const [cardQty, setCardQty] = useState<Record<string, string>>({})
  // Inline price edit for selected items: productId -> price string
  const [inlinePrice, setInlinePrice] = useState<Record<string, string>>({})
  const gridRef = useRef<HTMLDivElement>(null)
  const productRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showCameraScanner, setShowCameraScanner] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const html5QrCodeRef = useRef<any>(null)

  // Categories are loaded asynchronously by the parent. Once available,
  // select the requested category so the booking flow opens on the right list.
  useEffect(() => {
    if (!defaultCategoryName || selectedCategory) return
    const defaultCategory = categories.find(
      (category) => category.name.trim().toUpperCase() === defaultCategoryName.trim().toUpperCase()
    )
    if (defaultCategory) setSelectedCategory(defaultCategory.id)
  }, [categories, defaultCategoryName, selectedCategory])

  // Barcode scan handler - auto add to cart
  const handleBarcodeScan = async (code: string) => {
    if (!code.trim()) return
    
    setIsScanning(true)
    
    try {
      // Try API lookup first
      const response = await fetch('/api/barcode/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code.trim() })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Find matching product in our list to use proper typing
        const matchedProduct = products.find(p => p.id === result.product.id)
        if (matchedProduct) {
          onProductSelect(matchedProduct)
          toast.success("Product added!", {
            description: `${matchedProduct.name} added to cart`,
            duration: 2000
          })
        } else {
          // Product not in local list, create from API response
          onProductSelect({
            id: result.product.id,
            name: result.product.name,
            category: result.product.category || '',
            category_id: result.product.category_id,
            subcategory_id: result.product.subcategory_id,
            rental_price: result.product.rental_price || 0,
            sale_price: result.product.sale_price || result.product.price || 0,
            security_deposit: result.product.security_deposit || 0,
            stock_available: result.product.stock_available || 0,
            image_url: result.product.image_url,
            barcode: result.product.barcode
          })
          toast.success("Product added!", {
            description: `${result.product.name} added to cart`,
            duration: 2000
          })
        }
        setBarcodeInput("")
        return
      }
      
      // Fallback: Search in local products
      const foundProduct = products.find(p => {
        const matchesBarcode = p.barcode === code.trim()
        const matchesProductCode = p.product_code === code.trim()
        const matchesAnyBarcode = p.all_barcode_numbers?.includes(code.trim())
        return matchesBarcode || matchesProductCode || matchesAnyBarcode
      })
      
      if (foundProduct) {
        onProductSelect(foundProduct)
        toast.success("Product added!", {
          description: `${foundProduct.name} added to cart`,
          duration: 2000
        })
        setBarcodeInput("")
        return
      }
      
      // Not found
      toast.error("Product not found", {
        description: `No product found with barcode: ${code}`,
        duration: 3000
      })
      
    } catch (error) {
      toast.error("Scan error", {
        description: "Failed to lookup barcode",
        duration: 3000
      })
    } finally {
      setIsScanning(false)
      setBarcodeInput("")
      // Re-focus barcode input for next scan
      setTimeout(() => barcodeInputRef.current?.focus(), 100)
    }
  }

  // Camera scanning (mobile) — reuses the same handleBarcodeScan lookup as the hardware scanner
  const startCameraScanner = () => {
    setCameraError(null)
    setShowCameraScanner(true)

    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        const scanner = new Html5Qrcode("product-selector-camera-reader")
        html5QrCodeRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const minDim = Math.min(width, height)
              const boxDim = Math.floor(minDim * 0.7)
              return { width: boxDim, height: Math.floor(boxDim * 0.5) }
            },
          },
          (decodedText) => {
            handleBarcodeScan(decodedText)
            stopCameraScanner()
          },
          () => {}
        )
      } catch (error: any) {
        setCameraError(error?.message || "Failed to start camera scanner")
      }
    }, 250)
  }

  const stopCameraScanner = () => {
    const scanner = html5QrCodeRef.current
    if (scanner) {
      if (scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(() => {})
      }
      html5QrCodeRef.current = null
    }
    setShowCameraScanner(false)
    setCameraError(null)
  }

  useEffect(() => {
    return () => { stopCameraScanner() }
  }, [])

  // Barcode input change handler with debounce
  const handleBarcodeInputChange = (value: string) => {
    setBarcodeInput(value)
    
    // Clear existing timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
    }
    
    // Set debounce for auto-scan (1 second after last character)
    if (value.trim()) {
      scanTimeoutRef.current = setTimeout(() => {
        handleBarcodeScan(value)
      }, 1000)
    }
  }

  // Categories restricted to the other transaction type (used to hide their products)
  const categoryTypeById = useMemo(() => {
    const map = new Map<string, "rental" | "sale" | "both">()
    categories.forEach((c) => map.set(c.id, c.type || "both"))
    return map
  }, [categories])

  const subcategoryById = useMemo(
    () => new Map(subcategories.map((subcategory) => [subcategory.id, subcategory])),
    [subcategories]
  )

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  )

  const productCategoryIds = (product: Product) => {
    const explicitSubcategory = product.subcategory_id
      ? subcategoryById.get(product.subcategory_id)
      : undefined
    const categoryAsSubcategory = product.category_id
      ? subcategoryById.get(product.category_id)
      : undefined
    const subcategory = explicitSubcategory || categoryAsSubcategory

    return {
      categoryId: subcategory?.parent_id || product.category_id,
      subcategoryId: subcategory?.id || product.subcategory_id,
    }
  }

  const getBaratiSafaPackage = (product: Product) => {
    const candidates = [
      product.subcategory_id ? subcategoryById.get(product.subcategory_id) : undefined,
      product.category_id ? subcategoryById.get(product.category_id) : undefined,
    ].filter(Boolean) as Subcategory[]

    return candidates.find((subcategory) => {
      const parentName = categoryNameById.get(subcategory.parent_id)?.trim().toUpperCase() || ""
      return parentName === "BARATI SAFA" && /^package\s*\d+$/i.test(subcategory.name.trim())
    })
  }

  const additionalSafaProducts = useMemo(() => products
    .filter((product) => Boolean(getBaratiSafaPackage(product)))
    .sort((a, b) => a.name.localeCompare(b.name)),
  [products, categoryNameById, subcategoryById])

  const additionalSafaPackages = useMemo(() => {
    const baratiSafaCategory = categories.find((category) => category.name.trim().toUpperCase() === "BARATI SAFA")
    if (!baratiSafaCategory) return []
    return subcategories
      .filter((subcategory) => subcategory.parent_id === baratiSafaCategory.id && /^package\s*\d+$/i.test(subcategory.name.trim()))
      .sort((a, b) => Number(a.name.match(/\d+/)?.[0] || 999) - Number(b.name.match(/\d+/)?.[0] || 999))
  }, [categories, subcategories])

  const visibleAdditionalSafaProducts = additionalSafaPackageId === "all"
    ? additionalSafaProducts
    : additionalSafaProducts.filter((product) => getBaratiSafaPackage(product)?.id === additionalSafaPackageId)

  const additionalSafaProduct = additionalSafaProducts.find((product) => product.id === additionalSafaId)
  const getProductSubcategoryName = (product: Product) => {
    return getBaratiSafaPackage(product)?.name || "Package"
  }
  const alreadySelectedSafaQty = selectedItems.find((item) => item.product_id === additionalSafaId)?.quantity || 0
  const additionalSafaAvailable = Math.max(0, (Number(additionalSafaProduct?.stock_available) || 0) - alreadySelectedSafaQty)

  const addAdditionalSafa = () => {
    if (!additionalSafaProduct || additionalSafaAvailable <= 0) return
    const quantity = Math.max(1, Math.min(additionalSafaQty, additionalSafaAvailable))
    onProductSelect(additionalSafaProduct, quantity)
    setAdditionalSafaQty(1)
    toast.success("Additional Safa added", {
      description: `${quantity} × ${additionalSafaProduct.name}`,
      duration: 2000,
    })
  }

  const selectedCategoryName = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)?.name.trim().toUpperCase()
    : undefined
  const baratiSafaSubcategories = useMemo(() => {
    const baratiCategory = categories.find((category) => category.name.trim().toUpperCase() === "BARATI SAFA")
    if (!baratiCategory) return []
    return subcategories
      .filter((subcategory) => subcategory.parent_id === baratiCategory.id)
      .sort((a, b) => {
        const packageNumber = (name: string) => Number(name.match(/package\s*(\d+)/i)?.[1] || 999)
        return packageNumber(a.name) - packageNumber(b.name)
      })
      .filter((subcategory) => /^package\s*[1-3]$/i.test(subcategory.name.trim()))
  }, [categories, subcategories])

  const visibleSubcategories = useMemo(() => {
    const all = subcategories.filter((subcategory) => subcategory.parent_id === selectedCategory)
    if (!limitBaratiSafaPackages || selectedCategoryName !== "BARATI SAFA") return all
    return all.filter((subcategory) => baratiSafaSubcategories.some((visible) => visible.id === subcategory.id))
  }, [subcategories, selectedCategory, selectedCategoryName, limitBaratiSafaPackages, baratiSafaSubcategories])

  // Once a default category is resolved, also try to default the subcategory (e.g. the
  // booking flow asking for "Package 3" to match the rental package the user already
  // picked). Only ever matches within visibleSubcategories, so a number outside what's
  // actually offered here (e.g. limitBaratiSafaPackages capping this at Package 1-3)
  // is simply ignored instead of selecting a subcategory that would filter to nothing.
  useEffect(() => {
    if (!defaultSubcategoryName || !selectedCategory || selectedSubcategory) return
    const defaultSubcategory = visibleSubcategories.find(
      (subcategory) => subcategory.name.trim().toUpperCase() === defaultSubcategoryName.trim().toUpperCase()
    )
    if (defaultSubcategory) setSelectedSubcategory(defaultSubcategory.id)
  }, [visibleSubcategories, selectedCategory, defaultSubcategoryName, selectedSubcategory])

  // Filter products based on search and categories
  const filteredProducts = useMemo(() => {
    let result = products

    // Hide products whose category is restricted to the other transaction type
    result = result.filter((p) => {
      const type = p.category_id ? categoryTypeById.get(p.category_id) : undefined
      if (!type || type === "both") return true
      return type === bookingType
    })

    // Products may store a child category (for example Package 1) directly in
    // category_id. Resolve its parent so the BARATI SAFA category still works.
    if (selectedCategory) {
      result = result.filter((p) => productCategoryIds(p).categoryId === selectedCategory)
    }

    // In the booking flow, Barati Safa only exposes Package 1–3. This also
    // prevents products from hidden packages appearing under “All Subcategories”.
    if (limitBaratiSafaPackages && selectedCategoryName === "BARATI SAFA") {
      const allowedIds = new Set(baratiSafaSubcategories.map((subcategory) => subcategory.id))
      result = result.filter((p) => p.subcategory_id && allowedIds.has(p.subcategory_id))
    }

    // Filter by subcategory
    if (selectedSubcategory) {
      result = result.filter((p) => productCategoryIds(p).subcategoryId === selectedSubcategory)
    }

    // Match the same stock definitions used by the Inventory module.
    if (stockFilter !== "all") {
      result = result.filter((p) => {
        const available = Number(p.stock_available) || 0
        const reorderLevel = Number(p.reorder_level) || 0
        if (stockFilter === "in_stock") return available > reorderLevel
        if (stockFilter === "low_stock") return available > 0 && available <= reorderLevel
        return available <= 0
      })
    }

    // Filter by search (supports name, category, barcode and known code fields)
    if (productSearch) {
      const term = productSearch.toLowerCase()
      result = result.filter(
        (p) => {
          const ids = productCategoryIds(p)
          const parentCategoryName = ids.categoryId ? categoryNameById.get(ids.categoryId) || "" : ""
          const subcategoryName = ids.subcategoryId ? subcategoryById.get(ids.subcategoryId)?.name || "" : ""
          const matchesNameOrCategory = p.name.toLowerCase().includes(term) ||
            (p.category || "").toLowerCase().includes(term) ||
            parentCategoryName.toLowerCase().includes(term) ||
            subcategoryName.toLowerCase().includes(term)
          const matchesBarcode = p.barcode ? String(p.barcode).toLowerCase().includes(term) : false
          const matchesProductCode = p.product_code ? String(p.product_code).toLowerCase().includes(term) : false
          const matchesAnyBarcode = Array.isArray(p.all_barcode_numbers)
            ? p.all_barcode_numbers.some((b) => String(b).toLowerCase().includes(term))
            : false
          return matchesNameOrCategory || matchesBarcode || matchesProductCode || matchesAnyBarcode
        }
      )
    }

    // Keep selected items first, then apply the same sort choices as Inventory.
    const selectedIds = new Set(selectedItems.map(i => i.product_id))
    result = [...result].sort((a, b) => {
      const aSelected = selectedIds.has(a.id) ? 0 : 1
      const bSelected = selectedIds.has(b.id) ? 0 : 1
      if (aSelected !== bSelected) return aSelected - bSelected

      const lastActivity = (product: Product) => Math.max(
        new Date(product.updated_at || 0).getTime(),
        new Date(product.created_at || 0).getTime(),
      )
      if (sortBy === "stock_desc") return (Number(b.stock_available) || 0) - (Number(a.stock_available) || 0)
      if (sortBy === "stock_asc") return (Number(a.stock_available) || 0) - (Number(b.stock_available) || 0)
      if (sortBy === "name_asc") return a.name.localeCompare(b.name)
      if (sortBy === "name_desc") return b.name.localeCompare(a.name)
      const price = (product: Product) => bookingType === "rental"
        ? Number(product.rental_price) || 0
        : Number(product.sale_price || product.rental_price) || 0
      if (sortBy === "price_asc") return price(a) - price(b)
      if (sortBy === "price_desc") return price(b) - price(a)
      return lastActivity(b) - lastActivity(a)
    })

    return result
  }, [products, productSearch, selectedCategory, selectedSubcategory, stockFilter, sortBy, selectedItems, categoryTypeById, categoryNameById, subcategoryById, bookingType, limitBaratiSafaPackages, selectedCategoryName, baratiSafaSubcategories])

  // Calculate reserved quantities
  const getReservedQuantity = (productId: string): number => {
    return selectedItems.find((i) => i.product_id === productId)?.quantity || 0
  }

  // Get available stock
  const getAvailableStock = (product: Product): number => {
    const reserved = getReservedQuantity(product.id)
    return product.stock_available - reserved
  }

  // Check if product is out of stock
  const isOutOfStock = (product: Product): boolean => {
    return getAvailableStock(product) <= 0
  }

  // Get display value (string, may be empty while user is typing)
  const getCardQtyStr = (productId: string) => cardQty[productId] ?? "1"

  // Get resolved numeric qty (fallback 1)
  const getCardQtyNum = (productId: string) => Math.max(1, parseInt(cardQty[productId] || "1") || 1)

  // +/- buttons: operate on numeric value, clamp between 1 and maxStock
  const stepQty = (productId: string, delta: number, maxStock: number) => {
    const current = getCardQtyNum(productId)
    const next = Math.max(1, Math.min(current + delta, maxStock))
    setCardQty(prev => ({ ...prev, [productId]: String(next) }))
  }

  // Typing: allow any string (including empty) so backspace works freely
  const handleQtyInput = (productId: string, value: string) => {
    // Only allow digits
    if (/^\d*$/.test(value)) {
      setCardQty(prev => ({ ...prev, [productId]: value }))
    }
  }

  // On blur: if empty or 0, reset to "1"
  const handleQtyBlur = (productId: string, maxStock: number) => {
    const num = parseInt(cardQty[productId] || "1") || 1
    const clamped = Math.max(1, Math.min(num, maxStock))
    setCardQty(prev => ({ ...prev, [productId]: String(clamped) }))
  }

  // Handle add to cart with quantity — pass qty directly, no loop
  const handleAddToCart = (product: Product) => {
    const qty = getCardQtyNum(product.id)
    onProductSelect(product, qty)
    // Reset qty back to 1 after adding
    setCardQty(prev => ({ ...prev, [product.id]: "1" }))
  }

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (filteredProducts.length === 0) return

    const maxIndex = filteredProducts.length - 1

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, maxIndex))
        break
      case "ArrowLeft":
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "ArrowDown":
        e.preventDefault()
        // Move down by 4 (grid columns)
        setFocusedIndex((prev) => Math.min(prev + 4, maxIndex))
        break
      case "ArrowUp":
        e.preventDefault()
        // Move up by 4 (grid columns)
        setFocusedIndex((prev) => Math.max(prev - 4, 0))
        break
      case "Enter":
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex <= maxIndex) {
          const product = filteredProducts[focusedIndex]
          if (!isOutOfStock(product)) {
            onProductSelect(product)
          }
        }
        break
      case "Escape":
        e.preventDefault()
        setFocusedIndex(-1)
        break
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && filteredProducts[focusedIndex]) {
      const productId = filteredProducts[focusedIndex].id
      const element = productRefs.current[productId]
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
  }, [focusedIndex, filteredProducts])

  // Reset focus when filters change
  useEffect(() => {
    setFocusedIndex(-1)
  }, [productSearch, selectedCategory, selectedSubcategory, stockFilter, sortBy])

  return (
    <Card className={className}>
      <CardHeader className="pb-4 border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select Products
            {filteredProducts.length > 0 && (
              <Badge variant="secondary">
                {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
              </Badge>
            )}
          </div>
          {onOpenCustomProductDialog && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenCustomProductDialog}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-4 w-4" />
              Quick Custom Product
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {showAdditionalSafaSection && bookingType === "rental" && !hideAdditionalSafaSection && (
          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 font-semibold text-amber-950">
                  <Package className="h-4 w-4 text-amber-700" />
                  Additional Safa
                  <Badge variant="outline" className="border-amber-200 bg-white/80 text-[10px] text-amber-800">
                    {additionalSafaProducts.length} options
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-amber-800/70">
                  Select additional Safa only from Barati Safa packages.
                </p>
              </div>
              {alreadySelectedSafaQty > 0 && additionalSafaProduct && (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  {alreadySelectedSafaQty} already selected
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_minmax(0,1fr)_100px_auto]">
              <select
                aria-label="Additional Safa package"
                value={additionalSafaPackageId}
                onChange={(event) => {
                  setAdditionalSafaPackageId(event.target.value)
                  setAdditionalSafaId("")
                  setAdditionalSafaQty(1)
                }}
                className="h-10 rounded-md border border-amber-200 bg-white px-3 text-sm text-slate-800 focus:border-amber-400 focus:outline-none"
              >
                <option value="all">All Packages</option>
                {additionalSafaPackages.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                ))}
              </select>
              <select
                aria-label="Additional Safa product"
                value={additionalSafaId}
                onChange={(event) => {
                  setAdditionalSafaId(event.target.value)
                  setAdditionalSafaQty(1)
                }}
                className="h-10 min-w-0 rounded-md border border-amber-200 bg-white px-3 text-sm text-slate-800 focus:border-amber-400 focus:outline-none"
              >
                <option value="">Select Barati Safa package product</option>
                {visibleAdditionalSafaProducts.map((product) => (
                  <option key={product.id} value={product.id} disabled={(Number(product.stock_available) || 0) <= 0}>
                    {getProductSubcategoryName(product)} — {product.name} — Stock {Number(product.stock_available) || 0}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Additional Safa quantity"
                type="number"
                min={1}
                max={Math.max(1, additionalSafaAvailable)}
                value={additionalSafaQty}
                onChange={(event) => setAdditionalSafaQty(Math.max(1, Number(event.target.value) || 1))}
                disabled={!additionalSafaProduct || additionalSafaAvailable <= 0}
                className="h-10 border-amber-200 bg-white"
                title={additionalSafaProduct ? `${additionalSafaAvailable} available after current selection` : "Choose a Safa first"}
              />
              <Button
                type="button"
                onClick={addAdditionalSafa}
                disabled={!additionalSafaProduct || additionalSafaAvailable <= 0}
                className="h-10 bg-amber-600 text-white hover:bg-amber-700"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add Safa
              </Button>
            </div>
            {additionalSafaProduct && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-amber-900/70">
                <span>Available now: <strong>{additionalSafaAvailable}</strong></span>
                <span>Rental price: <strong>₹{Number(additionalSafaProduct.rental_price) || 0}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Barcode Scanner Input - Auto adds to cart */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Scan className="absolute left-3 top-3 h-4 w-4 text-green-600" />
            <Input
              ref={barcodeInputRef}
              placeholder="Scan barcode to auto-add product..."
              value={barcodeInput}
              onChange={(e) => handleBarcodeInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && barcodeInput.trim()) {
                  e.preventDefault()
                  if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current)
                  handleBarcodeScan(barcodeInput)
                }
              }}
              className="pl-10 pr-10 border-green-200 focus:border-green-500 focus:ring-green-500 bg-green-50/50"
              disabled={isScanning}
              autoComplete="off"
            />
            {isScanning && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent" />
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-green-200 text-green-700 hover:bg-green-50"
            onClick={startCameraScanner}
            title="Scan with phone camera"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>

        {/* Camera Scanner Dialog (mobile) */}
        {showCameraScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm flex items-center gap-1.5"><Camera className="h-4 w-4" />Camera scanner</span>
                <button onClick={stopCameraScanner} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
              </div>
              {cameraError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-sm text-red-700">
                  {cameraError}
                  <Button size="sm" variant="outline" onClick={startCameraScanner} className="mt-3 w-full">Try again</Button>
                </div>
              ) : (
                <div className="relative bg-black rounded-lg overflow-hidden min-h-[240px]">
                  <div id="product-selector-camera-reader" className="w-full h-full" />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground text-center mt-2">Point the camera at the barcode</p>
            </div>
          </div>
        )}

        {/* Inventory-style product filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#102516]/40" />
            <Input
              placeholder="Search products, barcode..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-10 border-[#102516]/15 bg-[#fefaf6] focus:border-[#102516]/40"
            />
          </div>
          <select
            aria-label="Stock status"
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)}
            className="h-10 min-w-[140px] rounded-md border border-[#102516]/15 bg-[#fefaf6] px-3 text-sm text-[#102516]"
          >
            <option value="all">All Products</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <select
            aria-label="Product category"
            value={selectedCategory || "all"}
            onChange={(event) => {
              setSelectedCategory(event.target.value === "all" ? null : event.target.value)
              setSelectedSubcategory(null)
            }}
            disabled={lockCategorySelect}
            className="h-10 min-w-[150px] rounded-md border border-[#102516]/15 bg-[#fefaf6] px-3 text-sm text-[#102516] disabled:opacity-100 disabled:cursor-not-allowed disabled:bg-[#f3efe9]"
          >
            {!hideAllCategoryOptions && <option value="all">All Categories</option>}
            {categories
              .filter((category) => !category.type || category.type === "both" || category.type === bookingType)
              .map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {selectedCategory && visibleSubcategories.length > 0 && (
            <select
              aria-label="Product subcategory"
              value={selectedSubcategory || "all"}
              onChange={(event) => setSelectedSubcategory(event.target.value === "all" ? null : event.target.value)}
              className="h-10 min-w-[150px] rounded-md border border-[#102516]/15 bg-[#fefaf6] px-3 text-sm text-[#102516]"
            >
              {!hideAllSubcategoryOptions && <option value="all">All Subcategories</option>}
              {visibleSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
              ))}
            </select>
          )}
          <select
            aria-label="Sort products"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            className="h-10 min-w-[175px] rounded-md border border-[#102516]/15 bg-[#fefaf6] px-3 text-sm text-[#102516]"
          >
            <option value="created_desc">Last Added / Updated</option>
            <option value="stock_desc">Stock: High → Low</option>
            <option value="stock_asc">Stock: Low → High</option>
            <option value="name_asc">Name: A → Z</option>
            <option value="name_desc">Name: Z → A</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-[#fcf7f0] border-[#102516]/10 text-[#102516]/70">
            {filteredProducts.length} of {products.length} products
          </Badge>
          {(productSearch || stockFilter !== "all" || selectedCategory || selectedSubcategory || sortBy !== "created_desc") && (
            <button
              type="button"
              onClick={() => {
                setProductSearch("")
                setStockFilter("all")
                setSelectedCategory(null)
                setSelectedSubcategory(null)
                setSortBy("created_desc")
              }}
              className="text-xs text-[#102516]/50 hover:text-[#102516] underline"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Products Grid */}
        <div
          ref={gridRef}
          className="max-h-[500px] overflow-y-auto border rounded-lg p-4"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-muted-foreground">No products found</p>
              {(productSearch || selectedCategory || selectedSubcategory) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setProductSearch("")
                    setStockFilter("all")
                    setSelectedCategory(null)
                    setSelectedSubcategory(null)
                    setSortBy("created_desc")
                  }}
                  className="mt-3"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product, index) => {
                const defaultPrice = bookingType === "rental"
                  ? product.rental_price
                  : (product.sale_price || product.rental_price || 0)
                const selectedItem = selectedItems.find(i => i.product_id === product.id)
                const isSelected = !!selectedItem
                const reservedQty = selectedItem?.quantity || 0
                const availableStock = product.stock_available
                const outOfStock = !isSelected && availableStock <= 0
                const isFocused = focusedIndex === index

                // Inline price for selected items
                const currentPrice = isSelected
                  ? (inlinePrice[product.id] !== undefined
                      ? inlinePrice[product.id]
                      : String(selectedItem?.unit_price ?? defaultPrice))
                  : String(defaultPrice)

                return (
                  <div
                    key={product.id}
                    ref={(el) => { productRefs.current[product.id] = el }}
                    className={`border-2 rounded-lg p-3 flex flex-col text-sm transition-all relative ${
                      isSelected
                        ? "border-green-500 bg-green-50/40 shadow-md"
                        : isFocused
                          ? "border-primary shadow-lg"
                          : "border-gray-200 hover:shadow-md hover:border-gray-300"
                    } ${outOfStock ? "opacity-50" : ""}`}
                  >
                    {/* Selected badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow z-10">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}

                    {/* Product Image */}
                    <div className="relative aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center text-xs text-muted-foreground overflow-hidden">
                      {product.image_url ? (
                        <OptimizedImage src={product.image_url} alt={product.name} webpWidth={360} className="w-full h-full object-cover rounded" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Package className="h-8 w-8 text-gray-300" />
                          <span>No Image</span>
                        </div>
                      )}
                      {availabilityMap && availabilityMap[product.id] && (() => {
                        const avail = availabilityMap[product.id].available
                        const badgeClass = avail <= 0
                          ? "bg-red-600 text-white"
                          : avail <= 2
                            ? "bg-amber-500 text-white"
                            : "bg-green-600 text-white"
                        const badgeText = avail <= 0 ? "Not available" : avail <= 2 ? `${avail} left` : "Available"
                        return (
                          <span className={`absolute bottom-1 left-1 right-1 text-center text-[9px] font-semibold px-1 py-0.5 rounded ${badgeClass}`}>
                            {badgeText}
                          </span>
                        )
                      })()}
                    </div>

                    {/* Product Info */}
                    <div className="font-semibold line-clamp-2 mb-0.5 min-h-[2.5rem] text-xs leading-snug" title={product.name}>
                      {product.name}
                    </div>
                    <div className="text-[10px] text-gray-500 mb-2">{product.category}</div>

                    {/* Price — editable when selected; hidden for fixed-price packages */}
                    {!hidePricing && (
                      <div className="mb-2">
                        <div className="text-[10px] text-gray-500 mb-0.5">
                          {bookingType === "rental" ? "Rental Price" : "Sale Price"}
                        </div>
                        {isSelected && onItemUpdate ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 text-xs">₹</span>
                            <Input
                              type="number"
                              value={currentPrice}
                              onChange={(e) => {
                                setInlinePrice(prev => ({ ...prev, [product.id]: e.target.value }))
                              }}
                              onBlur={(e) => {
                                const price = parseFloat(e.target.value) || 0
                                setInlinePrice(prev => ({ ...prev, [product.id]: String(price) }))
                                onItemUpdate(product.id, reservedQty, price)
                              }}
                              onClick={(e) => { e.stopPropagation(); (e.target as HTMLInputElement).select() }}
                              className="h-7 text-sm font-bold text-green-700 px-1 border-green-300 bg-white"
                            />
                          </div>
                        ) : (
                          <div className="font-bold text-base text-gray-800">₹{defaultPrice}</div>
                        )}
                      </div>
                    )}

                    {/* Stock info */}
                    <div className={`text-[10px] mb-2 ${outOfStock ? "text-red-600" : availableStock <= 5 ? "text-orange-600" : "text-gray-500"}`}>
                      Stock: {availableStock}
                      {isSelected && <span className="ml-1 text-green-600 font-semibold">• {reservedQty} selected</span>}
                    </div>

                    {availableStock <= 5 && !outOfStock && !isSelected && (
                      <div className="flex items-center gap-1 text-[10px] text-orange-600 mb-2 p-1 bg-orange-50 rounded">
                        <AlertCircle className="h-3 w-3" /><span>Low stock</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-auto space-y-1.5">
                      {isSelected ? (
                        <>
                          {/* Qty controls for selected */}
                          {onItemUpdate && (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline"
                                className="h-7 w-7 p-0 shrink-0 border-green-300"
                                onClick={(e) => { e.stopPropagation(); const newQty = Math.max(1, reservedQty - 1); onItemUpdate(product.id, newQty, parseFloat(currentPrice) || defaultPrice) }}
                                disabled={reservedQty <= 1}
                              ><Minus className="h-3 w-3" /></Button>
                              <Input
                                type="text" inputMode="numeric"
                                value={String(reservedQty)}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value) || 1
                                  onItemUpdate(product.id, qty, parseFloat(currentPrice) || defaultPrice)
                                }}
                                onClick={(e) => { e.stopPropagation(); (e.target as HTMLInputElement).select() }}
                                className="h-7 text-center px-1 font-bold text-sm border-green-300"
                              />
                              <Button size="sm" variant="outline"
                                className="h-7 w-7 p-0 shrink-0 border-green-300"
                                onClick={(e) => { e.stopPropagation(); onItemUpdate(product.id, reservedQty + 1, parseFloat(currentPrice) || defaultPrice) }}
                              ><Plus className="h-3 w-3" /></Button>
                            </div>
                          )}
                          {onItemRemove && (
                            <Button size="sm" variant="outline"
                              className="w-full h-7 text-red-600 border-red-200 hover:bg-red-50 text-xs"
                              onClick={() => {
                                onItemRemove(product.id)
                                setInlinePrice(prev => { const n = {...prev}; delete n[product.id]; return n })
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />Remove
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {!outOfStock && (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0 shrink-0"
                                onClick={(e) => { e.stopPropagation(); stepQty(product.id, -1, availableStock) }}
                                disabled={getCardQtyNum(product.id) <= 1}
                              ><Minus className="h-3 w-3" /></Button>
                              <Input type="text" inputMode="numeric"
                                value={getCardQtyStr(product.id)}
                                onChange={(e) => handleQtyInput(product.id, e.target.value)}
                                onBlur={() => handleQtyBlur(product.id, availableStock)}
                                onClick={(e) => { e.stopPropagation(); (e.target as HTMLInputElement).select() }}
                                className="h-7 text-center px-1 font-semibold text-sm"
                              />
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0 shrink-0"
                                onClick={(e) => { e.stopPropagation(); stepQty(product.id, +1, availableStock) }}
                                disabled={getCardQtyNum(product.id) >= availableStock}
                              ><Plus className="h-3 w-3" /></Button>
                            </div>
                          )}
                          <Button size="sm" onClick={() => handleAddToCart(product)} disabled={outOfStock} className="w-full h-8">
                            {outOfStock ? "Out of Stock" : "Add to Order"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Hint */}
        {filteredProducts.length > 0 && (
          <div className="text-[10px] text-muted-foreground text-center">
            💡 Use arrow keys to navigate, Enter to add, Escape to reset focus
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * AdditionalSafaQuickAdd - standalone version of the "Additional Safa" shortcut that normally
 * lives inline at the top of ProductSelector (see showAdditionalSafaSection). Extracted so a
 * caller can position it independently on the page — e.g. below a Safa-limit/bypass card —
 * instead of always having it appear above the product grid. Pass hideAdditionalSafaSection
 * to ProductSelector to avoid rendering the shortcut twice.
 */
export interface AdditionalSafaQuickAddProps {
  products: Product[]
  categories?: Category[]
  subcategories?: Subcategory[]
  selectedItems?: SelectedItem[]
  onProductSelect: (product: Product, quantity?: number) => void
  className?: string
  /** Hide the per-product rental price — for a fixed-price package where showing an
   *  individual item's rental price would be misleading. */
  hidePricing?: boolean
}

export function AdditionalSafaQuickAdd({
  products,
  categories = [],
  subcategories = [],
  selectedItems = [],
  onProductSelect,
  className = "",
  hidePricing = false,
}: AdditionalSafaQuickAddProps) {
  const [additionalSafaPackageId, setAdditionalSafaPackageId] = useState("all")
  const [additionalSafaId, setAdditionalSafaId] = useState("")
  const [additionalSafaQty, setAdditionalSafaQty] = useState(1)

  const subcategoryById = useMemo(
    () => new Map(subcategories.map((subcategory) => [subcategory.id, subcategory])),
    [subcategories]
  )
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  )

  const getBaratiSafaPackage = (product: Product) => {
    const candidates = [
      product.subcategory_id ? subcategoryById.get(product.subcategory_id) : undefined,
      product.category_id ? subcategoryById.get(product.category_id) : undefined,
    ].filter(Boolean) as Subcategory[]

    return candidates.find((subcategory) => {
      const parentName = categoryNameById.get(subcategory.parent_id)?.trim().toUpperCase() || ""
      return parentName === "BARATI SAFA" && /^package\s*\d+$/i.test(subcategory.name.trim())
    })
  }

  const additionalSafaProducts = useMemo(() => products
    .filter((product) => Boolean(getBaratiSafaPackage(product)))
    .sort((a, b) => a.name.localeCompare(b.name)),
  [products, categoryNameById, subcategoryById])

  const additionalSafaPackages = useMemo(() => {
    const baratiSafaCategory = categories.find((category) => category.name.trim().toUpperCase() === "BARATI SAFA")
    if (!baratiSafaCategory) return []
    return subcategories
      .filter((subcategory) => subcategory.parent_id === baratiSafaCategory.id && /^package\s*\d+$/i.test(subcategory.name.trim()))
      .sort((a, b) => Number(a.name.match(/\d+/)?.[0] || 999) - Number(b.name.match(/\d+/)?.[0] || 999))
  }, [categories, subcategories])

  const visibleAdditionalSafaProducts = additionalSafaPackageId === "all"
    ? additionalSafaProducts
    : additionalSafaProducts.filter((product) => getBaratiSafaPackage(product)?.id === additionalSafaPackageId)

  const additionalSafaProduct = additionalSafaProducts.find((product) => product.id === additionalSafaId)
  const getProductSubcategoryName = (product: Product) => {
    return getBaratiSafaPackage(product)?.name || "Package"
  }
  const alreadySelectedSafaQty = selectedItems.find((item) => item.product_id === additionalSafaId)?.quantity || 0
  const additionalSafaAvailable = Math.max(0, (Number(additionalSafaProduct?.stock_available) || 0) - alreadySelectedSafaQty)

  const addAdditionalSafa = () => {
    if (!additionalSafaProduct || additionalSafaAvailable <= 0) return
    const quantity = Math.max(1, Math.min(additionalSafaQty, additionalSafaAvailable))
    onProductSelect(additionalSafaProduct, quantity)
    setAdditionalSafaQty(1)
    toast.success("Additional Safa added", {
      description: `${quantity} × ${additionalSafaProduct.name}`,
      duration: 2000,
    })
  }

  return (
    <div className={`rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-semibold text-amber-950">
            <Package className="h-4 w-4 text-amber-700" />
            Additional Safa
            <Badge variant="outline" className="border-amber-200 bg-white/80 text-[10px] text-amber-800">
              {additionalSafaProducts.length} options
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-amber-800/70">
            Select additional Safa only from Barati Safa packages.
          </p>
        </div>
        {alreadySelectedSafaQty > 0 && additionalSafaProduct && (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            {alreadySelectedSafaQty} already selected
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_minmax(0,1fr)_100px_auto]">
        <select
          aria-label="Additional Safa package"
          value={additionalSafaPackageId}
          onChange={(event) => {
            setAdditionalSafaPackageId(event.target.value)
            setAdditionalSafaId("")
            setAdditionalSafaQty(1)
          }}
          className="h-10 rounded-md border border-amber-200 bg-white px-3 text-sm text-slate-800 focus:border-amber-400 focus:outline-none"
        >
          <option value="all">All Packages</option>
          {additionalSafaPackages.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
          ))}
        </select>
        <select
          aria-label="Additional Safa product"
          value={additionalSafaId}
          onChange={(event) => {
            setAdditionalSafaId(event.target.value)
            setAdditionalSafaQty(1)
          }}
          className="h-10 min-w-0 rounded-md border border-amber-200 bg-white px-3 text-sm text-slate-800 focus:border-amber-400 focus:outline-none"
        >
          <option value="">Select Barati Safa package product</option>
          {visibleAdditionalSafaProducts.map((product) => (
            <option key={product.id} value={product.id} disabled={(Number(product.stock_available) || 0) <= 0}>
              {getProductSubcategoryName(product)} — {product.name} — Stock {Number(product.stock_available) || 0}
            </option>
          ))}
        </select>
        <Input
          aria-label="Additional Safa quantity"
          type="number"
          min={1}
          max={Math.max(1, additionalSafaAvailable)}
          value={additionalSafaQty}
          onChange={(event) => setAdditionalSafaQty(Math.max(1, Number(event.target.value) || 1))}
          disabled={!additionalSafaProduct || additionalSafaAvailable <= 0}
          className="h-10 border-amber-200 bg-white"
          title={additionalSafaProduct ? `${additionalSafaAvailable} available after current selection` : "Choose a Safa first"}
        />
        <Button
          type="button"
          onClick={addAdditionalSafa}
          disabled={!additionalSafaProduct || additionalSafaAvailable <= 0}
          className="h-10 bg-amber-600 text-white hover:bg-amber-700"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Safa
        </Button>
      </div>
      {additionalSafaProduct && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-amber-900/70">
          <span>Available now: <strong>{additionalSafaAvailable}</strong></span>
          {!hidePricing && (
            <span>Rental price: <strong>₹{Number(additionalSafaProduct.rental_price) || 0}</strong></span>
          )}
        </div>
      )}
    </div>
  )
}
