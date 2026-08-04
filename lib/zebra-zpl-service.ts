/**
 * Zebra ZPL Service — Optimised for ZTC ZD230-203dpi ZPL
 * Label Styles:
 * - Style 1: 50mm × 25mm, 2-column (100mm total width)
 * - Style 2: 100mm × 15mm, 1-column (with jewelry tag layout)
 * Resolution: 203 dpi = 8 dots per mm
 */

export interface ZebraBarcodeItem {
  code: string
  productName: string
  price?: number
  regular_price?: number
  color?: string
  size?: string
  material?: string
}

export interface ZebraPrintConfig {
  barcodes: ZebraBarcodeItem[]
  style?: 1 | 2 | 3
  labelWidthMM?: number
  labelHeightMM?: number
  columns?: number
  topOffset?: number    // mm offset for label vertical alignment adjustment
  printDensity?: number // 0–30, default 25 (darker)
  printSpeed?: number   // 2–6 in/sec, default 2 (sharper)
}

export interface ZebraDevice {
  name: string
  deviceType: string
  uid: string
  connection: string
  version?: number
  provider?: string
  manufacturer?: string
}

const DPM = 8 // dots per mm at 203dpi
const d = (mm: number) => Math.round(mm * DPM)
const LOCAL_API_URL = "https://localhost:9101"

// Direct Style 1 (50mm × 25mm, 2-column, total 100mm × 25mm)
function twoColumnStyle1ZPL(
  item1: ZebraBarcodeItem,
  item2: ZebraBarcodeItem | null,
  wMM: number,
  hMM: number,
  density = 25,
  speed = 2
): string {
  const totalW   = d(wMM * 2) // 800 dots
  const H        = d(hMM)     // 200 dots
  const halfW    = d(wMM)     // 400 dots

  const formatItem = (item: ZebraBarcodeItem, xOffset: number) => {
    const name = item.productName.length > 22 ? item.productName.substring(0, 20) + ".." : item.productName
    const meta = [item.color, item.size].filter(Boolean).join(" | ")
    const mat = item.material || ""

    // Prices
    const regularPrice = item.regular_price
    const salePrice = item.price
    const savings = regularPrice && salePrice && regularPrice > salePrice ? regularPrice - salePrice : 0

    let pricingText = ""
    if (regularPrice && salePrice) {
      pricingText = `MRP: Rs.${regularPrice} Sale: Rs.${salePrice}`
    } else if (salePrice) {
      pricingText = `Rs.${salePrice}`
    }

    // Build block with clear ZPL layout commands
    let block = `
^FO${xOffset + d(4)},${d(3)}^A0N,22,22^FB${halfW - d(8)},2,0,C,0^FD${name}^FS`

    let currentY = 8.5 // start Y offset in mm

    if (meta) {
      block += `\n^FO${xOffset + d(4)},${d(currentY)}^A0N,16,16^FB${halfW - d(8)},1,0,C,0^FD${meta}^FS`
      currentY += 2.5
    }
    if (mat) {
      block += `\n^FO${xOffset + d(4)},${d(currentY)}^A0N,16,16^FB${halfW - d(8)},1,0,C,0^FD${mat}^FS`
      currentY += 2.5
    }

    if (pricingText) {
      block += `\n^FO${xOffset + d(4)},${d(currentY)}^A0N,20,20^FB${halfW - d(8)},1,0,C,0^FD${pricingText}^FS`
      currentY += 3.0
    }

    // Barcode: Code 128 (width 2, height 50 dots)
    const barcodeY = currentY + 1.5
    const barcodeX = xOffset + d(wMM / 2) - d(18) // center the barcode (approx width 36mm)
    block += `\n^BY2,3,40`
    block += `\n^FO${barcodeX},${d(barcodeY)}^BCN,40,N,N,N^FD${item.code}^FS`

    // Code text below barcode
    const codeTextY = barcodeY + 5.5
    block += `\n^FO${xOffset + d(4)},${d(codeTextY)}^A0N,16,16^FB${halfW - d(8)},1,0,C,0^FD${item.code}^FS`

    // Website at the bottom
    const webY = codeTextY + 2.5
    block += `\n^FO${xOffset + d(4)},${d(webY)}^A0N,14,14^FB${halfW - d(8)},1,0,C,0^FDwww.safawala.com^FS`

    return block
  }

  let zpl = `^XA
^PW${totalW}
^LL${H}
~SD${density}
^PR${speed},${speed},${speed}`

  zpl += formatItem(item1, 0)
  if (item2) {
    zpl += formatItem(item2, halfW)
  }

  zpl += `\n^XZ`
  return zpl
}

