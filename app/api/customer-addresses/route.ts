import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get('customer_id')

    if (!customerId) {
      return NextResponse.json({ error: "customer_id is required" }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .order("last_used_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("[Customer Addresses API] Error fetching addresses:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[Customer Addresses API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const body = await request.json()

    // Check if address already exists
    const { data: existingAddresses, error: checkError } = await supabaseServer
      .from("customer_addresses")
      .select("id")
      .eq("customer_id", body.customer_id)
      .ilike("full_address", body.full_address.trim())
      .limit(1)

    if (checkError) {
      console.error("[Customer Addresses API] Error checking address:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 400 })
    }

    if (existingAddresses && existingAddresses.length > 0) {
      // Update usage count instead of inserting duplicate
      const { data: updated, error: updateError } = await supabaseServer
        .from("customer_addresses")
        .update({
          usage_count: supabaseServer.sql`usage_count + 1`,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", existingAddresses[0].id)
        .select()
        .single()

      if (updateError) {
        console.error("[Customer Addresses API] Error updating address:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, data: updated, isNew: false })
    }

    // Insert new address
    const { data: newAddress, error: insertError } = await supabaseServer
      .from("customer_addresses")
      .insert({
        customer_id: body.customer_id,
        full_address: body.full_address.trim(),
        address_line_1: body.address_line_1 || body.full_address.trim(),
        address_type: body.address_type || "pickup",
        usage_count: 1,
        last_used_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[Customer Addresses API] Error inserting address:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: newAddress, isNew: true })
  } catch (error) {
    console.error("[Customer Addresses API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
