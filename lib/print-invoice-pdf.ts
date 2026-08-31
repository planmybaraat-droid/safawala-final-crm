/**
 * Client-side helper: asks the server to render the invoice as a clean PDF
 * (no browser print header/footer) and opens it in a new tab for the user to
 * print or save from there.
 *
 * Returns false (without throwing) on any failure, so callers can fall back to
 * the original window.print() behavior.
 */
export async function openInvoicePdfForPrint(params: {
  orderId: string
  orderType?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
}): Promise<boolean> {
  try {
    const res = await fetch("/api/invoices/print-pdf", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderType: "product_order", ...params }),
    })

    if (!res.ok) {
      console.warn("[Print PDF] Server returned", res.status)
      return false
    }

    const blob = await res.blob()
    if (!blob || blob.size === 0) return false

    const blobUrl = URL.createObjectURL(blob)
    const win = window.open(blobUrl, "_blank")
    if (!win) {
      // Popup blocked — let the caller fall back to window.print()
      URL.revokeObjectURL(blobUrl)
      return false
    }

    // Give the new tab time to load the blob before releasing it.
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    return true
  } catch (error) {
    console.warn("[Print PDF] Failed to generate PDF:", error)
    return false
  }
}
