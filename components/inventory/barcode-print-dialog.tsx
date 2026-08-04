"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Printer, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { SVG_LOGO } from "./logo-svg"
import { checkBartenderBridge, printViaBartender } from "@/lib/bartender-bridge-service"

interface Product {
  id: string
  name: string
  barcode?: string
  price?: number
  regular_price?: number
  rental_price?: number
  color?: string
  size?: string
  material?: string
}

interface ProductVariant {
  id: string
  variation_name: string
  sku?: string
  barcode?: string
  price_adjustment?: number
  regular_price_adjustment?: number
  color?: string
  size?: string
  material?: string
}

interface BarcodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

export function getCleanVariantName(productName: string, variationName: string): string {
  if (!productName) return variationName || ""
  if (!variationName) return productName

  const pName = productName.trim()
  const vName = variationName.trim()
  const pNameLower = pName.toLowerCase()
  const vNameLower = vName.toLowerCase()

  if (pNameLower === vNameLower) return pName
  if (vNameLower.startsWith(pNameLower)) {
    const rest = vName.substring(pName.length).replace(/^[\s\-\|\,\:]+/, "")
    return rest ? `${pName} - ${rest}` : pName
  }
  const firstWord = pName.split(/\s+/)[0]
  if (firstWord && firstWord.length > 1) {
    const firstWordLower = firstWord.toLowerCase()
    if (vNameLower.startsWith(firstWordLower)) {
      const rest = vName.substring(firstWord.length).replace(/^[\s\-\|\,\:]+/, "")
      return rest ? `${pName} - ${rest}` : pName
    }
  }
  return `${pName} - ${vName}`
}