// Direct Style 2 (100mm × 15mm, 1-column Jewelry Tag)
function singleStyle2ZPL(
  item: ZebraBarcodeItem,
  wMM: number,
  hMM: number,
  topOffsetMM = 0,
  density = 25,
  speed = 2
): string {
  const W = d(wMM) // 800 dots
  const H = d(hMM) // 120 dots
  const offset = d(topOffsetMM) // vertical shift in dots

  const regularPrice = item.regular_price
  const salePrice = item.price
  const savings = regularPrice && salePrice && regularPrice > salePrice ? regularPrice - salePrice : 0

  let pricingText = ""
  if (regularPrice && salePrice) {
    pricingText = `MRP: Rs.${regularPrice} Sale: Rs.${salePrice}`
  } else if (salePrice) {
    pricingText = `Rs.${salePrice}`
  }

  const mat = item.material ? `Mat: ${item.material}` : ""
  const size = item.size ? `Size: ${item.size}` : ""
  const color = item.color ? `Col: ${item.color}` : ""
  const feats = [mat, size, color].filter(Boolean).join(" ")

  const name = item.productName.length > 26 ? item.productName.substring(0, 24) + ".." : item.productName

  // Section 1 (0 to 35mm): Pricing & Barcode
  // Section 2 (35mm to 70mm): Brand, Name & Features
  // Section 3 (70mm to 100mm): Blank Tail
  return `^XA
^PW${W}
^LL${H + offset}
~SD${density}
^PR${speed},${speed},${speed}
^LH0,${offset}
^FO15,5^A0N,18,18^FB250,1,0,C,0^FD${pricingText}^FS
^BY1,3,32
^FO25,25^BCN,32,N,N,N^FD${item.code}^FS
^FO15,67^A0N,32,32^FB250,1,0,C,0^FD${item.code}^FS
^FO15,106^A0N,12,12^FB250,1,0,C,0^FDwww.safawala.com^FS
^FO280,10^GB2,100,2^FS
^FO300,10^A0N,20,20^FB240,1,0,C,0^FDSAFAWALA^FS
^FO320,32^GB200,2,2^FS
^FO300,42^A0N,18,18^FB240,2,0,C,0^FD${name}^FS
^FO300,85^A0N,14,14^FB240,2,0,L,0^FD${feats}^FS
^XZ`
}

export function generateZPL(config: ZebraPrintConfig): string {
  const {
    barcodes,
    style = 1,
    labelWidthMM = style === 1 ? 50 : 100,
    labelHeightMM = style === 1 ? 25 : 15,
    columns = style === 1 ? 2 : 1,
    topOffset = 0,
    printDensity = 25,
    printSpeed = 2,
  } = config

  if (barcodes.length === 0) return ""

  let out = ""
  if (style === 1) {
    // 2-column Style 1 layout
    for (let i = 0; i < barcodes.length; i += 2) {
      out += twoColumnStyle1ZPL(
        barcodes[i],
        i + 1 < barcodes.length ? barcodes[i + 1] : null,
        labelWidthMM,
        labelHeightMM,
        printDensity,
        printSpeed
      ) + "\n"
    }
  } else {
    // 1-column Style 2 Jewelry Tag layout
    for (const item of barcodes) {
      out += singleStyle2ZPL(
        item,
        labelWidthMM,
        labelHeightMM,
        topOffset,
        printDensity,
        printSpeed
      ) + "\n"
    }
  }
  return out
}

export function downloadZPL(config: ZebraPrintConfig, filename = "barcodes.zpl"): void {
  const zpl = generateZPL(config)
  const blob = new Blob([zpl], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Fetch default printer from Zebra service running locally (HTTPS)
export async function getLocalDefaultPrinter(): Promise<ZebraDevice | null> {
  if (typeof window === "undefined") return null
  try {
    const res = await fetch(`${LOCAL_API_URL}/default?type=printer`, {
      method: "GET",
      mode: "cors",
    })
    if (!res.ok) return null
    const text = await res.text()
    const trimmed = text.trim()
    if (!trimmed || trimmed === "" || trimmed === "{}") return null
    try {
      const parsed = JSON.parse(trimmed) as ZebraDevice
      if (!parsed || Object.keys(parsed).length === 0 || !parsed.name) {
        return null
      }
      return parsed
    } catch {
      return {
        name: trimmed,
        deviceType: "printer",
        uid: trimmed,
        connection: "usb"
      }
    }
  } catch (err) {
    console.warn("Zebra service not running on localhost:9101 or certificate not trusted:", err)
    return null
  }
}

// Fetch list of all available printers from local Zebra service
export async function getLocalAvailablePrinters(): Promise<ZebraDevice[]> {
  if (typeof window === "undefined") return []
  try {
    const res = await fetch(`${LOCAL_API_URL}/available`, {
      method: "GET",
      mode: "cors",
    })
    if (!res.ok) return []
    const text = await res.text()
    const trimmed = text.trim()
    if (!trimmed || trimmed === "" || trimmed === "{}") return []
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && Array.isArray(parsed.printer)) {
        return parsed.printer as ZebraDevice[]
      }
      return []
    } catch {
      return []
    }
  } catch (err) {
    console.warn("Failed to fetch available printers", err)
    return []
  }
}

