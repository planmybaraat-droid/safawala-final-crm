"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Archive, RotateCcw, Eye, ArrowLeft, Loader2, AlertCircle, PackageX, Package } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ArchivedProduct {
  id: string
  product_id: string
  product_name: string
  product_code?: string
  barcode?: string
  category: string
  reason: string
  notes?: string
  archived_at: string
  archived_by: string
  original_rental_price?: number
  original_sale_price?: number
  image_url?: string
  quantity?: number
}

interface Product {
  id: string
  name: string
  product_code?: string
  barcode?: string
  category: string
  rental_price: number
  sale_price: number
  stock_available: number
  image_url?: string
}

const archiveReasons = [
  { value: "lost", label: "Lost", color: "bg-red-500" },
  { value: "damaged", label: "Damaged", color: "bg-orange-500" },
  { value: "stolen", label: "Stolen", color: "bg-purple-500" },
  { value: "worn_out", label: "Worn Out", color: "bg-yellow-500" },
  { value: "discontinued", label: "Discontinued", color: "bg-gray-500" },
  { value: "sold", label: "Sold (Permanent)", color: "bg-green-500" },
  { value: "other", label: "Other", color: "bg-blue-500" },
]

export default function ProductArchivePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [archivedProducts, setArchivedProducts] = useState<ArchivedProduct[]>([])
  const [activeProducts, setActiveProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [reasonFilter, setReasonFilter] = useState("all")
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedArchived, setSelectedArchived] = useState<ArchivedProduct | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [archiving, setArchiving] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const [archiveForm, setArchiveForm] = useState({
    product_id: "",
    reason: "lost",
    notes: "",
    quantity: 1,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/product-archive", {
        method: "GET",
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load data")
      }

      setArchivedProducts(data.archived || [])
      setActiveProducts(data.products || [])
    } catch (error: any) {
      console.error("Error loading data:", error)
      toast.error(error.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleArchiveProduct = async () => {
    if (!selectedProduct || !archiveForm.reason) {
      toast.error("Please select a product and reason")
      return
    }

    if (archiveForm.quantity < 1 || archiveForm.quantity > selectedProduct.stock_available) {
      toast.error(`Please enter a valid quantity between 1 and ${selectedProduct.stock_available}`)
      return
    }

    try {
      setArchiving(true)

      const response = await fetch("/api/product-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          product_code: selectedProduct.product_code,
          barcode: selectedProduct.barcode,
          category: selectedProduct.category,
          reason: archiveForm.reason,
          notes: archiveForm.notes,
          original_rental_price: selectedProduct.rental_price,
          original_sale_price: selectedProduct.sale_price,
          image_url: selectedProduct.image_url,
          quantity: archiveForm.quantity,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to archive product")
      }

      toast.success(`${archiveForm.quantity} unit(s) of ${selectedProduct.name} archived`)
      setShowArchiveDialog(false)
      setArchiveForm({ product_id: "", reason: "lost", notes: "", quantity: 1 })
      setSelectedProduct(null)
      fetchData()
    } catch (error: any) {
      console.error("Error archiving product:", error)
      toast.error(error.message || "Failed to archive product")
    } finally {
      setArchiving(false)
    }
  }

  const handleRestoreProduct = async () => {
    if (!selectedArchived) return

    try {
      setRestoring(true)

      const response = await fetch(`/api/product-archive?id=${selectedArchived.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to restore product")
      }

      toast.success(`Product restored: ${selectedArchived.product_name}`)
      setShowRestoreDialog(false)
      setSelectedArchived(null)
      fetchData()
    } catch (error: any) {
      console.error("Error restoring product:", error)
      toast.error(error.message || "Failed to restore product")
    } finally {
      setRestoring(false)
    }
  }

  const filteredArchived = useMemo(() => {
    let filtered = archivedProducts

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.product_name.toLowerCase().includes(search) ||
          item.product_code?.toLowerCase().includes(search) ||
          item.barcode?.toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search)
      )
    }

    if (reasonFilter !== "all") {
      filtered = filtered.filter((item) => item.reason === reasonFilter)
    }

    return filtered
  }, [archivedProducts, searchTerm, reasonFilter])

  const paginatedArchived = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredArchived.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredArchived, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredArchived.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, reasonFilter])

  const getReasonBadge = (reason: string) => {
    const reasonObj = archiveReasons.find((r) => r.value === reason)
    return (
      <Badge className={`${reasonObj?.color || "bg-gray-500"} text-white`}>
        {reasonObj?.label || reason}
      </Badge>
    )
  }

  const stats = {
    total: archivedProducts.length,
    lost: archivedProducts.filter((p) => p.reason === "lost").length,
    damaged: archivedProducts.filter((p) => p.reason === "damaged").length,
    stolen: archivedProducts.filter((p) => p.reason === "stolen").length,
    other: archivedProducts.filter((p) => !["lost", "damaged", "stolen"].includes(p.reason)).length,
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <p className="text-sm text-gray-500">Loading product archive...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">📦 Product Archive</h2>
            <p className="text-muted-foreground">Manage lost, damaged, and discontinued products</p>
          </div>
        </div>
        <Button onClick={() => setShowArchiveDialog(true)}>
          <Archive className="h-4 w-4 mr-2" />
          Archive Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Archived</CardTitle>
            <PackageX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lost</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.lost}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Damaged</CardTitle>
            <PackageX className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.damaged}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stolen</CardTitle>
            <AlertCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.stolen}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Other</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.other}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search archived products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            {archiveReasons.map((reason) => (
              <SelectItem key={reason.value} value={reason.value}>
                {reason.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Archived Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Archived Products</CardTitle>
          <CardDescription>Products that are no longer available for booking</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredArchived.length === 0 ? (
            <div className="text-center py-12">
              <PackageX className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No archived products</h3>
              <p className="mt-1 text-sm text-gray-500">Archive lost or damaged products to keep records.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Code/Barcode</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Archived Date</TableHead>
                    <TableHead>Original Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedArchived.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.product_name} className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <span className="font-medium">{item.product_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.product_code && <div>Code: {item.product_code}</div>}
                          {item.barcode && <div className="text-muted-foreground">Barcode: {item.barcode}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{item.quantity || 1}</TableCell>
                      <TableCell>{getReasonBadge(item.reason)}</TableCell>
                      <TableCell>{new Date(item.archived_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Rental: ₹{item.original_rental_price || 0}</div>
                          <div className="text-muted-foreground">Sale: ₹{item.original_sale_price || 0}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedArchived(item)
                              setShowViewDialog(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedArchived(item)
                              setShowRestoreDialog(true)
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {filteredArchived.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredArchived.length)} of {filteredArchived.length} products
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
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <div className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Archive Product Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Archive Product</DialogTitle>
            <DialogDescription>Move a product to archive (lost, damaged, etc.)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Product</Label>
              <Select
                value={selectedProduct?.id || ""}
                onValueChange={(value) => {
                  const product = activeProducts.find((p) => p.id === value)
                  setSelectedProduct(product || null)
                  setArchiveForm({ ...archiveForm, product_id: value, quantity: 1 })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product to archive" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {activeProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - Stock: {product.stock_available}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="h-20 w-20 rounded object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded bg-gray-200 flex items-center justify-center">
                    <Package className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="font-medium">{selectedProduct.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedProduct.category}</div>
                  <div className="text-sm text-muted-foreground">
                    Rental: ₹{selectedProduct.rental_price} | Sale: ₹{selectedProduct.sale_price}
                  </div>
                  <div className="text-sm text-muted-foreground">Stock: {selectedProduct.stock_available}</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason for Archiving</Label>
              <Select value={archiveForm.reason} onValueChange={(value) => setArchiveForm({ ...archiveForm, reason: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {archiveReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <div className="space-y-2">
                <Label>Quantity to Archive</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={selectedProduct.stock_available}
                    value={archiveForm.quantity}
                    onChange={(e) => {
                      const value = Math.min(Math.max(1, parseInt(e.target.value) || 1), selectedProduct.stock_available)
                      setArchiveForm({ ...archiveForm, quantity: value })
                    }}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-500">/ {selectedProduct.stock_available} available</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any additional details about why this product is being archived..."
                value={archiveForm.notes}
                onChange={(e) => setArchiveForm({ ...archiveForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)} disabled={archiving}>
              Cancel
            </Button>
            <Button onClick={handleArchiveProduct} disabled={!selectedProduct || archiving}>
              {archiving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Product
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Details</DialogTitle>
          </DialogHeader>
          {selectedArchived && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedArchived.image_url ? (
                  <img src={selectedArchived.image_url} alt={selectedArchived.product_name} className="h-24 w-24 rounded object-cover" />
                ) : (
                  <div className="h-24 w-24 rounded bg-gray-200 flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-lg">{selectedArchived.product_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedArchived.category}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Product Code</Label>
                  <p>{selectedArchived.product_code || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Barcode</Label>
                  <p>{selectedArchived.barcode || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <div className="mt-1">{getReasonBadge(selectedArchived.reason)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Archived Date</Label>
                  <p>{new Date(selectedArchived.archived_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', hour12: true })}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Original Rental Price</Label>
                  <p>₹{selectedArchived.original_rental_price || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Original Sale Price</Label>
                  <p>₹{selectedArchived.original_sale_price || 0}</p>
                </div>
              </div>
              {selectedArchived.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1 text-sm">{selectedArchived.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Product?</DialogTitle>
            <DialogDescription>
              This will remove the product from archive and restore 1 unit to inventory. The product will be available for booking again.
            </DialogDescription>
          </DialogHeader>
          {selectedArchived && (
            <div className="py-4">
              <div className="font-medium">{selectedArchived.product_name}</div>
              <div className="text-sm text-muted-foreground">{selectedArchived.category}</div>
              <div className="mt-2 text-sm">
                Archived Reason: <span className="font-medium">{archiveReasons.find((r) => r.value === selectedArchived.reason)?.label}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)} disabled={restoring}>
              Cancel
            </Button>
            <Button onClick={handleRestoreProduct} disabled={restoring} className="bg-green-600 hover:bg-green-700">
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Product
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
