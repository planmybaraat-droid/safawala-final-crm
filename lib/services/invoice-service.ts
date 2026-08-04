import { supabase } from "@/lib/supabase"
import type { Invoice, CreateInvoiceData, InvoiceFilters } from "@/lib/types"

export class InvoiceService {
  /**
   * Fetch all invoices from product_orders and package_bookings
   * Filters by is_quote=false (actual bookings/orders that can have invoices)
   */
  static async getAll(filters: InvoiceFilters = {}): Promise<Invoice[]> {
    try {
      console.log("Fetching invoices with filters:", filters)

      // Check if supabase client is available
      if (!supabase) {
        console.error("Supabase client not initialized")
        return []
      }

      // Get current user for franchise filtering
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('safawala_user') : null
      const currentUser = userStr ? JSON.parse(userStr) : null
      const isSuperAdmin = currentUser?.role === 'super_admin'
      const franchiseId = currentUser?.franchise_id

      console.log("🔐 INVOICE FRANCHISE FILTER:", { 
        role: currentUser?.role, 
        franchiseId, 
        isSuperAdmin 
      })

      // Fetch from product_orders where is_quote=false (actual orders)
      // NOTE: Fetching without joins due to missing FK constraints
      let productQuery = supabase
        .from("product_orders")
        .select("*")
        .eq("is_quote", false)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })

