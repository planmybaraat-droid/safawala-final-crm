"use client"

import { useEffect, useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { printBarcodes } from "@/lib/barcode-print-service"
import { getCurrentUser } from "@/lib/auth"
import { 
  ShoppingBag, 
  Search, 
  Tag, 
  Printer, 
  Palette, 
  Maximize2, 
  Gem, 
  RefreshCw 
} from "lucide-react"

interface CoreProduct {
  id: string
  name: string
  category_id: string
  color: string | null
  size: string | null
  material: string | null
  price: number
  regular_price: number
  stock_available: number
  stock_total: number
  image_url: string | null
  barcode: string | null
  barcode_number: string | null
  is_active: boolean
  created_at: string
}

const MALA_CATEGORY_ID = "c2788e4d-1195-403b-a87b-c98c8974b88c"

export default function RetailCatalogPage() {
  const [products, setProducts] = useState<CoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    getCurrentUser()
      .then((user) => {
        if (mounted) setCurrentUser(user)
      })
      .catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("products")
        .select("*")
        .eq("category_id", MALA_CATEGORY_ID)
        .order("name", { ascending: true })

      if (currentUser?.role !== "super_admin" && currentUser?.franchise_id) {
        query = query.eq("franchise_id", currentUser.franchise_id)
      }

      const { data, error } = await query

      if (error) throw error
      setProducts(data || [])
    } catch (error: any) {
      console.error("Error loading retail catalog:", error)
      toast.error("Failed to load catalog from products table.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [currentUser])

  // Filter products by search term
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.color && p.color.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.material && p.material.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.barcode && p.barcode.includes(searchTerm)) ||
        (p.barcode_number && p.barcode_number.includes(searchTerm))

      return matchesSearch
    })
  }, [products, searchTerm])

  const handlePrintBarcode = async (product: CoreProduct) => {
    setPrintingId(product.id)
    try {
      const barcodeValue = product.barcode || product.barcode_number || `MALA-${product.id.slice(0, 8).toUpperCase()}`
      await printBarcodes({
        barcodes: [
          {
            code: barcodeValue,
            productName: product.name,
            price: product.price,
            regularPrice: product.regular_price > 0 ? product.regular_price : undefined
          }
        ],
        columns: 1,
        barcodeScale: 1
      })
      toast.success(`Sent barcode label for "${product.name}" to printer`)
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to print label: " + err.message)
    } finally {
      setPrintingId(null)
    }
  }

  // Format price in Indian Rupees
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amt)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-gray-900 tracking-tight">Retail Catalog (Malas)</h1>
            <p className="text-muted-foreground text-sm">Visual gallery, specifications, and barcode label printing for jewelry catalog</p>
          </div>
          <Button onClick={fetchProducts} variant="outline" size="sm" className="h-9 border-slate-200">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Catalog
          </Button>
        </div>

        {/* Search Toolbar */}
        <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, color, material or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-slate-200 focus:border-[#102516] focus:ring-[#102516] rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Visual Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Card key={i} className="overflow-hidden border border-slate-100 shadow-sm">
                <div className="aspect-[4/5] bg-slate-100 animate-pulse" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-slate-100 animate-pulse rounded w-1/2" />
                  <div className="h-8 bg-slate-100 animate-pulse rounded mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <ShoppingBag className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No products found</h3>
            <p className="text-slate-500 text-sm max-w-sm text-center mt-1">
              Try adjusting your search terms or run the import script to seed MALA data.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => {
              const stockCount = product.stock_available ?? product.stock_total ?? 0
              const inStock = stockCount > 0
              const barcodeValue = product.barcode || product.barcode_number
              
              return (
                <Card 
                  key={product.id} 
                  className="overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-300 flex flex-col group"
                >
                  {/* Photo Container */}
                  <div className="aspect-[4/5] bg-slate-50 relative overflow-hidden border-b border-slate-100">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <ShoppingBag size={40} className="mb-2 opacity-40" />
                        <span className="text-xs font-medium opacity-60">No Photo Available</span>
                      </div>
                    )}
                    
                    {/* Status / Category Tags */}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-[#102516] hover:bg-[#102516] text-white text-[10px] tracking-wide uppercase px-2.5 py-0.5 rounded-full font-semibold">
                        MALA
                      </Badge>
                    </div>
                  </div>

                  {/* Info Container */}
                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-slate-900 text-base line-clamp-1 mb-1 tracking-tight" title={product.name}>
                      {product.name}
                    </h3>
                    
                    {/* Price Tag */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="font-bold text-lg text-[#102516]">{formatCurrency(product.price)}</span>
                      {product.regular_price > product.price && (
                        <span className="text-xs text-slate-400 line-through">{formatCurrency(product.regular_price)}</span>
                      )}
                    </div>

                    {/* Detailed Specifications */}
                    <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600 mt-auto">
                      {product.color && (
                        <div className="flex items-center gap-2">
                          <Palette size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate"><strong>Color:</strong> {product.color}</span>
                        </div>
                      )}
                      {product.size && (
                        <div className="flex items-center gap-2">
                          <Maximize2 size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate"><strong>Size:</strong> {product.size}</span>
                        </div>
                      )}
                      {product.material && (
                        <div className="flex items-center gap-2">
                          <Gem size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate"><strong>Material:</strong> {product.material}</span>
                        </div>
                      )}
                      {barcodeValue && (
                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500 pt-1">
                          <Tag size={10} className="text-slate-400 shrink-0" />
                          <span>Barcode: {barcodeValue}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Badge 
                        className={`text-[9px] tracking-wide uppercase px-2 py-0.5 rounded-full select-none ${
                          inStock
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                            : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50"
                        }`}
                      >
                        {inStock ? "In Stock" : "Out of Stock"} ({stockCount} pc)
                      </Badge>
                      <Button
                        onClick={() => handlePrintBarcode(product)}
                        disabled={printingId === product.id}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs hover:bg-slate-50 border-slate-200/80 rounded-lg"
                      >
                        {printingId === product.id ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Printer className="h-3 w-3 mr-1" />
                        )}
                        Label
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
