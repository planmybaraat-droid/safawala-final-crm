"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Grid3x3, List, Loader2 } from "lucide-react"
import { downloadBarcodesAsPDF, type BarcodeItem, type PDFLayout } from "@/lib/barcode/bulk-download-pdf"
import { toast } from "@/hooks/use-toast"

interface BulkBarcodeDownloadDialogProps {
  items: BarcodeItem[]
  productName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BulkBarcodeDownloadDialog({
  items,
  productName,
  open,
  onOpenChange,
}: BulkBarcodeDownloadDialogProps) {
  const [layout, setLayout] = useState<PDFLayout>('labels')
  const [includeProductName, setIncludeProductName] = useState(true)
  const [includeItemCode, setIncludeItemCode] = useState(true)
  const [includeLocation, setIncludeLocation] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const filename = `${productName?.replace(/\s+/g, '_') || 'product'}_barcodes_${new Date().toISOString().split('T')[0]}.pdf`
      
      await downloadBarcodesAsPDF(items, filename, {
        layout,
        includeProductName,
        includeItemCode,
        includeLocation,
      })

      toast({
        title: "Success!",
        description: `Downloaded ${items.length} barcodes as PDF`,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Error downloading barcodes:', error)
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  const layoutDescriptions = {
    labels: {
      title: "Adhesive Labels",
      description: "Avery 5160 compatible (30 labels per page)",
      icon: Grid3x3,
      preview: "Perfect for printing on label sheets. 3 columns × 10 rows.",
    },
    sheet: {
      title: "Thermal Label Printer",
      description: "Zebra ZD230 (2 columns × 6 rows = 12 barcodes per label)",
      icon: FileText,
      preview: "Optimized for 4\" Zebra thermal printer. 2 columns × 6 rows = 12 barcodes per 4\"×6\" label. Reduced font size for minimal text.",
    },
    list: {
      title: "Inventory List",
      description: "Detailed list with all information",
      icon: List,
      preview: "Full details including status and location.",
    },
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Barcodes as PDF
          </DialogTitle>
          <DialogDescription>
            Generate printable PDF with {items.length} barcodes
            {productName && ` for ${productName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Layout Selection */}
          <div className="space-y-3">
            <Label>PDF Layout</Label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(layoutDescriptions) as PDFLayout[]).map((layoutKey) => {
                const info = layoutDescriptions[layoutKey]
                const Icon = info.icon
                return (
                  <Card
                    key={layoutKey}
                    className={`cursor-pointer transition-all ${
                      layout === layoutKey
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setLayout(layoutKey)}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <CardTitle className="text-sm">{info.title}</CardTitle>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        {info.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {layoutDescriptions[layout].preview}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label>Include in PDF</Label>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-normal">Item Code</Label>
                <p className="text-xs text-muted-foreground">
                  Show item code below barcode (TUR-0001)
                </p>
              </div>
              <Switch
                checked={includeItemCode}
                onCheckedChange={setIncludeItemCode}
              />
            </div>

            {layout !== 'labels' && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal">Product Name</Label>
                  <p className="text-xs text-muted-foreground">
                    Show product name for context
                  </p>
                </div>
                <Switch
                  checked={includeProductName}
                  onCheckedChange={setIncludeProductName}
                />
              </div>
            )}

            {layout === 'list' && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal">Location</Label>
                  <p className="text-xs text-muted-foreground">
                    Show storage location if available
                  </p>
                </div>
                <Switch
                  checked={includeLocation}
                  onCheckedChange={setIncludeLocation}
                />
              </div>
            )}
          </div>

          {/* Summary */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Items</p>
                  <p className="font-medium text-lg">{items.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated Pages</p>
                  <p className="font-medium text-lg">
                    {layout === 'labels' 
                      ? Math.ceil(items.length / 30)
                      : layout === 'sheet'
                      ? Math.ceil(items.length / 8)
                      : Math.ceil(items.length / 10)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={downloading}
            >
              Cancel
            </Button>
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
