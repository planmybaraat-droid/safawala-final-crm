import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Auth note: We use the unified authenticateRequest to rely on Supabase Auth cookies

/**
 * GET /api/vendors - List vendors with franchise isolation
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'vendors' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const isSuperAdmin = auth.user!.role === 'super_admin'
    const franchiseId = auth.user!.franchise_id
    const supabase = createClient()

    console.log(`[Vendors API] Fetching vendors for franchise: ${franchiseId}, isSuperAdmin: ${isSuperAdmin}`)

    const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") // 'active', 'inactive', or 'all'

    // Try to fetch with all filters first
    try {
      let query = supabase
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: false })

      // Franchise isolation: super_admin sees all, others see only their franchise
      if (!isSuperAdmin && franchiseId) {
        query = query.eq("franchise_id", franchiseId)
      }

      // Filter by is_active only when explicitly requested
      if (status === "active") {
        query = query.eq("is_active", true)
      } else if (status === "inactive") {
        query = query.eq("is_active", false)
      } else {
        // status === 'all' or missing -> do NOT filter by is_active
      }
      
      const { data, error } = await query

      if (error) {
        // Check if error is due to missing column
        const errorMsg = error.message?.toLowerCase() || ""
        if (errorMsg.includes("column") && (errorMsg.includes("franchise_id") || errorMsg.includes("is_active"))) {
          console.log("[Vendors API] Column missing, falling back to basic query")
          
          // Fallback: fetch all vendors without filters
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("vendors")
            .select("*")
            .order("created_at", { ascending: false })
          
          if (fallbackError) throw fallbackError
          
          return NextResponse.json({ 
            vendors: fallbackData || [],
            warning: "⚠️ Database schema incomplete. Please run migration: ADD_VENDORS_FRANCHISE_ISOLATION.sql"
          })
        }
        throw error
      }

      return NextResponse.json({ vendors: data || [] })
    } catch (error: any) {
      // Ultimate fallback: fetch all vendors without any filters
      const errorMsg = error.message?.toLowerCase() || ""
      if (errorMsg.includes("column") || errorMsg.includes("does not exist")) {
        console.log("[Vendors API] Fallback: fetching all vendors without filters")
        
        const { data, error: fallbackError } = await supabase
          .from("vendors")
          .select("*")
          .order("created_at", { ascending: false })
        
        if (fallbackError) throw fallbackError
        
        return NextResponse.json({ 
          vendors: data || [],
          warning: "⚠️ Database schema incomplete. Run migration: ADD_VENDORS_FRANCHISE_ISOLATION.sql"
        })
      }
      throw error
    }
  } catch (error: any) {
    console.error("[Vendors API] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch vendors" },
      { status: error.statusCode || (error.message === "Authentication required" ? 401 : 500) }
    )
  }
}

/**
 * POST /api/vendors - Create a new vendor with franchise isolation
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'staff', requirePermission: 'vendors' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    const franchiseId = auth.user!.franchise_id
    const userId = auth.user!.id

    const body = await request.json()
    const supabase = createClient()

  console.log(`[Vendors API] Creating vendor for franchise: ${franchiseId}, user: ${userId}`)

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Vendor name is required" },
        { status: 400 }
      )
    }

    // Check for duplicate vendor name (skip franchise check if column doesn't exist)
    try {
      const { data: existing } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("name", body.name)
        .eq("franchise_id", franchiseId)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: `Vendor "${body.name}" already exists in your franchise` },
          { status: 409 }
        )
      }
    } catch (dupError: any) {
      // If franchise_id column doesn't exist, skip duplicate check
      const errorMsg = dupError.message?.toLowerCase() || ""
      if (errorMsg.includes("column") && errorMsg.includes("franchise_id")) {
        console.log("[Vendors API] franchise_id column missing, skipping duplicate check")
      } else {
        throw dupError
      }
    }

    // Prepare vendor data - start with core columns that definitely exist
    const vendorData: any = {
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
    }

    // Try to add optional fields (they may not exist in schema yet)
    if (body.gst_number !== undefined) {
      vendorData.gst_number = body.gst_number
    }

    // Try to insert with minimal data first, then retry with more fields
    try {
      // Try with all fields including new columns
      const fullData = {
        ...vendorData,
        franchise_id: franchiseId,
        contact_person: body.contact_person || null,
        pricing_per_item: body.pricing_per_item || 0,
        notes: body.notes || null,
        is_active: true,
      }
      
      const { data, error } = await supabase
        .from("vendors")
        .insert([fullData])
        .select()
        .single()

      if (error) {
        // If error is about missing column, retry with minimal data
        const errorMsg = error.message?.toLowerCase() || ""
        if (errorMsg.includes("column") || errorMsg.includes("does not exist")) {
          console.log("[Vendors API] Some columns missing, retrying with core fields only")
          
          // Retry with only the absolutely essential columns
          const minimalData: any = {
            name: body.name,
            phone: body.phone || null,
            email: body.email || null,
            address: body.address || null,
          }

          // Try adding gst_number if it exists in schema
          if (body.gst_number) {
            minimalData.gst_number = body.gst_number
          }

          const { data: retryData, error: retryError } = await supabase
            .from("vendors")
            .insert([minimalData])
            .select()
            .single()

          if (retryError) throw retryError

          return NextResponse.json({
            vendor: retryData,
            warning: "⚠️ Vendor created with limited data. Run migration: ADD_VENDORS_FRANCHISE_ISOLATION.sql"
          }, { status: 201 })
        }
        throw error
      }

      return NextResponse.json({ vendor: data }, { status: 201 })
    } catch (error: any) {
      console.error("[Vendors API] POST error:", error)
      
      // Final fallback: absolute minimum data
      const errorMsg = error.message?.toLowerCase() || ""
      if (errorMsg.includes("column") || errorMsg.includes("does not exist")) {
        console.log("[Vendors API] Final fallback: inserting with absolute minimum fields")
        
        const absoluteMinimal: any = {
          name: body.name,
          phone: body.phone || null,
          email: body.email || null,
          address: body.address || null,
        }

        const { data: fallbackData, error: fallbackError } = await supabase
          .from("vendors")
          .insert([absoluteMinimal])
          .select()
          .single()

        if (fallbackError) throw fallbackError

        return NextResponse.json({
          vendor: fallbackData,
          warning: "⚠️ Vendor created with minimal data. Please run migration: ADD_VENDORS_FRANCHISE_ISOLATION.sql"
        }, { status: 201 })
      }

      throw error
    }
  } catch (error: any) {
    console.error("[Vendors API] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create vendor" },
      { status: error.statusCode || (error.message === "Authentication required" ? 401 : 500) }
    )
  }
}
