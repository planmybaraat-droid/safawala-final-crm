/**
 * Barcode Print Service — SVG-based for sharp thermal printing
 * Uses inline SVG (vector) instead of canvas/PNG to eliminate blurriness.
 */

interface BarcodeItem {
  code: string
  productName: string
  regularPrice?: number | string
  price?: number | string
}

interface PrintConfig {
  barcodes: BarcodeItem[]
  columns?: number
  leftMargin?: number
  rightMargin?: number
  topMargin?: number
  barcodeScale?: number
  barcodeRotation?: number
}

// Generate barcode as inline SVG string
async function makeSVGBarcode(value: string): Promise<string> {
  const JsBarcode = (await import("jsbarcode")).default
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  JsBarcode(svg, value, {
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

export async function generateBarcodeImage(code: string): Promise<string> {
  return makeSVGBarcode(code)
}

export async function generateMultipleBarcodeImages(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(makeSVGBarcode))
}

export async function createPrintHTML(config: PrintConfig): Promise<string> {
  const {
    barcodes,
    columns = 2,
    leftMargin = 0.5,
    rightMargin = 0.5,
    topMargin = 0.5,
    barcodeScale = 1,
  } = config

  const W = 50 * barcodeScale   // label width mm
  const H = 25 * barcodeScale   // label height mm
  const pageW = W * columns

  const svgMap = new Map<string, string>()
  for (const b of barcodes) {
    if (!svgMap.has(b.code)) {
      svgMap.set(b.code, await makeSVGBarcode(b.code))
    }
  }

  const labelHTML = (item: BarcodeItem) => {
    const svg = svgMap.get(item.code) ?? ""
    const bcW = (W - 4) * barcodeScale
    const bcH = (H - 14) * barcodeScale
    const namePt = 8 * barcodeScale
    const codePt = 6.5 * barcodeScale
    const regularPricePt = 5 * barcodeScale
    const salePricePt = 7 * barcodeScale
    const websitePt = 5 * barcodeScale
    return `
      <div style="width:${W}mm;height:${H}mm;display:flex;flex-direction:column;
                  align-items:center;justify-content:center;padding:1mm;
                  box-sizing:border-box;overflow:hidden;gap:0.3mm;border:0.2mm solid #ccc;">
        <div style="font-family:Arial Black,Arial,sans-serif;font-size:${namePt}pt;
                    font-weight:900;color:#000;text-align:center;line-height:1.1;
                    max-width:${W - 3}mm;word-break:break-word;">${item.productName}</div>
        ${item.regularPrice || item.price ? `<div style="display:flex;gap:1mm;align-items:center;justify-content:center;font-family:Arial,sans-serif;">
          ${item.regularPrice ? `<div style="font-size:${regularPricePt}pt;color:#777;position:relative;display:inline-block;white-space:nowrap;">
            ₹${item.regularPrice}
            <div style="position:absolute;top:50%;left:-5%;width:110%;height:1px;background:#777;transform:rotate(15deg);"></div>
            <div style="position:absolute;top:50%;left:-5%;width:110%;height:1px;background:#777;transform:rotate(-15deg);"></div>
          </div>` : ""}
          ${item.price ? `<div style="font-size:${salePricePt}pt;font-weight:bold;color:#000;">₹${item.price}</div>` : ""}
        </div>` : ""}
        <div style="width:${bcW}mm;height:${bcH}mm;display:flex;align-items:center;
                    justify-content:center;overflow:hidden;">
          ${svg.replace(/width="[^"]*"/, `width="${bcW}mm"`).replace(/height="[^"]*"/, `height="${bcH}mm"`)}
        </div>
        <div style="font-family:'Courier New',monospace;font-size:${codePt}pt;
                    font-weight:bold;color:#000;text-align:center;">${item.code}</div>
        <div style="font-family:Arial,sans-serif;font-size:${websitePt}pt;
                    color:#000;text-align:center;letter-spacing:0.5px;">www.safawala.com</div>
      </div>`
  }

  const barcodesPerPage = columns * 10
  const pages = Math.ceil(barcodes.length / barcodesPerPage)
  let body = ""

  for (let p = 0; p < pages; p++) {
    const slice = barcodes.slice(p * barcodesPerPage, (p + 1) * barcodesPerPage)
    let rows = ""
    for (let r = 0; r < slice.length; r += columns) {
      rows += `<div style="display:flex;page-break-inside:avoid;">`
      for (let c = 0; c < columns; c++) {
        const item = slice[r + c]
        rows += item ? labelHTML(item) : `<div style="width:${W}mm;height:${H}mm;"></div>`
      }
      rows += `</div>`
    }
    body += `<div style="width:${pageW}mm;padding:${topMargin}cm ${rightMargin}cm 0 ${leftMargin}cm;
                          page-break-after:always;box-sizing:border-box;">${rows}</div>`
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Barcodes</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @media print { body { margin: 0; } }
</style>
</head>
<body>${body}</body>
</html>`
}

export async function printBarcodes(config: PrintConfig): Promise<void> {
  try {
    const win = window.open("", "_blank")
    if (!win) throw new Error("Could not open print window. Check pop-up blocker.")
    const html = await createPrintHTML(config)
    win.document.write(html)
    win.document.close()
    win.onload = () => setTimeout(() => { win.print(); win.close() }, 400)
  } catch (error) {
    console.error("Error printing barcodes:", error)
    throw error
  }
}

export function getBarcodesPerPage(columns: number = 2): number {
  const available = 297 - 20
  const rowH = 25 + 2
  return Math.floor(available / rowH) * columns
}
