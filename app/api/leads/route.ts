import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

const VALID_STATUSES = new Set(["new", "contacted", "interested", "converted", "lost"])

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

    if (isCRM && authUser && !authUser.is_super_admin && !authUser.franchise_id) {
      return NextResponse.json({ error: "User is not assigned to a franchise" }, { status: 403 })
    }

    if (isCRM && status === "converted") {
      return NextResponse.json({ error: "Create the lead first, then convert it to a customer" }, { status: 400 })
    }

    if (isCRM && status && !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid lead status" }, { status: 400 })
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
      // Public callers must not be able to choose an arbitrary tenant.
      insertData.franchise_id = null
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
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 200, 1), 500)
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0)

    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })

    // 🔒 FRANCHISE ISOLATION: Non-super_admins only see leads from their own franchise or unassigned leads
    if (!auth.user.is_super_admin) {
      if (!auth.user.franchise_id) {
        return NextResponse.json({ error: "User is not assigned to a franchise" }, { status: 403 })
      }
      query = query.eq("franchise_id", auth.user.franchise_id)
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
      const safeSearch = search.replace(/[,%()]/g, " ").trim()
      if (safeSearch) {
        query = query.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,location.ilike.%${safeSearch}%`)
      }
    }

    const { data, error } = await query.range(offset, offset + limit - 1)

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
      name,
      phone,
      status, 
      notes, 
      assigned_to, 
      source, 
      email, 
      event_date, 
      location, 
      message,
      package_interest,
      franchise_id 
    } = body

    if (!id) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 })
    }

    if (status !== undefined && !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid lead status" }, { status: 400 })
    }

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: "Lead name is required" }, { status: 400 })
    }

    if (phone !== undefined && !phone.trim()) {
      return NextResponse.json({ error: "Lead phone is required" }, { status: 400 })
    }

    if (franchise_id !== undefined && !auth.user.is_super_admin) {
      return NextResponse.json({ error: "Only a super admin can reassign a lead's franchise" }, { status: 403 })
    }

    const supabase = createClient()
    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone.trim()
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (source !== undefined) updateData.source = source
    if (email !== undefined) updateData.email = email
    if (event_date !== undefined) updateData.event_date = event_date
    if (location !== undefined) updateData.location = location
    if (message !== undefined) updateData.message = message
    if (package_interest !== undefined) updateData.package_interest = package_interest
    if (franchise_id !== undefined) updateData.franchise_id = franchise_id

    const { data: existingLead, error: leadFetchError } = await supabase
      .from("leads")
      .select("id, franchise_id, status")
      .eq("id", id)
      .single()

    if (leadFetchError || !existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    if (!auth.user.is_super_admin) {
      if (!auth.user.franchise_id) {
        return NextResponse.json({ error: "User is not assigned to a franchise" }, { status: 403 })
      }
      if (existingLead.franchise_id !== auth.user.franchise_id) {
        return NextResponse.json({ error: "Access denied to this lead" }, { status: 403 })
      }
    }

    if (assigned_to) {
      const targetFranchiseId = franchise_id !== undefined ? franchise_id : existingLead.franchise_id
      const { data: assignee, error: assigneeError } = await supabase
        .from("users")
        .select("id, role, franchise_id, is_active")
        .eq("id", assigned_to)
        .single()

      if (assigneeError || !assignee?.is_active) {
        return NextResponse.json({ error: "Assigned staff member is invalid or inactive" }, { status: 400 })
      }
      if (assignee.role !== "super_admin" && assignee.franchise_id !== targetFranchiseId) {
        return NextResponse.json({ error: "Assigned staff member must belong to the lead franchise" }, { status: 400 })
      }
    }

    let updateQuery = supabase
      .from("leads")
      .update(updateData)
      .eq("id", id)

    updateQuery = existingLead.franchise_id
      ? updateQuery.eq("franchise_id", existingLead.franchise_id)
      : updateQuery.is("franchise_id", null)

    const { data, error } = await updateQuery
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
        const { data: existingCustomers, error: customerLookupError } = await supabase
          .from("customers")
          .select("*")
          .or(`lead_id.eq.${data.id},phone.eq.${cleanPhone}`)
          .limit(1)

        if (customerLookupError) throw customerLookupError
        const existingCustomer = existingCustomers?.[0] || null

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
            throw custError
          } else {
            console.log("[Leads PATCH] Auto-created customer from converted lead:", newCust.id)
            customer = newCust
          }
        } else {
          customer = existingCustomer
        }
      } catch (custErr) {
        console.error("[Leads PATCH] Error during auto-customer conversion:", custErr)
        // Keep lead and customer state consistent when customer creation fails.
        let rollbackQuery = supabase
          .from("leads")
          .update({ status: existingLead.status, updated_at: new Date().toISOString() })
          .eq("id", id)
        rollbackQuery = existingLead.franchise_id
          ? rollbackQuery.eq("franchise_id", existingLead.franchise_id)
          : rollbackQuery.is("franchise_id", null)
        await rollbackQuery
        return NextResponse.json({ error: "Lead conversion failed; no customer was created" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, data, customer })
  } catch (err) {
    console.error("[Leads] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
