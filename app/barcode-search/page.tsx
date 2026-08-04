'use client'

import { useState } from 'react'
import BarcodeSearchComponent from '@/components/BarcodeSearchComponent'

interface Product {
  id: string
  name: string
  barcode: string
  [key: string]: any
}

export default function BarcodeSearchPage() {
  const [foundProduct, setFoundProduct] = useState<Product | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleProductFound = (product: Product) => {
    setFoundProduct(product)
    setErrorMsg('')
    console.log('Product found:', product)
  }

  const handleError = (error: string) => {
    setErrorMsg(error)
    setFoundProduct(null)
    console.log('Search error:', error)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔍 Barcode Search & Scan
          </h1>
          <p className="text-gray-600">
            Search products by 11-digit barcode or scan with any barcode scanner
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Search Component */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Product Search</h2>
            <BarcodeSearchComponent
              onProductFound={handleProductFound}
              onError={handleError}
              debounceMs={300}
            />
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Results</h2>

            {foundProduct ? (
              <div className="space-y-6">
                <div className="bg-green-50 border-l-4 border-green-500 p-4">
                  <p className="text-green-700 font-semibold">✅ Product Found</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name
                    </label>
                    <p className="text-lg text-gray-900 font-semibold">
                      {foundProduct.name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      11-Digit Barcode
                    </label>
                    <p className="text-lg font-mono text-gray-900 bg-gray-100 p-2 rounded">
                      {foundProduct.barcode}
                    </p>
                  </div>

                  {foundProduct.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <p className="text-gray-700">{foundProduct.description}</p>
                    </div>
                  )}

                  {foundProduct.price && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sale Price
                      </label>
                      <p className="text-lg text-gray-900">₹{foundProduct.price}</p>
                    </div>
                  )}

                  {foundProduct.rental_price && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rental Price
                      </label>
                      <p className="text-lg text-gray-900">₹{foundProduct.rental_price}</p>
                    </div>
                  )}

                  {foundProduct.stock !== undefined && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Quantity
                      </label>
                      <p className="text-lg text-gray-900">{foundProduct.stock} units</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Product ID: {foundProduct.id}
                  </p>
                </div>
              </div>
            ) : errorMsg ? (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-red-700 font-semibold">❌ {errorMsg}</p>
              </div>
            ) : (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-blue-700">
                  👈 Enter or scan a barcode to see product details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📖 How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold mb-3">
                1
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Type Barcode</h4>
              <p className="text-gray-600 text-sm">
                Type or paste an 11-digit barcode in the search field
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold mb-3">
                2
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Or Scan</h4>
              <p className="text-gray-600 text-sm">
                Use any barcode scanner - it will auto-fill and search
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold mb-3">
                3
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">View Results</h4>
              <p className="text-gray-600 text-sm">
                Product details appear instantly after search
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
