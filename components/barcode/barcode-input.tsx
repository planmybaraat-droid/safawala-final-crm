"use client"

/**
 * BarcodeInput - Simple Inline Barcode Scanner Input
 * 
 * Lightweight component for quick barcode scanning in forms
 * Supports USB scanners via keyboard input simulation
 * 
 * Usage:
 * <BarcodeInput
 *   onScan={(code) => lookupProduct(code)}
 *   placeholder="Scan or type barcode..."
 * />
 */

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Scan } from "lucide-react"

interface BarcodeInputProps {
  onScan: (code: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
  debounceMs?: number
  // New options
  digitsOnly?: boolean // if true, strip non-digits
  minDigits?: number   // if set, trigger immediate scan when this many digits are entered
}

export function BarcodeInput({
  onScan,
  placeholder = "Scan barcode...",
  className = "",
  disabled = false,
  autoFocus = true,
  debounceMs = 1000,
  digitsOnly = false,
  minDigits,
}: BarcodeInputProps) {
  const [value, setValue] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scanStartTimeRef = useRef<number>(0)
  const immediateScanRef = useRef(false)

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Debounced scan trigger
  useEffect(() => {
    // If minDigits is defined, we DO NOT use time-based debounce at all.
    // Scans will trigger only when minDigits are reached (or on Enter with >= minDigits).
    if (typeof minDigits === 'number') return

    if (!value.trim()) return

    setIsScanning(true)

    // If minDigits configured and we already handled an immediate scan, skip debounce
    if (immediateScanRef.current) {
      immediateScanRef.current = false
      setIsScanning(false)
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      const finalValue = value.trim()
      onScan(finalValue)
      setValue("")
      setIsScanning(false)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, onScan, debounceMs, minDigits])

  return (
    <div className="relative">
      <Scan className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          const raw = e.currentTarget.value
          const newValue = digitsOnly ? raw.replace(/\D/g, "") : raw
          if (!value) {
            // mark start of scan window
            scanStartTimeRef.current = Date.now()
          }
          // If we have a minDigits requirement and it's met, scan immediately
          if (minDigits && newValue.length >= minDigits) {
            const code = newValue.slice(0, minDigits)
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
            }
            immediateScanRef.current = true
            onScan(code)
            setValue("")
            setIsScanning(false)
            return
          }
          setValue(newValue)
        }}
        onKeyDown={(e) => {
          // Detect scanner Enter key (typically comes after all characters)
          // Scanners typically send: character1 + character2 + ... + characterN + ENTER
          if (e.key === 'Enter' && value.trim()) {
            e.preventDefault()
            const finalValue = (digitsOnly ? value.replace(/\D/g, "") : value).trim()
            // If minDigits is set, only allow Enter to trigger when threshold met
            if (typeof minDigits === 'number' && finalValue.length < minDigits) {
              return
            }
            const code = typeof minDigits === 'number' ? finalValue.slice(0, minDigits) : finalValue
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
            }
            onScan(code)
            setValue("")
            setIsScanning(false)
          }
        }}
        onPaste={(e) => {
          // Handle paste events (some scanners paste the full code). Defer to debounce.
          e.preventDefault()
          const pastedText = e.clipboardData.getData('text')
          const sanitizedPaste = digitsOnly ? pastedText.replace(/\D/g, "") : pastedText
          const combined = (value + sanitizedPaste)
          if (!value) {
            scanStartTimeRef.current = Date.now()
          }
          if (minDigits && combined.length >= minDigits) {
            const code = combined.slice(0, minDigits)
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
            }
            immediateScanRef.current = true
            onScan(code)
            setValue("")
            setIsScanning(false)
            return
          }
          setValue(combined)
        }}
        placeholder={placeholder}
        className={`pl-10 pr-10 font-mono text-sm tracking-wide ${className}`}
        disabled={disabled || isScanning}
        autoComplete="off"
        spellCheck="false"
      />
      {isScanning && (
        <div className="absolute right-3 top-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  )
}
