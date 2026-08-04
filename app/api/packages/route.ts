import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Get user session from cookie and validate franchise access
 */
async function getPackageUser(request: NextRequest, minRole: 'staff' | 'readonly' = 'readonly') {
  const auth = await authenticateRequest(request, { 
    minRole, 
    requirePermission: minRole === 'staff' ? 'packages' : undefined 
  })
  if (!auth.authorized) {
    throw new Error(auth.error?.error || 'Authentication required')
  }
  return {
    userId: auth.user!.id,
    franchiseId: auth.user!.franchise_id,
    role: auth.user!.role,
    isSuperAdmin: auth.user!.is_super_admin
  }
}

export async function GET(request: NextRequest) {
  try {
    const { franchiseId, isSuperAdmin, userId } = await getPackageUser(request, 'readonly')
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category_id = searchParams.get("category_id")
    const include_variants = searchParams.get("include_variants") === "true"

    const supabase = createClient()

    let query = supabase
      .from("package_sets")
      .select(`
        *,
        packages_categories (
          id,
          name
        )
        ${include_variants ? `, package_variants (*)` : ''}
      `)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    // 🔒 FRANCHISE ISOLATION: Super admin sees all, others see only their franchise
    if (!isSuperAdmin && franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    if (category_id) {
      query = query.eq("category_id", category_id)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching packages:", error)
      return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })

  } catch (error) {
    console.error("Package API error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { franchiseId, isSuperAdmin, userId } = await getPackageUser(request, 'staff')
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      base_price,
      package_type,
      category_id,
      display_order = 1,
      variants = [],
      security_deposit,
      extra_safa_price,
    } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Package name is required' }, { status: 400 })
    }

    // 🔒 FRANCHISE ISOLATION: Auto-assign franchise_id from session (super admin can override)
    const packageFranchiseId = isSuperAdmin && body.franchise_id 
      ? body.franchise_id 
      : franchiseId

    const supabase = createClient()

    // Create the package
    const { data: packageData, error: packageError } = await supabase
      .from("package_sets")
      .insert({
        name: name.trim(),
        base_price: Number(base_price) || 0,
        package_type,
        category_id,
        franchise_id: packageFranchiseId,
        display_order,
        created_by: userId,
        security_deposit: Number(security_deposit) || 0,
        extra_safa_price: Number(extra_safa_price) || 0,
        is_active: true
      })
      .select()
      .single()

    if (packageError) {
      console.error("Error creating package:", packageError)
      return NextResponse.json({ error: "Failed to create package" }, { status: 500 })
    }

    // Create variants if provided
    if (variants.length > 0) {
      const variantInserts = variants.map((variant: any) => ({
        ...variant,
        package_id: packageData.id,
        is_active: true
      }))

      const { error: variantError } = await supabase
        .from("package_variants")
        .insert(variantInserts)

      if (variantError) {
        console.error("Error creating variants:", variantError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ success: true, data: packageData })

  } catch (error) {
    console.error("Package creation error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}