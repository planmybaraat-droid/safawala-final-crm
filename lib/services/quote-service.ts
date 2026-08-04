import { supabase } from "@/lib/supabase"
import type { Quote, CreateQuoteData, QuoteFilters } from "@/lib/types"

export class QuoteService {
  static async create(data: CreateQuoteData): Promise<Quote> {
    try {
      console.log("Creating quote with data:", data)

      // Generate quote number
      const { data: quoteNumberData, error: quoteNumberError } = await supabase.rpc("generate_quote_number")

      if (quoteNumberError) {
        console.error("Error generating quote number:", quoteNumberError)
        throw quoteNumberError
      }

      console.log("Generated quote number:", quoteNumberData)
      const quoteNumber = quoteNumberData as string

      // Calculate valid until date (7 days from now)
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + 7)

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          quote_number: quoteNumber,
          customer_id: data.customer_id || null,
          type: data.type || "rental",
          event_type: data.event_type || "wedding",
          event_date: data.event_date || null,
          delivery_date: data.delivery_date || null,
          return_date: data.return_date || null,

          customer_name: data.customer_name || "",
          customer_phone: data.customer_phone || "",
          customer_whatsapp: data.customer_whatsapp,
          customer_email: data.customer_email || "",
          customer_address: data.customer_address || "",
          customer_city: data.customer_city,
          customer_pincode: data.customer_pincode,
          customer_state: data.customer_state,

          event_for: data.event_for || "both",
          groom_name: data.groom_name,
          bride_name: data.bride_name,
          venue_name: data.venue_name || "",
          venue_address: data.venue_address || "",

          total_amount: data.total_amount,
          security_deposit: data.security_deposit || 0,
          tax_amount: data.tax_amount || 0,
          discount_amount: data.discount_amount || 0,

          special_instructions: data.special_instructions || "",
          notes: data.notes,

          valid_until: validUntil.toISOString().split("T")[0],
          status: "generated",
        })
        .select()
        .single()

      if (quoteError) {
        console.error("Error inserting quote:", quoteError)
        throw quoteError
      }

      // Create quote items
      if (data.items && data.items.length > 0) {
        const { error: itemsError } = await supabase.from("quote_items").insert(
          data.items.map((item) => ({
            quote_id: quote.id,
            product_id: item.product_id || null,
            product_name: item.product_name,
            product_code: item.product_code,
            category: item.category || "",
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            security_deposit: item.security_deposit || 0,
          })),
        )

        if (itemsError) {
          console.error("Error inserting quote items:", itemsError)
          throw itemsError
        }
      }

      console.log("Successfully created quote:", quote)
      return quote
    } catch (error) {
      console.error("Error creating quote:", error)
      throw error
    }
  }

  static async getAll(filters: QuoteFilters = {}): Promise<Quote[]> {
    try {
      console.log("Fetching quotes with filters:", filters)

      // Get current user for franchise filtering
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('safawala_user') : null
      const currentUser = userStr ? JSON.parse(userStr) : null
      const isSuperAdmin = currentUser?.role === 'super_admin'
      const franchiseId = currentUser?.franchise_id

      console.log("🔐 FRANCHISE ISOLATION ACTIVE:", { 
        role: currentUser?.role, 
        franchiseId, 
        isSuperAdmin,
        filteringBy: !isSuperAdmin && franchiseId ? `franchise_id = ${franchiseId}` : 'NO FILTER (Super Admin)'
      })

      // Fetch from product_orders where is_quote=true
      // NOTE: Fetching without joins due to missing FK constraints
      let productQuery = supabase
        .from("product_orders")
        .select("*")
        .eq("is_quote", true)

      // Apply franchise filter unless super admin
      if (!isSuperAdmin && franchiseId) {
        productQuery = productQuery.eq("franchise_id", franchiseId)
      }

      productQuery = productQuery.order("created_at", { ascending: false })

      // Fetch from package_bookings where is_quote=true
      // NOTE: Fetching without joins due to missing FK constraints
      let packageQuery = supabase
        .from("package_bookings")
        .select("*")
        .eq("is_quote", true)

      // Apply franchise filter unless super admin
      if (!isSuperAdmin && franchiseId) {
        packageQuery = packageQuery.eq("franchise_id", franchiseId)
      }

      packageQuery = packageQuery.order("created_at", { ascending: false })

      // Apply filters
      if (filters.status) {
        productQuery = productQuery.eq("status", filters.status)
        packageQuery = packageQuery.eq("status", filters.status)
      }

      if (filters.customer_id) {
        productQuery = productQuery.eq("customer_id", filters.customer_id)
        packageQuery = packageQuery.eq("customer_id", filters.customer_id)
      }

      if (filters.date_from) {
        productQuery = productQuery.gte("created_at", filters.date_from)
        packageQuery = packageQuery.gte("created_at", filters.date_from)
      }

      if (filters.date_to) {
        productQuery = productQuery.lte("created_at", filters.date_to)
        packageQuery = packageQuery.lte("created_at", filters.date_to)
      }

      if (filters.search) {
        const searchPattern = `%${filters.search}%`
        productQuery = productQuery.or(`
          order_number.ilike.${searchPattern},
          groom_name.ilike.${searchPattern},
          bride_name.ilike.${searchPattern}
        `)
        packageQuery = packageQuery.or(`
          package_number.ilike.${searchPattern},
          groom_name.ilike.${searchPattern},
          bride_name.ilike.${searchPattern}
        `)
      }

      const [productResult, packageResult] = await Promise.all([
        productQuery,
        packageQuery
      ])
      
      // Log the actual error messages
      if (productResult.error) {
        console.error("❌ Product query error details:", {
          message: productResult.error.message,
          hint: productResult.error.hint,
          details: productResult.error.details,
          code: productResult.error.code
        })
      }
      
      if (packageResult.error) {
        console.error("❌ Package query error details:", {
          message: packageResult.error.message,
          hint: packageResult.error.hint,
          details: packageResult.error.details,
          code: packageResult.error.code
        })
      }

      console.log("📦 Product orders query result:", {
        success: !productResult.error,
        count: productResult.data?.length || 0,
        error: productResult.error ? {
          message: productResult.error.message,
          code: productResult.error.code,
          details: productResult.error.details,
        } : null
      })

      console.log("📋 Package bookings query result:", {
        success: !packageResult.error,
        count: packageResult.data?.length || 0,
        error: packageResult.error ? {
          message: packageResult.error.message,
          code: packageResult.error.code,
          details: packageResult.error.details,
        } : null
      })

      if (productResult.error) {
        console.error("Error fetching product quotes:", productResult.error)
        if (typeof window !== 'undefined') {
          ;(window as any).__QUOTE_SCHEMA_ERROR__ = true
        }
        // Don't throw - continue with package data
      }

      if (packageResult.error) {
        console.error("Error fetching package quotes:", packageResult.error)
        if (typeof window !== 'undefined') {
          ;(window as any).__QUOTE_SCHEMA_ERROR__ = true
        }
        // Don't throw - continue with package data
      }

      // Fetch related data separately (since FK relationships aren't working)
      const productOrders = productResult.data || []
      const packageBookings = packageResult.data || []
      
      // Fetch customers
      const customerIds = [...new Set([
        ...productOrders.map((o: any) => o.customer_id),
        ...packageBookings.map((b: any) => b.customer_id)
      ].filter(Boolean))]
      
      const customersMap = new Map()
      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('*')
          .in('id', customerIds)
        
        customersData?.forEach((c: any) => customersMap.set(c.id, c))
      }
      
      // Fetch product order items
      const orderIds = productOrders.map((o: any) => o.id)
      const productOrderItemsMap = new Map()
      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('product_order_items')
          .select('*')
          .in('order_id', orderIds)
        
        itemsData?.forEach((item: any) => {
          if (!productOrderItemsMap.has(item.order_id)) {
            productOrderItemsMap.set(item.order_id, [])
          }
          productOrderItemsMap.get(item.order_id).push(item)
        })
      }
      
      // Fetch package booking items
      const bookingIds = packageBookings.map((b: any) => b.id)
      const packageBookingItemsMap = new Map()
      if (bookingIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('package_booking_items')
          .select('*')
          .in('booking_id', bookingIds)
        
        itemsData?.forEach((item: any) => {
          if (!packageBookingItemsMap.has(item.booking_id)) {
            packageBookingItemsMap.set(item.booking_id, [])
          }
          packageBookingItemsMap.get(item.booking_id).push(item)
        })
      }

      // Transform data to Quote format
      const productQuotes = productOrders.map((order: any) => {
        const customer = customersMap.get(order.customer_id)
        const items = productOrderItemsMap.get(order.id) || []
        
        return {
        id: order.id,
        quote_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: customer?.name || '',
        customer_phone: customer?.phone || '',
        customer_email: customer?.email || '',
        customer_whatsapp: customer?.whatsapp || '',
        customer_address: customer?.address || '',
        customer_city: customer?.city || '',
        customer_state: customer?.state || '',
        customer_pincode: customer?.pincode || '',
        event_type: order.event_type,
        event_participant: order.event_participant,
        event_date: order.event_date,
        delivery_date: order.delivery_date,
        return_date: order.return_date,
        groom_name: order.groom_name,
        groom_whatsapp: order.groom_whatsapp,
        groom_address: order.groom_address,
        bride_name: order.bride_name,
        bride_whatsapp: order.bride_whatsapp,
        bride_address: order.bride_address,
        venue_name: order.venue_name,
        venue_address: order.venue_address,
        payment_type: order.payment_type,
        payment_method: order.payment_method,
        coupon_code: order.coupon_code,
        coupon_discount: order.coupon_discount,
        discount_amount: order.discount_amount,
        amount_paid: order.amount_paid,
        pending_amount: order.pending_amount,
        total_amount: order.total_amount,
        subtotal_amount: order.subtotal_amount,
        tax_amount: order.tax_amount,
        security_deposit: order.security_deposit,
        status: order.status,
        notes: order.notes,
        sales_closed_by: order.sales_closed_by_id,
        sales_staff_name: null, // Will be populated separately if needed
        created_at: order.created_at,
        quote_items: items.map((item: any) => ({
          ...item,
          product_name: item.product_name_copy || item.product_name || 'Product',
          product_security_deposit: 0
        })),
        booking_type: 'product',
        booking_subtype: order.booking_type || 'rental' // rental or sale
      }})

      const packageQuotes = packageBookings.map((booking: any) => {
        const customer = customersMap.get(booking.customer_id)
        const items = packageBookingItemsMap.get(booking.id) || []
        
        return {
        id: booking.id,
        quote_number: booking.package_number,
        customer_id: booking.customer_id,
        customer_name: customer?.name || '',
        customer_phone: customer?.phone || '',
        customer_email: customer?.email || '',
        customer_whatsapp: customer?.whatsapp || '',
        customer_address: customer?.address || '',
        customer_city: customer?.city || '',
        customer_state: customer?.state || '',
        customer_pincode: customer?.pincode || '',
        event_type: booking.event_type,
        event_participant: booking.event_participant,
        event_date: booking.event_date,
        delivery_date: booking.delivery_date,
        return_date: booking.return_date,
        groom_name: booking.groom_name,
        groom_whatsapp: booking.groom_whatsapp,
        groom_address: booking.groom_address,
        bride_name: booking.bride_name,
        bride_whatsapp: booking.bride_whatsapp,
        bride_address: booking.bride_address,
        venue_name: booking.venue_name,
        venue_address: booking.venue_address,
        payment_type: booking.payment_type,
        payment_method: booking.payment_method,
        coupon_code: booking.coupon_code,
        coupon_discount: booking.coupon_discount,
        discount_amount: booking.discount_amount,
        amount_paid: booking.amount_paid,
        pending_amount: booking.pending_amount,
        total_amount: booking.total_amount,
        subtotal_amount: booking.subtotal_amount,
        tax_amount: booking.tax_amount,
        security_deposit: booking.security_deposit,
        status: booking.status,
        notes: booking.notes,
        sales_closed_by: booking.sales_closed_by_id,
        sales_staff_name: null, // Will be populated separately if needed
        created_at: booking.created_at,
        quote_items: items.map((item: any) => ({
          ...item,
          product_name: item.package_name_copy || item.package_name || 'Package',
          package_name: item.package_name_copy || item.package_name || '',
          package_description: '',
          package_security_deposit: 0,
          category: item.category || '',
          variant_name: item.variant_name || '',
          extra_safas: item.extra_safas || 0,
          variant_inclusions: []
        })),
        booking_type: 'package',
        booking_subtype: 'rental' // packages are always rental
      }})

      // Combine and sort by created_at
      const allQuotes = [...productQuotes, ...packageQuotes].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // Fetch staff names for quotes that have sales_closed_by
      const quotesWithStaff = allQuotes.filter(q => q.sales_closed_by)
      console.log("👥 Fetching staff names:", {
        quotesWithStaff: quotesWithStaff.length,
        staffIds: quotesWithStaff.map(q => q.sales_closed_by)
      })
      
      if (quotesWithStaff.length > 0) {
        const staffIds = [...new Set(quotesWithStaff.map(q => q.sales_closed_by))]
        const { data: staffData, error: staffError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', staffIds)
        
        console.log("👥 Staff fetch result:", {
          success: !staffError,
          count: staffData?.length || 0,
          data: staffData,
          error: staffError
        })
        
        if (staffData && staffData.length > 0) {
          const staffMap = new Map(staffData.map((s: any) => [s.id, s.name]))
          allQuotes.forEach(quote => {
            if (quote.sales_closed_by) {
              quote.sales_staff_name = staffMap.get(quote.sales_closed_by) || null
              console.log(`  - Quote ${quote.quote_number}: staff ID ${quote.sales_closed_by} → ${quote.sales_staff_name}`)
            }
          })
        }
      }

      console.log("✅ Successfully fetched quotes:", {
        total: allQuotes.length,
        product: productQuotes.length,
        package: packageQuotes.length,
        statuses: allQuotes.reduce((acc: any, q) => {
          acc[q.status] = (acc[q.status] || 0) + 1;
          return acc;
        }, {})
      })
      
      // LOG EACH QUOTE'S SALES DATA
      console.log("🔍 DETAILED QUOTE SALES DATA:")
      allQuotes.forEach(q => {
        console.log(`  Quote ${q.quote_number}:`, {
          sales_closed_by: q.sales_closed_by,
          sales_staff_name: q.sales_staff_name
        })
      })
      
      console.log("📋 ALL QUOTES LOADED:", allQuotes.map(q => ({
        number: q.quote_number,
        status: q.status,
        type: q.booking_type,
        customer: q.customer_name
      })))
      
      return allQuotes
    } catch (error) {
      if (typeof window !== 'undefined') {
        ;(window as any).__QUOTE_SCHEMA_ERROR__ = true
      }
      console.error("Error fetching quotes:", error)
      throw error
    }
  }

  static async getById(id: string): Promise<Quote | null> {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          customer:customers(name, phone, email, address, city),
          quote_items(*)
        `)
        .eq("id", id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error fetching quote:", error)
      throw error
    }
  }

  static async updateStatus(id: string, status: string): Promise<void> {
    try {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", id)
      if (error) throw error
    } catch (error) {
      console.error("Error updating quote status:", error)
      throw error
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("quotes").delete().eq("id", id)
      if (error) throw error
    } catch (error) {
      console.error("Error deleting quote:", error)
      throw error
    }
  }

  static async getStats(): Promise<{
    total: number
    generated: number
    sent: number
    accepted: number
    rejected: number
    converted: number
    expired: number
  }> {
    try {
      console.log("📊 Fetching quote stats with franchise isolation")

      // Get current user for franchise filtering
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('safawala_user') : null
      const currentUser = userStr ? JSON.parse(userStr) : null
      const isSuperAdmin = currentUser?.role === 'super_admin'
      const franchiseId = currentUser?.franchise_id

      // Fetch from both product_orders and package_bookings where is_quote=true
      let productQuery = supabase.from("product_orders").select("status").eq("is_quote", true)
      let packageQuery = supabase.from("package_bookings").select("status").eq("is_quote", true)

      // Apply franchise filter unless super admin
      if (!isSuperAdmin && franchiseId) {
        console.log("🔒 Filtering stats by franchise_id:", franchiseId)
        productQuery = productQuery.eq("franchise_id", franchiseId)
        packageQuery = packageQuery.eq("franchise_id", franchiseId)
      } else {
        console.log("🌐 Stats: No franchise filter (Super Admin)")
      }

      const [productResult, packageResult] = await Promise.all([
        productQuery,
        packageQuery
      ])

      console.log("📊 Stats query results:", {
        productSuccess: !productResult.error,
        productCount: productResult.data?.length || 0,
        packageSuccess: !packageResult.error,
        packageCount: packageResult.data?.length || 0,
      })

      if (productResult.error) {
        console.error("Error in getStats product query:", productResult.error)
        if (typeof window !== 'undefined') (window as any).__QUOTE_SCHEMA_ERROR__ = true
        // Don't throw - continue with package data
      }

      if (packageResult.error) {
        console.error("Error in getStats package query:", packageResult.error)
        if (typeof window !== 'undefined') (window as any).__QUOTE_SCHEMA_ERROR__ = true
        // Don't throw - continue with product data
      }

      const data = [...(productResult.data || []), ...(packageResult.data || [])]

      console.log("Stats data total:", data.length)

      const stats = {
        total: data.length,
        generated: data.filter((q: any) => q.status === "quote" || q.status === "generated").length,
        sent: data.filter((q: any) => q.status === "sent").length,
        accepted: data.filter((q: any) => q.status === "accepted").length,
        rejected: data.filter((q: any) => q.status === "rejected").length,
        converted: data.filter((q: any) => q.status === "converted").length,
        expired: data.filter((q: any) => q.status === "expired").length,
      }

      console.log("📈 Final stats:", stats)
      return stats
    } catch (error) {
      if (typeof window !== 'undefined') (window as any).__QUOTE_SCHEMA_ERROR__ = true
      console.error("Error fetching quote stats:", error)
      // Return zeros instead of throwing
      return {
        total: 0,
        generated: 0,
        sent: 0,
        accepted: 0,
        rejected: 0,
        converted: 0,
        expired: 0,
      }
    }
  }

  static async getQuoteAnalytics(dateRange?: { from: string; to: string }) {
    try {
      let query = supabase.from("quotes").select("total_amount, status, created_at, type")

      if (dateRange) {
        query = query.gte("created_at", dateRange.from).lte("created_at", dateRange.to)
      }

      const { data, error } = await query

      if (error) throw error

      // Calculate analytics
      const totalRevenue = data.reduce((sum: number, quote: any) => sum + (quote.total_amount || 0), 0)
      const avgQuoteValue = data.length > 0 ? totalRevenue / data.length : 0
      const conversionRate =
        data.length > 0 ? (data.filter((q: any) => q.status === "converted").length / data.length) * 100 : 0

      const revenueByType = data.reduce(
        (acc: Record<string, number>, quote: any) => {
          acc[quote.type] = (acc[quote.type] || 0) + (quote.total_amount || 0)
          return acc
        },
        {} as Record<string, number>,
      )

      return {
        totalRevenue,
        avgQuoteValue,
        conversionRate,
        revenueByType,
        totalQuotes: data.length,
      }
    } catch (error) {
      console.error("Error fetching quote analytics:", error)
      throw error
    }
  }

  static async getQuotesByDateRange(from: string, to: string): Promise<Quote[]> {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          customer:customers(name, phone, email),
          quote_items(*)
        `)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching quotes by date range:", error)
      throw error
    }
  }
}

// Export both the class and an instance for backward compatibility
export const quoteService = new QuoteService()

// Re-export types for convenience
export type { CreateQuoteData, QuoteFilters } from "@/lib/types"
