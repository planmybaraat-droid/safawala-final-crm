"use client"

/**
 * BarcodeScanner Component
 * 
 * Features:
 * - USB/Handheld scanner support (keyboard input simulation)
 * - Mobile camera scanning (HTML5 getUserMedia)
 * - Product lookup by barcode or product_code
 * - Quick product addition callback
 * - Visual feedback and loading states
 * - Error handling
 * 
 * Usage:
 * - In forms: Quick product lookup and add
 * - In inventory: Stock checking
 * - In deliveries/returns: Item verification
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Scan, Camera, X, CheckCircle, AlertCircle, Package } from "lucide-react"
import { toast } from "sonner"

export interface Product {
  id: string
  name: string
  category?: string
  product_code?: string
  barcode?: string
  rental_price?: number
  sale_price?: number
  stock_available?: number
  image_url?: string
}

interface BarcodeScannerProps {
  onProductFound: (product: Product) => void
  onError?: (error: string) => void
  searchProducts: (query: string) => Promise<Product[]>
  mode?: "usb" | "camera" | "both"
  placeholder?: string
  className?: string
  autoFocus?: boolean
  debounceMs?: number
}

export function BarcodeScanner({
  onProductFound,
  onError,
  searchProducts,
  mode = "both",
  placeholder = "Scan barcode or enter product code...",
  className = "",
  autoFocus = true,
  debounceMs = 1000,
}: BarcodeScannerProps) {
  const [scanInput, setScanInput] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null)
  const [showProductPreview, setShowProductPreview] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const html5QrCodeRef = useRef<any>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // USB Scanner: Detects rapid keyboard input (typical of barcode scanners)
  const handleUsbScan = useCallback(async (code: string) => {
    if (!code.trim()) return

    setIsSearching(true)
    try {
      const products = await searchProducts(code.trim())
      
      if (products.length === 0) {
        toast.error("Product not found", {
          description: `No product found with code: ${code}`
        })
        onError?.("Product not found")
      } else if (products.length === 1) {
        // Exact match
        const product = products[0]
        setLastScannedProduct(product)
        setShowProductPreview(true)
        onProductFound(product)
        toast.success("Product found!", {
          description: `${product.name} - Stock: ${product.stock_available || 0}`
        })
      } else {
        // Multiple matches
        toast.message("Multiple products found", {
          description: `Found ${products.length} products. Showing first match.`
        })
        const product = products[0]
        setLastScannedProduct(product)
        setShowProductPreview(true)
        onProductFound(product)
      }
    } catch (error) {
      toast.error("Search failed", {
        description: "Failed to search for product"
      })
      onError?.("Search failed")
    } finally {
      setIsSearching(false)
      setScanInput("")
    }
  }, [searchProducts, onProductFound, onError])

  // Handle input change with debounce for manual entry
  useEffect(() => {
    if (!scanInput) return

    // Clear existing timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
    }

    // Set new timeout (configurable debounce)
    scanTimeoutRef.current = setTimeout(() => {
      handleUsbScan(scanInput)
    }, debounceMs)

    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [scanInput, handleUsbScan, debounceMs])

  // Auto-focus input on mount if enabled
  useEffect(() => {
    if (autoFocus && inputRef.current && !showCamera) {
      inputRef.current.focus()
    }
  }, [autoFocus, showCamera])

  // Camera scanning (html5-qrcode)
  const startCamera = async () => {
    setCameraError(null)
    setShowCamera(true)
    
    // Allow dialog to open and mount container div
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        const scanner = new Html5Qrcode("camera-scanner-reader")
        html5QrCodeRef.current = scanner
        
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const minDim = Math.min(width, height)
              const boxDim = Math.floor(minDim * 0.7)
              return { width: boxDim, height: Math.floor(boxDim * 0.5) }
            },
            aspectRatio: 1.777778
          },
          (decodedText) => {
            handleUsbScan(decodedText)
            stopCamera()
          },
          () => {
            // Frame scan failure - normal verbose output, skip
          }
        )
        toast.success("Camera started", {
          description: "Point camera at barcode"
        })
      } catch (error: any) {
        setCameraError(error?.message || "Failed to start camera scanner")
        toast.error("Camera access denied", {
          description: "Please check camera permissions in browser settings"
        })
      }
    }, 250)
  }

  const stopCamera = () => {
    if (html5QrCodeRef.current) {
      const scanner = html5QrCodeRef.current
      if (scanner.isScanning) {
        scanner.stop()
          .then(() => {
            scanner.clear()
          })
          .catch(() => undefined)
      }
      html5QrCodeRef.current = null
    }
    setShowCamera(false)
    setCameraError(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [])

  const showUsb = mode === "usb" || mode === "both"
  const showCameraButton = mode === "camera" || mode === "both"

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scan className="h-4 w-4" />
            Barcode Scanner
            {lastScannedProduct && (
              <Badge variant="secondary" className="ml-auto">
                Last: {lastScannedProduct.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* USB Scanner Input */}
          {showUsb && (
            <div className="relative">
              <Scan className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                ref={inputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder={placeholder}
                className="pl-10 pr-10"
                disabled={isSearching}
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          )}

          {/* Camera Scanner Button */}
          {showCameraButton && (
            <Button
              variant="outline"
              onClick={startCamera}
              className="w-full"
              disabled={showCamera}
            >
              <Camera className="h-4 w-4 mr-2" />
              {showCamera ? "Camera Active" : "Use Camera Scanner"}
            </Button>
          )}

          {/* Helper Text */}
          <p className="text-xs text-muted-foreground">
            {showUsb && showCameraButton && (
              <>💡 Scan with handheld scanner or use camera</>
            )}
            {showUsb && !showCameraButton && (
              <>💡 Scan barcode with handheld scanner</>
            )}
            {!showUsb && showCameraButton && (
              <>💡 Use camera to scan barcodes</>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Camera View Dialog */}
      {showCamera && (
        <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Camera Scanner
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopCamera}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {cameraError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-700">{cameraError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startCamera}
                    className="mt-3"
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative bg-black rounded-lg overflow-hidden min-h-[250px] flex items-center justify-center">
                    <div id="camera-scanner-reader" className="w-full h-full text-white" />
                    {/* Scanning Guide Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-2 border-white rounded-lg w-64 h-32 shadow-lg opacity-70">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 text-center">
                      📷 Position barcode within the frame above
                    </p>
                    <p className="text-xs text-blue-600 text-center mt-1">
                      Note: This is a preview. Full scanning requires additional library (e.g., ZXing, QuaggaJS)
                    </p>
                  </div>

                  {/* Manual Input Fallback */}
                  <div>
                    <Label className="text-sm mb-2 block">Or enter manually:</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter barcode manually"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && scanInput.trim()) {
                            handleUsbScan(scanInput)
                            stopCamera()
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          if (scanInput.trim()) {
                            handleUsbScan(scanInput)
                            stopCamera()
                          }
                        }}
                        disabled={!scanInput.trim() || isSearching}
                      >
                        Search
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Product Preview Dialog */}
      {lastScannedProduct && showProductPreview && (
        <Dialog open={showProductPreview} onOpenChange={setShowProductPreview}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Product Scanned
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Product Image */}
              {lastScannedProduct.image_url ? (
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={lastScannedProduct.image_url}
                    alt={lastScannedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="h-16 w-16 text-gray-300" />
                </div>
              )}

              {/* Product Details */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{lastScannedProduct.name}</h3>
                {lastScannedProduct.category && (
                  <Badge variant="secondary">{lastScannedProduct.category}</Badge>
                )}
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {lastScannedProduct.product_code && (
                    <div>
                      <p className="text-xs text-muted-foreground">Product Code</p>
                      <p className="text-sm font-medium">{lastScannedProduct.product_code}</p>
                    </div>
                  )}
                  {lastScannedProduct.barcode && (
                    <div>
                      <p className="text-xs text-muted-foreground">Barcode</p>
                      <p className="text-sm font-medium">{lastScannedProduct.barcode}</p>
                    </div>
                  )}
                  {lastScannedProduct.rental_price && (
                    <div>
                      <p className="text-xs text-muted-foreground">Rental Price</p>
                      <p className="text-sm font-medium">₹{lastScannedProduct.rental_price}</p>
                    </div>
                  )}
                  {lastScannedProduct.sale_price && (
                    <div>
                      <p className="text-xs text-muted-foreground">Sale Price</p>
                      <p className="text-sm font-medium">₹{lastScannedProduct.sale_price}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <p className={`text-sm font-medium ${
                      (lastScannedProduct.stock_available || 0) > 5
                        ? "text-green-600"
                        : (lastScannedProduct.stock_available || 0) > 0
                        ? "text-orange-600"
                        : "text-red-600"
                    }`}>
                      {lastScannedProduct.stock_available || 0} available
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowProductPreview(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
