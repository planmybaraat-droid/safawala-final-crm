/**
 * Client-side helper to send an invoice via WhatsApp after order creation.
 * Call this after a successful order/booking insert — it fires and forgets
 * so the user isn't blocked waiting for WhatsApp delivery.
 */

export type OrderType = "product_order" | "package_booking" | "direct_sale"

interface SendInvoiceWhatsAppParams {
  orderId: string
  orderType: OrderType
  extraPhones?: string[]
  sendConfirmation?: boolean
}

/**
 * Fire-and-forget: sends the invoice PDF to the customer via WhatsApp.
 * Logs success/failure to console but never throws.
 */
export async function sendInvoiceViaWhatsApp(
  params: SendInvoiceWhatsAppParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/whatsapp/send-invoice", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      console.warn(
        "[WhatsApp Invoice] Send failed:",
        result.error || response.statusText
      )
      return { success: false, error: result.error || "Failed to send invoice" }
    }

    console.log("[WhatsApp Invoice] ✅ Sent:", result.message)
    return { success: true }
  } catch (error: any) {
    console.warn("[WhatsApp Invoice] Network error:", error.message)
    return { success: false, error: error.message }
  }
}
