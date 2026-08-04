/**
 * Custom hooks for item management and availability checking
 * Reusable business logic across the application
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { 
  AvailabilityData, 
  AvailabilityConflict, 
  Product, 
  PackageSet,
  SelectedProductItem,
  SelectedPackageItem 
} from '../types/items'

/**
 * Hook for managing selected items with add/remove/update operations
 */
export function useItemSelection<T extends SelectedProductItem | SelectedPackageItem>() {
  const [items, setItems] = useState<T[]>([])

  const addItem = useCallback((item: T) => {
    setItems(prev => [...prev, item])
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
  }, [])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }
    setItems(prev => prev.map(i => 
      i.id === itemId 
        ? { ...i, quantity, total_price: i.unit_price * quantity } 
        : i
    ))
  }, [removeItem])

  const updateItem = useCallback((itemId: string, updates: Partial<T>) => {
    setItems(prev => prev.map(i => 
      i.id === itemId ? { ...i, ...updates } : i
    ))
  }, [])

  const clearItems = useCallback(() => {
    setItems([])
  }, [])

  const getItem = useCallback((itemId: string) => {
    return items.find(i => i.id === itemId)
  }, [items])

  const totalItems = useMemo(() => items.length, [items])
  const totalQuantity = useMemo(() => 
    items.reduce((sum, item) => sum + item.quantity, 0), 
    [items]
  )
  const totalAmount = useMemo(() => 
    items.reduce((sum, item) => sum + item.total_price, 0), 
    [items]
  )

  return {
    items,
    setItems,
    addItem,
    removeItem,
    updateQuantity,
    updateItem,
    clearItems,
    getItem,
    totalItems,
    totalQuantity,
    totalAmount,
  }
}

/**
 * Hook for checking product/package availability for a specific date range
 */
export function useAvailabilityCheck() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AvailabilityData[]>([])
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const checkAvailability = useCallback(async (
    productIds: string[],
    eventDate: string,
    requiredQuantities?: Record<string, number>
  ) => {
    if (!productIds.length || !eventDate) {
      setData([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const eventDateObj = new Date(eventDate)
      const startDate = new Date(eventDateObj)
      startDate.setDate(startDate.getDate() - 2) // Check 2 days before
      const endDate = new Date(eventDateObj)
      endDate.setDate(endDate.getDate() + 2) // Check 2 days after

      // Fetch product details
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, stock_available, stock_booked, stock_total')
        .in('id', productIds)

      if (productsError) throw productsError

      // Fetch conflicting bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('product_orders')
        .select(`
          id,
          order_number,
          event_date,
          delivery_date,
          return_date,
          status,
          customers!inner(name),
          product_order_items!inner(
            product_id,
            quantity
          )
        `)
        .gte('delivery_date', startDate.toISOString().split('T')[0])
        .lte('delivery_date', endDate.toISOString().split('T')[0])
        .in('status', ['confirmed', 'delivered', 'in_progress'])

      if (bookingsError) throw bookingsError

      // Process availability data
      const availabilityResults: AvailabilityData[] = (products || []).map(product => {
        const conflicts: AvailabilityConflict[] = []
        let bookedQuantity = 0

        // Find bookings that affect this product
        bookings?.forEach((booking: any) => {
          booking.product_order_items?.forEach((item: any) => {
            if (item.product_id === product.id) {
              bookedQuantity += item.quantity
              conflicts.push({
                booking_id: booking.id,
                booking_number: booking.order_number,
                delivery_date: booking.delivery_date,
                return_date: booking.return_date,
                quantity: item.quantity,
                customer_name: booking.customers?.name,
                return_status: booking.status === 'returned' ? 'returned' : 'in_progress'
              })
            }
          })
        })

        const availableQuantity = product.stock_available - bookedQuantity
        const requiredQty = requiredQuantities?.[product.id] || 1

        let status: 'available' | 'limited' | 'unavailable' = 'available'
        if (availableQuantity >= requiredQty) {
          status = 'available'
        } else if (availableQuantity > 0) {
          status = 'limited'
        } else {
          status = 'unavailable'
        }

        return {
          product_id: product.id,
          product_name: product.name,
          available_quantity: availableQuantity,
          stock_total: product.stock_total || 0,
          conflicts,
          status,
        }
      })

      setData(availabilityResults)
    } catch (err: any) {
      setError(err.message || 'Failed to check availability')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const checkSingleProduct = useCallback(async (
    productId: string,
    eventDate: string
  ) => {
    return checkAvailability([productId], eventDate, { [productId]: 1 })
  }, [checkAvailability])

  return {
    loading,
    data,
    error,
    checkAvailability,
    checkSingleProduct,
  }
}

/**
 * Hook for filtering and searching products/packages
 */
export function useProductFilter<T extends Product | PackageSet>(items: T[]) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('')
  const [inStockOnly, setInStockOnly] = useState(false)

  const filteredItems = useMemo(() => {
    let result = [...items]

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term)
      )
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter(item => 
        item.category_id === selectedCategory || item.category === selectedCategory
      )
    }

    // Filter by subcategory
    if (selectedSubcategory) {
      result = result.filter(item => 
        'subcategory_id' in item && item.subcategory_id === selectedSubcategory
      )
    }

    // Filter by stock
    if (inStockOnly) {
      result = result.filter(item => 
        item.stock_available && item.stock_available > 0
      )
    }

    return result
  }, [items, searchTerm, selectedCategory, selectedSubcategory, inStockOnly])

  return {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    inStockOnly,
    setInStockOnly,
    filteredItems,
  }
}

/**
 * Hook for calculating order totals with GST and discounts
 */
export function useOrderCalculations(
  items: (SelectedProductItem | SelectedPackageItem)[],
  options?: {
    discountType?: 'flat' | 'percentage'
    discountAmount?: number
    couponDiscount?: number
    gstRate?: number
  }
) {
  return useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)
    
    // Apply discount
    let discount = 0
    if (options?.discountType === 'flat') {
      discount = Math.min(subtotal, options.discountAmount || 0)
    } else if (options?.discountType === 'percentage') {
      const percentage = Math.min(100, Math.max(0, options.discountAmount || 0))
      discount = subtotal * (percentage / 100)
    }
    
    const subtotalAfterDiscount = Math.max(0, subtotal - discount)
    
    // Apply coupon
    const couponDiscount = Math.min(subtotalAfterDiscount, options?.couponDiscount || 0)
    const subtotalAfterCoupon = Math.max(0, subtotalAfterDiscount - couponDiscount)
    
    // Calculate GST
    const gstRate = options?.gstRate || 0.05 // 5% default
    const gst = subtotalAfterCoupon * gstRate
    
    const total = subtotalAfterCoupon + gst
    
    // Calculate security deposit (for package bookings)
    const securityDeposit = items.reduce((sum, item) => {
      if ('security_deposit' in item) {
        return sum + (item.security_deposit || 0) * item.quantity
      }
      return sum
    }, 0)
    
    return {
      subtotal,
      discount,
      subtotalAfterDiscount,
      couponDiscount,
      subtotalAfterCoupon,
      gst,
      gstRate,
      total,
      securityDeposit,
      grandTotal: total + securityDeposit,
    }
  }, [items, options])
}
