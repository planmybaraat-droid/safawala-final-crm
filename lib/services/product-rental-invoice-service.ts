import { createClient } from "@supabase/supabase-js"
import type { Invoice, InvoiceItem } from "@/lib/types"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * ProductRentalInvoiceService
 * Specialized service for handling product rental invoices
 * Fetches from product_orders table and enriches with rental-specific data
 */
export class ProductRentalInvoiceService {
  /**
   * Get all product rental invoices (excluding quotes)
   */
  async getAll(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from("product_orders")
        .select(
          `
          id,
          order_number,
          customer_id,
          customers (id, name, phone, email, address),
          created_at,
          updated_at,
          delivery_date,
          delivery_time,
          return_date,
          return_time,
          special_instructions,
          booking_subtype,
          order_status,
          payment_method,
          amount_paid,
          total_amount,
          notes,
          is_quote,
          gst_amount,
          gst_percentage,
          discount_amount,
          security_deposit,
          product_order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            products (
              id,
              name,
              barcode,
              product_code,
              category,
              rental_price
            )
          )
        `
        )
        .eq("is_quote", false)
        .eq("booking_subtype", "rental")
        .order("created_at", { ascending: false })

      if (error) throw error

      const invoices = data.map((order: any) => {
        const invoiceItems: InvoiceItem[] = (
          order.product_order_items || []
        ).map((item: any) => ({
          id: item.id,
          product_name: item.products?.name || "Unknown",
          product_id: item.product_id,
          category: item.products?.category,
          barcode: item.products?.barcode,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))

        const pendingAmount =
          (order.total_amount || 0) - (order.amount_paid || 0)

        return {
          id: order.id,
          invoice_number: order.order_number,
          invoice_type: "product_order" as const,
          customer_name: order.customers?.name,
          customer_phone: order.customers?.phone,
          customer_email: order.customers?.email,
          venue_address: order.customers?.address,
          delivery_date: order.delivery_date,
          delivery_time: order.delivery_time,
          return_date: order.return_date,
          return_time: order.return_time,
          created_at: order.created_at,
          updated_at: order.updated_at,
          total_amount: order.total_amount || 0,
          paid_amount: order.amount_paid || 0,
          pending_amount: Math.max(0, pendingAmount),
          gst_amount: order.gst_amount,
          gst_percentage: order.gst_percentage,
          discount_amount: order.discount_amount,
          security_deposit: order.security_deposit,
          payment_method: order.payment_method,
          payment_status: this.getPaymentStatus(
            order.amount_paid || 0,
            order.total_amount || 0
          ),
          notes: order.notes,
          invoice_items: invoiceItems,
          booking_subtype: order.booking_subtype,
          order_status: order.order_status,
          special_instructions: order.special_instructions,
        } as Invoice
      })

      return invoices
    } catch (error) {
      console.error("Error fetching rental invoices:", error)
      throw error
    }
  }

  /**
   * Get a single rental invoice by ID
   */
  async getById(orderId: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from("product_orders")
        .select(
          `
          id,
          order_number,
          customer_id,
          customers (id, name, phone, email, address),
          created_at,
          updated_at,
          delivery_date,
          delivery_time,
          return_date,
          return_time,
          special_instructions,
          booking_subtype,
          order_status,
          payment_method,
          amount_paid,
          total_amount,
          notes,
          is_quote,
          gst_amount,
          gst_percentage,
          discount_amount,
          security_deposit,
          product_order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            products (
              id,
              name,
              barcode,
              product_code,
              category,
              rental_price
            )
          )
        `
        )
        .eq("id", orderId)
        .eq("booking_subtype", "rental")
        .eq("is_quote", false)
        .single()

      if (error) throw error
      if (!data) return null

      const invoiceItems: InvoiceItem[] = (
        data.product_order_items || []
      ).map((item: any) => ({
        id: item.id,
        product_name: item.products?.name || "Unknown",
        product_id: item.product_id,
        category: item.products?.category,
        barcode: item.products?.barcode,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))

      const pendingAmount = (data.total_amount || 0) - (data.amount_paid || 0)

      return {
        id: data.id,
        invoice_number: data.order_number,
        invoice_type: "product_order" as const,
        customer_name: data.customers?.name,
        customer_phone: data.customers?.phone,
        customer_email: data.customers?.email,
        venue_address: data.customers?.address,
        delivery_date: data.delivery_date,
        delivery_time: data.delivery_time,
        return_date: data.return_date,
        return_time: data.return_time,
        created_at: data.created_at,
        updated_at: data.updated_at,
        total_amount: data.total_amount || 0,
        paid_amount: data.amount_paid || 0,
        pending_amount: Math.max(0, pendingAmount),
        gst_amount: data.gst_amount,
        gst_percentage: data.gst_percentage,
        discount_amount: data.discount_amount,
        security_deposit: data.security_deposit,
        payment_method: data.payment_method,
        payment_status: this.getPaymentStatus(
          data.amount_paid || 0,
          data.total_amount || 0
        ),
        notes: data.notes,
        invoice_items: invoiceItems,
        booking_subtype: data.booking_subtype,
        order_status: data.order_status,
        special_instructions: data.special_instructions,
      } as Invoice
    } catch (error) {
      console.error("Error fetching rental invoice:", error)
      return null
    }
  }

