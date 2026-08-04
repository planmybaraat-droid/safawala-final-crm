import { apiClient } from "./api-client"
import type { Customer, Booking } from "./types"

interface DataCache {
  customers: Customer[]
  bookings: Booking[]
  lastFetch: { [key: string]: number }
  cachedData: { [key: string]: any }
}

class DataService {
  private cache: DataCache = {
    customers: [],
    bookings: [],
    lastFetch: {},
    cachedData: {},
  }

  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  private isCacheValid(key: string): boolean {
    const lastFetch = this.cache.lastFetch[key]
    return Boolean(lastFetch && Date.now() - lastFetch < this.CACHE_DURATION)
  }

  private updateCache(key: string, data: any) {
    this.cache[key as keyof DataCache] = data
    this.cache.lastFetch[key] = Date.now()
  }

  // Public method to clear cache (useful after updates)
  public clearCache(key?: string) {
    if (key) {
      delete this.cache.lastFetch[key]
    } else {
      this.cache.lastFetch = {}
    }
  }

  async getCustomers(forceRefresh = false, params: Record<string, any> = {}): Promise<Customer[]> {
    if (!forceRefresh && this.isCacheValid("customers") && Object.keys(params).length === 0) {
      return this.cache.customers
    }

    // If caller didn't provide a franchise_id, try to read it from the stored user
    try {
      if (!params.franchise_id && typeof window !== 'undefined') {
        const stored = localStorage.getItem('safawala_user')
        if (stored) {
          const user = JSON.parse(stored)
          if (user && user.franchise_id) {
            params = { ...params, franchise_id: user.franchise_id }
          }
        }
      }
    } catch (e) {
      // ignore JSON parse errors and proceed without franchise_id
    }

    // Add include_staff and include_notes to get the related data
    const queryParams = new URLSearchParams({
      include_staff: 'true',
      include_notes: 'true',
      ...params
    }).toString();

    const response = await apiClient.get<Customer[]>(`/api/customers?${queryParams}`)
    if (response.success && response.data) {
      // The API returns the customers array directly in response.data
      const customers = Array.isArray(response.data) ? response.data : []
      
      // Only update the cache for default (non-filtered) requests
      if (Object.keys(params).length === 0) {
        this.updateCache("customers", customers)
      }
      
      return customers
    }

    throw new Error(response.error || "Failed to fetch customers")
  }

  async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    const response = await apiClient.post<Customer>("/api/customers", customerData)
    if (response.success && response.data) {
      // Update cache
      this.cache.customers = [response.data, ...this.cache.customers]
      return response.data
    }

