'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { Printer, Download } from 'lucide-react'

interface BarcodeData {
  code: string
  productName: string
}

export default function Barcode2x5PrintPage() {
  const [barcodes, setBarcodes] = useState<BarcodeData[]>(Array(10).fill({ code: '', productName: '' }))
  const [isGenerating, setIsGenerating] = useState(false)

  const handleBarcodeChange = (index: number, field: 'code' | 'productName', value: string) => {
    const newBarcodes = [...barcodes]
    newBarcodes[index] = {
      ...newBarcodes[index],
      [field]: value
    }
    setBarcodes(newBarcodes)
  }

  const generatePrintLayout = async () => {
    try {
      setIsGenerating(true)
      const JsBarcode = (await import('jsbarcode')).default

      // Generate barcode images
      const barcodeImages: string[] = []
      for (let i = 0; i < barcodes.length; i++) {
        if (barcodes[i].code.trim()) {
          const canvas = document.createElement('canvas')
          canvas.width = 1200
          canvas.height = 400
          JsBarcode(canvas, 'www.safawala.com', {
            format: 'CODE128',
            width: 5,
            height: 80,
            displayValue: false,
            margin: 10,
          })
          barcodeImages[i] = canvas.toDataURL('image/png')
        } else {
          barcodeImages[i] = ''
        }
      }

      // Generate HTML with 2 columns × 5 rows layout
      let barcodeHTML = ''

      for (let rowIdx = 0; rowIdx < 5; rowIdx++) {
        barcodeHTML += `
          <div class="barcode-row">
            ${generateRowColumn(0 + rowIdx * 2, barcodeImages, barcodes)}
            ${generateRowColumn(1 + rowIdx * 2, barcodeImages, barcodes)}
          </div>
        `
      }

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Barcode Print - 2x5 Layout</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
                @page { margin: 0; padding: 0; size: A4; }
                body { font-family: Arial, sans-serif; background: white; margin: 0; padding: 0; display: flex; justify-content: center; align-items: flex-start; }
                .container { width: 100%; padding: 0; display: flex; justify-content: center; }
                .barcode-grid { width: fit-content; }
                .barcode-row {
                  display: flex;
                  margin: 0;
                  padding: 0;
                  border-bottom: 1px solid #333;
                  height: 100px;
                  page-break-inside: avoid;
                }
                .barcode-row:last-child {
                  border-bottom: 1px solid #333;
                }
                .barcode-column {
                  flex: 1;
                  width: 200px;
                  padding: 8px 6px;
                  text-align: center;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  border-right: 1px solid #333;
                }
                .barcode-column:last-child {
                  border-right: none;
                }
                .barcode-image {
                  width: 85%;
                  height: auto;
                  max-height: 50%;
                  display: block;
                  margin-bottom: 4px;
                  image-rendering: -webkit-optimize-contrast;
                  image-rendering: pixelated;
                  image-rendering: crisp-edges;
                }
                .barcode-code {
                  font-family: 'Courier New', monospace;
                  font-size: 8px;
                  font-weight: 700;
                  margin: 0;
                  line-height: 1;
                }
                .barcode-name {
                  font-family: Arial, sans-serif;
                  font-size: 5px;
                  color: #333;
                  margin-top: 1px;
                  line-height: 1;
                  word-break: break-word;
                  max-width: 100%;
                }
                @media print {
                  html, body { margin: 0; padding: 0; display: block; }
                  body { padding: 0; }
                  .container { padding: 0; }
                  .barcode-row { page-break-inside: avoid; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="barcode-grid">
                  ${barcodeHTML}
                </div>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()

        setTimeout(() => {
          printWindow.print()
        }, 500)

        toast({
          title: 'Success',
          description: 'Print preview opened. Ready to print 2x5 layout.',
        })
      }
    } catch (error) {
      console.error('Error generating print layout:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate print layout',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateDownloadPDF = async () => {
    try {
      setIsGenerating(true)
      const { default: jsPDF } = await import('jspdf')
      const JsBarcode = (await import('jsbarcode')).default

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'A4'
      })

      const pageWidth = doc.internal.pageSize.getWidth() // 210mm
      const pageHeight = doc.internal.pageSize.getHeight() // 297mm
      const cols = 2
      const rows = 5
      
      // Calculate dimensions for smaller, centered layout
      const barcodeWidth = 50 // Reduced
      const barcodeHeight = 20 // Reduced
      const totalWidth = barcodeWidth * cols // 100mm
      const totalHeight = barcodeHeight * rows // 100mm
      
      // Center on page
      const startX = (pageWidth - totalWidth) / 2
      const startY = (pageHeight - totalHeight) / 2
      const colWidth = barcodeWidth
      const rowHeight = barcodeHeight

      let barcodeIndex = 0

      for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
        for (let colIdx = 0; colIdx < cols; colIdx++) {
          if (barcodeIndex >= barcodes.length) break

          const barcode = barcodes[barcodeIndex]
          if (!barcode.code.trim()) {
            barcodeIndex++
            continue
          }

          const x = startX + colIdx * colWidth
          const y = startY + rowIdx * rowHeight

          // Generate barcode
          const canvas = document.createElement('canvas')
          const scale = 3
          canvas.width = 600 * scale
          canvas.height = 200 * scale
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.scale(scale, scale)
          }

          JsBarcode(canvas, 'www.safawala.com', {
            format: 'CODE128',
            width: 5,
            height: 70,
            displayValue: false,
            margin: 8,
          })

          // Add barcode to PDF
          const imgData = canvas.toDataURL('image/png')
          const barcodeWidth = colWidth - 4
          const barcodeHeight = 15

          doc.addImage(
            imgData,
            'PNG',
            x + 2,
            y + 5,
            barcodeWidth,
            barcodeHeight,
            undefined,
            'FAST'
          )

          // Add barcode code
          doc.setFontSize(7)
          doc.setFont('courier', 'bold')
          doc.text(barcode.code, x + colWidth / 2, y + 23, { align: 'center' })

          // Add product name
          doc.setFontSize(5)
          doc.setFont('helvetica', 'normal')
          const maxWidth = colWidth - 4
          doc.text(barcode.productName.substring(0, 30), x + colWidth / 2, y + 28, {
            align: 'center',
            maxWidth
          })

          // Add borders
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.3)
          doc.rect(x, y, colWidth, rowHeight)

          barcodeIndex++
        }
      }

      const filename = `barcodes-2x5-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)

      toast({
        title: 'Success',
        description: 'Barcode PDF downloaded successfully',
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Barcode Printing - 2 Columns × 5 Rows</CardTitle>
              <CardDescription>
                Enter barcode codes and product names for 10 items. Generate print layout or download PDF.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {barcodes.map((barcode, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor={`code-${index}`} className="text-xs">
                      Barcode Code
                    </Label>
                    <Input
                      id={`code-${index}`}
                      placeholder="e.g., SAF123456"
                      value={barcode.code}
                      onChange={(e) => handleBarcodeChange(index, 'code', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`name-${index}`} className="text-xs">
                      Product Name
                    </Label>
                    <Input
                      id={`name-${index}`}
                      placeholder="e.g., Pink Tissue"
                      value={barcode.productName}
                      onChange={(e) => handleBarcodeChange(index, 'productName', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={generatePrintLayout}
                  disabled={isGenerating}
                  size="lg"
                  className="w-full"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Open Print Preview'}
                </Button>
                <Button
                  onClick={generateDownloadPDF}
                  disabled={isGenerating}
                  size="lg"
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Layout</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-900">
                <ul className="space-y-1 list-disc list-inside">
                  <li>2 columns (left-right)</li>
                  <li>5 rows (top-bottom)</li>
                  <li>Total: 10 barcodes</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Font Sizes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-green-900">
                <ul className="space-y-1">
                  <li>Barcode: 10px (0.8x)</li>
                  <li>Product: 7px (0.6x)</li>
                  <li>Row height: 140px</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Export Options</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-purple-900">
                <ul className="space-y-1 list-disc list-inside">
                  <li>Print to paper</li>
                  <li>Export as PDF</li>
                  <li>Share or archive</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function generateRowColumn(
  index: number,
  barcodeImages: string[],
  barcodes: BarcodeData[]
): string {
  if (index >= barcodes.length || !barcodes[index].code.trim()) {
    return `
      <div class="barcode-column" style="flex: 1; padding: 12px 10px; border-right: 2px solid #333;">
      </div>
    `
  }

  return `
    <div class="barcode-column">
      ${
        barcodeImages[index]
          ? `<img src="${barcodeImages[index]}" alt="Barcode" class="barcode-image" />`
          : ''
      }
      <div class="barcode-code">${barcodes[index].code}</div>
      <div class="barcode-name">${barcodes[index].productName}</div>
    </div>
  `
}
