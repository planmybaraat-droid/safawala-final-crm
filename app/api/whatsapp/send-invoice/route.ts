import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { sendMessage, sendMedia, sendTemplateMessage } from "@/lib/services/wati-service"
import { generateAndSaveInvoicePDF } from "@/lib/services/invoice-pdf-service"
import { format } from "date-fns"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow up to 60 seconds for Puppeteer PDF rendering and WATI sending

/**
 * POST /api/whatsapp/send-invoice
 *
 * Generates an invoice PDF server-side, uploads to Supabase Storage,
 * and sends it to the customer via WhatsApp (WATI).
 *
 * Body: { orderId: string, orderType: "product_order" | "package_booking" | "direct_sale" }
 */
export async function sendInvoicePDFAndWhatsAppInternal(params: {
  orderId: string
  orderType: "product_order" | "package_booking" | "direct_sale"
  franchiseId?: string
  extraPhones?: string[]
  sendConfirmation?: boolean
}) {
  const { orderId, orderType, extraPhones, franchiseId, sendConfirmation } = params

  // 1. Fetch order/booking data
  const orderData = await fetchOrderData(orderId, orderType)
  if (!orderData) {
    throw new Error("Order not found")
  }

  // 2. Fetch customer data
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", orderData.customer_id)
    .single()

  if (!customer) {
    throw new Error("Customer not found for this order")
  }

  // Get phone number (prefer whatsapp field, then phone)
  const phone = customer.whatsapp || customer.phone
  if (!phone) {
    throw new Error("Customer has no phone/WhatsApp number")
  }

  // 3. Fetch order items directly from DB (reliable, with all product details)
  let items: any[] = []
  items = await fetchOrderItems(orderId, orderType)
  console.log(`[WhatsApp Invoice] Fetched ${items.length} items for ${orderType} ${orderId}`)

  // 4. Fetch company settings
  const finalFranchiseId = orderData.franchise_id || franchiseId
  const companySettings = await fetchCompanySettings(finalFranchiseId)

  // -- If sendConfirmation is true, trigger the booking confirmation template message first --
  if (sendConfirmation) {
    try {
      const { onBookingCreated } = await import("@/lib/services/whatsapp-triggers")
      if (finalFranchiseId) {
        await onBookingCreated({
          bookingId: orderId,
          franchiseId: finalFranchiseId,
        })
      }
    } catch (err) {
      console.error("[WhatsApp Invoice] Failed to send booking confirmation template:", err)
    }
  }

  // 5. Retrieve or Generate PDF
  let publicUrl = orderData.pdf_url
  if (!publicUrl) {
    console.log("[WhatsApp Invoice] pdf_url not found on order, generating synchronously...")
    publicUrl = await generateAndSaveInvoicePDF(orderId, orderType, supabase)
  } else {
    console.log("[WhatsApp Invoice] Found pre-generated pdf_url:", publicUrl)
  }

  const invoiceNumber =
    orderData.order_number || orderData.package_number || orderData.sale_number || orderId
  const customerName = customer.name || "Customer"
  const eventDate = orderData.event_date
    ? format(new Date(orderData.event_date), "dd/MM/yy")
    : ""
  const invoiceLabel = [invoiceNumber, customerName, eventDate].filter(Boolean).join(" | ")

  // 6. Build rich items summary for WhatsApp template
  const eventDateFormatted = orderData.event_date
    ? format(new Date(orderData.event_date), "dd MMM yyyy")
    : "TBD"
  const eventTime = orderData.delivery_time || orderData.event_time || "TBD"
  const venue = orderData.venue_name || orderData.venue_address || "TBD"

  let itemsSummary = await buildItemsSummary(orderId, orderType, orderData, items)

  if (itemsSummary.length > 900) {
    itemsSummary = itemsSummary.slice(0, 900) + "..."
  }
  // Template body has: • Total Amount: {{7}}  (NO ₹ prefix in template)
  // So we include ₹ in the value we send
  const totalAmountStr = `₹${(orderData.total_amount || 0).toLocaleString("en-IN")}`
  const paymentStatus = orderData.status === "quote" || orderData.is_quote
    ? "Quote Estimate"
    : orderData.amount_paid > 0
      ? `Advance ₹${orderData.amount_paid.toLocaleString("en-IN")} Paid`
      : "Pending"

  console.log("[WhatsApp Invoice] Sending booking_invoice_document template to:", phone)
  console.log("[WhatsApp Invoice] Parameters:", {
    customerName, invoiceNumber, eventDateFormatted, eventTime, venue,
    itemsSummary, totalAmountStr, paymentStatus, pdfUrl: publicUrl,
  })

  // Use the approved template. Try the newer UTILITY template (booking_invoice_document_v3) first.
  let templateResult = await sendTemplateMessage({
    phone,
    templateName: "booking_invoice_document_v3",
    parameters: [
      customerName,        // {{1}} - Customer name
      invoiceNumber,       // {{2}} - Booking/Invoice ID
      eventDateFormatted,  // {{3}} - Event Date
      eventTime,           // {{4}} - Event Time
      venue,               // {{5}} - Venue
      itemsSummary,        // {{6}} - Items summary
      totalAmountStr,      // {{7}} - Total amount
      paymentStatus,       // {{8}} - Payment status
    ],
    mediaUrl: publicUrl,   // PDF attached as document header
  })

  if (!templateResult.success) {
    console.log("[WhatsApp Invoice] booking_invoice_document_v3 failed/pending, trying booking_invoice_document_v2 fallback")
    templateResult = await sendTemplateMessage({
      phone,
      templateName: "booking_invoice_document_v2",
      parameters: [
        customerName,
        invoiceNumber,
        eventDateFormatted,
        eventTime,
        venue,
        itemsSummary,
        totalAmountStr,
        paymentStatus,
      ],
      mediaUrl: publicUrl,
    })
  }

  if (!templateResult.success) {
    console.log("[WhatsApp Invoice] booking_invoice_document_v2 failed/pending, trying booking_invoice_document fallback")
    templateResult = await sendTemplateMessage({
      phone,
      templateName: "booking_invoice_document",
      parameters: [
        customerName,
        invoiceNumber,
        eventDateFormatted,
        eventTime,
        venue,
        itemsSummary,
        totalAmountStr,
        paymentStatus,
      ],
      mediaUrl: publicUrl,
    })
  }

  console.log("[WhatsApp Invoice] Template message result:", templateResult)

  if (!templateResult.success) {
    throw new Error(templateResult.error || "Failed to send WhatsApp message")
  }


  // NOTE: No separate sendMedia needed — the PDF is attached as the DOCUMENT header
  // in the booking_invoice_document template (via mediaUrl in the receiver)


  // 8. Log the WhatsApp invoice send
  try {
    await supabase.from("whatsapp_messages").insert({
      phone: phone.replace(/\D/g, ""),
      message_type: "invoice",
      content: `${invoiceLabel} sent`,
      status: "sent",
      booking_id: orderId,
      franchise_id: finalFranchiseId,
      sent_at: new Date().toISOString(),
    })
  } catch (logErr) {
    console.warn("[WhatsApp Invoice] Failed to log message:", logErr)
  }

  // Also send to extra phone numbers (e.g. business owner)
  if (Array.isArray(extraPhones) && extraPhones.length > 0) {
    for (const extraPhone of extraPhones) {
      if (extraPhone && extraPhone.replace(/\D/g, "") !== phone.replace(/\D/g, "")) {
        try {
          await sendMedia({
            phone: extraPhone,
            mediaUrl: publicUrl,
            caption: `${invoiceLabel} - ${companySettings?.company_name || "Safawala"}`,
            mediaType: "document",
          })
        } catch (e) {
          console.warn(`[WhatsApp Invoice] Failed to send to extra phone ${extraPhone}:`, e)
        }
      }
    }
  }

  return {
    success: true,
    message: `${invoiceLabel} sent to ${phone} via WhatsApp`,
    pdfUrl: publicUrl,
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const authResult = await requireAuth(req, "staff")
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const body = await req.json()
    const { orderId, orderType, extraPhones, sendConfirmation } = body

    if (!orderId || !orderType) {
      return NextResponse.json(
        { error: "orderId and orderType are required" },
        { status: 400 }
      )
    }

    const validTypes = ["product_order", "package_booking", "direct_sale"]
    if (!validTypes.includes(orderType)) {
      return NextResponse.json(
        { error: `Invalid orderType. Use: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const franchiseId =
      body.franchiseId ||
      authResult.authContext?.user?.franchise_id

    const result = await sendInvoicePDFAndWhatsAppInternal({
      orderId,
      orderType,
      franchiseId,
      extraPhones,
      sendConfirmation,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[WhatsApp Invoice] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send invoice via WhatsApp" },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

async function fetchOrderData(orderId: string, orderType: string) {
  let table: string
  switch (orderType) {
    case "product_order":
      table = "product_orders"
      break
    case "package_booking":
      table = "package_bookings"
      break
    case "direct_sale":
      table = "direct_sales_orders"
      break
    default:
      return null
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", orderId)
    .single()

  if (error || !data) return null
  return data
}

async function fetchOrderItems(orderId: string, orderType: string) {
  if (orderType === "product_order") {
    // Select ALL columns including denormalized product_name, category, barcode, image_url
    // that are stored directly on product_order_items during order creation
    const { data, error } = await supabase
      .from("product_order_items")
      .select(`
        id, order_id, product_id, quantity, unit_price, total_price,
        product_name, barcode, category, image_url,
        products ( id, name, category, product_code, barcode )
      `)
      .eq("order_id", orderId)
    if (error) {
      console.warn(`[WhatsApp Invoice] Items fetch error from product_order_items:`, error)
      // Fallback: try selecting without the join (in case products FK is missing)
      const { data: fallback, error: fallbackErr } = await supabase
        .from("product_order_items")
        .select("*")
        .eq("order_id", orderId)
      if (fallbackErr || !fallback) return []
      return fallback.map((item: any) => ({
        ...item,
        product_name: item.product_name || item.name || "Item",
      }))
    }
    // Flatten: prefer denormalized fields, fallback to joined products table
    return (data || []).map((item: any) => ({
      ...item,
      product_name: item.product_name || item.products?.name || item.products?.category || "Item",
      category: item.category || item.products?.category || "",
      barcode: item.barcode || item.products?.barcode || item.products?.product_code || "",
    }))
  }

  if (orderType === "package_booking") {
    // Fetch package booking variant-level items (has variant_name, inclusions, reserved_products)
    const { data, error } = await supabase
      .from("package_booking_items")
      .select(`
        id, booking_id, category_id, variant_id, quantity, unit_price, total_price,
        variant_name, variant_inclusions, reserved_products,
        extra_safas, security_deposit, distance_addon
      `)
      .eq("booking_id", orderId)
    if (error) {
      console.warn(`[WhatsApp Invoice] Items fetch error from package_booking_items:`, error)
      return []
    }
    return (data || []).map((item: any) => ({
      ...item,
      product_name: item.variant_name || "Package Item",
      inclusions: item.variant_inclusions,
      reserved_products: item.reserved_products,
    }))
  }

  if (orderType === "direct_sale") {
    const { data, error } = await supabase
      .from("direct_sales_order_items")
      .select("*")
      .eq("order_id", orderId)
    if (error) {
      console.warn(`[WhatsApp Invoice] Items fetch error from direct_sales_order_items:`, error)
      return []
    }
    return (data || []).map((item: any) => ({
      ...item,
      product_name: item.product_name || item.name || item.category || "Item",
    }))
  }

  return []
}

/**
 * Build a rich items summary string for the WhatsApp template message.
 * Handles product orders (with and without package selection), package bookings,
 * and direct sales — always showing actual product/variant names.
 */
async function buildItemsSummary(
  orderId: string,
  orderType: string,
  orderData: any,
  items: any[]
): Promise<string> {
  // ─── PACKAGE BOOKING ───────────────────────────────────────────────
  if (orderType === "package_booking") {
    // Also fetch the product-level items (separate junction table)
    const { data: productItems } = await supabase
      .from("package_booking_product_items")
      .select(`
        quantity,
        products ( name, category )
      `)
      .eq("package_booking_id", orderId)

    if (items.length === 0 && (!productItems || productItems.length === 0)) {
      return orderData.event_type || "Package Booking"
    }

    const summaryParts = items.map((item: any) => {
      // Variant/category name
      const variantLabel = item.product_name || item.variant_name || "Package"
      
      // Inclusions
      const inclusions = Array.isArray(item.inclusions)
        ? item.inclusions
        : (typeof item.inclusions === "string" && item.inclusions
            ? item.inclusions.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [])

      // Reserved products (selected during booking)
      let reservedProducts: Array<{name: string; qty: number}> = []
      try {
        const raw = Array.isArray(item.reserved_products)
          ? item.reserved_products
          : (typeof item.reserved_products === "string" && item.reserved_products
              ? JSON.parse(item.reserved_products)
              : [])
        reservedProducts = raw.map((p: any) => ({
          name: p.name || p.product_name || "Item",
          qty: p.qty || p.quantity || 1,
        }))
      } catch { reservedProducts = [] }

      // Build the line
      let line = `${variantLabel} x${item.quantity || 1}`
      const details: string[] = []

      if (inclusions.length > 0) {
        details.push(inclusions.join(", "))
      }
      if (reservedProducts.length > 0) {
        details.push(reservedProducts.map(p => `${p.name} x${p.qty}`).join(", "))
      }

      if (details.length > 0) {
        line += ` (${details.join("; ")})`
      }
      return line
    })

    // If we have product-level items but no variant items were returned
    if (summaryParts.length === 0 && productItems && productItems.length > 0) {
      return productItems
        .map((p: any) => `${p.products?.name || p.products?.category || "Item"} x${p.quantity}`)
        .join(", ")
    }

    return summaryParts.join(", ")
  }

  // ─── PRODUCT ORDER (with package selection mode) ───────────────────
  if (orderType === "product_order" && (orderData.selection_mode === "packages" || orderData.variant_id)) {
    // Order was created using a package variant — show package name + selected products
    let pkgLabel = ""
    if (orderData.variant_id) {
      const { data: pkgVar } = await supabase
        .from("package_variants")
        .select("name, inclusions, package_id")
        .eq("id", orderData.variant_id)
        .maybeSingle()

      if (pkgVar) {
        let setName = ""
        if (pkgVar.package_id) {
          const { data: pkgSet } = await supabase
            .from("package_sets")
            .select("name")
            .eq("id", pkgVar.package_id)
            .maybeSingle()
          setName = pkgSet?.name || ""
        }
        pkgLabel = setName ? `${setName} — ${pkgVar.name || "Variant"}` : (pkgVar.name || "Package")

        const inclusions = Array.isArray(pkgVar.inclusions)
          ? pkgVar.inclusions
          : (typeof pkgVar.inclusions === "string" && pkgVar.inclusions
              ? pkgVar.inclusions.split(",").map((s: string) => s.trim()).filter(Boolean)
              : [])

        if (inclusions.length > 0) {
          pkgLabel += ` (${inclusions.join(", ")})`
        }
      }
    }

    // Also list the individual products selected
    const productsStr = items.length > 0
      ? items.map((i: any) => `${i.product_name || "Item"} x${i.quantity || 1}`).join(", ")
      : ""

    const parts = [pkgLabel, productsStr].filter(Boolean)
    return parts.join(" | Products: ") || orderData.event_type || "Order"
  }

  // ─── PRODUCT ORDER (standard products selection) ──────────────────
  if (orderType === "product_order" || orderType === "direct_sale") {
    if (items.length > 0) {
      return items
        .map((i: any) => `${i.product_name || "Item"} x${i.quantity || 1}`)
        .join(", ")
    }
    // Absolute last resort — use event type or generic label
    return orderData.event_type || "Order Items"
  }

  return "Order Items"
}

async function fetchCompanySettings(franchiseId?: string) {
  if (!franchiseId) return null

  const { data } = await supabase
    .from("company_settings")
    .select("*")
    .eq("franchise_id", franchiseId)
    .single()

  return data
}

