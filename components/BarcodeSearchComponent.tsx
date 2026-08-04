'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertCircle, CheckCircle, Search, Barcode } from 'lucide-react'

interface Product {
  id: string
  name: string
  barcode: string
  price?: number
  rental_price?: number
  [key: string]: any
}

interface BarcodeSearchComponentProps {
  onProductFound?: (product: Product) => void
  onError?: (error: string) => void
  debounceMs?: number
}

export default function BarcodeSearchComponent({
  onProductFound,
  onError,
  debounceMs = 500
}: BarcodeSearchComponentProps) {
  const [barcode, setBarcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [activeFranchiseId, setActiveFranchiseId] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let mounted = true

    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/user', { cache: 'no-store' })
        if (!response.ok) return
        const user = await response.json()
        if (mounted && user?.franchise_id) {
          setActiveFranchiseId(user.franchise_id)
        }
      } catch {
        // ignore; barcode search still works without explicit franchise scoping
      }
    }

    loadUser()

    return () => {
      mounted = false
    }
  }, [])

  // Search for product when barcode changes
  useEffect(() => {
    // Clear previous timers
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Clear previous results
    setProduct(null)
    setError('')
    setSuccess(false)

    // If barcode is empty, don't search
    if (!barcode.trim()) {
      return
    }

    // Set debounce timer
    debounceTimer.current = setTimeout(async () => {
      await searchByBarcode(barcode.trim())
    }, debounceMs)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [barcode, debounceMs])

  const searchByBarcode = async (barcodeValue: string) => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `/api/v3/search-product-by-barcode?barcode=${encodeURIComponent(barcodeValue)}${activeFranchiseId ? `&franchise_id=${encodeURIComponent(activeFranchiseId)}` : ""}`
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Product not found')
        setProduct(null)
        onError?.(data.message || 'Product not found')
        return
      }

      setProduct(data.product)
      setSuccess(true)
      setError('')
      onProductFound?.(data.product)

      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      const errorMsg = err.message || 'Error searching product'
      setError(errorMsg)
      setProduct(null)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSearch = () => {
    if (barcode.trim()) {
      searchByBarcode(barcode.trim())
    }
  }

  const handleClear = () => {
    setBarcode('')
    setProduct(null)
    setError('')
    setSuccess(false)
    inputRef.current?.focus()
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4">
      {/* Scanner Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Barcode className="w-4 h-4" />
            Scan or Enter Barcode
          </div>
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Enter 11-digit barcode"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            autoComplete="off"
          />
          <button
            onClick={handleManualSearch}
            disabled={!barcode.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Searching...' : 'Search'}
          </button>
          {barcode && (
            <button
              onClick={handleClear}
              className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 flex items-center gap-2">
          <div className="animate-spin">⏳</div>
          Searching product...
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 font-medium">
            <AlertCircle className="w-5 h-5" />
            Product Not Found
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Success State - Product Found */}
      {product && success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
            <CheckCircle className="w-5 h-5" />
            Product Found!
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Name:</span>
              <p className="text-gray-600">{product.name}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Barcode:</span>
              <p className="text-gray-600 font-mono">{product.barcode}</p>
            </div>
            {product.price && (
              <div>
                <span className="font-medium text-gray-700">Sale Price:</span>
                <p className="text-gray-600">₹{product.price}</p>
              </div>
            )}
            {product.rental_price && (
              <div>
                <span className="font-medium text-gray-700">Rental Price:</span>
                <p className="text-gray-600">₹{product.rental_price}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Details Card */}
      {product && !loading && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-lg text-gray-800 mb-3">{product.name}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Barcode</span>
              <p className="font-mono text-gray-800">{product.barcode}</p>
            </div>
            {product.stock !== undefined && (
              <div>
                <span className="text-gray-600">Stock</span>
                <p className="text-gray-800">{product.stock}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
