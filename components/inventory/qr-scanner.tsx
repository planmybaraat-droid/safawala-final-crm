"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, X } from "lucide-react"

interface QRScannerProps {
  onScan: (qrCode: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      setIsScanning(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // In a real implementation, you would use a QR code scanning library
      // like jsQR or qr-scanner here

      // Simulate QR code detection for demo
      setTimeout(() => {
        const mockQRCode = "PRODUCT_" + Math.random().toString(36).substr(2, 9)
        onScan(mockQRCode)
        stopScanning()
      }, 3000)
    } catch (err) {
      setError("Failed to access camera. Please ensure camera permissions are granted.")
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>QR Code Scanner</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isScanning ? (
          <div className="text-center space-y-4">
            <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
              <Camera className="h-16 w-16 text-gray-400" />
            </div>
            <Button onClick={startScanning} className="w-full">
              Start Scanning
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <video ref={videoRef} className="w-full h-48 bg-black rounded-lg" autoPlay playsInline muted />
              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-blue-500"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-blue-500"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-blue-500"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-blue-500"></div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Position QR code within the frame</p>
              <Button variant="outline" onClick={stopScanning}>
                Stop Scanning
              </Button>
            </div>
          </div>
        )}

        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
      </CardContent>
    </Card>
  )
}
