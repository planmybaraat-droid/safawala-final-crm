import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function authenticateCategoryWrite(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) return auth
  const user = auth.user!
  const canManage = user.is_super_admin || user.permissions.packages || user.department === "warehouse"
  if (!canManage) {
    return { authorized: false as const, error: { error: "Forbidden", message: "Package management permission is required" }, statusCode: 403 }
  }
  return auth
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'readonly' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from("packages_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching package categories:", error)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })

  } catch (error) {
    console.error("Package categories API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateCategoryWrite(request)
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const body = await request.json()
    const { name, display_order = 1 } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const supabase = createClient()
    const franchiseId = auth.user!.franchise_id

    const { data, error } = await supabase
      .from("packages_categories")
      .insert({
        name: name.trim(),
        display_order,
        franchise_id: franchiseId,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating category:", error)
      return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error("Category creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateCategoryWrite(request)
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    const { id, name } = await request.json()
    if (!id || !name?.trim()) return NextResponse.json({ error: "Category ID and name are required" }, { status: 400 })

    const supabase = createClient()
    const { data: existing } = await supabase.from("packages_categories").select("id, franchise_id").eq("id", id).maybeSingle()
    if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 })
    if (!auth.user!.is_super_admin && existing.franchise_id && existing.franchise_id !== auth.user!.franchise_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { data, error } = await supabase.from("packages_categories").update({ name: name.trim(), updated_at: new Date().toISOString() }).eq("id", id).select().single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateCategoryWrite(request)
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Category ID is required" }, { status: 400 })

    const supabase = createClient()
    const { data: existing } = await supabase.from("packages_categories").select("id, franchise_id").eq("id", id).maybeSingle()
    if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 })
    if (!auth.user!.is_super_admin && existing.franchise_id && existing.franchise_id !== auth.user!.franchise_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { error } = await supabase.from("packages_categories").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete category" }, { status: 500 })
  }
}
