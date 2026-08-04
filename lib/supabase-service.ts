import { supabase } from "./supabase"
import type { Customer, Product, BookingType, Franchise } from "./types" // Changed Booking to BookingType, added Category

export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting current user:", error)
      throw error
    }

    if (!user) {
      throw new Error("No authenticated user found")
    }

    // Get additional user metadata from the users table if it exists
    const { data: userData, error: userError } = await supabase.from("users").select("*").eq("id", user.id).single()

    if (userError && userError.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error("Error fetching user data:", userError)
    }

    // Combine auth user with database user data
    return {
      ...user,
      ...userData,
      franchise_id: userData?.franchise_id || user.user_metadata?.franchise_id || null,
      role: userData?.role || user.user_metadata?.role || "user",
      name: userData?.name || user.user_metadata?.name || user.email,
    }
  } catch (error) {
    console.error("Error in getCurrentUser:", error)
    throw error
  }
}

export const franchiseService = {
  async getAll() {
    const { data, error } = await supabase.from("franchises").select("*").eq("is_active", true).order("name")

    if (error) {
      console.error("Error fetching franchises:", error)
      throw error
    }
    return data
  },

  async create(franchise: Omit<Franchise, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase.from("franchises").insert([franchise]).select().single()

    if (error) {
      console.error("Error creating franchise:", error)
      throw error
    }
    return data
  },

  async update(id: string, franchise: Partial<Franchise>) {
    const { data, error } = await supabase
      .from("franchises")
      .update({ ...franchise, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating franchise:", error)
      throw error
    }
    return data
  },
}

export const customerService = {
  async getAll(franchiseId?: string) {
    let query = supabase.from("customers").select(`
        *,
        franchise:franchises(name, code)
      `)

    if (!franchiseId) {
      console.warn("[v0] No franchise ID provided for customer query - returning empty result")
      return []
    }

    // CRITICAL: Always filter by franchise_id to enforce data isolation
    query = query.eq("franchise_id", franchiseId)

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching customers:", error)
      throw error
    }
    return data || []
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("customers")
      .select(`
        *,
        franchise:franchises(name, code)
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching customer:", error)
      throw error
    }
    return data
  },

  async create(customer: Omit<Customer, "id" | "created_at" | "updated_at">) {
    if (!customer.franchise_id) {
      throw new Error("franchise_id is required. All customers must be assigned to a specific franchise.")
    }

    // Generate customer code if not provided
    if (!customer.customer_code) {
      const timestamp = Date.now().toString().slice(-6)
      customer.customer_code = `CUST${timestamp}`
    }

    const { data, error } = await supabase
      .from("customers")
      .insert([customer])
      .select()
      .single()

    if (error) {
      console.error("Error creating customer:", error)
      throw error
    }
    return data
  },

  async update(id: string, customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from("customers")
      .update({ ...customer, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating customer:", error)
      throw error
    }
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("customers").delete().eq("id", id)

    if (error) {
      console.error("Error deleting customer:", error)
      throw error
    }
  },
}

export const productService = {
  async getAll(franchiseId?: string) {
    let query = supabase
      .from("products")
      .select(`
        *,
        franchise:franchises(name, code)
      `)
      .eq("is_active", true)

    if (!franchiseId) {
      console.warn("[v0] No franchise ID provided for product query - returning empty result")
      return []
    }

    query = query.eq("franchise_id", franchiseId)

    const { data, error } = await query.order("name")

    if (error) {
      console.error("Error fetching products:", error)
      throw error
    }
    return data || []
  },

  async getAvailable(franchiseId?: string) {
    let query = supabase.from("products").select("*").eq("is_active", true).gt("stock_available", 0)

    if (!franchiseId) {
      console.warn("[v0] No franchise ID provided for available products query - returning empty result")
      return []
    }

    query = query.eq("franchise_id", franchiseId)

    const { data, error } = await query.order("name")

    if (error) {
      console.error("Error fetching available products:", error)
      throw error
    }
    return data || []
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        franchise:franchises(name, code)
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching product:", error)
      throw error
    }
    return data
  },

  async create(product: Omit<Product, "id" | "created_at" | "updated_at">) {
    if (!product.franchise_id) {
      throw new Error("franchise_id is required. All products must be assigned to a specific franchise.")
    }

    // Generate product code if not provided
    if (!product.product_code) {
      const timestamp = Date.now().toString().slice(-6)
      product.product_code = `PROD${timestamp}`
    }

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          ...product,
          stock_available: product.stock_quantity || 0, // Use stock_quantity from form
          stock_booked: product.stock_booked || 0,
          stock_damaged: product.stock_damaged || 0,
          stock_in_laundry: product.stock_in_laundry || 0,
          reorder_level: product.min_stock_level || 5, // Use min_stock_level from form
          usage_count: product.usage_count || 0,
          damage_count: product.damage_count || 0,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating product:", error)
      throw error
    }
    return data
  },

  async update(id: string, product: Partial<Product>) {
    const { data, error } = await supabase
      .from("products")
      .update({ ...product, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating product:", error)
      throw error
    }
    return data
  },

  async updateStock(
    id: string,
    stockChanges: {
      stock_available?: number
      stock_booked?: number
      stock_damaged?: number
      stock_in_laundry?: number
      usage_count?: number
    },
  ) {
    const { data, error } = await supabase
      .from("products")
      .update({
        ...stockChanges,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating product stock:", error)
      throw error
    }
    return data
  },
}

export const bookingService = {
  async getAll(franchiseId?: string) {
    let query = supabase.from("bookings").select(`
        *,
        customer:customers(*),
        franchise:franchises(name, code),
        booking_items(
          *,
          product:products(*)
        )
      `)

    if (!franchiseId) {
      console.warn("[v0] No franchise ID provided for booking query - returning empty result")
      return []
    }

    query = query.eq("franchise_id", franchiseId)

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching bookings:", error)
      throw error
    }
    return data || []
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        customer:customers(*),
        franchise:franchises(name, code),
        booking_items(
          *,
          product:products(*)
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching booking:", error)
      throw error
    }
    return data
  },

  async getByStatus(status: string, franchiseId?: string) {
    let query = supabase
      .from("bookings")
      .select(`
        *,
        customer:customers(*),
        franchise:franchises(name, code),
        booking_items(
          *,
          product:products(*)
        )
      `)
      .eq("status", status)

    if (franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching bookings by status:", error)
      throw error
    }
    return data || []
  },

  async getByCustomer(customerId: string) {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        customer:customers(*),
        franchise:franchises(name, code),
        booking_items(
          *,
          product:products(*)
        )
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching customer bookings:", error)
      throw error
    }
    return data || []
  },

  async create(booking: Omit<BookingType, "id" | "created_at" | "updated_at">) {
    // Changed Booking to BookingType
    if (!booking.franchise_id) {
      throw new Error("franchise_id is required. All bookings must be assigned to a specific franchise.")
    }

    if (!booking.created_by) {
      throw new Error("created_by is required. Bookings must be created by an authenticated user.")
    }

    // Generate booking number if not provided
    if (!booking.booking_number) {
      const prefix = booking.type === "rental" ? "REN" : "SAL"
      const timestamp = Date.now().toString().slice(-6)
      booking.booking_number = `${prefix}${timestamp}`
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          ...booking,
          discount_amount: booking.discount_amount || 0,
          refund_amount: booking.refund_amount || 0,
          status: booking.status || "pending",
          priority: booking.priority || "medium", // Default to 'medium'
          invoice_generated: booking.invoice_generated || false,
          whatsapp_sent: booking.whatsapp_sent || false,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating booking:", error)
      throw error
    }
    return data
  },

  async update(id: string, booking: Partial<BookingType>) {
    // Changed Booking to BookingType
    const { data, error } = await supabase
      .from("bookings")
      .update({ ...booking, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating booking:", error)
      throw error
    }
    return data
  },

  async updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from("bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating booking status:", error)
      throw error
    }
    return data
  },

  async delete(id: string) {
    // First delete booking items
    await supabase.from("booking_items").delete().eq("booking_id", id)

    // Then delete booking
    const { error } = await supabase.from("bookings").delete().eq("id", id)

    if (error) {
      console.error("Error deleting booking:", error)
    }
  },
}

export const bookingItemService = {
  async create(
    bookingItems: Array<{
      booking_id: string
      product_id: string
      quantity: number
      unit_price: number
      discount_percent?: number
      total_price: number
      security_deposit?: number
      damage_cost?: number
      cleaning_required?: boolean
    }>,
  ) {
    const { data, error } = await supabase
      .from("booking_items")
      .insert(
        bookingItems.map((item) => ({
          ...item,
          discount_percent: item.discount_percent || 0,
          security_deposit: item.security_deposit || 0,
          damage_cost: item.damage_cost || 0,
          cleaning_required: item.cleaning_required || false,
        })),
      )
      .select()

    if (error) {
      console.error("Error creating booking items:", error)
      throw error
    }
    return data
  },

  async getByBooking(bookingId: string) {
    const { data, error } = await supabase
      .from("booking_items")
      .select(`
        *,
        product:products(*)
      `)
      .eq("booking_id", bookingId)

    if (error) {
      console.error("Error fetching booking items:", error)
      throw error
    }
    return data
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from("booking_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating booking item:", error)
      throw error
    }
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("booking_items").delete().eq("id", id)

    if (error) {
      console.error("Error deleting booking item:", error)
    }
  },
}

// Dashboard statistics service
export const dashboardService = {
  async getStats(franchiseId?: string) {
    try {
      console.log("[v0] Starting dashboard stats fetch for franchise:", franchiseId || "all")

      // Test connection first
      if (!supabase) {
        throw new Error("Supabase client not initialized")
      }

      // Get booking counts by status
      console.log("[v0] Fetching booking stats...")
      let bookingQuery = supabase.from("bookings").select("status, total_amount").neq("status", "cancelled")

      if (franchiseId) {
        bookingQuery = bookingQuery.eq("franchise_id", franchiseId)
      }

      const { data: bookingStats, error: bookingError } = await bookingQuery

      if (bookingError) {
        console.error("[v0] Error fetching booking stats:", bookingError)
        throw bookingError
      }

      console.log("[v0] Booking stats fetched:", bookingStats?.length || 0, "records")

      // Get customer count
      console.log("[v0] Fetching customer count...")
      let customerQuery = supabase.from("customers").select("*", { count: "exact", head: true })

      if (franchiseId) {
        customerQuery = customerQuery.eq("franchise_id", franchiseId)
      }

      const { count: customerCount, error: customerError } = await customerQuery

      if (customerError) {
        console.error("[v0] Error fetching customer count:", customerError)
        throw customerError
      }

      console.log("[v0] Customer count:", customerCount)

      // Get product count
      console.log("[v0] Fetching product count...")
      let productQuery = supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true)

      if (franchiseId) {
        productQuery = productQuery.eq("franchise_id", franchiseId)
      }

      const { count: productCount, error: productError } = await productQuery

      if (productError) {
        console.error("[v0] Error fetching product count:", productError)
        throw productError
      }

      console.log("[v0] Product count:", productCount)

      // Get low stock products
      console.log("[v0] Fetching low stock products...")
      let lowStockQuery = supabase.from("products").select("*").eq("is_active", true).lt("stock_available", 5)

      if (franchiseId) {
        lowStockQuery = lowStockQuery.eq("franchise_id", franchiseId)
      }

      const { data: lowStockProducts, error: lowStockError } = await lowStockQuery

      if (lowStockError) {
        console.error("[v0] Error fetching low stock products:", lowStockError)
        throw lowStockError
      }

      console.log("[v0] Low stock products:", lowStockProducts?.length || 0)

      // Calculate totals
      const totalBookings = bookingStats?.length || 0
      const totalRevenue = bookingStats?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0
      const pendingBookings = bookingStats?.filter((b) => b.status === "pending").length || 0
      const confirmedBookings = bookingStats?.filter((b) => b.status === "confirmed").length || 0
      const deliveredBookings = bookingStats?.filter((b) => b.status === "delivered").length || 0
      const completedBookings = bookingStats?.filter((b) => b.status === "completed").length || 0

      const stats = {
        totalBookings,
        totalRevenue,
        totalCustomers: customerCount || 0,
        totalProducts: productCount || 0,
        pendingBookings,
        confirmedBookings,
        deliveredBookings,
        completedBookings,
        lowStockProducts: lowStockProducts || [],
        lowStockCount: lowStockProducts?.length || 0,
      }

      console.log("[v0] Dashboard stats calculated successfully:", stats)
      return stats
    } catch (error) {
      console.error("[v0] Error fetching dashboard stats:", error)
      // Return default stats instead of throwing
      return {
        totalBookings: 0,
        totalRevenue: 0,
        totalCustomers: 0,
        totalProducts: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        deliveredBookings: 0,
        completedBookings: 0,
        lowStockProducts: [],
        lowStockCount: 0,
      }
    }
  },

  async getRecentBookings(limit = 5, franchiseId?: string) {
    try {
      console.log("[v0] Fetching recent bookings with limit:", limit, "for franchise:", franchiseId || "all")

      if (!supabase) {
        throw new Error("Supabase client not initialized")
      }

      let query = supabase.from("bookings").select(`
          *,
          customer:customers(name, phone),
          franchise:franchises(name)
        `)

      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId)
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(limit)

      if (error) {
        console.error("[v0] Error fetching recent bookings:", error)
        throw error
      }

      console.log("[v0] Recent bookings fetched:", data?.length || 0, "records")
      return data || []
    } catch (error) {
      console.error("[v0] Error fetching recent bookings:", error)
      return []
    }
  },

  async getUpcomingBookings(limit = 5, franchiseId?: string) {
    try {
      console.log("[v0] Fetching upcoming bookings with limit:", limit, "for franchise:", franchiseId || "all")

      if (!supabase) {
        throw new Error("Supabase client not initialized")
      }

      const today = new Date().toISOString().split("T")[0] // Get today's date in YYYY-MM-DD format
      console.log("[v0] Using date filter:", today)

      let query = supabase
        .from("bookings")
        .select(`
          *,
          customer:customers(name, phone),
          franchise:franchises(name)
        `)
        .gte("event_date", today) // Filter for future or today's events
        .neq("status", "cancelled") // Exclude cancelled bookings

      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId)
      }

      const { data, error } = await query
        .order("event_date", { ascending: true }) // Order by event date ascending (soonest first)
        .limit(limit)

      if (error) {
        console.error("[v0] Error fetching upcoming bookings:", error)
        throw error
      }

      console.log("[v0] Upcoming bookings fetched:", data?.length || 0, "records")
      return data || []
    } catch (error) {
      console.error("[v0] Error fetching upcoming bookings:", error)
      return []
    }
  },

  async getMonthlyBookings(year: number, month: number, franchiseId?: string) {
    try {
      console.log("[v0] Fetching monthly bookings for:", year, month, "franchise:", franchiseId || "all")

      if (!supabase) {
        throw new Error("Supabase client not initialized")
      }

      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()
      console.log("[v0] Date range:", startDate, "to", endDate)

      let query = supabase
        .from("bookings")
        .select(`
          *,
          customer:customers(name, phone),
          franchise:franchises(name)
        `)
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .neq("status", "cancelled")

      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId)
      }

      const { data, error } = await query.order("event_date")

      if (error) {
        console.error("[v0] Error fetching monthly bookings:", error)
        throw error
      }

      console.log("[v0] Monthly bookings fetched:", data?.length || 0, "records")
      return data || []
    } catch (error) {
      console.error("[v0] Error fetching monthly bookings:", error)
      return []
    }
  },

  async getMonthlyRevenue(franchiseId?: string) {
    try {
      console.log("[v0] Fetching monthly revenue for franchise:", franchiseId || "all")

      if (!supabase) {
        throw new Error("Supabase client not initialized")
      }

      let query = supabase
        .from("bookings")
        .select("total_amount, created_at")
        .neq("status", "cancelled")
        .gte("created_at", new Date(new Date().getFullYear(), 0, 1).toISOString())

      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId)
      }

      const { data, error } = await query.order("created_at")

      if (error) {
        console.error("[v0] Error fetching monthly revenue:", error)
        throw error
      }

      console.log("[v0] Monthly revenue data fetched:", data?.length || 0, "records")
      return data || []
    } catch (error) {
      console.error("[v0] Error fetching monthly revenue:", error)
      return []
    }
  },

  async searchBookings(searchTerm: string, franchiseId?: string, limit = 10) {
    try {
      console.log("[v0] Searching bookings with term:", searchTerm, "for franchise:", franchiseId || "all")

      if (!supabase) {
        throw new Error("Supabase client not initialized")
      }

      if (!searchTerm || searchTerm.trim().length < 2) {
        return []
      }

      const term = searchTerm.trim().toLowerCase()

      let baseQuery = supabase
        .from("bookings")
        .select(`
          *,
          customer:customers(name, phone, email, address, city),
          franchise:franchises(name)
        `)
        .neq("status", "cancelled")

      if (franchiseId) {
        baseQuery = baseQuery.eq("franchise_id", franchiseId)
      }

      // Search in booking fields
      const bookingQuery = baseQuery
        .or(`booking_number.ilike.%${term}%,venue_address.ilike.%${term}%`)
        .order("created_at", { ascending: false })
        .limit(limit)

      // Search in customer fields - need to join differently
      const customerQuery = supabase
        .from("customers")
        .select(`
          bookings!inner(
            *,
            customer:customers(name, phone, email, address, city),
            franchise:franchises(name)
          )
        `)
        .or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,city.ilike.%${term}%`)

      if (franchiseId) {
        customerQuery.eq("bookings.franchise_id", franchiseId)
      }

      const [bookingResults, customerResults] = await Promise.all([bookingQuery, customerQuery])

      if (bookingResults.error) {
        console.error("[v0] Error in booking search:", bookingResults.error)
      }

      if (customerResults.error) {
        console.error("[v0] Error in customer search:", customerResults.error)
      }

      // Combine and deduplicate results
      const allResults = []
      const seenIds = new Set()

      // Add booking results
      if (bookingResults.data) {
        for (const booking of bookingResults.data) {
          if (!seenIds.has(booking.id)) {
            allResults.push(booking)
            seenIds.add(booking.id)
          }
        }
      }

      // Add customer results
      if (customerResults.data) {
        for (const customer of customerResults.data) {
          for (const booking of customer.bookings) {
            if (!seenIds.has(booking.id) && booking.status !== "cancelled") {
              allResults.push(booking)
              seenIds.add(booking.id)
            }
          }
        }
      }

      // Sort by created_at and limit
      const sortedResults = allResults
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)

      console.log("[v0] Search results found:", sortedResults.length, "bookings")
      return sortedResults
    } catch (error) {
      console.error("[v0] Error searching bookings:", error)
      return []
    }
  },
}

export const categoryService = {
  async getAll() {
    const { data, error } = await supabase.from("product_categories").select("*").order("name")

    if (error) {
      console.error("Error fetching categories:", error)
      throw error
    }
    return data
  },
}
