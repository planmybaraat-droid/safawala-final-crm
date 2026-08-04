import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabaseAdmin } from "@/lib/supabase-server-simple"
import { authenticateRequest, AuthMiddleware } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "staff" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const user = auth.user!

    if (!user.permissions.inventory) {
      return NextResponse.json({ error: "Inventory access required" }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.base_price) {
      return NextResponse.json({ error: "Name and base price are required" }, { status: 400 })
    }

    // 🔒 FRANCHISE ISOLATION: Auto-assign franchise_id from session (super admin can override)
    const serviceFranchiseId = user.is_super_admin && body.franchise_id
      ? body.franchise_id
      : user.franchise_id

    if (!serviceFranchiseId) {
      return NextResponse.json({ error: "Franchise context is required" }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(user, serviceFranchiseId)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    // Create service using admin client (bypasses RLS for creation)
    const { data, error } = await supabaseAdmin
      .from("services")
      .insert({
        name: body.name,
        description: body.description || "",
        base_price: Number.parseFloat(body.base_price) || 0,
        service_category: body.service_category || "other",
        vendor_id: body.vendor_id || null,
        franchise_id: serviceFranchiseId,
        is_active: true,
        duration_minutes: body.duration_minutes || 60,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating service:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