// Check if Zebra Browser Print is running
export async function checkLocalZebraStatus(): Promise<boolean> {
  const device = await getLocalDefaultPrinter()
  return device !== null
}

// Send ZPL directly to Zebra printer via fetch API
export async function printZPLDirect(config: ZebraPrintConfig, selectedDevice?: ZebraDevice): Promise<boolean> {
  const zpl = generateZPL(config)
  if (!zpl) return false

  try {
    const device = selectedDevice || await getLocalDefaultPrinter()
    if (!device) {
      // Fallback: download ZPL file so they can feed it manually
      downloadZPL(config)
      return false
    }

    const payload = {
      device: device,
      data: zpl
    }

    const res = await fetch(`${LOCAL_API_URL}/write`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(payload)
    })
    
    return res.ok
  } catch (err) {
    console.error("Direct printing failed", err)
    downloadZPL(config)
    return false
  }
}

export async function copyZPLToClipboard(config: ZebraPrintConfig): Promise<void> {
  await navigator.clipboard.writeText(generateZPL(config))
}

// HTML fallback print using inline SVG — sharp on any standard printer (if Zebra app not installed)
export async function printThermalLabels(config: ZebraPrintConfig): Promise<void> {
  const { barcodes, style = 1, labelWidthMM = style === 1 ? 50 : 100, labelHeightMM = style === 1 ? 25 : 15, columns = style === 1 ? 2 : 1 } = config
  const JsBarcode = (await import("jsbarcode")).default

  const makeSVG = (code: string): string => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    JsBarcode(svg, code, {
      format: "CODE128",
      width: 3,
      height: 80,
      displayValue: false,
      margin: 0,
      background: "#FFFFFF",
      lineColor: "#000000",
    })
    return svg.outerHTML
  }

  const totalW = labelWidthMM * columns
  const bcW = labelWidthMM - 6
  const bcH = labelHeightMM - 12

  const labelHTML = (item: ZebraBarcodeItem) => {
    const svg = makeSVG(item.code)
    const name = item.productName.length > 20 ? item.productName.substring(0, 18) + ".." : item.productName
    const fontSize = style === 2 ? 14 : 7
    const marginTop = style === 2 ? "1.5mm" : "0"
    return `
      <div style="width:${labelWidthMM}mm;height:${labelHeightMM}mm;display:flex;flex-direction:column;
                  align-items:center;justify-content:center;padding:1mm;box-sizing:border-box;
                  overflow:hidden;gap:0.4mm;">
        <div style="font-family:Arial Black,Arial,sans-serif;font-size:9pt;font-weight:900;
                    color:#000;text-align:center;line-height:1.1;">${name}</div>
        <div style="width:${bcW}mm;height:${bcH}mm;display:flex;align-items:center;
                    justify-content:center;overflow:hidden;">
          ${svg.replace(/width="[^"]*"/, `width="${bcW}mm"`).replace(/height="[^"]*"/, `height="${bcH}mm"`)}
        </div>
        <div style="font-family:'Courier New',monospace;font-size:${fontSize}pt;font-weight:bold;color:#000;margin-top:${marginTop};">
          ${item.code}
        </div>
      </div>`
  }

  let rows = ""
  for (let i = 0; i < barcodes.length; i += columns) {
    rows += `<div style="width:${totalW}mm;height:${labelHeightMM}mm;display:flex;
                          page-break-after:always;page-break-inside:avoid;overflow:hidden;">`
    for (let c = 0; c < columns; c++) {
      const item = barcodes[i + c]
      rows += item
        ? labelHTML(item)
        : `<div style="width:${labelWidthMM}mm;height:${labelHeightMM}mm;"></div>`
    }
    rows += `</div>`
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Zebra Labels</title>
<style>
  @page { size: ${totalW}mm ${labelHeightMM}mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${totalW}mm;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
</head>
<body>${rows}</body>
</html>`

  const win = window.open("", "_blank")
  if (!win) throw new Error("Could not open print window. Check pop-up blocker.")
  win.document.write(html)
  win.document.close()
  win.onload = () => setTimeout(() => win.print(), 300)
}

export function getZebraSetupInstructions(): string {
  return `Zebra ZD230 Setup Instructions:
1. Download and install "Zebra Browser Print" for Windows or macOS.
2. Ensure the service is running in your system tray.
3. Open https://localhost:9101/available in your browser.
4. Click "Advanced" -> "Proceed to localhost (unsafe)" to trust the self-signed HTTPS certificate.
5. In Safawala CRM, select "Print Direct (ZPL)" to print instantly without standard dialog popups.`
}
