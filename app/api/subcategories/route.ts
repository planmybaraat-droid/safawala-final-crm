import { NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const categoryId = req.nextUrl.searchParams.get("category_id")

    let query = supabase
      .from("subcategories")
      .select("id, name, category_id, description")
      .order("name")

    if (categoryId) query = query.eq("category_id", categoryId)

    const { data, error } = await query

    if (error) {
      // Table might not exist — return empty array gracefully
      console.warn("[/api/subcategories] Query error:", error.message)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err: any) {
    console.error("[/api/subcategories] Error:", err.message)
    return NextResponse.json({ data: [] })
  }
}
