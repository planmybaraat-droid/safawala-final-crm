"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Printer, Download, Loader2, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { doPrint } from "./barcode-print-dialog"

interface Product {
  id: string
  name: string
  barcode?: string
  regular_price?: number
  price?: number
  color?: string
  size?: string
  material?: string
}

interface BarcodeGeneratorEnhancedProps {
  product: Product
  onBarcodeGenerated?: () => void
}

export function BarcodeGenerator({ product, onBarcodeGenerated }: BarcodeGeneratorEnhancedProps) {
  const [quantity, setQuantity] = useState(1)
  const [printing, setPrinting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [currentBarcode, setCurrentBarcode] = useState(product.barcode || "")

  const generateNewBarcode = async () => {
    setGenerating(true)
    try {
      const response = await fetch("/api/products/generate-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      })
      if (!response.ok) throw new Error("Failed to generate barcode")
      const { barcode } = await response.json()
      setCurrentBarcode(barcode)
      await supabase.from("products").update({ barcode }).eq("id", product.id)
      toast.success("Barcode generated successfully")
      onBarcodeGenerated?.()
    } catch (error) {
      console.error("Barcode generation failed:", error)
      toast.error("Failed to generate barcode")
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = async () => {
    if (!currentBarcode) { toast.error("Generate a barcode first"); return }
    if (quantity < 1) { toast.error("Enter at least 1 label"); return }
    setPrinting(true)
    try {
      await doPrint(
        currentBarcode,
        product.name,
        quantity,
        product.regular_price,
        product.price,
        product.color,
        product.size,
        product.material
      )
      toast.success(`Sent ${quantity} label${quantity > 1 ? "s" : ""} to printer`)
    } catch (error) {
      console.error("Print error:", error)
      toast.error("Print failed")
    } finally {
      setPrinting(false)
    }
  }

  const metaPreview = [product.color, product.size, product.material].filter(Boolean).join(" | ")
  const savings = product.regular_price && product.price && product.regular_price > product.price
    ? product.regular_price - product.price : 0

  return (
    <div className="space-y-4">
      {/* Barcode Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Barcode</h4>
            {currentBarcode && (
              <code className="text-xs font-mono bg-blue-100 px-2 py-1 rounded text-blue-700">
                {currentBarcode}
              </code>
            )}
          </div>
          {!currentBarcode && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No barcode assigned yet. Generate one below.</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {!currentBarcode && (
        <Button onClick={generateNewBarcode} disabled={generating} className="w-full">
          {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {generating ? "Generating..." : "Generate Barcode"}
        </Button>
      )}

      {currentBarcode && (
        <>
          {/* Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-xs text-muted-foreground mb-3">Preview (50mm × 25mm)</p>
            <div className="bg-white border-2 border-gray-400 rounded p-2 inline-block">
              <div className="flex flex-col items-center gap-0.5" style={{ width: "200px" }}>
                <div className="text-[10px] font-bold text-center leading-tight">{product.name.substring(0, 22)}</div>
                {metaPreview && (
                  <div className="text-[8px] font-bold text-gray-600 text-center">{metaPreview}</div>
                )}
                {product.regular_price ? (
                  <div className="text-[8px] font-bold text-center">MRP: <span className="line-through">₹{product.regular_price}</span></div>
                ) : null}
                {product.price ? <div className="text-[11px] font-bold text-center">₹{product.price}</div> : null}
                {savings > 0 ? <div className="text-[7px] font-bold text-center">You save ₹{savings}</div> : null}
                <div className="bg-black h-5 w-full flex items-center justify-center mt-0.5">
                  <div className="flex gap-px h-4">
                    {Array.from({ length: 28 }).map((_, j) => (
                      <div key={j} className="bg-white" style={{ width: j % 4 === 0 ? "2px" : "1px" }} />
                    ))}
                  </div>
                </div>
                <div className="text-[8px] font-mono font-bold">{currentBarcode}</div>
                <div className="text-[7px] font-bold font-sans mt-0.5">www.safawala.com</div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Scale: 1:1 on 100mm × 25mm paper</p>
          </div>

          {/* Print Settings */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="print-quantity" className="text-sm">Number of Labels</Label>
              <div className="flex gap-2 mt-1">
                <Input id="print-quantity" type="number" min="1" max="100" value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20" />
                <div className="flex gap-1">
                  {[1, 5, 10, 20, 50].map((n) => (
                    <Button key={n} size="sm" variant={quantity === n ? "default" : "outline"}
                      className="px-2 h-9" onClick={() => setQuantity(n)}>
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.ceil(quantity / 2)} rows (2 labels per row × 50mm)
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 className="font-semibold text-xs text-amber-900 mb-2">Thermal Printer Setup</h4>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• Paper Size: 100mm × 25mm</li>
                <li>• Margins: None (0mm)</li>
                <li>• Scale: 100% (no scaling)</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={handlePrint} disabled={printing || !currentBarcode}
                className="flex-1 bg-green-600 hover:bg-green-700">
                <Printer className="w-4 h-4 mr-2" />
                {printing ? "Printing..." : "Print Labels"}
              </Button>
              <Button disabled variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>

            <Button onClick={generateNewBarcode} disabled={generating} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              {generating ? "Generating..." : "Generate New Barcode"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
