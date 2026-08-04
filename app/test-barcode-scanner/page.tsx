"use client"

import React, { useState } from "react"
import { SimpleBarcodeInput } from "@/components/SimpleBarcodeInput"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Package } from "lucide-react"

interface ScannedProduct {
  id: string
  name: string
  barcode: string
  price: number
  rental_price: number
  stock_available: number
}

export default function BarcodeTestPage() {
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const handleScanSuccess = (product: any) => {
    console.log("[Test Page] Product scanned:", product)
    
    // Add to scanned list
    setScannedProducts(prev => {
      const existing = prev.find(p => p.id === product.id)
      if (existing) {
        // Product already in list, could increment qty here
        return prev
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        price: product.price,
        rental_price: product.rental_price,
        stock_available: product.stock_available,
      }]
    })

    // Clear old errors
    setErrors([])
  }

  const handleScanError = (error: string) => {
    console.error("[Test Page] Scan error:", error)
    setErrors(prev => [...prev.slice(-4), error]) // Keep last 5 errors
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔍 Barcode Scanner (Simple v2)
          </h1>
          <p className="text-gray-600">
            Test the new simplified barcode search and scanning feature
          </p>
        </div>

        {/* Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Scan Barcode
            </CardTitle>
            <CardDescription>
              Paste or scan barcode: <code className="bg-gray-200 px-2 py-1 rounded">SAF562036</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarcodeInput
              onScanSuccess={handleScanSuccess}
              onError={handleScanError}
            />
          </CardContent>
        </Card>

        {/* Scanned Products */}
        {scannedProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Scanned Products ({scannedProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scannedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-600">Barcode: {product.barcode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-green-700">
                          ₹{product.price}
                        </p>
                        <p className="text-xs text-gray-600">
                          Stock: {product.stock_available}
                        </p>
                      </div>
                    </div>
                    {product.rental_price > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        Rental: ₹{product.rental_price}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Recent Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                    {error}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">📋 Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p>✅ <strong>To test the barcode scanner:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Click the input field above (auto-focused)</li>
              <li>Paste: <code className="bg-white px-1">SAF562036</code></li>
              <li>Press Enter</li>
              <li>Product should appear below if barcode exists</li>
            </ol>
            <p className="mt-4">💡 <strong>Features:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Works with barcode scanners (Enter key triggers search)</li>
              <li>Works with manual paste + Enter</li>
              <li>Shows loading state while searching</li>
              <li>Displays success/error messages</li>
              <li>Prevents duplicate products (can add qty increment logic)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
