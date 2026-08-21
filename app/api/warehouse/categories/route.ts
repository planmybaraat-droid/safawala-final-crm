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

  const includeAll = new URL(request.url).searchParams.get("all") === "true"
  let query = supabaseServer
    .from("product_categories")
    .select("id, name, parent_id")
    .eq("is_active", true)
    .order("name")
  if (!includeAll) query = query.is("parent_id", null)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [] })
}
