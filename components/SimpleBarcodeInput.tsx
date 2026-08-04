/**
 * Simple Barcode Scanner Component (v2)
 * 
 * Features:
 * - Works with keyboard input and barcode scanners
 * - Auto-triggers on newline (barcode scanner terminator)
 * - Shows loading/error states
 * - Provides clear feedback
 * - Debounce delay: waits 500ms before searching if more than 2 chars
 *   This allows time for full barcode entry before triggering search
 */

"use client"

import React, { useRef, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

interface BarcodeSearchResult {
  success: boolean
  source: string
  product: {
    id: string
    name: string
    barcode: string
    price: number
    rental_price: number
    cost_price: number
    security_deposit: number
    stock_available: number
    category_id: string
    franchise_id: string
    image_url?: string
  }
}

interface SimpleBarcodeInputProps {
  onScanSuccess: (product: BarcodeSearchResult["product"]) => void
  onError?: (error: string) => void
  disabled?: boolean
  debounceMs?: number  // Debounce delay in milliseconds (default: 500ms)
}

export function SimpleBarcodeInput({
  onScanSuccess,
  onError,
  disabled = false,
  debounceMs = 500,  // 500ms delay to allow full barcode entry
}: SimpleBarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [barcode, setBarcode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const performSearch = async (code: string) => {
    if (!code.trim()) return

    setIsLoading(true)
    setStatus("idle")
    setMessage("")

    try {
      // Use the correct API path
      const response = await fetch("/api/v2/barcode-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: code.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Barcode not found")
      }

      const result: BarcodeSearchResult = await response.json()

      setStatus("success")
      setMessage(`✅ ${result.product.name}`)
      setBarcode("")

      // Call success handler
      onScanSuccess(result.product)

      // Clear success message after 2 seconds
      setTimeout(() => {
        setStatus("idle")
        setMessage("")
        inputRef.current?.focus()
      }, 2000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error searching barcode"

      setStatus("error")
      setMessage(`❌ ${errorMsg}`)

      if (onError) onError(errorMsg)

      // Clear error after 3 seconds
      setTimeout(() => {
        setStatus("idle")
        setMessage("")
        inputRef.current?.focus()
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter key triggers search immediately (barcode scanner terminator)
    if (e.key === "Enter") {
      e.preventDefault()
      // Cancel any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      performSearch(barcode)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setBarcode(newValue)

    // Cancel previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // If less than 3 characters, don't search yet (waiting for more input)
    if (newValue.length < 3) {
      return
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      performSearch(newValue)
    }, debounceMs)
  }

  const handleManualSearch = () => {
    // Cancel any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    performSearch(barcode)
  }

  return (
    <div className="w-full space-y-3 p-4 border rounded-lg bg-slate-50">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Scan barcode or type code..."
          value={barcode}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          autoFocus
          className="flex-1 text-base"
        />
        <Button
          onClick={handleManualSearch}
          disabled={disabled || isLoading || !barcode.trim()}
          className="min-w-24"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {/* Status Messages */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded text-sm font-medium ${
            status === "success"
              ? "bg-green-100 text-green-800"
              : status === "error"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
          }`}
        >
          {status === "success" && <CheckCircle2 className="w-4 h-4" />}
          {status === "error" && <AlertCircle className="w-4 h-4" />}
          {message}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-600">
        💡 Scan a barcode or paste the code and press Enter
      </div>
    </div>
  )
}