  /**
   * Update payment status for a rental invoice
   */
  async updatePaymentStatus(
    orderId: string,
    amountPaid: number,
    paymentMethod?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        amount_paid: amountPaid,
        updated_at: new Date().toISOString(),
      }

      if (paymentMethod) {
        updateData.payment_method = paymentMethod
      }

      const { error } = await supabase
        .from("product_orders")
        .update(updateData)
        .eq("id", orderId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("Error updating rental invoice payment:", error)
      return false
    }
  }

  /**
   * Get statistics for all rental invoices
   */
  async getStats() {
    try {
      const invoices = await this.getAll()

      return {
        total: invoices.length,
        paid: invoices.filter((inv) => inv.payment_status === "paid").length,
        partially_paid: invoices.filter(
          (inv) => inv.payment_status === "partial"
        ).length,
        pending: invoices.filter((inv) => inv.payment_status === "pending")
          .length,
        total_revenue: invoices.reduce(
          (sum, inv) => sum + (inv.paid_amount || 0),
          0
        ),
        pending_amount: invoices.reduce(
          (sum, inv) => sum + (inv.pending_amount || 0),
          0
        ),
        average_rental_period: this.calculateAverageRentalPeriod(invoices),
      }
    } catch (error) {
      console.error("Error calculating rental stats:", error)
      return {
        total: 0,
        paid: 0,
        partially_paid: 0,
        pending: 0,
        total_revenue: 0,
        pending_amount: 0,
        average_rental_period: 0,
      }
    }
  }

  /**
   * Get invoices by rental duration
   */
  getRentalsByDuration(
    invoices: Invoice[],
    durationDays: number
  ): Invoice[] {
    return invoices.filter((inv) => {
      if (!inv.delivery_date || !inv.return_date) return false
      const duration = Math.ceil(
        (new Date(inv.return_date).getTime() -
          new Date(inv.delivery_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      return duration === durationDays
    })
  }

  /**
   * Get invoices by rental period range
   */
  getRentalsByPeriod(
    invoices: Invoice[],
    minDays: number,
    maxDays: number
  ): Invoice[] {
    return invoices.filter((inv) => {
      if (!inv.delivery_date || !inv.return_date) return false
      const duration = Math.ceil(
        (new Date(inv.return_date).getTime() -
          new Date(inv.delivery_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      return duration >= minDays && duration <= maxDays
    })
  }

  /**
   * Calculate rental duration
   */
  calculateRentalDuration(deliveryDate: string, returnDate: string): number {
    return Math.ceil(
      (new Date(returnDate).getTime() - new Date(deliveryDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  }

  /**
   * Helper: Determine payment status
   */
  private getPaymentStatus(
    amountPaid: number,
    totalAmount: number
  ): "paid" | "partial" | "pending" {
    if (amountPaid >= totalAmount) return "paid"
    if (amountPaid > 0) return "partial"
    return "pending"
  }

  /**
   * Helper: Calculate average rental period
   */
  private calculateAverageRentalPeriod(invoices: Invoice[]): number {
    const rentalPeriods = invoices
      .filter((inv) => inv.delivery_date && inv.return_date)
      .map((inv) =>
        this.calculateRentalDuration(inv.delivery_date!, inv.return_date!)
      )

    if (rentalPeriods.length === 0) return 0
    return (
      rentalPeriods.reduce((sum, days) => sum + days, 0) /
      rentalPeriods.length
    )
  }

  /**
   * Export rental invoices to CSV
   */
  async exportToCSV(invoices: Invoice[]): Promise<string> {
    const headers = [
      "Invoice #",
      "Customer",
      "Phone",
      "Pickup Date",
      "Return Date",
      "Duration (Days)",
      "Total Amount",
      "Paid",
      "Pending",
      "Status",
    ]

    const rows = invoices.map((inv) => {
      const duration =
        inv.delivery_date && inv.return_date
          ? this.calculateRentalDuration(inv.delivery_date, inv.return_date)
          : 0

      return [
        inv.invoice_number,
        inv.customer_name || "",
        inv.customer_phone || "",
        inv.delivery_date
          ? new Date(inv.delivery_date).toLocaleDateString()
          : "",
        inv.return_date
          ? new Date(inv.return_date).toLocaleDateString()
          : "",
        duration,
        inv.total_amount || 0,
        inv.paid_amount || 0,
        inv.pending_amount || 0,
        inv.payment_status || "pending",
      ]
    })

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    return csvContent
  }
}
