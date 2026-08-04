import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

console.log("[v0] Supabase environment check:", {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl.length,
  keyLength: supabaseAnonKey.length,
  urlPreview: supabaseUrl ? supabaseUrl.substring(0, 20) + "..." : "empty",
  keyPreview: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + "..." : "empty",
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables:", {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey,
  })
}

let supabase: any = null

try {
  if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http")) {
    supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Disable session persistence for better compatibility
      },
    })
    console.log("[v0] Supabase client initialized successfully")
  } else {
    console.warn("Supabase client not initialized due to missing or invalid environment variables")
    const createMockQuery = () => ({
      select: () => createMockQuery(),
      insert: () => createMockQuery(),
      update: () => createMockQuery(),
      delete: () => createMockQuery(),
      upsert: () => createMockQuery(),
      eq: () => createMockQuery(),
      neq: () => createMockQuery(),
      gt: () => createMockQuery(),
      gte: () => createMockQuery(),
      lt: () => createMockQuery(),
      lte: () => createMockQuery(),
      like: () => createMockQuery(),
      ilike: () => createMockQuery(),
      is: () => createMockQuery(),
      in: () => createMockQuery(),
      contains: () => createMockQuery(),
      containedBy: () => createMockQuery(),
      rangeGt: () => createMockQuery(),
      rangeGte: () => createMockQuery(),
      rangeLt: () => createMockQuery(),
      rangeLte: () => createMockQuery(),
      rangeAdjacent: () => createMockQuery(),
      overlaps: () => createMockQuery(),
      textSearch: () => createMockQuery(),
      match: () => createMockQuery(),
      not: () => createMockQuery(),
      or: () => createMockQuery(),
      filter: () => createMockQuery(),
      order: () => createMockQuery(),
      limit: () => createMockQuery(),
      range: () => createMockQuery(),
      single: () =>
        Promise.resolve({ data: null, error: new Error("Supabase not configured - missing environment variables") }),
      maybeSingle: () =>
        Promise.resolve({ data: null, error: new Error("Supabase not configured - missing environment variables") }),
      then: (resolve: any) =>
        resolve({ data: [], error: new Error("Supabase not configured - missing environment variables") }),
    })

    supabase = {
      from: () => createMockQuery(),
      auth: {
        signUp: () =>
          Promise.resolve({ data: null, error: new Error("Supabase not configured - missing environment variables") }),
        signInWithPassword: () =>
          Promise.resolve({ data: null, error: new Error("Supabase not configured - missing environment variables") }),
        signOut: () => Promise.resolve({ error: new Error("Supabase not configured - missing environment variables") }),
        getUser: () =>
          Promise.resolve({ data: null, error: new Error("Supabase not configured - missing environment variables") }),
        getSession: () =>
          Promise.resolve({ data: null, error: new Error("Supabase not configured - missing environment variables") }),
      },
    }
  }
} catch (error) {
  console.error("Failed to create Supabase client:", error)
  const createMockQuery = () => ({
    select: () => createMockQuery(),
    insert: () => createMockQuery(),
    update: () => createMockQuery(),
    delete: () => createMockQuery(),
    upsert: () => createMockQuery(),
    eq: () => createMockQuery(),
    neq: () => createMockQuery(),
    gt: () => createMockQuery(),
    gte: () => createMockQuery(),
    lt: () => createMockQuery(),
    lte: () => createMockQuery(),
    like: () => createMockQuery(),
    ilike: () => createMockQuery(),
    is: () => createMockQuery(),
    in: () => createMockQuery(),
    contains: () => createMockQuery(),
    containedBy: () => createMockQuery(),
    rangeGt: () => createMockQuery(),
    rangeGte: () => createMockQuery(),
    rangeLt: () => createMockQuery(),
    rangeLte: () => createMockQuery(),
    rangeAdjacent: () => createMockQuery(),
    overlaps: () => createMockQuery(),
    textSearch: () => createMockQuery(),
    match: () => createMockQuery(),
    not: () => createMockQuery(),
    or: () => createMockQuery(),
    filter: () => createMockQuery(),
    order: () => createMockQuery(),
    limit: () => createMockQuery(),
    range: () => createMockQuery(),
    single: () => Promise.resolve({ data: null, error: new Error(`Supabase initialization failed: ${error}`) }),
    maybeSingle: () => Promise.resolve({ data: null, error: new Error(`Supabase initialization failed: ${error}`) }),
    then: (resolve: any) => resolve({ data: [], error: new Error(`Supabase initialization failed: ${error}`) }),
  })

  supabase = {
    from: () => createMockQuery(),
    auth: {
      signUp: () => Promise.resolve({ data: null, error: new Error(`Supabase initialization failed: ${error}`) }),
      signInWithPassword: () =>
        Promise.resolve({ data: null, error: new Error(`Supabase initialization failed: ${error}`) }),
      signOut: () => Promise.resolve({ error: new Error(`Supabase initialization failed: ${error}`) }),
      getUser: () => Promise.resolve({ data: null, error: new Error(`Supabase initialization failed: ${error}`) }),
      getSession: () => Promise.resolve({ data: null, error: new Error(`Supabase initialization failed: ${error}`) }),
    },
  }
}

