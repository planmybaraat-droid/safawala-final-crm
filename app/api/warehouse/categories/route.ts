import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { requireRbacPermission } from "@/lib/rbac"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Top-level product categories for the "Add Item" form's dropdown. Queried
// server-side with the service-role client — the warehouse portal
// authenticates via a custom cookie, not necessarily an active Supabase Auth
// browser session, so a client-side supabase query here would silently
// return zero rows instead of erroring (same failure mode already fixed for
// staff ledgers in app/api/staff-ledgers/route.ts).
export async function GET(request: NextRequest) {
  const permission = await requireRbacPermission(request, "warehouse.view")
  if ("response" in permission) return permission.response

  const { data, error } = await supabaseServer
    .from("product_categories")
    .select("id, name")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("name")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [] })
}
