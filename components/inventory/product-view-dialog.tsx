"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Package,
  Barcode,
  Printer,
  Download,
  Archive,
  AlertTriangle,
  CheckCircle,
  FileText,
  ImageIcon,
  Settings,
  Layers,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { generateBarcode, generateBarcodeLabel } from "@/lib/barcode-generator"
import { doPrint } from "./barcode-print-dialog"
import { BarcodePrinter } from "@/components/inventory/barcode-printer"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// Fixed import path for ProductItemService
import { ProductItemService } from "@/lib/services/product-item-service"

interface Product {
  id: string
  product_code?: string
  name: string
  description?: string
  brand?: string
  size?: string
  color?: string
  material?: string
  price: number
  rental_price: number
  cost_price: number
  security_deposit: number
  stock_total: number
  stock_available: number
  stock_booked: number
  stock_damaged: number
  stock_in_laundry: number
  reorder_level: number
  usage_count: number
  damage_count: number
  barcode?: string
  qr_code?: string
  is_active: boolean
  created_at: string
  updated_at: string
  category_id?: string
  subcategory_id?: string
  franchise_id?: string
  image_url?: string // Added image_url field
}

interface ProductViewDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductViewDialog({ product, open, onOpenChange }: ProductViewDialogProps) {
  const [printing, setPrinting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [barcodePrinterOpen, setBarcodePrinterOpen] = useState(false)
  const [generatedBarcode, setGeneratedBarcode] = useState<string>("")
  const [itemBarcodes, setItemBarcodes] = useState<
    Array<{
      id: string
      item_code: string
      barcode: string
      status: string
    }>
  >([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [showAllBarcodes, setShowAllBarcodes] = useState(false)
  const [variations, setVariations] = useState<any[]>([])
  const [loadingVariations, setLoadingVariations] = useState(false)
  const [variationBarcodeImages, setVariationBarcodeImages] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && product) {
      loadItemBarcodes()
      loadVariations()
    }
  }, [open, product])

  if (!product) return null

  const loadVariations = async () => {
    if (!product) return
    setLoadingVariations(true)
    try {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })

      if (error) throw error
      setVariations(data || [])

