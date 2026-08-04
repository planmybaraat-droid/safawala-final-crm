"use client"

import { useState, useEffect, useCallback } from "react"
import { dataService } from "@/lib/data-service"
import type { Customer, Booking } from "@/lib/types"
import { toast } from "./use-toast"

function formatError(err: any) {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch (e) {
    return String(err)
  }
}

export function useData<T>(key: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(
    async (forceRefresh = false) => {
      // Skip data loading if key is "skip" (used for conditional permissions)
      if (key === "skip") {
        setLoading(false)
        setData(null)
        setError(null)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Map different data keys to appropriate service methods
        let result: T
        switch (key) {
          case "dashboard-stats":
            result = (await dataService.getDashboardStats(forceRefresh)) as T
            break
          case "booking-stats": {
            const bookings = (await dataService.getBookings(forceRefresh)) as unknown as Booking[]
            const stats = {
              totalBookings: bookings.length,
              confirmedBookings: bookings.filter((b) => b.status === "confirmed" || b.status === "pending_selection").length,
              deliveredBookings: bookings.filter((b) => b.status === "delivered").length,
              completedBookings: bookings.filter((b) => b.status === "order_complete" || b.status === "returned").length,
              totalRevenue: bookings
                .filter((b) => b.status === "order_complete")
                .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0),
            }
            result = stats as unknown as T
            break
          }
          case "recent-bookings":
            result = (await dataService.getRecentBookings(forceRefresh)) as T
            break
          case "calendar-bookings":
            result = (await dataService.getCalendarBookings(forceRefresh)) as T
            break
          case "customers":
            result = (await dataService.getCustomers(forceRefresh)) as T
            break
          case "bookings":
            result = (await dataService.getBookings(forceRefresh)) as T
            break
          default:
            throw new Error(`Unknown data key: ${key}`)
        }

        setData(result)
      } catch (err) {
          const errorMessage = formatError(err) || `Failed to load ${key}`
          setError(errorMessage)
          
          // Don't show error toast for permission-related errors
          const isPermissionError = errorMessage.toLowerCase().includes('permission') || 
                                   errorMessage.toLowerCase().includes('unauthorized') ||
                                   errorMessage.toLowerCase().includes('forbidden')
          
          if (!isPermissionError) {
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive",
            })
          }
      } finally {
        setLoading(false)
      }
    },
    [key],
  )

  const refresh = useCallback(() => loadData(true), [loadData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    loading,
    error,
    refresh,
  }
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCustomers = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      const data = await dataService.getCustomers(forceRefresh)
      setCustomers(data)
    } catch (err) {
      const errorMessage = formatError(err) || "Failed to load customers"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const createCustomer = useCallback(async (customerData: Partial<Customer>) => {
    try {
      const newCustomer = await dataService.createCustomer(customerData)
      setCustomers((prev) => [newCustomer, ...prev])
      toast({
        title: "Success",
        description: "Customer created successfully",
      })
      return newCustomer
    } catch (err) {
      const errorMessage = formatError(err) || "Failed to create customer"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [])

  const updateCustomer = useCallback(async (id: string, customerData: Partial<Customer>) => {
    try {
      const updatedCustomer = await dataService.updateCustomer(id, customerData)
      setCustomers((prev) => prev.map((c) => (c.id === id ? updatedCustomer : c)))
      toast({
        title: "Success",
        description: "Customer updated successfully",
      })
      return updatedCustomer
    } catch (err) {
      const errorMessage = formatError(err) || "Failed to update customer"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [])

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      await dataService.deleteCustomer(id)
      setCustomers((prev) => prev.filter((c) => c.id !== id))
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      })
    } catch (err) {
      const errorMessage = formatError(err) || "Failed to delete customer"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  return {
    customers,
    loading,
    error,
    refresh: () => loadCustomers(true),
    createCustomer,
    updateCustomer,
    deleteCustomer,
  }
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBookings = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      const data = await dataService.getBookings(forceRefresh)
      setBookings(data)
    } catch (err) {
      const errorMessage = formatError(err) || "Failed to load bookings"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const createBooking = useCallback(async (bookingData: Partial<Booking>) => {
    try {
      const newBooking = await dataService.createBooking(bookingData)
      setBookings((prev) => [newBooking, ...prev])
      toast({
        title: "Success",
        description: "Booking created successfully",
      })
      return newBooking
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create booking"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  return {
    bookings,
    loading,
    error,
    refresh: () => loadBookings(true),
    createBooking,
  }
}
