"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Plus, Minus, RefreshCw, ShoppingCart, Package, QrCode } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { BarcodeInput } from "@/components/barcode/barcode-input"

type Product = {
  id: string
  name: string
  category?: string | null
  price?: number | null
  rental_price?: number | null
  stock_available?: number | null
  barcode?: string | null
  product_code?: string | null
}

type BookingItem = {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  product?: { name?: string | null }
}

export default function SelectProductsForBookingPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const bookingId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [booking, setBooking] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<Record<string, { qty: number; unit: number }>>({})
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")

  useEffect(() => {
    if (!bookingId) return
    ;(async () => {
      try {
        setLoading(true)
        // Load booking with existing items
        const { data: bk, error: bErr } = await supabase
          .from("bookings")
          .select(
            `*, booking_items(id, product_id, quantity, unit_price, total_price, product:products(name))`
          )
          .eq("id", bookingId)
          .single()
        if (bErr) throw bErr
        setBooking(bk)
        // Seed items map from existing items
        const next: Record<string, { qty: number; unit: number }> = {}
        for (const it of (bk as any).booking_items || []) {
          next[it.product_id] = { qty: it.quantity, unit: Number(it.unit_price || 0) }
        }
        setItems(next)

        // Load products
        let productsQuery = supabase
          .from("products")
          .select("id, name, category, price, rental_price, stock_available, barcode, product_code")
          .order("name", { ascending: true })

        if (bk?.franchise_id) {
          productsQuery = productsQuery.eq("franchise_id", bk.franchise_id)
        }

        const { data: prods, error: pErr } = await productsQuery
        if (pErr) throw pErr
        setProducts(prods || [])
      } catch (e) {
        console.error(e)
        toast({ title: "Error", description: "Failed to load booking/products", variant: "destructive" })
        router.push("/bookings")
      } finally {
        setLoading(false)
      }
    })()
  }, [bookingId])

  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchesSearch =
        !s ||
        p.name.toLowerCase().includes(s) ||
        (p.category || "").toLowerCase().includes(s) ||
        (p.barcode ? String(p.barcode).toLowerCase().includes(s) : false) ||
        (p.product_code ? String(p.product_code).toLowerCase().includes(s) : false)
      const matchesCategory = category === "all" || (p.category || "").toLowerCase() === category.toLowerCase()
      return matchesSearch && matchesCategory
    })
  }, [products, search, category])

  const addProduct = (p: Product) => {
    const stock = typeof p.stock_available === 'number' ? p.stock_available : undefined
    setItems((prev) => {
      const current = prev[p.id]?.qty || 0
      const nextQty = current + 1
      
      if (typeof stock === 'number' && nextQty > stock) {
        toast({ title: "Out of stock", description: `Only ${stock} available`, variant: "destructive" })
        return prev
      }
      const unit = Number((booking?.type === "rental" ? p.rental_price : p.price) || 0)
      return { ...prev, [p.id]: { qty: nextQty, unit } }
    })
  }

  const updateQty = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId)
    const stock = product && typeof product.stock_available === 'number' ? product.stock_available : undefined
    
    // normalize to integer
    const nextQty = Math.floor(qty)
    
    // Remove item if qty is 0 or less
    if (!nextQty || nextQty <= 0) {
      setItems((prev) => {
        const { [productId]: _, ...rest } = prev
        return rest
      })
      return
    }
    
    // Check stock limit
    if (typeof stock === 'number' && nextQty > stock) {
      toast({ title: "Stock limit", description: `Max ${stock} available`, variant: "destructive" })
      return
    }
    
    setItems((prev) => {
      const currentUnit = prev[productId]?.unit
      if (currentUnit !== undefined) {
        // Item already exists, just update qty
        return { ...prev, [productId]: { qty: nextQty, unit: currentUnit } }
      }
      // This shouldn't happen, but fallback
      return prev
    })
  }

  const totals = useMemo(() => {
    const entries = Object.entries(items)
    const subtotal = entries.reduce((s, [_, v]) => s + v.qty * v.unit, 0)
    return {
      itemCount: entries.reduce((s, [_, v]) => s + v.qty, 0),
      subtotal,
    }
  }, [items])

  const saveSelection = async (confirmAfter = false) => {
    if (!booking) return
    try {
      setSaving(true)
      const selection = Object.entries(items).map(([product_id, v]) => ({
        booking_id: bookingId,
        product_id,
        quantity: v.qty,
        unit_price: v.unit,
        total_price: v.qty * v.unit,
        franchise_id: booking.franchise_id,
      }))

      // Replace existing items with new selection (simple strategy)
      await supabase.from("booking_items").delete().eq("booking_id", bookingId)
      if (selection.length > 0) {
        const { error: insErr } = await supabase.from("booking_items").insert(selection)
        if (insErr) throw insErr
      }

      // Optionally confirm booking after selection
      if (confirmAfter) {
        await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId)
      }

      toast({ title: "Saved", description: "Product selection saved" })
      router.push(`/bookings/${bookingId}`)
    } catch (e: any) {
      console.error(e)
      toast({ title: "Error", description: e?.message || "Failed to save selection", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!booking) return null

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push(`/bookings/${bookingId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Select Products</h2>
            <p className="text-muted-foreground text-sm">Booking #{booking.booking_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => saveSelection(false)} disabled={saving}>
            Save
          </Button>
          <Button onClick={() => saveSelection(true)} disabled={saving}>
            Save & Confirm
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Quick Barcode Scanner */}
            <Card className="mb-4 bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="h-5 w-5" />
                  Quick Add by Barcode Scanner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarcodeInput
                  onScan={async (code) => {
                    // First try to find by barcode in product_items (individual items)
                    const { data: itemData, error: itemError } = await supabase
                      .from('product_items')
                      .select('*, product:products(*)')
                      .eq('barcode', code)
                      .eq('status', 'available')
                      .single()
                    
                    if (itemData && itemData.product) {
                      // Found individual item - add its product
                      const product = itemData.product as any
                      const mappedProduct: Product = {
                        id: product.id,
                        name: product.name,
                        category: product.category,
                        price: product.sale_price,
                        rental_price: product.rental_price,
                        stock_available: product.stock_available
                      }
                      addProduct(mappedProduct)
                      toast({
                        title: "✅ Item scanned!",
                        description: `${product.name} (${itemData.item_code}) added to booking`
                      })
                    } else {
                      // Try to find by product barcode or code
                      const product = products.find(
                        (p) => (p as any).barcode === code || (p as any).product_code === code
                      )
                      
                      if (product) {
                        addProduct(product)
                        toast({
                          title: "✅ Product added!",
                          description: `${product.name} added to cart`
                        })
                      } else {
                        toast({
                          title: "❌ Not found",
                          description: `No product or item found with code: ${code}`,
                          variant: "destructive"
                        })
                      }
                    }
                  }}
                  placeholder="Scan item barcode or product barcode..."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Scan individual item barcodes or product barcodes. Each scan adds 1 quantity automatically.
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1">
                <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Array.from(new Set(products.map((p) => p.category || "").filter(Boolean))).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const selected = items[p.id]?.qty || 0
                const unit = items[p.id]?.unit ?? Number((booking?.type === "rental" ? p.rental_price : p.price) || 0)
                const isAtStock = typeof p.stock_available === 'number' && selected >= p.stock_available
                
                return (
                  <div key={p.id} className="border rounded-md p-3 flex flex-col gap-2 hover:bg-muted/30 transition-colors">
                    <div className="font-medium truncate" title={p.name}>{p.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline">{p.category || "General"}</Badge>
                      {(p.barcode || p.product_code) && (
                        <span className="font-mono">{p.barcode || p.product_code}</span>
                      )}
                      {typeof p.stock_available === 'number' && (
                        <span className={selected > 0 ? "font-semibold" : ""}>Stock: {p.stock_available}</span>
                      )}
                    </div>
                    <div className="text-sm font-medium">₹{unit}/unit</div>
                    
                    {selected > 0 ? (
                      <div className="flex flex-col gap-2 mt-auto">
                        <div className="flex items-center gap-1 bg-blue-50 rounded p-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 w-7 p-0"
                            onClick={() => updateQty(p.id, selected - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-semibold flex-1 text-center">{selected}</span>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 w-7 p-0"
                            onClick={() => updateQty(p.id, selected + 1)}
                            disabled={isAtStock}
                            title={isAtStock ? `Max ${p.stock_available} available` : ""}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-xs font-semibold text-blue-600">
                          Total: ₹{(selected * unit).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        className="mt-auto w-full"
                        onClick={() => addProduct(p)}
                        disabled={p.stock_available !== null && p.stock_available !== undefined && p.stock_available <= 0}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add to Cart
                      </Button>
                    )}
                  </div>
                )
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center text-sm text-muted-foreground border rounded p-6">
                  No products match your search
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Selection Summary
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{Object.keys(items).length} item{Object.keys(items).length !== 1 ? 's' : ''} selected</p>
          </CardHeader>
          <CardContent>
            {Object.keys(items).length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                <p>No items selected yet</p>
                <p className="text-xs mt-1">Add products from the left to see them here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(items).map(([pid, v]) => {
                  const p = products.find((x) => x.id === pid)
                  if (!p) return null
                  return (
                    <div key={pid} className="border-b pb-3 last:border-b-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold leading-tight text-balance" title={p.name}>{p.name}</div>
                          <div className="text-[11px] text-muted-foreground">{p.category || "General"}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                          onClick={() => updateQty(pid, 0)}
                          title="Remove item"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 w-6 p-0"
                            onClick={() => updateQty(pid, v.qty - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-bold w-8 text-center">{v.qty}</span>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 w-6 p-0"
                            onClick={() => updateQty(pid, v.qty + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-bold text-right">₹{(v.qty * v.unit).toLocaleString()}</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground flex justify-between px-2">
                        <span>₹{v.unit} × {v.qty}</span>
                        <span className="font-semibold text-foreground">= ₹{(v.qty * v.unit).toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })}

                <Separator className="my-2" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-semibold">{totals.itemCount}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-blue-600 bg-blue-50 p-2 rounded">
                    <span>Subtotal:</span>
                    <span>₹{totals.subtotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => saveSelection(false)} 
                    disabled={saving}
                  >
                    Save
                  </Button>
                  <Button 
                    className="w-full" 
                    onClick={() => saveSelection(true)} 
                    disabled={saving || Object.keys(items).length === 0}
                  >
                    Save & Confirm Booking
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