    throw new Error(response.error || "Failed to create customer")
  }

  async updateCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
    const response = await apiClient.put<Customer>(`/api/customers/${id}`, customerData)
    if (response.success && response.data) {
      // Update cache
      const index = this.cache.customers.findIndex((c) => c.id === id)
      if (index !== -1) {
        this.cache.customers[index] = response.data
      }
      return response.data
    }

    throw new Error(response.error || "Failed to update customer")
  }

  async deleteCustomer(id: string): Promise<void> {
    const response = await apiClient.delete(`/api/customers/${id}`)
    if (response.success) {
      // Update cache
      this.cache.customers = this.cache.customers.filter((c) => c.id !== id)
      return
    }

    throw new Error(response.error || "Failed to delete customer")
  }

  async getBookings(forceRefresh = false): Promise<Booking[]> {
    if (!forceRefresh && this.isCacheValid("bookings")) {
      return this.cache.bookings
    }

    const response = await apiClient.get<Booking[]>("/api/bookings")
    if (response.success && response.data) {
      this.updateCache("bookings", response.data)
      return response.data
    }

    throw new Error(response.error || "Failed to fetch bookings")
  }

  async createBooking(bookingData: Partial<Booking>): Promise<Booking> {
    const response = await apiClient.post<Booking>("/api/bookings", bookingData)
    if (response.success && response.data) {
      // Update cache
      this.cache.bookings = [response.data, ...this.cache.bookings]
      return response.data
    }

    throw new Error(response.error || "Failed to create booking")
  }

  async getDashboardStats(forceRefresh = false): Promise<any> {
    const cacheKey = "dashboard-stats"
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      return this.cache.cachedData[cacheKey]
    }

    try {
      const response = await apiClient.get("/api/dashboard/stats")
      if (response.success && response.data) {
        this.cache.lastFetch[cacheKey] = Date.now()
        this.cache.cachedData[cacheKey] = response.data
        console.log("[DataService] Dashboard stats received:", response.data)
        return response.data
      }
      
      console.error("[DataService] Dashboard stats API returned unsuccessful response:", response)
    } catch (error) {
      console.error("[DataService] Dashboard stats API error:", error)
    }
    
    // Fallback: Calculate stats from bookings data
    console.log("[DataService] Calculating stats from bookings data...")
    try {
      const bookings = await this.getBookings(true)
      const customers = await this.getCustomers(true)
      
      const activeBookings = bookings.filter((b: any) => 
        ['confirmed', 'delivered'].includes(b.status)
      ).length
      
      const totalRevenue = bookings.reduce((sum: number, b: any) => 
        sum + (Number(b.total_amount) || 0), 0
      )
      
      const avgBookingValue = bookings.length > 0 ? totalRevenue / bookings.length : 0
      
      const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed').length
      const quotesCount = bookings.filter((b: any) => b.status === 'quote').length
      const conversionRate = (confirmedBookings + quotesCount) > 0 
        ? (confirmedBookings / (confirmedBookings + quotesCount)) * 100 
        : 0
      
      const calculatedStats = {
        totalBookings: bookings.length,
        activeBookings,
        totalCustomers: customers.length,
        totalRevenue,
        monthlyGrowth: 0,
        lowStockItems: 0,
        conversionRate: Math.round(conversionRate),
        avgBookingValue: Math.round(avgBookingValue),
        revenueByMonth: [],
        bookingsByType: {
          package: bookings.filter((b: any) => b.type === 'package').length,
          product: bookings.filter((b: any) => b.type !== 'package').length
        },
        pendingActions: {
          payments: bookings.filter((b: any) => b.status === 'pending_payment').length,
          deliveries: bookings.filter((b: any) => b.status === 'confirmed').length,
          returns: bookings.filter((b: any) => b.status === 'delivered').length,
          overdue: 0
        }
      }
      
      console.log("[DataService] Calculated stats:", calculatedStats)
      this.cache.lastFetch[cacheKey] = Date.now()
      this.cache.cachedData[cacheKey] = calculatedStats
      return calculatedStats
    } catch (fallbackError) {
      console.error("[DataService] Failed to calculate fallback stats:", fallbackError)
      
      // Last resort: return empty stats
      const emptyStats = {
        totalBookings: 0,
        activeBookings: 0,
        totalCustomers: 0,
        totalRevenue: 0,
        monthlyGrowth: 0,
        lowStockItems: 0,
        conversionRate: 0,
        avgBookingValue: 0,
        revenueByMonth: [],
        bookingsByType: { package: 0, product: 0 },
        pendingActions: { payments: 0, deliveries: 0, returns: 0, overdue: 0 }
      }
      
      return emptyStats
    }
  }

  async getRecentBookings(forceRefresh = false): Promise<Booking[]> {
    const bookings = await this.getBookings(true)
    return bookings.slice(0, 5) // Return 5 most recent bookings
  }

  async getCalendarBookings(forceRefresh = false): Promise<any[]> {
    const bookings = await this.getBookings(true)
    return bookings.map(booking => ({
      id: booking.id,
      title: `${booking.customer?.name || 'Customer'} - ${booking.event_type || 'Event'}`,
      start: booking.event_date,
      end: booking.event_date,
      status: booking.status
    }))
  }
}

export const dataService = new DataService()
