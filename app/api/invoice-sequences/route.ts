import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'readonly')
  if (!authResult.success) {
    return NextResponse.json(authResult.response, { status: 401 })
  }

  const user = authResult.authContext!.user
  const supabase = createClient()
  const requestedFranchiseId = request.nextUrl.searchParams.get("franchise_id")
  const franchiseId = user.is_super_admin ? requestedFranchiseId : (user.franchise_id || null)
  const type = request.nextUrl.searchParams.get("type") || "rental" // Default to rental

  if (!franchiseId) {
    return NextResponse.json(
      { error: "franchise_id is required" },
      { status: 400 }
    )
  }

  if (!AuthMiddleware.canAccessFranchise(user, franchiseId)) {
    return NextResponse.json(
      { error: "Access denied to this franchise" },
      { status: 403 }
    )
  }

  try {
    // SEPARATE SEQUENCES BY TYPE: Get the last BOOKING of this specific type (exclude quotes)
    const { data: lastOrder, error: orderError } = await supabase
      .from("product_orders")
      .select("order_number, created_at")
      .eq("franchise_id", franchiseId)
      .eq("booking_type", type)  // Filter by type
      .neq("status", "quote")  // Exclude quotes - only get actual bookings
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (orderError && orderError.code !== "PGRST116") {
      console.error("[InvoiceSequences] DB Error:", orderError)
      throw orderError
    }

    let nextInvoiceNumber: string

    if (lastOrder && lastOrder.order_number) {
      console.log(`[InvoiceSequences] Found last ${type} order: ${lastOrder.order_number}`)
      // Extract and increment from last order number
      const match = lastOrder.order_number.match(/^([A-Za-z0-9-]+?)(\d+)$/)
      if (match) {
        const prefix = match[1]
        const numberStr = match[2]  // Original string e.g. "002"
        let lastNumber = parseInt(numberStr, 10)  // Parsed number e.g. 2
        const paddingLength = numberStr.length
        
        // Check if the next number already exists, and keep incrementing until we find an available one
        let candidate: string
        let candidateExists = true
        
        while (candidateExists) {
          lastNumber++
          const paddedNumber = String(lastNumber).padStart(paddingLength, "0")
          candidate = `${prefix}${paddedNumber}`
          
          // Check if this candidate already exists
          const { data: existingOrder, error: checkError } = await supabase
            .from("product_orders")
            .select("id")
            .eq("order_number", candidate)
            .single()
          
          if (checkError?.code === "PGRST116") {
            // Not found - this number is available
            candidateExists = false
          } else if (checkError) {
            throw checkError
          } else if (existingOrder) {
            // Found - keep looping
            candidateExists = true
          }
        }
        
        nextInvoiceNumber = candidate!
        console.log(`[InvoiceSequences] Generated unique number: ${nextInvoiceNumber}`)
      } else {
        console.log(`[InvoiceSequences] Regex failed to parse: ${lastOrder.order_number}`)
        nextInvoiceNumber = type === "sale" ? "ORD-2026001" : "INV-2026001"
      }
    } else {
      console.log(`[InvoiceSequences] No ${type} orders found, using default`)
      nextInvoiceNumber = type === "sale" ? "ORD-2026001" : "INV-2026001"
    }

    return NextResponse.json({ next_invoice_number: nextInvoiceNumber }, { status: 200 })
  } catch (error) {
    console.error("[Invoice Sequences] Error generating next invoice number:", error)
    return NextResponse.json(
      { error: "Failed to generate next invoice number" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, 'readonly')
  if (!authResult.success) {
    return NextResponse.json(authResult.response, { status: 401 })
  }

  const user = authResult.authContext!.user
  const supabase = createClient()
  const body = await request.json()

  const { franchise_id, type, invoice_number } = body

  if (!franchise_id || !type || !invoice_number) {
    return NextResponse.json(
      { error: "franchise_id, type, and invoice_number are required" },
      { status: 400 }
    )
  }

  if (!AuthMiddleware.canAccessFranchise(user, franchise_id)) {
    return NextResponse.json(
      { error: "Access denied to this franchise" },
      { status: 403 }
    )
  }

  try {
    // Validate format only - system reads directly from product_orders table
    const match = invoice_number.match(/^([A-Za-z0-9-]+?)(\d+)$/)
    
    if (!match) {
      return NextResponse.json(
        { error: "Invalid invoice number format. Use format like INV001, ORD001, etc" },
        { status: 400 }
      )
    }

    console.log(`[TypedInvoice] Validated ${type} invoice: ${invoice_number}`)
    return NextResponse.json({ success: true, invoice_number }, { status: 200 })
  } catch (error) {
    console.error("[Invoice Sequences] Error validating invoice number:", error)
    return NextResponse.json(
      { error: "Failed to validate invoice number" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request, 'readonly')
  if (!authResult.success) {
    return NextResponse.json(authResult.response, { status: 401 })
  }

  const user = authResult.authContext!.user
  const supabase = createClient()
  const body = await request.json()

  const { franchise_id, type } = body

  if (!franchise_id || !type) {
    return NextResponse.json(
      { error: "franchise_id and type are required" },
      { status: 400 }
    )
  }

  if (!AuthMiddleware.canAccessFranchise(user, franchise_id)) {
    return NextResponse.json(
      { error: "Access denied to this franchise" },
      { status: 403 }
    )
  }

  try {
    // SEPARATE SEQUENCES BY TYPE: Read the LAST BOOKING of this type and increment from it (exclude quotes)
    const { data: lastOrder, error: orderError } = await supabase
      .from("product_orders")
      .select("order_number")
      .eq("franchise_id", franchise_id)
      .eq("booking_type", type)  // Filter by type
      .neq("status", "quote")  // Exclude quotes - only get actual bookings
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (orderError && orderError.code !== "PGRST116") {
      throw orderError
    }

    let nextInvoiceNumber: string

    if (lastOrder && lastOrder.order_number) {
      // Extract prefix and number from last order of this type
      const match = lastOrder.order_number.match(/^([A-Za-z0-9-]+?)(\d+)$/)
      
      if (match) {
        const prefix = match[1]
        const numberStr = match[2]
        const lastNumber = parseInt(numberStr, 10)
        const nextNumber = lastNumber + 1
        const paddedNumber = String(nextNumber).padStart(numberStr.length, "0")
        nextInvoiceNumber = `${prefix}${paddedNumber}`
        
        console.log(`[TypedInvoice] Last ${type}: ${lastOrder.order_number} → Next: ${nextInvoiceNumber}`)
      } else {
        nextInvoiceNumber = type === "sale" ? "ORD-2026001" : "INV-2026001"
      }
    } else {
      // No orders of this type found, use default
      nextInvoiceNumber = type === "sale" ? "ORD-2026001" : "INV-2026001"
    }

    return NextResponse.json({ next_invoice_number: nextInvoiceNumber }, { status: 200 })
  } catch (error) {
    console.error("[Invoice Sequences] Error generating next invoice number:", error)
    return NextResponse.json(
      { error: "Failed to generate next invoice number" },
      { status: 500 }
    )
  }
}
