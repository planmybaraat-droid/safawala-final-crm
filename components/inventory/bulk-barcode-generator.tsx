"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Package, Loader2 } from "lucide-react"
import { ProductItemService, type ProductItem, type BulkGenerateRequest } from "@/lib/services/product-item-service"
import { generateBarcode, downloadQRCode } from "@/lib/barcode-generator"
import { toast } from "@/hooks/use-toast"

interface BulkBarcodeGeneratorProps {
  product: {
    id: string
    name: string
    product_code?: string
    barcode?: string
    category: string
    stock_total: number
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemsGenerated?: () => void
}

export function BulkBarcodeGenerator({ product, open, onOpenChange, onItemsGenerated }: BulkBarcodeGeneratorProps) {
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState("new")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [generatedItems, setGeneratedItems] = useState<ProductItem[]>([])
  const [step, setStep] = useState<"form" | "preview" | "generated">("form")

  const handleGenerate = async () => {
    if (quantity < 1 || quantity > 1000) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a quantity between 1 and 1000",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const request: BulkGenerateRequest = {
        product_id: product.id,
        quantity,
        condition,
        location: location || undefined,
        notes: notes || undefined,
      }

      const items = await ProductItemService.generateBulkItems(request)
      setGeneratedItems(items)
      setStep("generated")

      toast({
        title: "Items Generated Successfully",
        description: `Generated ${items.length} unique barcodes for ${product.name}`,
      })

      onItemsGenerated?.()
    } catch (error) {
      console.error("Error generating items:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate barcodes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadAllBarcodes = async () => {
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Set canvas size for multiple barcodes
      const barcodeWidth = 300
      const barcodeHeight = 150
      const cols = 3
      const rows = Math.ceil(generatedItems.length / cols)

      canvas.width = barcodeWidth * cols
      canvas.height = barcodeHeight * rows

      // Generate and draw each barcode
      for (let i = 0; i < generatedItems.length; i++) {
        const item = generatedItems[i]
        const col = i % cols
        const row = Math.floor(i / cols)

        const barcodeDataURL = generateBarcode(item.barcode)
        const img = new Image()
        img.crossOrigin = "anonymous"

        await new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, col * barcodeWidth, row * barcodeHeight, barcodeWidth, barcodeHeight)

            // Add item code text
            ctx.font = "12px Arial"
            ctx.fillStyle = "black"
            ctx.textAlign = "center"
            ctx.fillText(
              item.item_code,
              col * barcodeWidth + barcodeWidth / 2,
              row * barcodeHeight + barcodeHeight - 10,
            )

            resolve(void 0)
          }
          img.src = barcodeDataURL
        })
      }

      // Download the combined image
  const dataURL = canvas.toDataURL("image/png")
  const codeText = product.barcode || product.product_code || product.id
  downloadQRCode(dataURL, `${codeText}_barcodes_${new Date().toISOString().split("T")[0]}.png`)

      toast({
        title: "Download Started",
        description: "All barcodes are being downloaded as a single image",
      })
    } catch (error) {
      console.error("Error downloading barcodes:", error)
      toast({
        title: "Download Failed",
        description: "Failed to download barcodes. Please try again.",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setQuantity(1)
    setCondition("new")
    setLocation("")
    setNotes("")
    setGeneratedItems([])
    setStep("form")
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Generate Individual Item Barcodes</span>
          </DialogTitle>
          <DialogDescription>Generate unique barcodes for individual stock items of {product.name}</DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-6">
            {/* Product Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <CardDescription>
                  Barcode: <span className="font-mono font-medium">{product.barcode || product.product_code || '—'}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{product.category}</Badge>
                  <Badge variant="outline">Total Stock: {product.stock_total}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Generation Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity to Generate</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="1000"
                  value={quantity}
                  onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                  placeholder="Enter quantity"
                />
                <p className="text-sm text-muted-foreground">Maximum 1000 items per batch</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Item Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Storage Location (Optional)</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Warehouse A, Shelf 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about these items"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate {quantity} Barcode{quantity !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {step === "generated" && (
          <div className="space-y-6">
            {/* Success Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">✓ Generation Complete</CardTitle>
                <CardDescription>Successfully generated {generatedItems.length} unique barcodes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Button onClick={handleDownloadAllBarcodes} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download All Barcodes
                  </Button>
                  <Button onClick={() => setStep("form")} variant="outline">
                    Generate More
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generated Items Table */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Items</CardTitle>
                <CardDescription>Individual items with unique barcodes and item codes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <code className="text-sm">{item.item_code}</code>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{item.barcode}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.condition}</Badge>
                          </TableCell>
                          <TableCell>{item.location || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const barcodeDataURL = generateBarcode(item.barcode)
                                downloadQRCode(barcodeDataURL, `${item.item_code}_barcode.png`)
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
