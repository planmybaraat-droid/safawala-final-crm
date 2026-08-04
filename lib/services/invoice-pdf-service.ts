import { supabaseServer as defaultSupabase } from "@/lib/supabase-server-simple"
import { urlToPdfBuffer } from "@/lib/puppeteer-pdf"
import { generatePdfToken } from "@/lib/pdf-token"
import { format } from "date-fns"

/**
 * Generates an invoice PDF server-side from HTML, uploads it to Supabase Storage,
 * and saves the resulting URL to the order record.
 */
export async function generateAndSaveInvoicePDF(
  orderId: string,
  orderType: string,
  supabaseClient = defaultSupabase
): Promise<string> {
  console.log(`[PDF Service] Generating PDF for ${orderType} ${orderId}...`)

  // 1. Fetch order/booking data
  const orderData = await fetchOrderData(orderId, orderType, supabaseClient)
  if (!orderData) {
    throw new Error(`Order/Booking not found: ${orderId} (${orderType})`)
  }

  // 2. Fetch customer data
  const { data: customer, error: customerErr } = await supabaseClient
    .from("customers")
    .select("*")
    .eq("id", orderData.customer_id)
    .single()

  if (customerErr || !customer) {
    throw new Error(`Customer not found for this order: ${customerErr?.message || 'No record'}`)
  }

  // 3. Generate PDF by navigating to the live URL with a pdfToken and customer details
  const token = generatePdfToken(orderId, orderType)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mysafawala.com"
  const cName = customer.name || "Customer"
  const cPhone = customer.phone || ""
  const cEmail = customer.email || ""
  const invoicePageUrl = `${appUrl}/create-invoice?mode=edit&id=${orderId}&print=true&pdfToken=${token}&customerName=${encodeURIComponent(cName)}&customerPhone=${encodeURIComponent(cPhone)}&customerEmail=${encodeURIComponent(cEmail)}`

  console.log(`[PDF Service] Navigating to URL: ${invoicePageUrl}`)
  const pdfBuffer = await urlToPdfBuffer(invoicePageUrl)

  // 8. Determine file name and storage paths
  const invoiceNumber =
    orderData.order_number ||
    orderData.package_number ||
    orderData.sale_number ||
    orderData.booking_number ||
    orderId

  const customerName = customer.name || "Customer"
  const eventDate = orderData.event_date
    ? format(new Date(orderData.event_date), "dd/MM/yy")
    : ""

  const safeFileName = [
    invoiceNumber,
    customerName.replace(/[^a-zA-Z0-9]/g, "_"),
    eventDate?.replace(/[^a-zA-Z0-9-]/g, "")
  ].filter(Boolean).join("_")

  const bucket = process.env.NEXT_PUBLIC_INVOICES_BUCKET || "uploads"
  const filePath = `invoices/whatsapp/${safeFileName}_${Date.now()}.pdf`

  // 9. Upload the PDF buffer to Supabase Storage
  console.log(`[PDF Service] Uploading PDF to storage: ${bucket}/${filePath}...`)
  const { error: uploadErr } = await supabaseClient.storage
    .from(bucket)
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadErr) {
    console.error("[PDF Service] Upload error:", uploadErr)
    throw new Error(`Failed to upload invoice PDF: ${uploadErr.message}`)
  }

  // 10. Retrieve the public URL for the uploaded PDF
  const {
    data: { publicUrl },
  } = supabaseClient.storage.from(bucket).getPublicUrl(filePath)

  if (!publicUrl) {
    throw new Error("Failed to get public URL for uploaded invoice PDF")
  }

  console.log(`[PDF Service] Public URL generated: ${publicUrl}`)

  // 11. Save the public URL to the order table
  const tableName = getTableName(orderType)
  if (tableName) {
    console.log(`[PDF Service] Saving PDF URL to ${tableName}.${orderId}...`)
    const { error: updateErr } = await supabaseClient
      .from(tableName)
      .update({ pdf_url: publicUrl })
      .eq("id", orderId)

    if (updateErr) {
      console.error(`[PDF Service] Database update error on table ${tableName}:`, updateErr)
      throw new Error(`Failed to update order with PDF URL: ${updateErr.message}`)
    }
    console.log(`[PDF Service] Successfully updated ${tableName} with pdf_url.`)
  } else {
    console.warn(`[PDF Service] Unknown orderType "${orderType}", skipped database update.`)
  }

  return publicUrl
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function getTableName(orderType: string): string | null {
  switch (orderType) {
    case "product_order":
    case "product_orders":
      return "product_orders"
    case "package_booking":
    case "package_bookings":
      return "package_bookings"
    case "direct_sale":
    case "direct_sales_orders":
      return "direct_sales_orders"
    case "booking":
    case "bookings":
      return "bookings"
    default:
      return null
  }
}

async function fetchOrderData(orderId: string, orderType: string, supabase: any) {
  const tableName = getTableName(orderType)
  if (!tableName) return null

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("id", orderId)
    .single()

  if (error || !data) {
    console.warn(`[PDF Service] Error fetching order data from ${tableName}:`, error)
    return null
  }
  return data
}


