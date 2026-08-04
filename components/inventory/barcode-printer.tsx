"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Printer, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { doDownloadStylePNG, doDownloadStylePDF, doDownloadStyleSVG, doDownloadCSV, doDownloadStyleBMP } from "./barcode-print-dialog"
import { SVG_LOGO } from "./logo-svg"

interface BarcodePrinterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productCode: string
  productName: string
  productPrice?: number
  productMaterial?: string
  productSize?: string
  productColor?: string
}

export function BarcodePrinter({
  open,
  onOpenChange,
  productCode,
  productName,
  productPrice,
  productMaterial,
  productSize,
  productColor,
}: BarcodePrinterProps) {
  const [quantity, setQuantity] = useState(10)
  const [isPrinting, setIsPrinting] = useState(false)
  const [style, setStyle] = useState<1 | 2 | 3>(1)
  const [topOffset, setTopOffset] = useState(0) // mm offset for first label alignment
  const [darkness, setDarkness] = useState(15)   // default to sharp 15
  const [speed, setSpeed] = useState(2)         // default to sharpest 2 in/sec
  const [zebraDevice, setZebraDevice] = useState<any | null>(null)
  const [zebraDevices, setZebraDevices] = useState<any[]>([])
  const [zebraStatus, setZebraStatus] = useState<"loading" | "connected" | "disconnected">("loading")
  const [showSetup, setShowSetup] = useState(false)

  const checkZebra = async () => {
    setZebraStatus("loading")
    try {
      const { getLocalDefaultPrinter, getLocalAvailablePrinters } = await import("@/lib/zebra-zpl-service")
      const dev = await getLocalDefaultPrinter()
      const list = await getLocalAvailablePrinters()
      
      setZebraDevices(list)
      if (dev) {
        setZebraDevice(dev)
        setZebraStatus("connected")
      } else if (list.length > 0) {
        setZebraDevice(list[0])
        setZebraStatus("connected")
      } else {
        setZebraDevice(null)
        setZebraStatus("disconnected")
      }
    } catch {
      setZebraDevice(null)
      setZebraDevices([])
      setZebraStatus("disconnected")
    }
  }

  useState(() => {
    if (typeof window !== "undefined") {
      checkZebra()
    }
  })

  const handlePrint = async () => {
    if (quantity < 1) {
      toast.error("Enter at least 1 label")
      return
    }
    setIsPrinting(true)
    try {
      if (style === 1) {
        await printStyle1()
      } else if (style === 3) {
        await printStyle3()
      } else {
        await printStyle2()
      }
      toast.success(`Printing ${quantity} labels`)
      onOpenChange(false)
    } catch (error) {
      console.error("Print error:", error)
      toast.error("Print failed")
    } finally {
      setIsPrinting(false)
    }
  }

  const handleDownloadPNG = async () => {
    if (!productCode) {
      toast.error("No barcode assigned")
      return
    }
    setIsPrinting(true)
    try {
      await doDownloadStylePNG(
        productCode,
        productName,
        style,
        undefined,
        productPrice,
        productColor,
        productSize,
        productMaterial
      )
      toast.success("Downloaded barcode PNG successfully")
    } catch (error) {
      console.error(error)
      toast.error("Failed to download PNG")
    } finally {
      setIsPrinting(false)
    }
  }

  const handleDownloadBMP = async () => {
    if (!productCode) {
      toast.error("No barcode assigned")
      return
    }
    setIsPrinting(true)
    try {
      await doDownloadStyleBMP(
        productCode,
        productName,
        style,
        undefined,
        productPrice,
        productColor,
        productSize,
        productMaterial
      )
      toast.success("Downloaded barcode BMP successfully")
    } catch (error) {
      console.error(error)
      toast.error("Failed to download BMP")
    } finally {
      setIsPrinting(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!productCode) {
      toast.error("No barcode assigned")
      return
    }
    setIsPrinting(true)
    try {
      await doDownloadStylePDF(
        productCode,
        productName,
        style,
        undefined,
        productPrice,
        productColor,
        productSize,
        productMaterial
      )
      toast.success("Downloaded barcode PDF successfully")
    } catch (error) {
      console.error(error)
      toast.error("Failed to download PDF")
    } finally {
      setIsPrinting(false)
    }
  }

  const handleDownloadSVG = async () => {
    if (!productCode) {
      toast.error("No barcode assigned")
      return
    }
    setIsPrinting(true)
    try {
      await doDownloadStyleSVG(
        productCode,
        productName,
        style,
        undefined,
        productPrice,
        productColor,
        productSize,
        productMaterial
      )
      toast.success("Downloaded barcode SVG successfully")
    } catch (error) {
      console.error(error)
      toast.error("Failed to download SVG")
    } finally {
      setIsPrinting(false)
    }
  }

  const handleDownloadCSV = async () => {
    if (!productCode) {
      toast.error("No barcode assigned")
      return
    }
    setIsPrinting(true)
    try {
      doDownloadCSV(
        productCode,
        productName,
        undefined,
        productPrice,
        productColor,
        productSize,
        productMaterial,
        quantity
      )
      toast.success("Downloaded CSV for BarTender successfully")
    } catch (error) {
      console.error(error)
      toast.error("Failed to download CSV")
    } finally {
      setIsPrinting(false)
    }
  }

  const handleZPLPrint = async () => {
    if (quantity < 1) {
      toast.error("Enter at least 1 label")
      return
    }
    setIsPrinting(true)
    try {
      const { printZPLDirect } = await import("@/lib/zebra-zpl-service")
      const items = Array.from({ length: quantity }).map(() => ({
        code: productCode,
        productName: productName,
        price: productPrice,
        color: productColor,
        size: productSize,
        material: productMaterial
      }))

      const ok = await printZPLDirect({
        barcodes: items,
        style: style,
        topOffset: style === 2 ? topOffset : 0,
        printDensity: darkness,
        printSpeed: speed
      }, zebraDevice)

      if (ok) {
        toast.success(`Printed ${quantity} labels directly to ${zebraDevice?.name || "Zebra printer"}`)
        onOpenChange(false)
      } else {
        toast.warning("Direct print was not possible. ZPL file downloaded instead.")
      }
    } catch (err) {
      console.error(err)
      toast.error("ZPL printing failed")
    } finally {
      setIsPrinting(false)
    }
  }

  const makeBarcodeDataURL = async (): Promise<string> => {
    const JsBarcode = (await import("jsbarcode")).default
    const canvas = document.createElement("canvas")
    JsBarcode(canvas, productCode, {
      format: "CODE128",
      width: 3,
      height: 80,
      displayValue: false,
      margin: 4,
      background: "#FFFFFF",
      lineColor: "#000000",
    })
    return canvas.toDataURL("image/png")
  }

  const printStyle1 = async () => {
    const barcodeImg = await makeBarcodeDataURL()
    const rows = Math.ceil(quantity / 2)
    let labelsHTML = ""

    for (let row = 0; row < rows; row++) {
      labelsHTML += `<div class="row">`
      for (let col = 0; col < 2; col++) {
        const idx = row * 2 + col
        if (idx < quantity) {
          labelsHTML += `
            <div class="label">
              <div class="name">${productName}</div>
              <img src="${barcodeImg}" class="barcode" />
              <div class="code">${productCode}</div>
            </div>`
        } else {
          labelsHTML += `<div class="label empty"></div>`
        }
      }
      labelsHTML += `</div>`
    }

    const printHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Labels</title>
<style>
  @page { size: 100mm 25mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; width: 100mm; background: #fff;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .row { width: 100mm; height: 25mm; display: flex;
         page-break-after: always; page-break-inside: avoid; }
  .row:last-child { page-break-after: avoid; }
  .label { width: 50mm; height: 25mm; display: flex; flex-direction: column;
           justify-content: center; align-items: center; padding: 1.5mm; gap: 0.5mm; }
  .label.empty { visibility: hidden; }
  .name { font-size: 8pt; font-weight: bold; color: #000; text-align: center;
          max-width: 48mm; line-height: 1.2; word-break: break-word; }
  .barcode { width: 44mm; height: 11mm; display: block;
             image-rendering: pixelated; image-rendering: crisp-edges; }
  .code { font-family: 'Courier New', monospace; font-size: 7.5pt; font-weight: bold;
          color: #000; text-align: center; letter-spacing: 0.5px; }
</style>
</head>
<body>${labelsHTML}</body>
</html>`

    openPrint(printHTML)
  }

  const printStyle2 = async () => {
    const JsBarcode = (await import("jsbarcode")).default

    // Render barcode as inline SVG — vector quality, no rasterization blur
    const barcodeSvgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    JsBarcode(barcodeSvgEl, productCode, {
      format: "CODE128", displayValue: false, margin: 0,
      width: 2, height: 80, background: "#FFFFFF", lineColor: "#000000",
    })
    const barcodeSVG = new XMLSerializer().serializeToString(barcodeSvgEl)

    const attrsLine = [productMaterial, productSize, productColor].filter(Boolean).join(" | ")
    // note: productPrice here is the sale price from the printer component
    const savings = 0 // BarcodePrinter only has one price field; no MRP available here

    let labelsHTML = ""
    for (let i = 0; i < quantity; i++) {
      const isFirst = i === 0
      const labelStyle = isFirst && topOffset > 0 ? `style="padding-top: ${topOffset}mm;"` : ""
    labelsHTML += `
        <div class="label" ${labelStyle}>
          <div class="tag-content">
            <div class="s1">
              ${productPrice ? `<div class="sale-price">₹${productPrice}</div>` : ""}
              <div class="bc">${barcodeSVG}</div>
              <div class="code">${productCode}</div>
            </div>
            <div class="s2">
              <div class="pname">${productName}</div>
              ${attrsLine ? `<div class="attrs">${attrsLine}</div>` : ""}
              <div class="divider"></div>
              <div class="website">SAFAWALA.com</div>
            </div>
          </div>
          <div class="s3"></div>
        </div>`
    }

    const printHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Labels</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap">
<style>
  @page { size: 100mm 15mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { width: 100mm; margin: 0; padding: 0; background: #fff; }
  .label { width: 100mm; height: 14.8mm; display: flex; flex-direction: row; page-break-after: always; page-break-inside: avoid; overflow: hidden; }
  .label:last-child { page-break-after: avoid; }
  .tag-content {
    display: flex;
    flex-direction: row;
    width: 69.8mm;
    height: 14.8mm;
    transform: scale(0.9);
    transform-origin: left top;
    margin-top: 2.4mm;
    margin-left: -1.8mm;
  }
  .s1 { width: 34.9mm; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.2mm 1mm; gap: 0.2mm; }
  .sale-price { font-family: 'Oswald', Arial, sans-serif; font-size: 13pt; font-weight: 500; color: #000; line-height: 1; text-align: center; letter-spacing: 0.5px; }
  .bc { width: 33mm; height: 3.5mm; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; margin-top: 1.5mm; }
  .bc svg { width: 100%; height: 100%; display: block; }
  .code { font-family: 'Courier New', monospace; font-size: 13pt; font-weight: 500; color: #000; text-align: center; letter-spacing: 0.3px; line-height: 1; flex-shrink: 0; margin-top: 0.8mm; }
  .s2 { width: 34.9mm; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.5mm 1mm; gap: 0.4mm; }
  .pname { font-family: Verdana, sans-serif; font-size: 9pt; font-weight: 500; color: #000; text-align: center; line-height: 1.1; max-width: 33mm; word-break: break-word; overflow: hidden; }
  .attrs { font-family: Verdana, sans-serif; font-size: 7pt; color: #000; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 33mm; font-weight: 500; }
  .divider { width: 90%; height: 0.3mm; background: #000; }
  .website { font-size: 10.5pt; font-weight: 900; color: #000; text-align: center; letter-spacing: 0.8px; white-space: nowrap; }
  .s3 { width: 30mm; height: 100%; }
</style></head><body>${labelsHTML}</body></html>`

    openPrint(printHTML)
  }

  const openPrint = (html: string) => {
    const win = window.open("", "_blank")
    if (!win) {
      toast.error("Please allow popups for printing")
      return
    }
    win.document.write(html)
    win.document.close()
    setTimeout(() => {
      win.focus()
      win.print()
    }, 500)
  }

  const printStyle3 = async () => {
    const JsBarcode = (await import("jsbarcode")).default

    const barcodeSvgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    JsBarcode(barcodeSvgEl, productCode, {
      format: "CODE128", displayValue: false, margin: 0,
      width: 2, height: 80, background: "#FFFFFF", lineColor: "#000000",
    })
    const barcodeSVG = new XMLSerializer().serializeToString(barcodeSvgEl)

    let logoPng3 = ""
    try {
      const res = await fetch("/safawalalogo.png")
      const blob = await res.blob()
      logoPng3 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch { }
    const logoHTML = logoPng3
      ? `<img src="${logoPng3}" style="max-width:33mm;max-height:9mm;object-fit:contain;display:block;" />`
      : `<div style="font-family:Arial;font-size:10pt;font-weight:bold;">SAFAWALA</div>`

    let labelsHTML = ""
    for (let i = 0; i < quantity; i++) {
      const isFirst = i === 0
      const labelStyle = isFirst && topOffset > 0 ? `style="padding-top: ${topOffset}mm;"` : ""
      labelsHTML += `
        <div class="label" ${labelStyle}>
          <div class="sec-pricing">
            ${productPrice ? `<div class="price">₹${productPrice}</div>` : ""}
            <div class="barcode-wrap">${barcodeSVG}</div>
            <div class="code">${productCode}</div>
            <div class="website">www.safawala.com</div>
          </div>
          <div class="sec-info">
            <div class="logo-wrap">${logoHTML}</div>
            <div class="prod-name">${productName}</div>
          </div>
          <div class="sec-blank"></div>
        </div>`
    }

    const printHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Labels</title>
<style>
  @page { size: 100mm 15mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { width: 100mm; margin: 0; padding: 0; background: #fff; }
  .label { width: 100mm; height: 14.8mm; display: flex; flex-direction: row; page-break-after: always; page-break-inside: avoid; overflow: hidden; }
  .label:last-child { page-break-after: avoid; }
  .sec-pricing { width: 34.9mm; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.3mm 0.8mm; gap: 0.1mm; }
  .price { font-family: Arial, sans-serif; font-size: 12pt; font-weight: bold; color: #000; line-height: 1; }
  .barcode-wrap { width: 33mm; height: 7mm; display: block; overflow: hidden; }
  .barcode-wrap svg { width: 100%; height: 100%; display: block; }
  .code { font-family: Arial, sans-serif; font-size: 8pt; font-weight: bold; color: #000; text-align: center; letter-spacing: 0.3px; }
  .website { font-family: Arial, sans-serif; font-size: 7.5pt; font-weight: normal; color: #000; text-align: center; }
  .sec-info { width: 34.9mm; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.3mm 0.8mm; gap: 0.4mm; }
  .logo-wrap { display: flex; align-items: center; justify-content: center; width: 33mm; max-height: 9mm; overflow: hidden; }
  .logo-wrap svg { width: 33mm; height: auto; max-height: 9mm; display: block; }
  .prod-name { font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: #000; text-align: center; line-height: 1.1; max-width: 33mm; word-break: break-word; overflow: hidden; }
  .sec-blank { width: 30mm; height: 100%; }
</style></head><body>${labelsHTML}</body></html>`

    openPrint(printHTML)
  }

  const rows = Math.ceil(quantity / 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print Labels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Style selector */}
          <div>
            <Label className="text-xs mb-1 block">Label Style</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setStyle(1)}
                className={`flex-1 rounded border-2 p-2 text-left transition-all ${
                  style === 1 ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-xs font-bold mb-1">Style 1 — Simple</div>
                <div className="flex gap-1">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex-1 border border-gray-300 p-1 bg-white flex flex-col items-center gap-0.5">
                      <div className="text-[5px] font-bold truncate w-full text-center text-gray-700">{productName}</div>
                      <div className="bg-black h-2.5 w-full" />
                      <div className="text-[5px] font-mono text-gray-600 truncate w-full text-center">{productCode}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[9px] text-gray-400 text-center mt-1">50mm × 2 per row</div>
              </button>

              <button
                onClick={() => setStyle(2)}
                className={`flex-1 rounded border-2 p-2 text-left transition-all ${
                  style === 2 ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-xs font-bold mb-1">Style 2 — Branded</div>
                <div className="border border-gray-300 bg-white flex h-10 overflow-hidden">
                  <div className="flex-1 border-r border-gray-200 flex flex-col items-center justify-center gap-0.5 px-0.5">
                    {productPrice && <div className="text-[6px] font-black">₹{productPrice}</div>}
                    <div className="bg-black h-2 w-full" />
                    <div className="text-[4px] font-mono truncate w-full text-center text-gray-500">{productCode}</div>
                    <div className="text-[4px] text-gray-400">safawala.com</div>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center gap-0.5 px-0.5">
                    <div className="text-[5px] font-black text-yellow-600">SAFAWALA</div>
                    <div className="text-[4.5px] font-bold text-center leading-tight text-gray-700 truncate w-full">{productName}</div>
                    {productMaterial && <div className="text-[4px] text-gray-400">Mat: {productMaterial}</div>}
                  </div>
                  <div className="w-5 bg-gray-50" />
                </div>
                <div className="text-[9px] text-gray-400 text-center mt-1">100mm × 1 per row</div>
              </button>

              <button
                onClick={() => setStyle(3)}
                className={`flex-1 rounded border-2 p-2 text-left transition-all ${
                  style === 3 ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-xs font-bold mb-1">Style 3 — Big Logo</div>
                <div className="border border-gray-300 bg-white flex h-10 overflow-hidden">
                  <div className="flex-1 border-r border-gray-200 flex flex-col items-center justify-center gap-0.5 px-0.5">
                    {productPrice && <div className="text-[6px] font-black">₹{productPrice}</div>}
                    <div className="bg-black h-2.5 w-full" />
                    <div className="text-[4px] font-mono truncate w-full text-center text-gray-500">{productCode}</div>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center px-0.5">
                    <div className="text-[6px] font-black text-yellow-600">SAFAWALA</div>
                    <div className="text-[5px] font-bold text-center text-gray-800 truncate w-full mt-px">{productName}</div>
                  </div>
                  <div className="w-5 bg-gray-50" />
                </div>
                <div className="text-[9px] text-gray-400 text-center mt-1">Big logo · No attributes</div>
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <Label className="text-xs mb-1 block">Quantity</Label>
            <div className="flex gap-1 flex-wrap">
              <Input
                type="number"
                min="1"
                max="500"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 h-8 text-sm"
              />
              {[5, 10, 20, 50, 100].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={quantity === n ? "default" : "outline"}
                  className="h-8 px-2 text-xs"
                  onClick={() => setQuantity(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {style === 1
                ? `${quantity} labels = ${rows} rows (2 per row) · 100mm × 25mm`
                : `${quantity} labels = ${quantity} rows (1 per row) · 100mm × 15mm`}
            </p>
          </div>

          {/* Top Offset — only for Style 2 */}
          {style === 2 && (
            <div>
              <Label className="text-xs mb-1 block">Top Offset (alignment)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={topOffset}
                  onChange={(e) => setTopOffset(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-16 h-8 text-sm"
                />
                <span className="text-xs text-gray-500">mm</span>
                <div className="flex gap-1">
                  {[0, 5, 10, 15, 20].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={topOffset === n ? "default" : "outline"}
                      className="h-7 px-2 text-[10px]"
                      onClick={() => setTopOffset(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Adjust if labels print between stickers. Start with 15mm.
              </p>
            </div>
          )}

          {/* Print Quality Settings */}
          <div className="grid grid-cols-2 gap-2 border rounded-lg p-2.5 bg-gray-50/50">
            <div>
              <Label className="text-[10px] font-semibold text-gray-600 block mb-1">Print Darkness (Density)</Label>
              <select
                value={darkness}
                onChange={(e) => setDarkness(parseInt(e.target.value))}
                className="text-xs p-1.5 border rounded bg-white w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500 font-medium"
              >
                <option value="10">10 (Light - sharper)</option>
                <option value="15">15 (Medium - recommended)</option>
                <option value="20">20 (Dark)</option>
                <option value="25">25 (Very Dark - causes bleed)</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px] font-semibold text-gray-600 block mb-1">Print Speed</Label>
              <select
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="text-xs p-1.5 border rounded bg-white w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500 font-medium"
              >
                <option value="2">2 in/s (Sharpest)</option>
                <option value="3">3 in/s (Medium)</option>
                <option value="4">4 in/s (Fast)</option>
              </select>
            </div>
          </div>

          {/* Zebra Connection Indicator */}
          <div className="border rounded-lg p-3 bg-gray-50 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  zebraStatus === "connected" ? "bg-green-500 animate-pulse" :
                  zebraStatus === "loading" ? "bg-blue-500 animate-pulse" : "bg-amber-500"
                }`} />
                <span className="text-xs font-semibold">
                  Zebra Printer: {zebraStatus === "connected" ? zebraDevice?.name || "Connected" : 
                                 zebraStatus === "loading" ? "Scanning..." : "Disconnected"}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={checkZebra}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {zebraStatus === "connected" && zebraDevices.length > 0 && (
              <div className="flex flex-col gap-1 mt-1 border-t pt-2 border-gray-200">
                <Label className="text-[10px] text-gray-500 font-semibold">Select Printer Device:</Label>
                <select
                  value={zebraDevice?.uid || ""}
                  onChange={(e) => {
                    const selected = zebraDevices.find(d => d.uid === e.target.value)
                    if (selected) setZebraDevice(selected)
                  }}
                  className="text-xs p-1.5 border rounded bg-white w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500 font-medium text-gray-800"
                >
                  {zebraDevices.map((d) => (
                    <option key={d.uid} value={d.uid}>
                      {d.name} ({d.connection})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {zebraStatus === "disconnected" && (
              <div className="text-[11px] text-gray-500">
                Zebra Browser Print service not detected. You can use Browser HTML print or{" "}
                <button onClick={() => setShowSetup(!showSetup)} className="text-green-700 underline font-medium">
                  view setup steps
                </button>.
              </div>
            )}

            {showSetup && (
              <div className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 p-2.5 rounded mt-1 space-y-1">
                <p className="font-bold">Setup Instructions:</p>
                <p>1. Open and start the <b>Zebra Browser Print</b> desktop app on this PC.</p>
                <p>2. Open <a href="https://localhost:9101/available" target="_blank" rel="noreferrer" className="text-green-700 underline font-semibold">https://localhost:9101/available</a> in a new tab.</p>
                <p>3. Click <b>Advanced</b> -&gt; <b>Proceed to localhost</b> to accept the HTTPS certificate.</p>
                <p>4. Refresh this popup to connect.</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {zebraStatus === "connected" ? (
              <>
                <Button
                  onClick={handleZPLPrint}
                  disabled={isPrinting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {isPrinting ? "Printing..." : `Print Direct (ZPL)`}
                </Button>
                <Button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-50"
                >
                  Browser Print
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {isPrinting ? "Printing..." : `Print ${quantity} Labels`}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const { downloadZPL } = require("@/lib/zebra-zpl-service")
                    downloadZPL({
                      barcodes: Array.from({ length: quantity }).map(() => ({
                        code: productCode,
                        productName: productName,
                        price: productPrice,
                        color: productColor,
                        size: productSize,
                        material: productMaterial
                      })),
                      style: style,
                      topOffset: style === 2 ? topOffset : 0
                    })
                  }}
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-50"
                >
                  Download ZPL
                </Button>
              </>
            )}
            <Button
              type="button"
              onClick={handleDownloadPNG}
              disabled={isPrinting}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
            >
              Download PNG
            </Button>
            <Button
              type="button"
              onClick={handleDownloadBMP}
              disabled={isPrinting}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
            >
              Download BMP (1-Bit)
            </Button>
            <Button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isPrinting}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
            >
              Download PDF (Vector)
            </Button>
            <Button
              type="button"
              onClick={handleDownloadSVG}
              disabled={isPrinting}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold"
            >
              Download SVG (Vector)
            </Button>
            <Button
              type="button"
              onClick={handleDownloadCSV}
              disabled={isPrinting}
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50 font-semibold"
            >
              Download CSV (BarTender)
            </Button>
          </div>

          <p className="text-[10px] text-gray-400 text-center">
            {style === 1
              ? "Paper: 100mm × 25mm · Margins: None · Scale: 100%"
              : "Paper: 100mm × 15mm · Margins: None · Scale: 100%"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
