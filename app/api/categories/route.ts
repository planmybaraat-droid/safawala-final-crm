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
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, description")
      .order("name")

    if (error) {
      // Table might not exist — return empty array gracefully
      console.warn("[/api/categories] Query error:", error.message)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err: any) {
    console.error("[/api/categories] Error:", err.message)
    return NextResponse.json({ data: [] })
  }
}
