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
  /** Restrict Barati Safa's visible package choices in the booking flow. */
  limitBaratiSafaPackages?: boolean
  /** Hide the broad all-items filter buttons when a focused catalogue is required. */
  hideAllCategoryOptions?: boolean
  hideAllSubcategoryOptions?: boolean
  defaultCategoryName?: string
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
  limitBaratiSafaPackages = false,
  hideAllCategoryOptions = false,
  hideAllSubcategoryOptions = false,
  defaultCategoryName,
  className = "",
}: ProductSelectorProps) {
  const [productSearch, setProductSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
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

  // Filter products based on search and categories
  const filteredProducts = useMemo(() => {
    let result = products

    // Hide products whose category is restricted to the other transaction type
    result = result.filter((p) => {
      const type = p.category_id ? categoryTypeById.get(p.category_id) : undefined
      if (!type || type === "both") return true
      return type === bookingType
    })

    // Filter by category
    if (selectedCategory) {
      result = result.filter((p) => p.category_id === selectedCategory)
    }

    // In the booking flow, Barati Safa only exposes Package 1–3. This also
    // prevents products from hidden packages appearing under “All Subcategories”.
    if (limitBaratiSafaPackages && selectedCategoryName === "BARATI SAFA") {
      const allowedIds = new Set(baratiSafaSubcategories.map((subcategory) => subcategory.id))
      result = result.filter((p) => p.subcategory_id && allowedIds.has(p.subcategory_id))
    }

    // Filter by subcategory
    if (selectedSubcategory) {
      result = result.filter((p) => p.subcategory_id === selectedSubcategory)
    }

    // Filter by search (supports name, category, barcode and known code fields)
    if (productSearch) {
      const term = productSearch.toLowerCase()
      result = result.filter(
        (p) => {
          const matchesNameOrCategory = p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
          const matchesBarcode = p.barcode ? String(p.barcode).toLowerCase().includes(term) : false
          const matchesProductCode = p.product_code ? String(p.product_code).toLowerCase().includes(term) : false
          const matchesAnyBarcode = Array.isArray(p.all_barcode_numbers)
            ? p.all_barcode_numbers.some((b) => String(b).toLowerCase().includes(term))
            : false
          return matchesNameOrCategory || matchesBarcode || matchesProductCode || matchesAnyBarcode
        }
      )
    }

    // Sort: selected items first, then rest
    const selectedIds = new Set(selectedItems.map(i => i.product_id))
    result = [...result].sort((a, b) => {
      const aSelected = selectedIds.has(a.id) ? 0 : 1
      const bSelected = selectedIds.has(b.id) ? 0 : 1
      return aSelected - bSelected
    })

    return result
  }, [products, productSearch, selectedCategory, selectedSubcategory, selectedItems, categoryTypeById, bookingType, limitBaratiSafaPackages, selectedCategoryName, baratiSafaSubcategories])

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
  }, [productSearch, selectedCategory, selectedSubcategory])

  return (
    <Card className={className}>
      <CardHeader>
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
      <CardContent className="space-y-4">
        {/* Category Filter Buttons */}
        {categories.filter((cat) => !cat.type || cat.type === "both" || cat.type === bookingType).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {!hideAllCategoryOptions && (
              <Button
                size="sm"
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => {
                  setSelectedCategory(null)
                  setSelectedSubcategory(null)
                }}
                className="h-7 px-3 text-xs font-normal"
              >
                All Categories
              </Button>
            )}
            {categories.filter((cat) => !cat.type || cat.type === "both" || cat.type === bookingType).map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => {
                  setSelectedCategory(cat.id)
                  setSelectedSubcategory(null)
                }}
                className="h-7 px-3 text-xs font-normal"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        )}

        {/* Subcategory Filter Buttons - Show only when category is selected */}
        {selectedCategory && visibleSubcategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {!hideAllSubcategoryOptions && (
                <Button
                  size="sm"
                  variant={selectedSubcategory === null ? "default" : "outline"}
                  onClick={() => setSelectedSubcategory(null)}
                  className="h-7 px-3 text-xs font-normal"
                >
                  All Subcategories
                </Button>
              )}
              {visibleSubcategories.map((subcat) => (
                  <Button
                    key={subcat.id}
                    size="sm"
                    variant={selectedSubcategory === subcat.id ? "default" : "outline"}
                    onClick={() => setSelectedSubcategory(subcat.id)}
                    className="h-7 px-3 text-xs font-normal"
                  >
                    {subcat.name}
                  </Button>
                ))}
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

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products by name or category..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="pl-10"
          />
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
                    setSelectedCategory(null)
                    setSelectedSubcategory(null)
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
                    <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center text-xs text-muted-foreground overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Package className="h-8 w-8 text-gray-300" />
                          <span>No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="font-semibold line-clamp-2 mb-0.5 min-h-[2.5rem] text-xs leading-snug" title={product.name}>
                      {product.name}
                    </div>
                    <div className="text-[10px] text-gray-500 mb-2">{product.category}</div>

                    {/* Price — editable when selected */}
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