      // Fetch from package_bookings where is_quote=false (actual bookings)
      let packageQuery = supabase
        .from("package_bookings")
        .select("*")
        .eq("is_quote", false)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })

      // Apply franchise filter unless super admin
      if (!isSuperAdmin && franchiseId) {
        productQuery = productQuery.eq("franchise_id", franchiseId)
        packageQuery = packageQuery.eq("franchise_id", franchiseId)
      }

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

      const [productResult, packageResult] = await Promise.all([productQuery, packageQuery])

      if (productResult.error) {
        console.error("❌ Product orders error:", productResult.error)
      }

      if (packageResult.error) {
        console.error("❌ Package bookings error:", packageResult.error)
      }

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

      // Transform data to Invoice format
      const productInvoices = productOrders.map((order: any) => {
        const customer = customersMap.get(order.customer_id)
        return {
        id: order.id,
        invoice_number: order.order_number,
        booking_id: order.id,
        invoice_type: "product_order" as const,
        order_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: customer?.name || "",
        customer_phone: customer?.phone || "",
        customer_email: customer?.email || "",
        event_type: order.event_type,
        event_date: order.event_date,
        delivery_date: order.delivery_date,
        return_date: order.return_date,
        groom_name: order.groom_name,
        bride_name: order.bride_name,
        venue_address: order.venue_address,
        total_amount: order.total_amount,
        subtotal_amount: order.subtotal_amount,
        tax_amount: order.tax_amount,
        paid_amount: order.amount_paid,
        pending_amount: order.pending_amount,
        status: order.status,
        payment_status: order.amount_paid >= order.total_amount ? "paid" : order.amount_paid > 0 ? "partial" : "pending",
        notes: order.notes,
        created_at: order.created_at,
        invoice_items: [],
      }})

      const packageInvoices = packageBookings.map((booking: any) => {
        const customer = customersMap.get(booking.customer_id)
        return {
        id: booking.id,
        invoice_number: booking.package_number,
        booking_id: booking.id,
        invoice_type: "package_booking" as const,
        order_number: booking.package_number,
        customer_id: booking.customer_id,
        customer_name: customer?.name || "",
        customer_phone: customer?.phone || "",
        customer_email: customer?.email || "",
        event_type: booking.event_type,
        event_date: booking.event_date,
        delivery_date: booking.delivery_date,
        return_date: booking.return_date,
        groom_name: booking.groom_name,
        bride_name: booking.bride_name,
        venue_address: booking.venue_address,
        total_amount: booking.total_amount,
        subtotal_amount: booking.subtotal_amount,
        tax_amount: booking.tax_amount,
        paid_amount: booking.amount_paid,
        pending_amount: booking.pending_amount,
        status: booking.status,
        payment_status: booking.amount_paid >= booking.total_amount ? "paid" : booking.amount_paid > 0 ? "partial" : "pending",
        notes: booking.notes,
        created_at: booking.created_at,
        invoice_items: [],
      }})

      // Combine and sort by created_at
      const allInvoices = [...productInvoices, ...packageInvoices].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      console.log("Fetched invoices:", allInvoices.length, "invoices")
      console.log("Sample invoice:", allInvoices[0])
      return allInvoices
    } catch (error) {
      // Schema / migration awareness
      if (typeof window !== 'undefined') {
        // Mark a global flag so UI can show helpful message
        ;(window as any).__INVOICE_SCHEMA_ERROR__ = true
      }
      console.error("Error fetching invoices:", error)
      console.error("Error details:", error instanceof Error ? error.message : error)
      // Return empty array instead of throwing to prevent page crash
      return []
    }
  }

  static async getById(id: string, invoiceType: "product_order" | "package_booking"): Promise<Invoice | null> {
    try {
      const tableName = invoiceType === "package_booking" ? "package_bookings" : "product_orders"
      const itemsTable = invoiceType === "package_booking" ? "package_booking_items" : "product_order_items"

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          customer:customers(name, phone, email, address, city)
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      // Fetch items separately
      const { data: items } = await supabase.from(itemsTable).select("*").eq(
        invoiceType === "package_booking" ? "booking_id" : "order_id",
        id
      )

      return {
        ...data,
        invoice_number: invoiceType === "package_booking" ? data.package_number : data.order_number,
        invoice_type: invoiceType,
        invoice_items: items || [],
      } as Invoice
    } catch (error) {
      console.error("Error fetching invoice:", error)
      throw error
    }
  }

  static async getStats(): Promise<{
    total: number
    draft: number
    sent: number
    paid: number
    partially_paid: number
    overdue: number
    total_revenue: number
    pending_amount: number
  }> {
    try {
      console.log("Fetching invoice stats")

      // Check if supabase client is available
      if (!supabase) {
        console.error("Supabase client not initialized for stats")
        return {
          total: 0,
          draft: 0,
          sent: 0,
          paid: 0,
          partially_paid: 0,
          overdue: 0,
          total_revenue: 0,
          pending_amount: 0,
        }
      }

      // Get current user for franchise filtering
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('safawala_user') : null
      const currentUser = userStr ? JSON.parse(userStr) : null
      const isSuperAdmin = currentUser?.role === 'super_admin'
      const franchiseId = currentUser?.franchise_id

      // Fetch from both product_orders and package_bookings where is_quote=false
      let productQuery = supabase
        .from("product_orders")
        .select("status, total_amount, amount_paid, pending_amount")
        .eq("is_quote", false)
      
      let packageQuery = supabase
        .from("package_bookings")
        .select("status, total_amount, amount_paid, pending_amount")
        .eq("is_quote", false)

      // Apply franchise filter unless super admin
      if (!isSuperAdmin && franchiseId) {
        productQuery = productQuery.eq("franchise_id", franchiseId)
        packageQuery = packageQuery.eq("franchise_id", franchiseId)
      }

      const [productResult, packageResult] = await Promise.all([
        productQuery,
        packageQuery
      ])

      if (productResult.error) {
        console.error("Error in getStats product query:", productResult.error)
        console.error("Product stats error details:", {
          message: productResult.error.message,
          details: productResult.error.details,
          hint: productResult.error.hint,
        })
        // Don't throw, continue with package data only
      }

      if (packageResult.error) {
        console.error("Error in getStats package query:", packageResult.error)
        console.error("Package stats error details:", {
          message: packageResult.error.message,
          details: packageResult.error.details,
          hint: packageResult.error.hint,
        })
        // Don't throw, continue with product data only
      }

      const data = [...(productResult.data || []), ...(packageResult.data || [])]

      console.log("Stats data:", data)

      const stats = {
        total: data.length,
        draft: data.filter((i: any) => i.status === "draft").length,
        sent: data.filter((i: any) => i.status === "sent").length,
        paid: data.filter((i: any) => i.amount_paid >= i.total_amount).length,
        partially_paid: data.filter((i: any) => i.amount_paid > 0 && i.amount_paid < i.total_amount).length,
        overdue: data.filter((i: any) => i.status === "overdue").length,
        total_revenue: data.reduce((sum: number, i: any) => sum + (i.amount_paid || 0), 0),
        pending_amount: data.reduce((sum: number, i: any) => sum + (i.pending_amount || 0), 0),
      }

      return stats
    } catch (error) {
      if (typeof window !== 'undefined') {
        ;(window as any).__INVOICE_SCHEMA_ERROR__ = true
      }
      console.error("Error fetching invoice stats:", error)
      throw error
    }
  }

  static async updatePaymentStatus(
    id: string,
    invoiceType: "product_order" | "package_booking",
    amountPaid: number
  ): Promise<void> {
    try {
      const tableName = invoiceType === "package_booking" ? "package_bookings" : "product_orders"
      const numberField = invoiceType === "package_booking" ? "package_number" : "order_number"

      // Get current invoice
      const { data: invoice, error: fetchError } = await supabase
        .from(tableName)
        .select("total_amount, amount_paid, pending_amount")
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError

      const totalPaid = (invoice.amount_paid || 0) + amountPaid
      const pendingAmount = invoice.total_amount - totalPaid

      const { error } = await supabase
        .from(tableName)
        .update({
          amount_paid: totalPaid,
          pending_amount: pendingAmount,
          status: totalPaid >= invoice.total_amount ? "paid" : "partially_paid",
        })
        .eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error updating payment status:", error)
      throw error
    }
  }
}

// Export both the class and an instance for backward compatibility
export const invoiceService = new InvoiceService()

// Re-export types for convenience
export type { CreateInvoiceData, InvoiceFilters } from "@/lib/types"