// ── Style 1: 50mm × 25mm, 2-up ──────────────────────────────────────────────
export async function doPrint(
  barcode: string,
  label: string,
  qty: number,
  regularPrice?: number,
  salePrice?: number,
  color?: string,
  size?: string,
  material?: string,
) {
  const JsBarcode = (await import("jsbarcode")).default
  const labelsPerRow = 2
  const rows = Math.ceil(qty / labelsPerRow)
  let labelsHTML = ""

  const metaLine1 = [color, size].filter(Boolean).join(" | ")
  const metaLine2 = material || ""
  const savings = regularPrice && salePrice && regularPrice > salePrice ? regularPrice - salePrice : 0

  for (let row = 0; row < rows; row++) {
    labelsHTML += `<div class="row">`
    for (let col = 0; col < labelsPerRow; col++) {
      const idx = row * labelsPerRow + col
      if (idx < qty) {
        const canvas = document.createElement("canvas")
        JsBarcode(canvas, barcode, {
          format: "CODE128", width: 3, height: 80,
          displayValue: false, margin: 4,
          background: "#FFFFFF", lineColor: "#000000",
        })
        const barcodeImg = canvas.toDataURL("image/png")
        labelsHTML += `
          <div class="label">
            <div class="name">${label}</div>
            ${metaLine1 ? `<div class="meta">${metaLine1}</div>` : ""}
            ${metaLine2 ? `<div class="meta">${metaLine2}</div>` : ""}
            ${(regularPrice || salePrice) ? `<div class="pricing-row">
              ${regularPrice ? `MRP: <span class="mrp-price">₹${regularPrice}</span>` : ""}
              ${salePrice ? `<span class="sale-price">₹${salePrice}</span>` : ""}
              ${savings > 0 ? `<span class="you-save">You save ₹${savings}</span>` : ""}
            </div>` : ""}
            <img src="${barcodeImg}" class="barcode" />
            <div class="code">${barcode}</div>
            <div class="website">www.safawala.com</div>
          </div>`
      } else {
        labelsHTML += `<div class="label empty"></div>`
      }
    }
    labelsHTML += `</div>`
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: 100mm 25mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Arial Black', Arial, sans-serif; }
  html, body { width: 100mm; height: 25mm; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; overflow: hidden; }
  .row { width: 100mm; height: 25mm; display: flex; page-break-after: always; page-break-inside: avoid; }
  .row:last-child { page-break-after: avoid; }
  .label { width: 50mm; height: 25mm; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding: 3mm 1mm 0 1mm; gap: 0; border: 0.5mm solid #ddd; overflow: hidden; }
  .label.empty { visibility: hidden; }
  .name { font-size: 6.7pt; font-weight: 900; color: #000; text-align: center; width: 48mm; overflow: hidden; line-height: 1.15; word-break: break-word; margin-bottom: 0.4mm; }
  .meta { font-size: 6.5pt; font-weight: 500; color: #000; text-align: center; width: 48mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.15; }
  .pricing-row { font-size: 8.5pt; font-weight: 700; color: #000; text-align: center; line-height: 1.15; white-space: nowrap; margin-top: 0.4mm; font-family: Arial, sans-serif; }
  .mrp-price { position: relative; display: inline-block; margin-right: 2px; color: #777; white-space: nowrap; font-family: Arial, sans-serif; }
  .mrp-price::before, .mrp-price::after { content: ""; position: absolute; left: -5%; top: 50%; width: 110%; height: 1px; background: #777; }
  .mrp-price::before { transform: rotate(15deg); }
  .mrp-price::after { transform: rotate(-15deg); }
  .sale-price { font-size: 10pt; font-weight: 900; color: #000; margin-right: 2px; font-family: Arial, sans-serif; }
  .you-save { font-size: 8pt; font-weight: 700; color: #000; font-family: Arial, sans-serif; }
  .barcode { width: 43mm; height: 5mm; display: block; image-rendering: pixelated; image-rendering: crisp-edges; margin-top: 0.4mm; }
  .code { font-size: 6.5pt; font-weight: 700; color: #000; text-align: center; letter-spacing: 0.5px; line-height: 1.1; font-family: 'Courier New', monospace; }
  .website { font-size: 6pt; font-weight: 700; color: #000; line-height: 1.1; font-family: Arial, sans-serif; }
  @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>${labelsHTML}</body></html>`

  const win1 = window.open("", "_blank")
  if (!win1) { toast.error("Please allow popups for printing"); return }
  win1.document.write(html)
  win1.document.close()
  setTimeout(() => { win1.focus(); win1.print() }, 200)
}

// ── Style 2: 100mm × 15mm jewelry price tag labels ──────────────────────────────────────────
export async function doPrintStyle2(
  barcode: string,
  label: string,
  qty: number,
  regularPrice?: number,
  salePrice?: number,
  color?: string,
  size?: string,
  material?: string,
  topOffset: number = 0,
) {
  const JsBarcode = (await import("jsbarcode")).default
  const savings = regularPrice && salePrice && regularPrice > salePrice ? regularPrice - salePrice : 0

  // Render barcode as inline SVG — vector quality, no rasterization blur
  const barcodeSvgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  JsBarcode(barcodeSvgEl, barcode, {
    format: "CODE128", displayValue: false, margin: 0,
    width: 2, height: 80, background: "#FFFFFF", lineColor: "#000000",
  })
  const barcodeSVG = new XMLSerializer().serializeToString(barcodeSvgEl)

  // Attributes inline: Cotton | M | Blue
  const attrParts = [material, size, color].filter(Boolean)
  const attrsLine = attrParts.join(" | ")

  let labelsHTML = ""
  for (let row = 0; row < qty; row++) {
    const isFirst = row === 0
    const rowStyle = isFirst && topOffset > 0 ? `style="padding-top: ${topOffset}mm;"` : ""
    labelsHTML += `
    <div class="row" ${rowStyle}>
      <div class="tag-content">
        <div class="s1">
          ${(regularPrice || savings > 0) ? `
          <div class="mrp-row">
            ${regularPrice ? `<span class="mrp-label">MRP: <span class="mrp-val">₹${regularPrice}</span></span>` : ""}
            ${savings > 0 ? `<span class="save-text">You save ₹${savings}</span>` : ""}
          </div>` : ""}
          ${salePrice ? `<div class="sale-price">₹${salePrice}</div>` : ""}
          <div class="bc">${barcodeSVG}</div>
          <div class="code">${barcode}</div>
        </div>
        <div class="s2">
          <div class="pname">${label}</div>
          ${attrsLine ? `<div class="attrs">${attrsLine}</div>` : ""}
          <div class="divider"></div>
          <div class="website">SAFAWALA.com</div>
        </div>
      </div>
      <div class="s3"></div>
    </div>`
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap">
<style>
  @page { size: 100mm 15mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 100mm; margin: 0; padding: 0; background: #fff; }
  .row { width: 100mm; height: 14.8mm; display: flex; flex-direction: row; page-break-after: always; page-break-inside: avoid; overflow: hidden; }
  .row:last-child { page-break-after: avoid; }
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
  .mrp-row { display: flex; justify-content: space-between; align-items: center; width: 100%; line-height: 1; }
  .mrp-label { font-family: 'Oswald', Arial, sans-serif; font-size: 8pt; color: #000; font-weight: 400; letter-spacing: 0.3px; }
  .mrp-val { position: relative; display: inline-block; font-family: 'Oswald', Arial, sans-serif; font-size: 8pt; font-weight: 400; color: #333; padding: 0 1px; }
  .mrp-val::after { content: ""; position: absolute; left: -2px; bottom: 1px; width: calc(100% + 4px); height: 0.8px; background: #000; transform: rotate(-12deg); transform-origin: left bottom; }
  .save-text { font-family: 'Oswald', Arial, sans-serif; font-size: 8pt; font-weight: 500; color: #000; white-space: nowrap; letter-spacing: 0.2px; }
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
  @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>${labelsHTML}</body></html>`

  const win = window.open("", "_blank")
  if (!win) { toast.error("Please allow popups for printing"); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 800)
}

// ── Style 3: 100mm × 15mm — Big logo, no attributes, Arial ──────────────────
export async function doPrintStyle3(
  barcode: string,
  label: string,
  qty: number,
  salePrice?: number,
  topOffset: number = 0,
) {
  const JsBarcode = (await import("jsbarcode")).default

  const barcodeSvgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  JsBarcode(barcodeSvgEl, barcode, {
    format: "CODE128", displayValue: false, margin: 0,
    width: 2, height: 80, background: "#FFFFFF", lineColor: "#000000",
  })
  const barcodeSVG = new XMLSerializer().serializeToString(barcodeSvgEl)

  let logoSrc3 = ""
  try {
    const res = await fetch("/safawalalogo.png")
    const blob = await res.blob()
    logoSrc3 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { }
  const logoHTML = logoSrc3
    ? `<img src="${logoSrc3}" style="max-width:33mm;max-height:9mm;object-fit:contain;display:block;" />`
    : `<div style="font-family:Arial;font-size:10pt;font-weight:bold;">SAFAWALA</div>`

  let labelsHTML = ""
  for (let row = 0; row < qty; row++) {
    const isFirst = row === 0
    const rowStyle = isFirst && topOffset > 0 ? `style="padding-top: ${topOffset}mm;"` : ""
    labelsHTML += `
    <div class="row" ${rowStyle}>
      <div class="s1">
        ${salePrice ? `<div class="price">₹${salePrice}</div>` : ""}
        <div class="bc">${barcodeSVG}</div>
        <div class="code">${barcode}</div>
        <div class="web">www.safawala.com</div>
      </div>
      <div class="s2">
        <div class="logo">${logoHTML}</div>
        <div class="pname">${label}</div>
      </div>
      <div class="s3"></div>
    </div>`
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: 100mm 15mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 100mm; margin: 0; padding: 0; background: #fff; }
  .row { width: 100mm; height: 14.8mm; display: flex; flex-direction: row; page-break-after: always; page-break-inside: avoid; overflow: hidden; }
  .row:last-child { page-break-after: avoid; }
  .s1 { width: 34.9mm; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.3mm 0.8mm; gap: 0.1mm; }
  .price { font-family: Arial, sans-serif; font-size: 12pt; font-weight: bold; color: #000; line-height: 1; }
  .bc { width: 33mm; height: 7mm; display: block; overflow: hidden; }
  .bc svg { width: 100%; height: 100%; display: block; }
  .code { font-family: Arial, sans-serif; font-size: 8pt; font-weight: bold; color: #000; text-align: center; letter-spacing: 0.3px; }
  .web { font-family: Arial, sans-serif; font-size: 7.5pt; font-weight: normal; color: #000; text-align: center; }
  .s2 { width: 34.9mm; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.3mm 0.8mm; gap: 0.4mm; }
  .logo { display: flex; align-items: center; justify-content: center; width: 33mm; max-height: 9mm; overflow: hidden; }
  .logo svg { width: 33mm; height: auto; max-height: 9mm; display: block; }
  .pname { font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: #000; text-align: center; line-height: 1.1; max-width: 33mm; word-break: break-word; overflow: hidden; }
  .s3 { width: 30mm; height: 100%; }
  @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>${labelsHTML}</body></html>`

  const win = window.open("", "_blank")
  if (!win) { toast.error("Please allow popups for printing"); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 200)
}

// ── Draw Barcode Canvas ────────────────────────────────────────────────────────
export async function drawBarcodeCanvas(
  barcode: string,
  label: string,
  style: 1 | 2 | 3,
  regularPrice?: number,
  salePrice?: number,
  color?: string,
  size?: string,
  material?: string,
  scale: number = 1
): Promise<HTMLCanvasElement> {
  const JsBarcode = (await import("jsbarcode")).default
  const canvas = document.createElement("canvas")

  if (style === 1) {
    // Style 1: 100mm x 25mm layout (2 columns of 50mm x 25mm)
    canvas.width = 800 * scale
    canvas.height = 200 * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return canvas
    
    // Scale coordinate system
    ctx.scale(scale, scale)

    // Fill background
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, 800, 200)

    // Generate barcode canvas once to avoid duplicate creation
    const barcodeCanvas = document.createElement("canvas")
    JsBarcode(barcodeCanvas, barcode, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0,
      background: "#FFFFFF",
      lineColor: "#000000"
    })

    const words = label.split(" ")
    const meta1 = [color, size].filter(Boolean).join(" | ")
    const savings = regularPrice && salePrice && regularPrice > salePrice ? regularPrice - salePrice : 0

    for (let col = 0; col < 2; col++) {
      const dx = col * 400

      // Border (thin light outline matching Style 1 preview)
      ctx.strokeStyle = "#DDDDDD"
      ctx.lineWidth = 3
      ctx.strokeRect(dx + 1.5, 1.5, 397, 197)

      ctx.fillStyle = "#000000"
      ctx.textAlign = "center"

      // Product Title
      ctx.font = "bold 15px Arial"
      let line1 = ""
      let line2 = ""
      for (const word of words) {
        if (ctx.measureText(line1 + " " + word).width < 360 && line2 === "") {
          line1 += (line1 ? " " : "") + word
        } else {
          line2 += (line2 ? " " : "") + word
        }
      }
      ctx.fillText(line1.substring(0, 24), dx + 200, 28)
      if (line2) {
        ctx.fillText(line2.substring(0, 24), dx + 200, 45)
      }

      // Meta Attributes
      ctx.font = "12px Arial"
      ctx.fillStyle = "#000000"
      let metaY = line2 ? 62 : 45
      if (meta1) {
        ctx.fillText(meta1, dx + 200, metaY)
        metaY += 17
      }
      if (material) {
        ctx.fillText(material, dx + 200, metaY)
        metaY += 17
      }

      // Pricing Layout
      const pricingY = metaY + 7
      ctx.textAlign = "left"
      let textX = dx + 30

      if (regularPrice || salePrice) {
        if (regularPrice) {
          ctx.font = "15px Arial"
          ctx.fillStyle = "#000000"
          ctx.fillText(`MRP: ₹${regularPrice}`, textX, pricingY)
          const textWidth = ctx.measureText(`MRP: ₹${regularPrice}`).width
          ctx.strokeStyle = "#000000"
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(textX - 2, pricingY - 4)
          ctx.lineTo(textX + textWidth + 2, pricingY - 4)
          ctx.stroke()
          textX += textWidth + 10
        }
        if (salePrice) {
          ctx.font = "bold 18px Arial"
          ctx.fillStyle = "#000000"
          ctx.fillText(`₹${salePrice}`, textX, pricingY)
          const textWidth = ctx.measureText(`₹${salePrice}`).width
          textX += textWidth + 10
        }
        if (savings > 0) {
          ctx.font = "bold 14px Arial"
          ctx.fillStyle = "#000000"
          ctx.fillText(`Save ₹${savings}`, textX, pricingY - 1)
        }
      }

      // Draw Barcode image
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(barcodeCanvas, dx + 25, 110, 350, 40)
      ctx.imageSmoothingEnabled = true

      // Code String
      ctx.textAlign = "center"
      ctx.font = "bold 13px Courier New"
      ctx.fillStyle = "#000000"
      ctx.fillText(barcode, dx + 200, 160)

      // Website Link
      ctx.font = "17px Arial"
      ctx.fillText("www.safawala.com", dx + 200, 178)
    }

  } else if (style === 2) {
    // Style 2: new layout — MRP+Save row | big sale price | barcode | code || name | attrs | divider | SAFAWALA.com
    canvas.width = 800 * scale
    canvas.height = 120 * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return canvas
    ctx.scale(scale, scale)
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, 800, 120)
    ctx.fillStyle = "#000000"

    const savings = regularPrice && salePrice && regularPrice > salePrice ? regularPrice - salePrice : 0
    const sec1W = 280
    const sec2Start = 280
    const sec2W = 280
    const sec2Center = sec2Start + sec2W / 2

    // --- SECTION 1 ---
    // Row 1: MRP (left, strikethrough) | You save (right) — Y=46
    if (regularPrice || savings > 0) {
      if (regularPrice) {
        ctx.font = "bold 18px Arial"
        ctx.textAlign = "left"
        const prefix = "MRP: "
        ctx.fillText(prefix, 8, 46)
        const prefixW = ctx.measureText(prefix).width
        const priceText = `₹${regularPrice}`
        ctx.fillText(priceText, 8 + prefixW, 46)
        const priceW = ctx.measureText(priceText).width
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(8 + prefixW - 1, 49)
        ctx.lineTo(8 + prefixW + priceW + 1, 36)
        ctx.stroke()
      }
      if (savings > 0) {
        ctx.font = "bold 18px Arial"
        ctx.textAlign = "right"
        ctx.fillText(`You save ₹${savings}`, sec1W - 18, 46)
      }
    }

    // Row 2: Big sale price — Y=68
    if (salePrice) {
      ctx.font = "500 24px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`₹${salePrice}`, sec1W / 2 - 25, 68)
    }

    // Row 3: Barcode (1.5x height = 30) — Y=84
    const bcTop = salePrice ? 76 : 54
    const barcodeCanvas2 = document.createElement("canvas")
    JsBarcode(barcodeCanvas2, barcode, { format: "CODE128", width: 1, height: 30, displayValue: false, margin: 0, background: "#FFFFFF", lineColor: "#000000" })
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(barcodeCanvas2, 6, bcTop, 227, 30)
    ctx.imageSmoothingEnabled = true

    // Row 4: Barcode number — bcTop + 44
    ctx.font = "500 19px 'Courier New'"
    ctx.textAlign = "center"
    ctx.fillText(barcode, sec1W / 2 - 25, bcTop + 44)

    // --- SECTION 2 ---
    // Product name — Y=52
    ctx.font = "500 20px Verdana"
    ctx.textAlign = "center"
    ctx.fillText(label.substring(0, 26), sec2Center - 15, 52)

    // Attributes — Y=72
    const attrParts = [material, size, color].filter(Boolean)
    if (attrParts.length > 0) {
      ctx.font = "500 14px Verdana"
      ctx.fillText(attrParts.join(" | "), sec2Center - 15, 72)
    }

    // Thin divider line — Y=82
    const divY = attrParts.length > 0 ? 82 : 66
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(sec2Start + 5, divY)
    ctx.lineTo(sec2Start + sec2W - 35, divY)
    ctx.stroke()

    // SAFAWALA.com — Y=divY + 28
    ctx.font = "bold 22px Arial"
    ctx.textAlign = "center"
    ctx.fillText("SAFAWALA.com", sec2Center - 15, divY + 28)

  } else {
    // Style 3: big logo + product name only, no attributes, Arial
    canvas.width = 800 * scale
    canvas.height = 120 * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return canvas
    ctx.scale(scale, scale)
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, 800, 120)

    // --- SECTION 1: price + barcode + code + website ---
    const sec1Width = 280
    ctx.textAlign = "center"
    ctx.fillStyle = "#000000"

    if (salePrice) {
      ctx.font = "bold 26px Arial"
      ctx.fillText(`₹${salePrice}`, sec1Width / 2, 24)
    }

    const barcodeCanvas3 = document.createElement("canvas")
    JsBarcode(barcodeCanvas3, barcode, { format: "CODE128", width: 1, height: 48, displayValue: false, margin: 0, background: "#FFFFFF", lineColor: "#000000" })
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(barcodeCanvas3, 10, salePrice ? 42 : 24, 260, 52)
    ctx.imageSmoothingEnabled = true

    ctx.font = "bold 17px Arial"
    ctx.fillText(barcode, sec1Width / 2, salePrice ? 104 : 86)
    ctx.font = "15px Arial"
    ctx.fillText("www.safawala.com", sec1Width / 2, salePrice ? 118 : 100)

    // --- SECTION 2: big logo + product name only ---
    const sec2Width = 280
    const sec2Start = 280
    const sec2Center = sec2Start + (sec2Width / 2)

    let logoDrawn3 = false
    try {
      const logoImg = new Image()
      logoImg.crossOrigin = "anonymous"
      await new Promise<void>((resolve) => {
        logoImg.onload = () => {
          // 2x bigger logo: maxH=84 (vs 42 in style 2)
          const maxLogoW = 254, maxLogoH = 84
          const scaleL = Math.min(maxLogoW / logoImg.naturalWidth, maxLogoH / logoImg.naturalHeight)
          const w = logoImg.naturalWidth * scaleL
          const h = logoImg.naturalHeight * scaleL
          const logoY = 4
          ctx.save()
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(logoImg, (sec2Center - w/2) * scale, logoY * scale, w * scale, h * scale)
          ctx.restore()
          const imgData = ctx.getImageData((sec2Center - w/2) * scale, logoY * scale, w * scale, h * scale)
          for (let k = 0; k < imgData.data.length; k += 4) {
            const brightness = 0.299 * imgData.data[k] + 0.587 * imgData.data[k+1] + 0.114 * imgData.data[k+2]
            if (imgData.data[k+3] < 10) { imgData.data[k] = imgData.data[k+1] = imgData.data[k+2] = 255; imgData.data[k+3] = 0 }
            else if (brightness < 220) { imgData.data[k] = imgData.data[k+1] = imgData.data[k+2] = 0 }
            else { imgData.data[k] = imgData.data[k+1] = imgData.data[k+2] = 255; imgData.data[k+3] = 0 }
          }
          ctx.putImageData(imgData, (sec2Center - w/2) * scale, logoY * scale)
          logoDrawn3 = true
          resolve()
        }
        logoImg.onerror = () => resolve()
        logoImg.src = "/safawalalogo.png"
      })
    } catch { /* ignored */ }
    if (!logoDrawn3) { ctx.font = "bold 28px Arial"; ctx.fillStyle = "#000000"; ctx.fillText("SAFAWALA", sec2Center, 44) }

    // Product name — big, Arial Bold, below logo
    ctx.font = "bold 22px Arial"
    ctx.fillStyle = "#000000"
    ctx.textAlign = "center"
    ctx.fillText(label.substring(0, 24), sec2Center, 106)
  }

  return canvas
}

// ── Download Barcode as PNG at 203 DPI ─────────────────────────────────────────
export async function doDownloadStylePNG(
  barcode: string,
  label: string,
  style: 1 | 2 | 3,
  regularPrice?: number,
  salePrice?: number,
  color?: string,
  size?: string,
  material?: string,
) {
  const canvas = await drawBarcodeCanvas(barcode, label, style, regularPrice, salePrice, color, size, material, 20)
  const link = document.createElement("a")
  const cleanLabel = label
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
  link.download = cleanLabel
    ? `${cleanLabel}-${barcode}-style${style}.png`
    : `barcode-${barcode}-style${style}.png`
  link.href = canvas.toDataURL("image/png")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ── Download Barcode as 24-Bit BMP (Pure Black & White, No Palette Alpha Bugs) ──
export async function doDownloadStyleBMP(
  barcode: string,
  label: string,
  style: 1 | 2 | 3,
  regularPrice?: number,
  salePrice?: number,
  color?: string,
  size?: string,
  material?: string,
) {
  // Use scale = 4 for 812 DPI high-resolution vector-quality BMP download
  const canvas = await drawBarcodeCanvas(barcode, label, style, regularPrice, salePrice, color, size, material, 4)
  const width = canvas.width
  const height = canvas.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data
  
  // 24-bit BMP: 3 bytes per pixel. Rows must be padded to a multiple of 4 bytes.
  const rowBytes = Math.ceil((width * 3) / 4) * 4
  const pixelDataSize = rowBytes * height
  const fileSize = 54 + pixelDataSize
  
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)
  
  // File Header (14 bytes)
  view.setUint8(0, 0x42) // 'B'
  view.setUint8(1, 0x4D) // 'M'
  view.setUint32(2, fileSize, true)
  view.setUint32(6, 0, true) // Reserved
  view.setUint32(10, 54, true) // Offset to pixel data (54 bytes, no palette)
  
  // DIB Header (40 bytes)
  view.setUint32(14, 40, true) // DIB header size
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // Positive height = bottom-to-top
  view.setUint16(26, 1, true) // Planes
  view.setUint16(28, 24, true) // Bits per pixel (24-bit RGB)
  view.setUint32(30, 0, true) // BI_RGB (no compression)
  view.setUint32(34, pixelDataSize, true)
  view.setInt32(38, 2835, true) // Horizontal resolution (~72 DPI)
  view.setInt32(42, 2835, true) // Vertical resolution (~72 DPI)
  view.setUint32(46, 0, true) // Colors in palette (0 for 24-bit)
  view.setUint32(50, 0, true) // Important colors
  
  // Pixel Data (bottom-to-top)
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = 54 + (height - 1 - y) * rowBytes
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]
      
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b
      const alphaFactor = a / 255
      const effectiveBrightness = brightness * alphaFactor + 255 * (1 - alphaFactor)
      
      // Threshold at 180: less than 180 is black (0), otherwise white (255)
      const colorVal = effectiveBrightness < 180 ? 0 : 255
      
      const pixelOffset = rowStart + x * 3
      view.setUint8(pixelOffset, colorVal)     // Blue
      view.setUint8(pixelOffset + 1, colorVal) // Green
      view.setUint8(pixelOffset + 2, colorVal) // Red
    }
  }
  
  const blob = new Blob([buffer], { type: "image/bmp" })
  const link = document.createElement("a")
  const cleanLabel = label
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
  link.download = cleanLabel
    ? `${cleanLabel}-${barcode}-style${style}.bmp`
    : `barcode-${barcode}-style${style}.bmp`
  link.href = URL.createObjectURL(blob)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Helper to load and process base64 logo for vectors
function getLogoBase64(): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        // Convert to solid black with transparency
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        for (let k = 0; k < imgData.data.length; k += 4) {
          const r = imgData.data[k]
          const g = imgData.data[k+1]
          const b = imgData.data[k+2]
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b
          if (brightness < 240) {
            imgData.data[k] = 0
            imgData.data[k+1] = 0
            imgData.data[k+2] = 0
          } else {
            imgData.data[k] = 255
            imgData.data[k+1] = 255
            imgData.data[k+2] = 255
            imgData.data[k+3] = 0 // Transparent
          }
        }
        ctx.putImageData(imgData, 0, 0)
        resolve(canvas.toDataURL("image/png"))
      } else {
        resolve("")
      }
    }
    img.onerror = () => resolve("")
    img.src = "/safawalalogo.png"
  })
}

// ── Download Barcode as SVG (Pure Vector) ──────────────────────────────────────
export async function doDownloadStyleSVG(
  barcode: string,
  label: string,
  style: 1 | 2 | 3,
  regularPrice?: number,
  salePrice?: number,
  color?: string,
  size?: string,
  material?: string,
) {
  const JsBarcode = (await import("jsbarcode")).default
  
  // Render barcode to temporary SVG to extract vector paths
  const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  JsBarcode(tempSvg, barcode, {
    format: "CODE128",
    displayValue: false,
    margin: 0,
  })
  
  const tempWidth = parseFloat(tempSvg.getAttribute("width") || "100")
  const tempHeight = parseFloat(tempSvg.getAttribute("height") || "100")
  
  let svgContent = ""
  
  if (style === 1) {
    // Style 1: 100mm x 25mm (2 columns of 50mm x 25mm)
    const bcW = 42
    const bcH = 6.5
    const bcX = 4
    const bcY = 11.5
    
    const scaleX = bcW / tempWidth
    const scaleY = bcH / tempHeight
    const barsHTML = tempSvg.innerHTML
    
    const titleWords = label.split(" ")
    let line1 = ""
    let line2 = ""
    for (const word of titleWords) {
      if ((line1 + " " + word).length < 24 && line2 === "") {
        line1 += (line1 ? " " : "") + word
      } else {
        line2 += (line2 ? " " : "") + word
      }
    }
    line1 = line1.substring(0, 24)
    line2 = line2.substring(0, 24)
    
    const meta1 = [color, size].filter(Boolean).join(" | ")
    const savings = regularPrice && salePrice && regularPrice > salePrice ? regularPrice - salePrice : 0
    const pricingY = line2 ? 10.2 : 8.5
    
    let pricingHTML = ""
    let currentX = 5
    
    if (regularPrice) {
      pricingHTML += `
        <text x="${currentX}" y="${pricingY}" font-family="Arial" font-size="2.2" fill="#000000">MRP: ₹${regularPrice}</text>
        <line x1="${currentX}" y1="${pricingY - 0.5}" x2="${currentX + 10}" y2="${pricingY - 0.5}" stroke="#000000" stroke-width="0.2" />
      `
      currentX += 12
    }
    if (salePrice) {
      pricingHTML += `
        <text x="${currentX}" y="${pricingY}" font-family="Arial" font-size="2.2" font-weight="bold" fill="#000000">₹${salePrice}</text>
      `
      currentX += 10
    }
    if (savings > 0) {
      pricingHTML += `
        <text x="${currentX}" y="${pricingY - 0.2}" font-family="Arial" font-size="2.0" font-weight="bold" fill="#000000">Save ₹${savings}</text>
      `
    }
    
    const singleLabelSVG = `
      <rect x="0.25" y="0.25" width="49.5" height="24.5" fill="#FFFFFF" stroke="#DDDDDD" stroke-width="0.5" rx="0.5" ry="0.5" />
      <text x="25" y="3.5" font-family="Arial" font-size="2.0" font-weight="bold" fill="#000000" text-anchor="middle">${line1}</text>
      ${line2 ? `<text x="25" y="5.7" font-family="Arial" font-size="2.0" font-weight="bold" fill="#000000" text-anchor="middle">${line2}</text>` : ""}
      
      <text x="25" y="${line2 ? 7.6 : 5.7}" font-family="Arial" font-size="1.6" fill="#000000" text-anchor="middle">${meta1}</text>
      ${material ? `<text x="25" y="${line2 ? 9.2 : 7.3}" font-family="Arial" font-size="1.6" fill="#000000" text-anchor="middle">${material}</text>` : ""}
      
      ${pricingHTML}
      
      <g transform="translate(${bcX}, ${bcY}) scale(${scaleX}, ${scaleY})">
        ${barsHTML}
      </g>
      
      <text x="25" y="20.2" font-family="Courier New" font-size="1.8" font-weight="bold" fill="#000000" text-anchor="middle">${barcode}</text>
      <text x="25" y="22.5" font-family="Arial" font-size="1.5" fill="#000000" text-anchor="middle">www.safawala.com</text>
    `

    svgContent = `
      <g transform="translate(0, 0)">
        ${singleLabelSVG}
      </g>
      <g transform="translate(50, 0)">
        ${singleLabelSVG}
      </g>
    `
  } else {
    // Style 2: 100mm x 15mm
    const bcW = 31.5
    const bcH = 3.2
    const bcX = 2
    const bcY = 4.0
    
    const scaleX = bcW / tempWidth
    const scaleY = bcH / tempHeight
    const barsHTML = tempSvg.innerHTML
    
    const savings = regularPrice && salePrice && regularPrice > salePrice ? regularPrice - salePrice : 0
    let pricingHTML = ""
    let currentX = 2
    const pricingY = 3.2
    
    if (regularPrice) {
      pricingHTML += `
        <text x="${currentX}" y="${pricingY}" font-family="Helvetica, Arial, sans-serif" font-size="2.2" fill="#000000">MRP: ₹${regularPrice}</text>
        <line x1="${currentX}" y1="${pricingY - 0.5}" x2="${currentX + 9}" y2="${pricingY - 0.5}" stroke="#000000" stroke-width="0.15" />
      `
      currentX += 10
    }
    if (salePrice) {
      pricingHTML += `
        <text x="${currentX}" y="${pricingY}" font-family="Helvetica, Arial, sans-serif" font-size="2.2" font-weight="500" fill="#000000">₹${salePrice}</text>
      `
      currentX += 9
    }
    if (savings > 0) {
      pricingHTML += `
        <text x="${currentX}" y="${pricingY - 0.1}" font-family="Helvetica, Arial, sans-serif" font-size="2.0" font-weight="500" fill="#000000">Save ₹${savings}</text>
      `
    }

    const logoHTML = `<text x="52.5" y="4.5" font-family="Arial, sans-serif" font-size="3.8" font-weight="bold" fill="#000000" text-anchor="middle" letter-spacing="0.3">SAFAWALA</text><text x="62.5" y="4.5" font-family="Arial, sans-serif" font-size="2.4" font-weight="normal" fill="#000000" text-anchor="start">.com</text>`

    let featY = 10.5
    let featHTML = ""
    if (material) {
      featHTML += `<text x="37.5" y="${featY}" font-family="Verdana, sans-serif" font-size="1.5" fill="#000000">MATERIAL: ${material}</text>`
      featY += 1.6
    }
    if (size) {
      featHTML += `<text x="37.5" y="${featY}" font-family="Verdana, sans-serif" font-size="1.5" fill="#000000">SIZE: ${size}</text>`
      featY += 1.6
    }
    if (color) {
      featHTML += `<text x="37.5" y="${featY}" font-family="Verdana, sans-serif" font-size="1.5" fill="#000000">COLOUR: ${color}</text>`
      featY += 1.6
    }

    svgContent = `
      <rect x="0" y="0" width="100" height="15" fill="#FFFFFF" />
      ${pricingHTML}
      <g transform="translate(${bcX}, ${bcY}) scale(${scaleX}, ${scaleY})">
        ${barsHTML}
      </g>
      <text x="17.5" y="11.8" font-family="Courier New, monospace" font-size="3.4" font-weight="500" fill="#000000" text-anchor="middle">${barcode}</text>
      <text x="17.5" y="13.8" font-family="Helvetica, Arial, sans-serif" font-size="1.2" fill="#000000" text-anchor="middle">www.safawala.com</text>
      <line x1="35" y1="1" x2="35" y2="14" stroke="#000000" stroke-width="0.2" />
      ${logoHTML}
      <line x1="39" y1="6.2" x2="66" y2="6.2" stroke="#000000" stroke-width="0.15" />
      <text x="52.5" y="8.5" font-family="Verdana, sans-serif" font-size="1.8" font-weight="500" fill="#000000" text-anchor="middle">${label.substring(0, 30)}</text>
      ${featHTML}
    `
  }  
  const fullSVG = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100mm" height="${style === 1 ? "25mm" : "15mm"}" viewBox="0 0 100 ${style === 1 ? "25" : "15"}">
  ${svgContent}
</svg>`

  const blob = new Blob([fullSVG], { type: "image/svg+xml;charset=utf-8" })
  const link = document.createElement("a")
  const cleanLabel = label
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
  link.download = cleanLabel
    ? `${cleanLabel}-${barcode}-style${style}.svg`
    : `barcode-${barcode}-style${style}.svg`
  link.href = URL.createObjectURL(blob)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ── Download Barcode as PDF (Vector Layout) ───────────────────────────────────
export async function doDownloadStylePDF(
  barcode: string,
  label: string,
  style: 1 | 2 | 3,
  regularPrice?: number,
  salePrice?: number,
  color?: string,
  size?: string,
  material?: string,
) {
  const { jsPDF } = await import("jspdf")
  const JsBarcode = (await import("jsbarcode")).default
  
  const width = 100
  const height = style === 1 ? 25 : 15
  
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [width, height],
    putOnlyUsedFonts: true
  })
  
  if (style === 1) {
    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, 0, 100, 25, "F")
    
    const titleWords = label.split(" ")
    let line1 = ""
    let line2 = ""
    for (const word of titleWords) {
      if ((line1 + " " + word).length < 24 && line2 === "") {
        line1 += (line1 ? " " : "") + word
      } else {
        line2 += (line2 ? " " : "") + word
      }
    }
    line1 = line1.substring(0, 24)
    line2 = line2.substring(0, 24)
    
    const meta1 = [color, size].filter(Boolean).join(" | ")
    const savings = regularPrice && salePrice && regularPrice > salePrice ? regularPrice - salePrice : 0
    const pricingY = line2 ? 11.2 : 9.5
    
    const barcodeCanvas = document.createElement("canvas")
    JsBarcode(barcodeCanvas, barcode, {
      format: "CODE128",
      width: 4,
      height: 80,
      displayValue: false,
      margin: 0,
      background: "#FFFFFF",
      lineColor: "#000000"
    })
    const barcodeImgData = barcodeCanvas.toDataURL("image/png")

    for (let col = 0; col < 2; col++) {
      const dx = col * 50

      pdf.setDrawColor(220, 220, 220)
      pdf.setLineWidth(0.3)
      pdf.rect(dx + 0.5, 0.5, 49, 24, "S")
      
      pdf.setTextColor(0, 0, 0)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(6.5)
      pdf.text(line1, dx + 25, 3.8, { align: "center" })
      if (line2) {
        pdf.text(line2, dx + 25, 6.2, { align: "center" })
      }
      
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(5.0)
      pdf.text(meta1, dx + 25, line2 ? 8.2 : 6.2, { align: "center" })
      
      if (material) {
        pdf.text(material, dx + 25, line2 ? 10.0 : 8.0, { align: "center" })
      }
      
      let currentX = dx + 5
      
      if (regularPrice) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(6.5)
        pdf.text(`MRP: ₹${regularPrice}`, currentX, pricingY)
        const textWidth = pdf.getTextWidth(`MRP: ₹${regularPrice}`)
        pdf.setDrawColor(0, 0, 0)
        pdf.setLineWidth(0.15)
        pdf.line(currentX, pricingY - 0.5, currentX + textWidth, pricingY - 0.5)
        currentX += textWidth + 2
      }
      if (salePrice) {
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(8.0)
        pdf.text(`₹${salePrice}`, currentX, pricingY)
        const textWidth = pdf.getTextWidth(`₹${salePrice}`)
        currentX += textWidth + 2
      }
      if (savings > 0) {
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(6.0)
        pdf.text(`Save ₹${savings}`, currentX, pricingY - 0.2)
      }
      
      pdf.addImage(barcodeImgData, "PNG", dx + 4, 12, 42, 6.5)
      
      pdf.setFont("courier", "bold")
      pdf.setFontSize(5.5)
      pdf.text(barcode, dx + 25, 20.2, { align: "center" })
      
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(4.5)
      pdf.text("www.safawala.com", dx + 25, 22.5, { align: "center" })
    }
    
  } else {
    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, 0, 100, 15, "F")
    
    const savings = regularPrice && salePrice && regularPrice > salePrice ? regularPrice - salePrice : 0
    let currentX = 2
    const pricingY = 3.2
    
    pdf.setTextColor(0, 0, 0)
    if (regularPrice) {
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(6.5)
      pdf.text(`MRP: ₹${regularPrice}`, currentX, pricingY)
      const textWidth = pdf.getTextWidth(`MRP: ₹${regularPrice}`)
      pdf.setDrawColor(0, 0, 0)
      pdf.setLineWidth(0.15)
      pdf.line(currentX, pricingY - 0.5, currentX + textWidth, pricingY - 0.5)
      currentX += textWidth + 1.5
    }
    if (salePrice) {
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(8.0)
      pdf.text(`₹${salePrice}`, currentX, pricingY)
      const textWidth = pdf.getTextWidth(`₹${salePrice}`)
      currentX += textWidth + 1.5
    }
    if (savings > 0) {
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(6.0)
      pdf.text(`Save ₹${savings}`, currentX, pricingY - 0.1)
    }
    
    const barcodeCanvas = document.createElement("canvas")
    JsBarcode(barcodeCanvas, barcode, {
      format: "CODE128",
      width: 4,
      height: 80,
      displayValue: false,
      margin: 0,
      background: "#FFFFFF",
      lineColor: "#000000"
    })
    pdf.addImage(barcodeCanvas.toDataURL("image/png"), "PNG", 2, 4.2, 31, 3.2)
    
    pdf.setFont("courier", "normal")
    pdf.setFontSize(11)
    pdf.text(barcode, 17.5, 12.0, { align: "center" })
    
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(3.5)
    pdf.text("www.safawala.com", 17.5, 14.0, { align: "center" })
    
    pdf.setDrawColor(0, 0, 0)
    pdf.setLineWidth(0.2)
    pdf.line(35, 1, 35, 14)
    
    // SAFAWALA big bold + .com smaller, side by side centered
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(7.5)
    const safaTextW = pdf.getTextWidth("SAFAWALA")
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(4.8)
    const comTextW = pdf.getTextWidth(".com")
    const brandStartX = 52.5 - (safaTextW + comTextW) / 2
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(7.5)
    pdf.text("SAFAWALA", brandStartX, 4.5)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(4.8)
    pdf.text(".com", brandStartX + safaTextW, 4.5)

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(5.5)
    pdf.text(label.substring(0, 30), 52.5, 8.5, { align: "center" })
    
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(4.8)
    let featY = 10.5
    if (material) {
      pdf.text(`MATERIAL: ${material}`, 37.5, featY)
      featY += 1.6
    }
    if (size) {
      pdf.text(`SIZE: ${size}`, 37.5, featY)
      featY += 1.6
    }
    if (color) {
      pdf.text(`COLOUR: ${color}`, 37.5, featY)
      featY += 1.6
    }
  }
  
  const cleanLabel = label
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
  const pdfName = cleanLabel
    ? `${cleanLabel}-${barcode}-style${style}.pdf`
    : `barcode-${barcode}-style${style}.pdf`
  pdf.save(pdfName)
}

// ── Download Barcode as CSV for BarTender (Data File) ────────────────────────
export function doDownloadCSV(
  barcode: string,
  label: string,
  regularPrice: number | undefined,
  salePrice: number | undefined,
  color: string | undefined,
  size: string | undefined,
  material: string | undefined,
  quantity: number
) {
  const headers = ["Barcode", "ProductName", "RegularPrice", "SalePrice", "Color", "Size", "Material", "Quantity"]
  const row = [
    barcode,
    label,
    regularPrice ?? "",
    salePrice ?? "",
    color ?? "",
    size ?? "",
    material ?? "",
    quantity
  ]
  
  const escapeCSV = (val: any) => {
    if (val === undefined || val === null) return ""
    const str = String(val)
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [
    headers.map(escapeCSV).join(","),
    row.map(escapeCSV).join(",")
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const cleanLabel = label
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
  link.download = cleanLabel
    ? `${cleanLabel}-${barcode}-bartender.csv`
    : `barcode-${barcode}-bartender.csv`
  link.href = URL.createObjectURL(blob)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ── Dialog ───────────────────────────────────────────────────────────────────
export function BarcodePrintDialog({ open, onOpenChange, product }: BarcodeDialogProps) {
  const [quantity, setQuantity] = useState(1)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [printing, setPrinting] = useState(false)
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("main")
  const [printStyle, setPrintStyle] = useState<1 | 2 | 3>(1)
  const [topOffset, setTopOffset] = useState(0) // mm offset for first label alignment
  const [darkness, setDarkness] = useState(15)   // default to sharp 15
  const [speed, setSpeed] = useState(2)         // default to sharpest 2 in/sec
  const [zebraDevice, setZebraDevice] = useState<any | null>(null)
  const [zebraDevices, setZebraDevices] = useState<any[]>([])
  const [zebraStatus, setZebraStatus] = useState<"loading" | "connected" | "disconnected">("loading")
  const [showSetup, setShowSetup] = useState(false)
  const [bartenderStatus, setBartenderStatus] = useState<"idle" | "connected" | "disconnected">("idle")
  const [showBartenderSetup, setShowBartenderSetup] = useState(false)

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

  const checkBartender = async () => {
    setBartenderStatus("idle")
    const ok = await checkBartenderBridge()
    setBartenderStatus(ok ? "connected" : "disconnected")
  }

  useEffect(() => {
    if (open && product?.id) {
      loadVariants()
      setSelectedVariantId(null)
      setQuantity(1)
      setActiveTab("main")
      checkZebra()
      checkBartender()
    }
  }, [open, product?.id])

  const loadVariants = async () => {
    if (!product?.id) return
    try {
      setLoadingVariants(true)
      const res = await fetch(`/api/products/${product.id}/variations`)
      if (!res.ok) throw new Error("Failed to load variants")
      const json = await res.json()
      setVariants(json.data || [])
    } catch {
      toast.error("Failed to load variants")
    } finally {
      setLoadingVariants(false)
    }
  }

  const handlePrint = async (
    barcode: string | undefined,
    label: string,
    regularPrice?: number,
    salePrice?: number,
    color?: string,
    size?: string,
    material?: string,
  ) => {
    if (!barcode) { toast.error(`No barcode for ${label}`); return }
    if (quantity < 1) { toast.error("Enter at least 1 label"); return }
    setPrinting(true)
    try {
      if (printStyle === 2) {
        await doPrintStyle2(barcode, label, quantity, regularPrice, salePrice, color, size, material, topOffset)
      } else if (printStyle === 3) {
        await doPrintStyle3(barcode, label, quantity, salePrice, topOffset)
      } else {
        await doPrint(barcode, label, quantity, regularPrice, salePrice, color, size, material)
      }
      toast.success(`Sent ${quantity} label${quantity > 1 ? "s" : ""} to printer`)
    } catch {
      toast.error("Print failed")
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadPNG = async (
    barcode: string | undefined,
    label: string,
    regularPrice?: number,
    salePrice?: number,
    color?: string,
    size?: string,
    material?: string,
  ) => {
    if (!barcode) { toast.error(`No barcode for ${label}`); return }
    setPrinting(true)
    try {
      await doDownloadStylePNG(barcode, label, printStyle, regularPrice, salePrice, color, size, material)
      toast.success("Downloaded barcode PNG successfully")
    } catch (e) {
      console.error(e)
      toast.error("Failed to download barcode image")
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadBMP = async (
    barcode: string | undefined,
    label: string,
    regularPrice?: number,
    salePrice?: number,
    color?: string,
    size?: string,
    material?: string,
  ) => {
    if (!barcode) { toast.error(`No barcode for ${label}`); return }
    setPrinting(true)
    try {
      await doDownloadStyleBMP(barcode, label, printStyle, regularPrice, salePrice, color, size, material)
      toast.success("Downloaded barcode BMP successfully")
    } catch (e) {
      console.error(e)
      toast.error("Failed to download barcode BMP")
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadPDF = async (
    barcode: string | undefined,
    label: string,
    regularPrice?: number,
    salePrice?: number,
    color?: string,
    size?: string,
    material?: string,
  ) => {
    if (!barcode) { toast.error(`No barcode for ${label}`); return }
    setPrinting(true)
    try {
      await doDownloadStylePDF(barcode, label, printStyle, regularPrice, salePrice, color, size, material)
      toast.success("Downloaded barcode PDF successfully")
    } catch (e) {
      console.error(e)
      toast.error("Failed to download barcode PDF")
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadSVG = async (
    barcode: string | undefined,
    label: string,
    regularPrice?: number,
    salePrice?: number,
    color?: string,
    size?: string,
    material?: string,
  ) => {
    if (!barcode) { toast.error(`No barcode for ${label}`); return }
    setPrinting(true)
    try {
      await doDownloadStyleSVG(barcode, label, printStyle, regularPrice, salePrice, color, size, material)
      toast.success("Downloaded barcode SVG successfully")
    } catch (e) {
      console.error(e)
      toast.error("Failed to download barcode SVG")
    } finally {
      setPrinting(false)
    }
  }

  const handleBartenderPrint = async (
    barcode: string | undefined,
    label: string,
    regularPrice?: number,
    salePrice?: number,
    color?: string,
    size?: string,
    material?: string,
  ) => {
    if (!barcode) { toast.error(`No barcode for ${label}`); return }
    if (quantity < 1) { toast.error("Enter at least 1 label"); return }
    setPrinting(true)
    try {
      const result = await printViaBartender({
        barcode,
        productName: label,
        salePrice,
        regularPrice,
        color,
        size,
        material,
        quantity,
      })
      if (result.success) {
        toast.success(`Sent ${quantity} label${quantity > 1 ? "s" : ""} to BarTender`)
      } else {
        toast.error(result.error || "BarTender print failed")
      }
    } catch {
      toast.error("BarTender Bridge unreachable")
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadCSV = async (
    barcode: string | undefined,
    label: string,
    regularPrice?: number,
    salePrice?: number,
    color?: string,
    size?: string,
    material?: string,
  ) => {
    if (!barcode) { toast.error(`No barcode for ${label}`); return }
    setPrinting(true)
    try {
      doDownloadCSV(barcode, label, regularPrice, salePrice, color, size, material, quantity)
      toast.success("Downloaded CSV for BarTender successfully")
    } catch (e) {
      console.error(e)
      toast.error("Failed to download CSV")
    } finally {
      setPrinting(false)
    }
  }

  const handleZPLPrint = async (
    barcode: string | undefined,
    label: string,
    regularPrice?: number,
    salePrice?: number,
    color?: string,
    size?: string,
    material?: string,
  ) => {
    if (!barcode) { toast.error(`No barcode for ${label}`); return }
    if (quantity < 1) { toast.error("Enter at least 1 label"); return }
    setPrinting(true)
    try {
      const { printZPLDirect } = await import("@/lib/zebra-zpl-service")
      const items = Array.from({ length: quantity }).map(() => ({
        code: barcode,
        productName: label,
        price: salePrice,
        regular_price: regularPrice,
        color,
        size,
        material
      }))

      const ok = await printZPLDirect({
        barcodes: items,
        style: printStyle,
        topOffset: printStyle === 2 ? topOffset : 0,
        printDensity: darkness,
        printSpeed: speed
      }, zebraDevice)

      if (ok) {
        toast.success(`Printed ${quantity} labels directly to ${zebraDevice?.name || "Zebra printer"}`)
      } else {
        toast.warning("Direct print was not possible. ZPL file downloaded instead.")
      }
    } catch (err) {
      console.error(err)
      toast.error("ZPL printing failed")
    } finally {
      setPrinting(false)
    }
  }

  if (!product) return null

  const selectedVariant = variants.find((v) => v.id === selectedVariantId)
  const regPrice = selectedVariant
    ? (product.regular_price ?? 0) + (selectedVariant.regular_price_adjustment ?? 0) || undefined
    : undefined
  const salPrice = selectedVariant
    ? (product.price ?? 0) + (selectedVariant.price_adjustment ?? 0) || undefined
    : undefined
  const varColor    = selectedVariant ? selectedVariant.color    || product.color    : undefined
  const varSize     = selectedVariant ? selectedVariant.size     || product.size     : undefined
  const varMaterial = selectedVariant ? selectedVariant.material || product.material : undefined
  const varName     = selectedVariant ? getCleanVariantName(product.name, selectedVariant.variation_name) : ""

  const buildMeta = (color?: string, size?: string, material?: string) =>
    [color, size, material].filter(Boolean).join(" | ")

  // ── Style selector (shared across tabs) ──
  const StyleSelector = () => (
    <div className="mb-1">
      <Label className="text-xs mb-1.5 block">Label Style</Label>
      <div className="flex gap-2">
        {/* Style 1 card */}
        <button
          onClick={() => setPrintStyle(1)}
          className={`flex-1 rounded border-2 p-2 text-left transition-all ${
            printStyle === 1 ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-white"
          }`}
        >
          <div className="text-[10px] font-bold mb-1.5">Style 1 — Simple</div>
          <div className="flex gap-1">
            {[0, 1].map((i) => (
              <div key={i} className="flex-1 border border-gray-300 p-1 bg-white flex flex-col items-center gap-0.5">
                <div className="text-[5px] font-bold truncate w-full text-center text-gray-700 leading-tight">
                  {(product.name || "Product").substring(0, 12)}
                </div>
                <div className="bg-black h-2 w-full" />
                <div className="text-[4px] font-mono text-gray-500 truncate w-full text-center">
                  {product.barcode?.substring(0, 10) || "BARCODE"}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[8px] text-gray-400 text-center mt-1">50mm × 2 per row · 25mm tall</div>
        </button>

        {/* Style 2 card */}
        <button
          onClick={() => setPrintStyle(2)}
          className={`flex-1 rounded border-2 p-2 text-left transition-all ${
            printStyle === 2 ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-white"
          }`}
        >
          <div className="text-[10px] font-bold mb-1.5">Style 2 — Branded</div>
          <div className="border border-gray-300 bg-white flex h-8 overflow-hidden rounded-sm">
            <div className="flex-1 border-r border-gray-200 flex flex-col items-center justify-center gap-px px-0.5">
              {product.price && <div className="text-[5.5px] font-black leading-none">₹{product.price}</div>}
              <div className="bg-black h-1.5 w-full" />
              <div className="text-[3.5px] font-mono text-gray-400 truncate w-full text-center leading-none">
                {product.barcode?.substring(0, 10) || "BARCODE"}
              </div>
              <div className="text-[3px] text-gray-300 leading-none">safawala.com</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-px px-0.5">
              <div className="text-[4.5px] font-black text-yellow-600 leading-none">SAFAWALA</div>
              <div className="text-[4px] font-bold text-center text-gray-700 truncate w-full leading-tight">
                {(product.name || "Product").substring(0, 10)}
              </div>
              {product.material && <div className="text-[3px] text-gray-400 leading-none">{product.material}</div>}
            </div>
            <div className="w-4 bg-gray-50" />
          </div>
          <div className="text-[8px] text-gray-400 text-center mt-1">100mm × 1 per row · 15mm tall</div>
        </button>

        {/* Style 3 card */}
        <button
          onClick={() => setPrintStyle(3)}
          className={`flex-1 rounded border-2 p-2 text-left transition-all ${
            printStyle === 3 ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-white"
          }`}
        >
          <div className="text-[10px] font-bold mb-1.5">Style 3 — Big Logo</div>
          <div className="border border-gray-300 bg-white flex h-8 overflow-hidden rounded-sm">
            <div className="flex-1 border-r border-gray-200 flex flex-col items-center justify-center gap-px px-0.5">
              {product.price && <div className="text-[6px] font-black leading-none">₹{product.price}</div>}
              <div className="bg-black h-2 w-full" />
              <div className="text-[3.5px] font-mono text-gray-400 truncate w-full text-center leading-none">
                {product.barcode?.substring(0, 10) || "BARCODE"}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-0.5">
              <div className="text-[6px] font-black text-yellow-600 leading-none">SAFAWALA</div>
              <div className="text-[5px] font-bold text-center text-gray-800 truncate w-full leading-tight mt-px">
                {(product.name || "Product").substring(0, 10)}
              </div>
            </div>
            <div className="w-4 bg-gray-50" />
          </div>
          <div className="text-[8px] text-gray-400 text-center mt-1">Big logo · No attributes</div>
        </button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Print Barcodes — {product.name}</DialogTitle>
        </DialogHeader>

        {loadingVariants ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="main">Main Product</TabsTrigger>
              <TabsTrigger value="variants">Variants ({variants.length})</TabsTrigger>
            </TabsList>

            {/* ── Main Product ── */}
            <TabsContent value="main" className="space-y-3 mt-4">
              {!product.barcode ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No barcode assigned. Open the product editor → Barcode tab to generate one.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <StyleSelector />

                  {/* Preview */}
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <p className="text-xs text-muted-foreground mb-2">
                      {printStyle === 1 ? "Label preview (50mm × 25mm)" : "Label preview (100mm × 15mm)"}
                    </p>
                    {printStyle === 1 ? (
                      <div className="bg-white border-2 border-gray-400 rounded p-2 inline-block">
                        <div className="flex flex-col items-center gap-0.5" style={{ width: "200px" }}>
                          <div className="text-[10px] font-bold text-center leading-tight">{product.name.substring(0, 22)}</div>
                          {buildMeta(product.color, product.size, product.material) && (
                            <div className="text-[8px] font-bold text-gray-600 text-center">{buildMeta(product.color, product.size, product.material)}</div>
                          )}
                          {product.regular_price ? (
                            <div className="text-[8px] font-bold text-center">
                              MRP:{" "}
                              <span className="relative inline-block mr-0.5 text-gray-500">
                                ₹{product.regular_price}
                                <span className="absolute left-[-5%] top-1/2 w-[110%] h-[1px] bg-gray-500 rotate-[15deg]"></span>
                                <span className="absolute left-[-5%] top-1/2 w-[110%] h-[1px] bg-gray-500 -rotate-[15deg]"></span>
                              </span>
                            </div>
                          ) : null}
                          {product.price ? <div className="text-[11px] font-bold text-center">₹{product.price}</div> : null}
                          {product.regular_price && product.price && product.regular_price > product.price ? (
                            <div className="text-[7px] font-bold text-center">You save ₹{product.regular_price - product.price}</div>
                          ) : null}
                          <div className="bg-black h-5 w-full flex items-center justify-center mt-0.5">
                            <div className="flex gap-px h-4">
                              {Array.from({ length: 28 }).map((_, j) => (
                                <div key={j} className="bg-white" style={{ width: j % 4 === 0 ? "2px" : "1px" }} />
                              ))}
                            </div>
                          </div>
                          <div className="text-[8px] font-mono font-bold">{product.barcode}</div>
                          <div className="text-[7px] font-bold font-sans mt-0.5">www.safawala.com</div>
                        </div>
                      </div>
                    ) : (
                      /* Style 2 preview */
                      <div className="bg-white border-2 border-gray-400 rounded flex overflow-hidden" style={{ width: "100%", height: "56px" }}>
                        {/* sec 1 */}
                        <div className="flex flex-col items-center justify-center gap-0.5 border-r border-gray-200 px-2" style={{ width: "35%" }}>
                          {product.price && <div className="text-[9px] font-black">₹{product.price}</div>}
                          <div className="bg-black h-3 w-full" />
                          <div className="text-[6px] font-mono text-gray-500 truncate w-full text-center">{product.barcode}</div>
                          <div className="text-[5px] text-gray-400">www.safawala.com</div>
                        </div>
                        {/* sec 2 */}
                        <div className="flex flex-col items-center justify-center gap-0.5 px-2" style={{ width: "35%" }}>
                          <div className="text-[7px] font-black text-yellow-600">SAFAWALA</div>
                          <div className="w-full h-px bg-gray-200" />
                          <div className="text-[7px] font-bold text-center leading-tight text-gray-800">{product.name.substring(0, 18)}</div>
                          {product.material && <div className="text-[5px] text-gray-400">Mat: {product.material}</div>}
                          {product.size     && <div className="text-[5px] text-gray-400">Size: {product.size}</div>}
                          {product.color    && <div className="text-[5px] text-gray-400">Col: {product.color}</div>}
                        </div>
                        {/* sec 3 blank */}
                        <div className="bg-gray-50" style={{ width: "30%" }} />
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <Label className="text-sm">Number of Labels</Label>
                    <div className="flex gap-2 mt-1">
                      <Input type="number" min="1" max="100" value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20" />
                      <div className="flex gap-1">
                        {[1, 5, 10, 20, 50].map((n) => (
                          <Button key={n} type="button" size="sm" variant={quantity === n ? "default" : "outline"}
                            className="px-2 h-9" onClick={() => setQuantity(n)}>
                            {n}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {printStyle === 1
                        ? `${Math.ceil(quantity / 2)} rows (2 labels per row)`
                        : `${quantity} rows (1 label per row)`}
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <h4 className="font-semibold text-xs text-amber-900 mb-1">Thermal Printer Setup</h4>
                    <ul className="text-xs text-amber-800 space-y-0.5">
                      {printStyle === 1 ? (
                        <>
                          <li>• Paper Size: 100mm × 25mm</li>
                          <li>• Margins: None (0mm) · Scale: 100%</li>
                        </>
                      ) : (
                        <>
                          <li>• Paper Size: 100mm × 15mm</li>
                          <li>• Margins: None (0mm) · Scale: 100%</li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Top Offset — only for Style 2 */}
                  {printStyle === 2 && (
                    <div>
                      <Label className="text-xs">Top Offset (alignment)</Label>
                      <div className="flex items-center gap-2 mt-1">
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
                            <Button key={n} type="button" size="sm" variant={topOffset === n ? "default" : "outline"}
                              className="h-7 px-2 text-[10px]" onClick={() => setTopOffset(n)}>
                              {n}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Adjust if labels print between stickers. Default: 15mm.
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

                  {/* BarTender Bridge */}
                  <div className="border rounded-lg p-3 bg-orange-50 border-orange-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          bartenderStatus === "connected" ? "bg-orange-500 animate-pulse" :
                          bartenderStatus === "idle" ? "bg-blue-400 animate-pulse" : "bg-gray-400"
                        }`} />
                        <span className="text-xs font-semibold text-orange-900">
                          BarTender Bridge: {bartenderStatus === "connected" ? "Ready" : bartenderStatus === "idle" ? "Checking..." : "Not running"}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={checkBartender}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {bartenderStatus === "connected" && (
                      <Button
                        type="button"
                        onClick={() => handleBartenderPrint(product.barcode, product.name, product.regular_price, product.price, product.color, product.size, product.material)}
                        disabled={printing}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        {printing ? "Sending to BarTender..." : `Print ${quantity} Label${quantity > 1 ? "s" : ""} via BarTender`}
                      </Button>
                    )}
                    {bartenderStatus === "disconnected" && (
                      <div className="text-[11px] text-orange-800 space-y-1">
                        <p>Bridge not running.{" "}
                          <button onClick={() => setShowBartenderSetup(!showBartenderSetup)} className="underline font-semibold">
                            View setup steps
                          </button>
                        </p>
                        {showBartenderSetup && (
                          <div className="bg-white border border-orange-200 rounded p-2 space-y-1 text-[10px] text-orange-900">
                            <p className="font-bold">One-time Setup (Windows):</p>
                            <p>1. Install <b>Node.js</b> from nodejs.org if not already installed.</p>
                            <p>2. Copy the <b>tools/bartender-bridge/</b> folder to this PC (e.g. <b>C:\safawala-bridge\</b>).</p>
                            <p>3. Edit <b>config.json</b> — set your BarTender .exe path and label template (.btw) path.</p>
                            <p>4. Run <b>install-service.bat</b> as Administrator to install as a Windows Service (auto-starts on boot).</p>
                            <p>5. Or run <b>start.bat</b> manually for a quick test.</p>
                            <p>6. Click the refresh button above to reconnect.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {zebraStatus === "connected" ? (
                      <>
                        <Button
                          onClick={() => handleZPLPrint(product.barcode, product.name, product.regular_price, product.price, product.color, product.size, product.material)}
                          disabled={printing}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          {printing ? "Printing..." : "Print ZPL Direct"}
                        </Button>
                        <Button
                          onClick={() => handlePrint(product.barcode, product.name, product.regular_price, product.price, product.color, product.size, product.material)}
                          disabled={printing}
                          variant="outline"
                          className="border-green-600 text-green-700 hover:bg-green-50"
                        >
                          Browser HTML Print
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handlePrint(product.barcode, product.name, product.regular_price, product.price, product.color, product.size, product.material)}
                        disabled={printing}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        {printing ? "Printing..." : "Print Labels (HTML)"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => handleDownloadPNG(product.barcode, product.name, product.regular_price, product.price, product.color, product.size, product.material)}
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                    >
                      Download PNG
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── Variants ── */}
            <TabsContent value="variants" className="space-y-3 mt-4">
              {variants.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No variants for this product. Add variants in the product editor.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <StyleSelector />

                  <div className="space-y-2">
                    {variants.map((variant) => (
                      <div
                        key={variant.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedVariantId === variant.id
                            ? "bg-purple-50 border-purple-400"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                        onClick={() => setSelectedVariantId(variant.id)}
                      >
                        <p className="font-semibold text-sm">{variant.variation_name}</p>
                        {buildMeta(variant.color, variant.size, variant.material) && (
                          <p className="text-xs text-muted-foreground">{buildMeta(variant.color, variant.size, variant.material)}</p>
                        )}
                        {variant.sku && <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>}
                        {variant.barcode ? (
                          <code className="text-xs font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded inline-block mt-1">
                            {variant.barcode}
                          </code>
                        ) : (
                          <p className="text-xs text-amber-600 mt-1">No barcode — open editor to regenerate</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedVariant && (
                    <>
                      {/* Preview */}
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <p className="text-xs text-muted-foreground mb-2">
                          {printStyle === 1 ? "Label preview (50mm × 25mm)" : "Label preview (100mm × 15mm)"}
                        </p>
                        {printStyle === 1 ? (
                          <div className="bg-white border-2 border-gray-400 rounded p-2 inline-block">
                            <div className="flex flex-col items-center gap-0.5" style={{ width: "200px" }}>
                              <div className="text-[10px] font-bold text-center leading-tight">{varName}</div>
                              {buildMeta(varColor, varSize, varMaterial) && (
                                <div className="text-[8px] font-bold text-gray-600 text-center">{buildMeta(varColor, varSize, varMaterial)}</div>
                              )}
                              {regPrice ? (
                                <div className="text-[8px] font-bold text-center">
                                  MRP:{" "}
                                  <span className="relative inline-block mr-0.5 text-gray-500">
                                    ₹{regPrice}
                                    <span className="absolute left-[-5%] top-1/2 w-[110%] h-[1px] bg-gray-500 rotate-[15deg]"></span>
                                    <span className="absolute left-[-5%] top-1/2 w-[110%] h-[1px] bg-gray-500 -rotate-[15deg]"></span>
                                  </span>
                                </div>
                              ) : null}
                              {salPrice ? <div className="text-[11px] font-bold text-center">₹{salPrice}</div> : null}
                              {regPrice && salPrice && regPrice > salPrice ? (
                                <div className="text-[7px] font-bold text-center">You save ₹{regPrice - salPrice}</div>
                              ) : null}
                              <div className="bg-black h-5 w-full flex items-center justify-center mt-0.5">
                                <div className="flex gap-px h-4">
                                  {Array.from({ length: 28 }).map((_, j) => (
                                    <div key={j} className="bg-white" style={{ width: j % 4 === 0 ? "2px" : "1px" }} />
                                  ))}
                                </div>
                              </div>
                              <div className="text-[8px] font-mono font-bold">{selectedVariant.barcode || "—"}</div>
                              <div className="text-[7px] font-bold font-sans mt-0.5">www.safawala.com</div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white border-2 border-gray-400 rounded flex overflow-hidden" style={{ width: "100%", height: "56px" }}>
                            <div className="flex flex-col items-center justify-center gap-0.5 border-r border-gray-200 px-2" style={{ width: "35%" }}>
                              {salPrice && <div className="text-[9px] font-black">₹{salPrice}</div>}
                              <div className="bg-black h-3 w-full" />
                              <div className="text-[6px] font-mono text-gray-500 truncate w-full text-center">{selectedVariant.barcode || "—"}</div>
                              <div className="text-[5px] text-gray-400">www.safawala.com</div>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-0.5 px-2" style={{ width: "35%" }}>
                              <div className="text-[7px] font-black text-yellow-600">SAFAWALA</div>
                              <div className="w-full h-px bg-gray-200" />
                              <div className="text-[7px] font-bold text-center leading-tight text-gray-800">{varName.substring(0, 18)}</div>
                              {varMaterial && <div className="text-[5px] text-gray-400">Mat: {varMaterial}</div>}
                              {varSize     && <div className="text-[5px] text-gray-400">Size: {varSize}</div>}
                              {varColor    && <div className="text-[5px] text-gray-400">Col: {varColor}</div>}
                            </div>
                            <div className="bg-gray-50" style={{ width: "30%" }} />
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm">Number of Labels</Label>
                        <div className="flex gap-2 mt-1">
                          <Input type="number" min="1" max="100" value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20" />
                          <div className="flex gap-1">
                            {[1, 5, 10, 20, 50].map((n) => (
                              <Button key={n} type="button" size="sm" variant={quantity === n ? "default" : "outline"}
                                className="px-2 h-9" onClick={() => setQuantity(n)}>
                                {n}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {printStyle === 1
                            ? `${Math.ceil(quantity / 2)} rows (2 labels per row)`
                            : `${quantity} rows (1 label per row)`}
                        </p>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <h4 className="font-semibold text-xs text-amber-900 mb-1">Thermal Printer Setup</h4>
                        <ul className="text-xs text-amber-800 space-y-0.5">
                          {printStyle === 1 ? (
                            <>
                              <li>• Paper Size: 100mm × 25mm</li>
                              <li>• Margins: None (0mm) · Scale: 100%</li>
                            </>
                          ) : (
                            <>
                              <li>• Paper Size: 100mm × 15mm</li>
                              <li>• Margins: None (0mm) · Scale: 100%</li>
                            </>
                          )}
                        </ul>
                      </div>

                      {/* Top Offset — only for Style 2 */}
                      {printStyle === 2 && (
                        <div>
                          <Label className="text-xs">Top Offset (alignment)</Label>
                          <div className="flex items-center gap-2 mt-1">
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
                                <Button key={n} type="button" size="sm" variant={topOffset === n ? "default" : "outline"}
                                  className="h-7 px-2 text-[10px]" onClick={() => setTopOffset(n)}>
                                  {n}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Adjust if labels print between stickers. Default: 15mm.
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

                      {/* BarTender Bridge */}
                      <div className="border rounded-lg p-3 bg-orange-50 border-orange-200 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              bartenderStatus === "connected" ? "bg-orange-500 animate-pulse" :
                              bartenderStatus === "idle" ? "bg-blue-400 animate-pulse" : "bg-gray-400"
                            }`} />
                            <span className="text-xs font-semibold text-orange-900">
                              BarTender Bridge: {bartenderStatus === "connected" ? "Ready" : bartenderStatus === "idle" ? "Checking..." : "Not running"}
                            </span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={checkBartender}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {bartenderStatus === "connected" && (
                          <Button
                            type="button"
                            onClick={() => handleBartenderPrint(selectedVariant.barcode, varName, regPrice, salPrice, varColor, varSize, varMaterial)}
                            disabled={printing || !selectedVariant.barcode}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            {printing ? "Sending to BarTender..." : `Print ${quantity} Label${quantity > 1 ? "s" : ""} via BarTender`}
                          </Button>
                        )}
                        {bartenderStatus === "disconnected" && (
                          <p className="text-[11px] text-orange-800">
                            Bridge not running. Start <b>start.bat</b> or run <b>install-service.bat</b> on this PC.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {zebraStatus === "connected" ? (
                          <>
                            <Button
                              type="button"
                              onClick={() => handleZPLPrint(selectedVariant.barcode, varName, regPrice, salPrice, varColor, varSize, varMaterial)}
                              disabled={printing || !selectedVariant.barcode}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              {printing ? "Printing..." : "Print ZPL Direct"}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handlePrint(selectedVariant.barcode, varName, regPrice, salPrice, varColor, varSize, varMaterial)}
                              disabled={printing || !selectedVariant.barcode}
                              variant="outline"
                              className="border-green-600 text-green-700 hover:bg-green-50"
                            >
                              Browser HTML Print
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              onClick={() => handlePrint(selectedVariant.barcode, varName, regPrice, salPrice, varColor, varSize, varMaterial)}
                              disabled={printing || !selectedVariant.barcode}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              {printing ? "Printing..." : "Print Labels (HTML)"}
                            </Button>
                          </>
                        )}
                        <Button
                          type="button"
                          onClick={() => handleDownloadPNG(selectedVariant.barcode, varName, regPrice, salPrice, varColor, varSize, varMaterial)}
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                          disabled={!selectedVariant.barcode}
                        >
                          Download PNG
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}

              <Button variant="outline" size="sm" className="w-full" onClick={loadVariants}>
                <RefreshCw className="w-3 h-3 mr-2" /> Refresh Variants
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