export { supabase }

export const testConnection = async () => {
  try {
    if (!supabase) {
      console.error("❌ Supabase client not initialized")
      return false
    }

    const { data, error } = await Promise.race([
      supabase.from("franchises").select("count").single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 5000)),
    ])

    if (error) throw error
    console.log("✅ Supabase connection successful")
    return true
  } catch (error) {
    console.error("❌ Supabase connection failed:", error)
    return false
  }
}

// Legacy helper intentionally fails closed. Callers must pass an explicit authenticated user id.
const getCurrentUser = async () => {
  console.warn("getCurrentUser() in lib/supabase.ts no longer provides a fallback user. Pass an explicit userId instead.")
  return null
}

// Legacy helper intentionally fails closed. Callers must pass an explicit franchise id.
const getCurrentFranchise = async () => {
  console.warn("getCurrentFranchise() in lib/supabase.ts no longer provides a fallback franchise. Pass an explicit franchiseId instead.")
  return null
}

// Helper functions for database operations
export const supabaseService = {
  // Test connection
  async testConnection() {
    return await testConnection()
  },

  // Settings
  async getSystemSettings() {
    const { data, error } = await supabase.from("system_settings").select("*").order("category", { ascending: true })

    if (error) {
      console.error("Error fetching system settings:", error)
      throw error
    }
    return data
  },

  async getFranchiseSettings(franchiseId: string) {
    const { data, error } = await supabase
      .from("franchise_settings")
      .select("*")
      .eq("franchise_id", franchiseId)
      .order("category", { ascending: true })

    if (error) {
      console.error("Error fetching franchise settings:", error)
      throw error
    }
    return data
  },

  async getUserPreferences(userId: string) {
    const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", userId)

    if (error) {
      console.error("Error fetching user preferences:", error)
      throw error
    }
    return data
  },

  async getNotificationSettings(userId?: string) {
    try {
      // If no userId provided, get current user
      if (!userId) {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          console.log("No current user found, returning default settings")
          return null
        }
        userId = currentUser.id
      }

      const { data, error } = await supabase.from("notification_settings").select("*").eq("user_id", userId).single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching notification settings:", error)
        throw error
      }
      return data
    } catch (error) {
      console.error("Error in getNotificationSettings:", error)
      return null
    }
  },

  async updateNotificationSettings(userId: string | undefined, settings: Partial<any>) {
    try {
      // If no userId provided, get current user
      if (!userId) {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          throw new Error("No current user found")
        }
        userId = currentUser.id
      }

      const { data, error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: userId,
          email_notifications: settings.email,
          sms_notifications: settings.sms,
          push_notifications: settings.push,
          marketing_notifications: settings.marketing,
          booking_reminders: settings.bookingReminders,
          payment_reminders: settings.paymentReminders,
          inventory_alerts: settings.inventoryAlerts,
          system_updates: settings.systemUpdates,
          low_stock_alerts: settings.lowStockAlerts,
          customer_updates: settings.customerUpdates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error updating notification settings:", error)
        throw error
      }
      return data
    } catch (error) {
      console.error("Error in updateNotificationSettings:", error)
      throw error
    }
  },

  async getBusinessHours(franchiseId?: string) {
    try {
      // If no franchiseId provided, get current franchise
      if (!franchiseId) {
        const currentFranchise = await getCurrentFranchise()
        if (!currentFranchise) {
          console.log("No current franchise found")
          return []
        }
        franchiseId = currentFranchise.id
      }

      const { data, error } = await supabase
        .from("business_hours")
        .select("*")
        .eq("franchise_id", franchiseId)
        .order("day_of_week", { ascending: true })

      if (error) {
        console.error("Error fetching business hours:", error)
        throw error
      }
      return data || []
    } catch (error) {
      console.error("Error in getBusinessHours:", error)
      return []
    }
  },

  async updateBusinessHours(franchiseId: string | undefined, hours: any[]) {
    try {
      // If no franchiseId provided, get current franchise
      if (!franchiseId) {
        const currentFranchise = await getCurrentFranchise()
        if (!currentFranchise) {
          throw new Error("No current franchise found")
        }
        franchiseId = currentFranchise.id
      }

      const { data, error } = await supabase
        .from("business_hours")
        .upsert(
          hours.map((hour, index) => ({
            franchise_id: franchiseId,
            day_of_week: index,
            day_name: hour.day,
            is_open: hour.isOpen,
            open_time: hour.openTime || null,
            close_time: hour.closeTime || null,
            break_start_time: hour.breakStart || null,
            break_end_time: hour.breakEnd || null,
            updated_at: new Date().toISOString(),
          })),
        )
        .select()

      if (error) {
        console.error("Error updating business hours:", error)
        throw error
      }
      return data
    } catch (error) {
      console.error("Error in updateBusinessHours:", error)
      throw error
    }
  },

  async getTaxSettings(franchiseId?: string) {
    try {
      // If no franchiseId provided, get current franchise
      if (!franchiseId) {
        const currentFranchise = await getCurrentFranchise()
        if (!currentFranchise) {
          console.log("No current franchise found")
          return []
        }
        franchiseId = currentFranchise.id
      }

      const { data, error } = await supabase
        .from("tax_settings")
        .select("*")
        .eq("franchise_id", franchiseId)
        .order("tax_name", { ascending: true })

      if (error) {
        console.error("Error fetching tax settings:", error)
        throw error
      }
      return data || []
    } catch (error) {
      console.error("Error in getTaxSettings:", error)
      return []
    }
  },

  async updateTaxSetting(id: string, updates: any) {
    const { data, error } = await supabase
      .from("tax_settings")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating tax setting:", error)
      throw error
    }
    return data
  },

  async getPaymentGatewaySettings(franchiseId?: string) {
    try {
      // If no franchiseId provided, get current franchise
      if (!franchiseId) {
        const currentFranchise = await getCurrentFranchise()
        if (!currentFranchise) {
          console.log("No current franchise found")
          return []
        }
        franchiseId = currentFranchise.id
      }

      const { data, error } = await supabase
        .from("payment_gateway_settings")
        .select("*")
        .eq("franchise_id", franchiseId)
        .order("gateway_name", { ascending: true })

      if (error) {
        console.error("Error fetching payment gateway settings:", error)
        throw error
      }
      return data || []
    } catch (error) {
      console.error("Error in getPaymentGatewaySettings:", error)
      return []
    }
  },

  // Customers
  async getCustomers() {
    const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching customers:", error)
      throw error
    }
    return data
  },

  async createCustomer(customer: any) {
    const customerData = {
      customer_code: `CUST${Date.now().toString().slice(-6)}`,
      name: customer.name,
      phone: customer.phone,
      whatsapp: customer.whatsapp || null,
      email: customer.email || null,
      address: customer.address || null,
      city: customer.city || null,
      pincode: customer.pincode || null,
      state: customer.state || null, // Added state field
      franchise_id: customer.franchise_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("customers").insert([customerData]).select().single()

    if (error) {
      console.error("Error creating customer:", error)
      throw error
    }
    return data
  },

  async updateCustomer(id: string, updates: any) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating customer:", error)
      throw error
    }
    return data
  },

  async deleteCustomer(id: string) {
    const { error } = await supabase.from("customers").delete().eq("id", id)

    if (error) {
      console.error("Error deleting customer:", error)
      return false
    }
    return true
  },

  // Franchises
  async getFranchises() {
    const { data, error } = await supabase.from("franchises").select("*").order("name")

    if (error) {
      console.error("Error fetching franchises:", error)
      throw error
    }
    return data
  },

  async createFranchise(franchise: any) {
    const { data, error } = await supabase
      .from("franchises")
      .insert([
        {
          ...franchise,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating franchise:", error)
      throw error
    }
    return data
  },

  // Products
  async getProducts() {
    const { data, error } = await supabase.from("products").select("*").order("name")

    if (error) {
      console.error("Error fetching products:", error)
      throw error
    }
    return data
  },

  async createProduct(product: any) {
    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          ...product,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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

  // Bookings
  async getBookings() {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        customer:customers(name, phone, email),
        franchise:franchises(name)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching bookings:", error)
      throw error
    }
    return data
  },

  async createBooking(booking: any) {
    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          ...booking,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
}

export const createClient = () => {
  return supabase
}

// Server-side client creation function (without importing next/headers)
export const createServerClient = (cookieStore?: any) => {
  // This is a placeholder for server-side client creation
  // In actual implementation, this would use @supabase/ssr
  return supabase
}

// Default export for backward compatibility
export default supabase
