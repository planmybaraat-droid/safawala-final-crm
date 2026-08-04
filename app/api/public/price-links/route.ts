import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const ADMIN_PASSWORD = process.env.PACKAGES_ADMIN_PASSWORD || null

// GET: Fetch a price link by key
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")
  if (!key) return NextResponse.json({ error: "Key required" }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from("package_price_links")
    .select("*")
    .eq("link_key", key)
    .eq("is_active", true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Price link not found or expired" }, { status: 404 })
  }

  // Increment view count
  await supabase
    .from("package_price_links")
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq("id", data.id)

  return NextResponse.json({ success: true, data })
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 25) || "quote"
}

// POST: Create a new price link (admin only)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { password, custom_prices, label } = body

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid admin password" }, { status: 401 })
  }

  if (!custom_prices || typeof custom_prices !== "object") {
    return NextResponse.json({ error: "Custom prices required" }, { status: 400 })
  }

  const supabase = createClient()
  const baseSlug = slugify(label || "quote")

  // Deduplicate slug: if "sharmaji" exists try "sharmaji2", "sharmaji3"…
  let slug = baseSlug
  let attempt = 1
  while (true) {
    const { data: existing } = await supabase
      .from("package_price_links")
      .select("id")
      .eq("link_key", slug)
      .maybeSingle()
    if (!existing) break
    attempt++
    slug = `${baseSlug}${attempt}`
  }

  const { data, error } = await supabase
    .from("package_price_links")
    .insert({ custom_prices, label: label || "Custom Quote", link_key: slug, is_active: true })
    .select()
    .single()

  if (error) {
    console.error("[price-links] Insert error:", error)
    return NextResponse.json({ error: "Failed to create price link" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data, link_key: slug, slug })
}
