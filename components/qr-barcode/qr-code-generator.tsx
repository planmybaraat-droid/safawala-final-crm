"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Printer, QrCode, Barcode } from 'lucide-react'
import { generateQRCode, generateBarcode, downloadQRCode, printQRCode } from '@/lib/barcode-generator'

interface QRCodeGeneratorProps {
  item: {
    id: number
    product_code?: string
    barcode?: string
    name: string
    category: string
    size?: string
    color?: string
    rental_price: number
    qr_code?: string
  }
  onClose: () => void
}

export function QRCodeGenerator({ item, onClose }: QRCodeGeneratorProps) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('')
  const [barcodeDataURL, setBarcodeDataURL] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const generateCodes = async () => {
      try {
        const codeText = item.barcode || item.product_code || ""
        // Generate QR Code
        const qrCode = await generateQRCode(codeText)
        setQrCodeDataURL(qrCode)

        // Generate Barcode
        const barcode = generateBarcode(codeText)
        setBarcodeDataURL(barcode)
      } catch {
      } finally {
        setLoading(false)
      }
    }

    generateCodes()
  }, [item.barcode, item.product_code])

  const handleDownloadQR = () => {
    if (qrCodeDataURL) {
      const codeText = item.barcode || item.product_code || 'code'
      downloadQRCode(qrCodeDataURL, `QR_${codeText}.png`)
    }
  }

  const handleDownloadBarcode = () => {
    if (barcodeDataURL) {
      const codeText = item.barcode || item.product_code || 'code'
      downloadQRCode(barcodeDataURL, `Barcode_${codeText}.png`)
    }
  }

  const handlePrintQR = () => {
    if (qrCodeDataURL) {
      printQRCode(qrCodeDataURL)
    }
  }

  const handlePrintBarcode = () => {
    if (barcodeDataURL) {
      printQRCode(barcodeDataURL)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <QrCode className="h-5 w-5" />
            <span>QR Code & Barcode Generator</span>
          </DialogTitle>
          <DialogDescription>
            Generate and download QR codes and barcodes for your products
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <CardDescription>
                Barcode: <span className="font-mono font-medium">{item.barcode || item.product_code || '—'}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{item.category}</Badge>
                {item.size && <Badge variant="outline">Size: {item.size}</Badge>}
                {item.color && <Badge variant="outline">Color: {item.color}</Badge>}
                <Badge variant="outline">₹{item.rental_price}</Badge>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Generating codes...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <QrCode className="h-4 w-4" />
                    <span>QR Code</span>
                  </CardTitle>
                  <CardDescription>
                    Scan to get product information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    {qrCodeDataURL ? (
                      <img 
                        src={qrCodeDataURL || "/placeholder.svg"} 
                        alt="QR Code" 
                        className="border rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500">Failed to generate</span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDownloadQR}
                      disabled={!qrCodeDataURL}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrintQR}
                      disabled={!qrCodeDataURL}
                      className="flex-1"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Barcode */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Barcode className="h-4 w-4" />
                    <span>Barcode</span>
                  </CardTitle>
                  <CardDescription>
                    Standard barcode for inventory tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    {barcodeDataURL ? (
                      <img 
                        src={barcodeDataURL || "/placeholder.svg"} 
                        alt="Barcode" 
                        className="border rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500">Failed to generate</span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDownloadBarcode}
                      disabled={!barcodeDataURL}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrintBarcode}
                      disabled={!barcodeDataURL}
                      className="flex-1"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