      // Generate barcode images
      const images: Record<string, string> = {}
      for (const v of (data || [])) {
        if (v.barcode) {
          try {
            images[v.barcode] = generateBarcode(v.barcode)
          } catch { /* ignore */ }
        }
      }
      setVariationBarcodeImages(images)
    } catch {
    } finally {
      setLoadingVariations(false)
    }
  }

  const handlePrintBarcode = async () => {
    setPrinting(true)
    try {
      const p = product as any
      await doPrint(
        p.barcode || "",
        p.name,
        1,
        p.regular_price || undefined,
        p.price || undefined,
        p.color,
        p.size,
        p.material
      )
      toast({
        title: "Success",
        description: "Barcode sent to printer",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to print barcode",
        variant: "destructive",
      })
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadBarcode = async () => {
    setDownloading(true)
    try {
      const labelImage = generateBarcodeLabel({
        barcodeText: product.barcode || "",
        variationName: product.name,
        mrp: product.price,
      })

      const link = document.createElement("a")
      link.href = labelImage
      link.download = `barcode-${product.name.replace(/[^a-zA-Z0-9]/g, "_")}-${product.barcode ?? ""}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Success",
  description: `Barcode downloaded: ${product.name} (${product.barcode ?? ""})`,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to download barcode",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleGenerateBarcode = async () => {
    try {
      const barcodeDataURL = generateBarcode(product.barcode || "")
      setGeneratedBarcode(barcodeDataURL)
      toast({
        title: "Success",
        description: "Barcode image generated for printing/downloading.",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate barcode",
        variant: "destructive",
      })
    }
  }

  // Fixed barcode generation to use correct generateBarcode function
  const loadItemBarcodes = async () => {
    setLoadingItems(true)
    try {
      const items = await ProductItemService.getProductItems(product.id, product.franchise_id)
      const itemsWithBarcodes = await Promise.all(
        items.map(async (item) => {
          try {
            const barcodeDataUrl = generateBarcode(item.item_code)
            return {
              ...item,
              barcode: barcodeDataUrl,
            }
          } catch {
            return {
              ...item,
              barcode: "", // Will fallback to placeholder
            }
          }
        }),
      )
      setItemBarcodes(itemsWithBarcodes)
    } catch {
      toast({
        title: "Error",
        description: "Failed to load item barcodes",
        variant: "destructive",
      })
    } finally {
      setLoadingItems(false)
    }
  }

  const downloadBarcodesAsPDF = async () => {
    setDownloadingPDF(true)
    try {
      // Dynamic import of jsPDF to avoid SSR issues
      const { jsPDF } = await import("jspdf")

      if (itemBarcodes.length === 0) {
        toast({
          title: "No Barcodes",
          description: "No item barcodes available to download",
          variant: "destructive",
        })
        return
      }

      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // Configuration
      const margin = 10
      const barcodeWidth = 60
      const barcodeHeight = 20
      const textHeight = 8
      const itemHeight = barcodeHeight + textHeight + 5
      const itemsPerRow = Math.floor((pageWidth - 2 * margin) / (barcodeWidth + 5))
      const itemsPerPage = Math.floor((pageHeight - 2 * margin - 20) / itemHeight) * itemsPerRow

      // Add title
      pdf.setFontSize(16)
      pdf.setFont("helvetica", "bold")
      pdf.text(`${product.name} - Item Barcodes`, margin, margin + 10)

      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      pdf.text(`Barcode: ${product.barcode ?? ""}`, margin, margin + 18)
      pdf.text(`www.safawala.com  |  MRP - \u20B9${product.price}/-`, margin, margin + 25)
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, margin + 32)

      let currentPage = 1
      let yPosition = margin + 42

      for (let i = 0; i < itemBarcodes.length; i++) {
        const item = itemBarcodes[i]
        const row = Math.floor((i % itemsPerPage) / itemsPerRow)
        const col = (i % itemsPerPage) % itemsPerRow

        // Check if we need a new page
        if (i > 0 && i % itemsPerPage === 0) {
          pdf.addPage()
          currentPage++
          yPosition = margin + 10
        }

        const xPosition = margin + col * (barcodeWidth + 5)
        const currentYPosition = yPosition + row * itemHeight

        // Add barcode image if available
        if (item.barcode && item.barcode.startsWith("data:image")) {
          try {
            pdf.addImage(item.barcode, "PNG", xPosition, currentYPosition, barcodeWidth, barcodeHeight)
          } catch {
            // Draw a placeholder rectangle if image fails
            pdf.rect(xPosition, currentYPosition, barcodeWidth, barcodeHeight)
            pdf.text("Barcode Error", xPosition + 5, currentYPosition + 10)
          }
        } else {
          // Draw placeholder rectangle
          pdf.rect(xPosition, currentYPosition, barcodeWidth, barcodeHeight)
          pdf.text("No Barcode", xPosition + 5, currentYPosition + 10)
        }

        // Add serial code below barcode
        pdf.setFontSize(8)
        pdf.setFont("helvetica", "normal")
        const textX = xPosition + barcodeWidth / 2
        pdf.text(item.item_code, textX, currentYPosition + barcodeHeight + 5, { align: "center" })

        // Add status
        pdf.setFontSize(6)
        pdf.text(item.status.toUpperCase(), textX, currentYPosition + barcodeHeight + 10, { align: "center" })
      }

      // Add page numbers
      const totalPages = Math.ceil(itemBarcodes.length / itemsPerPage)
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 5)
      }

      // Save the PDF
      const fileName = `${product.name.replace(/[^a-zA-Z0-9]/g, "_")}_barcodes_${new Date().toISOString().split("T")[0]}.pdf`
      pdf.save(fileName)

      toast({
        title: "Success",
        description: `PDF downloaded: ${itemBarcodes.length} barcodes`,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloadingPDF(false)
    }
  }

  const getStockStatus = () => {
    if (product.stock_available <= 0) {
      return { label: "Out of Stock", color: "destructive", icon: AlertTriangle }
    } else if (product.stock_available <= product.reorder_level) {
      return { label: "Low Stock", color: "warning", icon: AlertTriangle }
    } else {
      return { label: "In Stock", color: "success", icon: CheckCircle }
    }
  }

  const stockStatus = getStockStatus()
  const StockIcon = stockStatus.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>{product.name}</span>
          </DialogTitle>
          <DialogDescription>
            Barcode: {product.barcode || "—"} • Created: {new Date(product.created_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="lg:col-span-2 space-y-6">
            {product.image_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Product Image</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <img
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="max-w-full h-auto max-h-64 rounded-lg border object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = "none"
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                    <p className="font-mono">{product.barcode || "—"}</p>
                  </div>
                  {product.brand && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Brand</label>
                      <p>{product.brand}</p>
                    </div>
                  )}
                  {product.size && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Size</label>
                      <p>{product.size}</p>
                    </div>
                  )}
                </div>
                {product.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm">{product.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Archive className="h-4 w-4" />
                  <span>Stock Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stock Status</span>
                    <Badge variant={stockStatus.color as any} className="flex items-center space-x-1">
                      <StockIcon className="h-3 w-3" />
                      <span>{stockStatus.label}</span>
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Stock</label>
                      <p className="text-lg font-semibold">{product.stock_total}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Available</label>
                      <p className="text-lg font-semibold text-green-600">{product.stock_available}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Booked</label>
                      <p className="text-lg font-semibold text-blue-600">{product.stock_booked}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Damaged</label>
                      <p className="text-lg font-semibold text-red-600">{product.stock_damaged}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Variations */}
            {(loadingVariations || variations.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Layers className="h-4 w-4" />
                    <span>Variations</span>
                    {variations.length > 0 && (
                      <Badge variant="secondary">{variations.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Product color, design, and material variations with individual barcodes</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingVariations ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Variation Quantity Summary */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="rounded-lg border p-2 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                          <p className="text-base font-bold">{variations.reduce((s, v) => s + (v.stock_total || 0), 0)}</p>
                        </div>
                        <div className="rounded-lg border p-2 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Available</p>
                          <p className="text-base font-bold text-green-600">{variations.reduce((s, v) => s + (v.stock_available || 0), 0)}</p>
                        </div>
                        <div className="rounded-lg border p-2 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Booked</p>
                          <p className="text-base font-bold text-blue-600">{variations.reduce((s, v) => s + (v.stock_booked || 0), 0)}</p>
                        </div>
                        <div className="rounded-lg border p-2 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase">Damaged</p>
                          <p className="text-base font-bold text-red-600">{variations.reduce((s, v) => s + (v.stock_damaged || 0), 0)}</p>
                        </div>
                      </div>

                      {/* Variations Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Variation</TableHead>
                              <TableHead className="text-center">Total</TableHead>
                              <TableHead className="text-center">Avail.</TableHead>
                              <TableHead className="text-center">Booked</TableHead>
                              <TableHead className="text-center">Dmg.</TableHead>
                              <TableHead>Barcode</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {variations.map((v) => (
                              <TableRow key={v.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {v.color && (
                                      <div
                                        className="w-3 h-3 rounded-full border flex-shrink-0"
                                        style={{ backgroundColor: v.color.toLowerCase() }}
                                      />
                                    )}
                                    <div>
                                      <p className="text-sm font-medium">{v.variation_name}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {[v.color, v.design, v.material, v.size].filter(Boolean).join(" · ")}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center font-medium">{v.stock_total || 0}</TableCell>
                                <TableCell className="text-center text-green-600 font-medium">{v.stock_available || 0}</TableCell>
                                <TableCell className="text-center text-blue-600 font-medium">{v.stock_booked || 0}</TableCell>
                                <TableCell className="text-center text-red-600 font-medium">{v.stock_damaged || 0}</TableCell>
                                <TableCell>
                                  {v.barcode ? (
                                    <div className="flex items-center gap-1">
                                      {variationBarcodeImages[v.barcode] && (
                                        <img src={variationBarcodeImages[v.barcode]} alt="" className="h-6 w-auto max-w-[60px]" />
                                      )}
                                      <span className="text-[10px] font-mono text-muted-foreground">{v.barcode}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Barcode & QR Code */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Barcode className="h-4 w-4" />
                  <span>Barcode & QR Code</span>
                </CardTitle>
                <CardDescription>Auto-generated product identifiers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(product.barcode && product.barcode.startsWith("data:image")) || generatedBarcode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                      <div className="border rounded-lg p-4 bg-white mt-2 flex items-center justify-center min-h-[100px]">
                        <img
                          src={
                            generatedBarcode ||
                            generateBarcode(product.barcode || "") ||
                            "/placeholder.svg"
                          }
                          alt="Product Barcode"
                          className="w-full h-auto max-w-[300px]"
                        />
                      </div>
                      <p className="text-center font-mono text-sm mt-2">{product.barcode}</p>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => setBarcodePrinterOpen(true)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print Labels
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Barcode className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">No 11-digit barcode found for this product</p>
                    <Button size="sm" onClick={handleGenerateBarcode}>
                      <Barcode className="h-4 w-4 mr-2" />
                      Generate Barcode Image
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
      
      {product && (
        <BarcodePrinter
          open={barcodePrinterOpen}
          onOpenChange={setBarcodePrinterOpen}
          productCode={product.barcode || product.product_code || ""}
          productName={product.name}
          productPrice={product.price}
          productMaterial={product.material}
          productSize={product.size}
          productColor={product.color}
        />
      )}
    </Dialog>
  )
}
