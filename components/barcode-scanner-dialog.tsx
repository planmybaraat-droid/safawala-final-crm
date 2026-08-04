"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle,
  Keyboard,
  Barcode as BarcodeIcon
} from "lucide-react"
import { toast } from "sonner"

interface BarcodeScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (barcode: string) => void
  onScan: (barcode: string) => void
  mode?: 'manual' | 'scanner' | 'camera'
  title?: string
  description?: string
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
  mode = 'manual',
  title = "Scan Barcode",
  description = "Use a barcode scanner or enter manually"
}: BarcodeScannerDialogProps) {
  const [manualBarcode, setManualBarcode] = useState("")
  const [scanMode, setScanMode] = useState<'manual' | 'scanner' | 'camera'>(mode)
  const [lastScanned, setLastScanned] = useState<string[]>([])
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const html5QrCodeRef = useRef<any>(null)
  const scanBufferRef = useRef<string>("")
  const scanTimeoutRef = useRef<NodeJS.Timeout>()

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  const startCamera = async () => {
    setCameraError(null)
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        const scanner = new Html5Qrcode("dialog-camera-reader")
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
            handleScan(decodedText)
          },
          () => {
            // silent frame scan fail
          }
        )
      } catch (error: any) {
        setCameraError(error?.message || "Failed to start camera")
      }
    }, 250)
  }

  const stopCamera = () => {
    if (html5QrCodeRef.current) {
      const scanner = html5QrCodeRef.current
      if (scanner.isScanning) {
        scanner.stop()
          .then(() => scanner.clear())
          .catch(() => undefined)
      }
      html5QrCodeRef.current = null
    }
    setCameraError(null)
  }

  // Handle camera start/stop
  useEffect(() => {
    if (open && scanMode === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [open, scanMode])

  // Handle keyboard input for barcode scanner devices
  useEffect(() => {
    if (!open || scanMode !== 'scanner') return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field (except our scanner input)
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' && target !== inputRef.current) return
      if (target.tagName === 'TEXTAREA') return

      // Clear previous timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }

      // Enter key means scan is complete
      if (e.key === 'Enter' && scanBufferRef.current.length > 0) {
        e.preventDefault()
        const scannedBarcode = scanBufferRef.current.trim()
        
        if (scannedBarcode) {
          handleScan(scannedBarcode)
        }
        
        scanBufferRef.current = ""
        return
      }

      // Add character to buffer (ignore special keys)
      if (e.key.length === 1) {
        e.preventDefault()
        scanBufferRef.current += e.key
      }

      // Auto-submit after 100ms of no input (barcode scanners are fast)
      scanTimeoutRef.current = setTimeout(() => {
        if (scanBufferRef.current.length > 3) {
          const scannedBarcode = scanBufferRef.current.trim()
          if (scannedBarcode) {
            handleScan(scannedBarcode)
          }
        }
        scanBufferRef.current = ""
      }, 100)
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => {
      window.removeEventListener('keypress', handleKeyPress)
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [open, scanMode])

  const handleScan = (barcode: string) => {
    if (!barcode || barcode.length < 3) {
      toast.error("Invalid barcode")
      return
    }

    // Check for duplicates in this session
    if (lastScanned.includes(barcode)) {
      toast.warning("Barcode already scanned in this session")
      return
    }

    // Add to history
    setLastScanned(prev => [barcode, ...prev.slice(0, 9)]) // Keep last 10

    // Callback
    onScan(barcode)
    
    // Success feedback
    toast.success(`Scanned: ${barcode}`)

    // Clear input
    setManualBarcode("")
    
    // Refocus for next scan
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualBarcode.trim()) {
      handleScan(manualBarcode.trim())
    }
  }

  const handleClose = () => {
    setManualBarcode("")
    setLastScanned([])
    scanBufferRef.current = ""
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarcodeIcon className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Mode Selector */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={scanMode === 'scanner' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setScanMode('scanner')}
          >
            <BarcodeIcon className="h-3.5 w-3.5 mr-1" />
            Scanner Device
          </Button>
          <Button
            variant={scanMode === 'camera' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setScanMode('camera')}
          >
            <Camera className="h-3.5 w-3.5 mr-1" />
            Camera Scan
          </Button>
          <Button
            variant={scanMode === 'manual' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setScanMode('manual')}
          >
            <Keyboard className="h-3.5 w-3.5 mr-1" />
            Manual Entry
          </Button>
        </div>

        {/* Scanner Mode */}
        {scanMode === 'scanner' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center bg-primary/5">
              <BarcodeIcon className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
              <p className="text-lg font-medium mb-2">Ready to Scan</p>
              <p className="text-sm text-muted-foreground">
                Point your barcode scanner at a barcode and press the trigger
              </p>
            </div>
            
            {/* Hidden input to capture scanner input */}
            <input
              ref={inputRef}
              type="text"
              className="opacity-0 h-0 w-0 absolute"
              autoFocus
              value=""
              onChange={() => {}}
            />
          </div>
        )}

        {/* Camera Scanner Mode */}
        {scanMode === 'camera' && (
          <div className="space-y-4">
            {cameraError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-700">{cameraError}</p>
                <Button variant="outline" size="sm" onClick={startCamera} className="mt-3">
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <div className="relative bg-black rounded-lg overflow-hidden min-h-[220px] flex items-center justify-center">
                  <div id="dialog-camera-reader" className="w-full h-full text-white" />
                  {/* Scanning Guide Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-white rounded-lg w-52 h-26 shadow-lg opacity-60">
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-400 rounded-tl" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-400 rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-400 rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-400 rounded-br" />
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center text-xs text-blue-800">
                  📷 Position the barcode inside the target area to scan
                </div>
              </>
            )}
          </div>
        )}
        {/* Manual Entry Mode */}
        {scanMode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter Barcode Number</label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="e.g., PROD-6736-001"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  className="flex-1 font-mono"
                  autoFocus
                />
                <Button type="submit" disabled={!manualBarcode.trim()}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Scan
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Scanned History */}
        {lastScanned.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Recently Scanned</label>
              <Badge variant="secondary">{lastScanned.length}</Badge>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
              {lastScanned.map((barcode, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-secondary/50 rounded text-sm"
                >
                  <span className="font-mono font-semibold">{barcode}</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">💡 Tips:</p>
          <ul className="text-blue-700 dark:text-blue-300 space-y-1 text-xs">
            <li>• Camera Scan lets you scan directly with mobile devices</li>
            <li>• Scanner mode works with USB handheld barcode hardware</li>
            <li>• Duplicate scans in same session are automatically prevented</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
