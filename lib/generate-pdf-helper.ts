/**
 * Client-side helper to trigger background PDF generation.
 * Call this immediately after a successful order/booking creation or update
 * so that the invoice PDF is pre-generated in the background.
 */
export async function triggerPDFGeneration(
  orderId: string,
  orderType: "product_order" | "package_booking" | "direct_sale" | "booking" | string
): Promise<void> {
  if (!orderId || !orderType) return

  try {
    const response = await fetch("/api/generate-invoice-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId, orderType }),
    })

    if (!response.ok) {
      console.warn(`[PDF trigger] Failed to trigger PDF generation (status ${response.status})`)
    } else {
      console.log(`[PDF trigger] ✅ Background PDF generation triggered for ${orderType} ${orderId}`)
    }
  } catch (error: any) {
    console.warn(`[PDF trigger] Network error triggering PDF generation:`, error.message || error)
  }
}
