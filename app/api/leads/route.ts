import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

// POST - Public/CRM: Submit/create a lead enquiry
export async function POST(request: NextRequest) {
  try {
    // Try to authenticate the user to see if this is a manual CRM submission
    const auth = await authenticateRequest(request, { minRole: "staff" }).catch(() => ({ authorized: false, user: null }))
    const authUser = auth.authorized ? auth.user : null
    const isCRM = Boolean(authUser)

    const body = await request.json()
    const { 
      name, 
      phone, 
      email, 
      event_date, 
      location, 
      message, 
      package_interest, 
      source, 
      status, 
      notes, 
      assigned_to, 
      franchise_id 
    } = body

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Name and WhatsApp number are required" }, { status: 400 })
    }

    if (isCRM && !event_date) {
      return NextResponse.json({ error: "Event date is required" }, { status: 400 })
    }

    const supabase = createClient()
    const insertData: any = {
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      event_date: event_date || null,
      location: location?.trim() || null,
      message: message?.trim() || null,
      package_interest: package_interest?.trim() || null,
      notes: notes?.trim() || null,
    }

    if (isCRM && authUser) {
      insertData.source = source || "manual"
      insertData.status = status || "new"
      insertData.assigned_to = assigned_to || null
      insertData.franchise_id = authUser.is_super_admin && franchise_id
        ? franchise_id
        : authUser.franchise_id || null
    } else {
      insertData.source = source || "website"
      insertData.status = "new"
      insertData.franchise_id = franchise_id || null
    }

    const { data, error } = await supabase
      .from("leads")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error("[Leads] Insert error:", error)
      return NextResponse.json({ error: "Failed to save enquiry", details: error.message }, { status: 500 })
    }

    if (data?.id) {
      const { onLeadCreated } = await import("@/lib/services/whatsapp-triggers")
      onLeadCreated({ leadId: data.id, franchiseId: data.franchise_id }).catch(err => {
        console.error("[Leads POST] WhatsApp trigger failed:", err)
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[Leads] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET - Authenticated: Fetch all leads for CRM
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "readonly" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    if (!auth.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const source = searchParams.get("source")
    const franchise_id = searchParams.get("franchise_id")

    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })

    // 🔒 FRANCHISE ISOLATION: Non-super_admins only see leads from their own franchise or unassigned leads
    if (!auth.user.is_super_admin && auth.user.franchise_id) {
      query = query.or(`franchise_id.eq.${auth.user.franchise_id},franchise_id.is.null`)
    } else if (franchise_id && franchise_id !== "all") {
      if (franchise_id === "unassigned") {
        query = query.is("franchise_id", null)
      } else {
        query = query.eq("franchise_id", franchise_id)
      }
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (source && source !== "all") {
      query = query.eq("source", source)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,location.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("[Leads] Fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err) {
    console.error("[Leads] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Authenticated: Update lead status/notes/fields
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "staff" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }
    if (!auth.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      id, 
      status, 
      notes, 
      assigned_to, 
      source, 
      email, 
      event_date, 
      location, 
      message, 
      franchise_id 
    } = body

    if (!id) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 })
    }

    const supabase = createClient()
    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (source !== undefined) updateData.source = source
    if (email !== undefined) updateData.email = email
    if (event_date !== undefined) updateData.event_date = event_date
    if (location !== undefined) updateData.location = location
    if (message !== undefined) updateData.message = message
    if (franchise_id !== undefined) updateData.franchise_id = franchise_id

    const { data: existingLead, error: leadFetchError } = await supabase
      .from("leads")
      .select("id, franchise_id")
      .eq("id", id)
      .single()

    if (leadFetchError || !existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    if (!auth.user.is_super_admin && auth.user.franchise_id && existingLead.franchise_id !== auth.user.franchise_id) {
      return NextResponse.json({ error: "Access denied to this lead" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", id)
      .eq("franchise_id", existingLead.franchise_id)
      .select()
      .single()

    if (error) {
      console.error("[Leads] Patch error:", error)
      return NextResponse.json({ error: "Failed to update lead", details: error.message }, { status: 500 })
    }

    // Auto-create a customer record if lead is updated to "converted"
    let customer: any = null
    if (data && data.status === "converted") {
      try {
        const cleanPhone = data.phone?.trim()
        
        // Check if customer already exists for this lead or phone
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("*")
          .or(`lead_id.eq.${data.id},phone.eq.${cleanPhone}`)
          .maybeSingle()

        if (!existingCustomer) {
          const customerPayload = {
            name: data.name,
            phone: cleanPhone,
            whatsapp: cleanPhone,
            email: data.email || null,
            address: data.location || null,
            franchise_id: data.franchise_id || auth.user.franchise_id || null,
            lead_id: data.id,
            status: "active",
            kyc_status: "pending",
            created_by: auth.user.id
          }

          const { data: newCust, error: custError } = await supabase
            .from("customers")
            .insert(customerPayload)
            .select()
            .single()

          if (custError) {
            console.error("[Leads PATCH] Failed to auto-create customer:", custError)
          } else {
            console.log("[Leads PATCH] Auto-created customer from converted lead:", newCust.id)
            customer = newCust
          }
        } else {
          customer = existingCustomer
        }
      } catch (custErr) {
        console.error("[Leads PATCH] Error during auto-customer conversion:", custErr)
      }
    }

    return NextResponse.json({ success: true, data, customer })
  } catch (err) {
    console.error("[Leads] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
