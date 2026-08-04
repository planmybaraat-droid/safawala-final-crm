import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "super_admin" })
  if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("financial_categories")
      .select("id, name, type")
      .order("type")
      .order("name")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load financial categories" }, { status: 500 })
  }
}
