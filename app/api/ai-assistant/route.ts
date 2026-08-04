import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"
export const maxDuration = 30

async function getCRMContext(supabase: any, franchiseId: string, isSuperAdmin: boolean) {
  const today = new Date().toISOString().split("T")[0]

  const baseFilter = (q: any) =>
    !isSuperAdmin && franchiseId ? q.eq("franchise_id", franchiseId) : q

  // Run all queries in parallel
  const [
    bookingsToday,
    pendingPayments,
    allProducts,
    todayDeliveries,
    recentLeads,
    recentBookings,
  ] = await Promise.allSettled([
    baseFilter(
      supabase
        .from("bookings")
        .select("id, booking_number, event_date, total_amount, status, customer:customers(name, phone)")
        .eq("event_date", today)
        .limit(10)
    ),
    baseFilter(
      supabase
        .from("bookings")
        .select("id, booking_number, total_amount, paid_amount, amount_paid, customer:customers(name, phone)")
        .in("payment_status", ["pending", "partial"])
        .order("created_at", { ascending: false })
        .limit(10)
    ),
    baseFilter(
      supabase
        .from("products")
        .select("id, name, stock_available, reorder_level, category")
        .eq("is_active", true)
    ),
    baseFilter(
      supabase
        .from("deliveries")
        .select("id, delivery_date, delivery_type, status, customer:customers(name, phone)")
        .eq("delivery_date", today)
        .limit(10)
    ),
    baseFilter(
      supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)
    ),
    baseFilter(
      supabase
        .from("bookings")
        .select("id, booking_number, event_date, total_amount, status, customer:customers(name, phone)")
        .order("created_at", { ascending: false })
        .limit(5)
    ),
  ])

  const get = (r: PromiseSettledResult<any>) =>
    r.status === "fulfilled" ? r.value.data || [] : []

  const rawProducts = get(allProducts)
  const lowStock = rawProducts
    .filter((p: any) => p.stock_available <= (p.reorder_level || 0))
    .slice(0, 10)

  return {
    bookingsToday: get(bookingsToday),
    pendingPayments: get(pendingPayments),
    lowStock,
    todayDeliveries: get(todayDeliveries),
    recentLeads: get(recentLeads),
    recentBookings: get(recentBookings),
    today,
  }
}

async function executeTool(
  name: string,
  args: any,
  supabase: any,
  auth: any,
  isSuperAdmin: boolean,
  franchiseId: string,
  userId: string
): Promise<{ success: boolean; data?: any; error?: string; card?: any }> {
  try {
    switch (name) {
      case "create_coupon": {
        // Enforce permissions: Only franchise_admin or super_admin
        if (!isSuperAdmin && auth.user.role !== "franchise_admin") {
          return { success: false, error: "Unauthorized: Only franchise admins or super admins can create coupons." }
        }

        const { code, discount_type, discount_value, description } = args
        
        // Map discount type to what offers table expects ('percent' | 'fixed')
        let mappedType = "percent"
        if (discount_type === "fixed_amount" || discount_type === "fixed") {
          mappedType = "fixed"
        }

        // Sanitize and insert into NEW offers table
        const sanitized = {
          code: code.trim().toUpperCase(),
          name: description || `${code.trim().toUpperCase()} Offer`,
          discount_type: mappedType,
          discount_value: Number(discount_value) || 0,
          franchise_id: franchiseId || null,
          is_active: true,
        }

        const { data, error } = await supabase
          .from("offers")
          .insert([sanitized])
          .select()
          .single()

        if (error) {
          if (error.code === "23505") return { success: false, error: "Offer code already exists." }
          return { success: false, error: error.message }
        }

        // Return coupon card formatted data
        return {
          success: true,
          data,
          card: { 
            type: "coupon", 
            data: {
              code: data.code,
              discount_type: data.discount_type === "percent" ? "percentage" : "fixed_amount",
              discount_value: data.discount_value,
              description: data.name,
              is_active: data.is_active
            } 
          }
        }
      }

      case "add_staff": {
        // Enforce permissions: Only super_admin or franchise_admin
        if (!isSuperAdmin && auth.user.role !== "franchise_admin") {
          return { success: false, error: "Unauthorized: Only franchise admins or super admins can add staff." }
        }

        const { name: staffName, email, password, role = "staff" } = args

        if (!staffName || !email || !password) {
          return { success: false, error: "Missing required fields (name, email, password)." }
        }

        if (password.length < 8) {
          return { success: false, error: "Password must be at least 8 characters long." }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10)
        const password_hash = await bcrypt.hash(password, salt)

        // Check duplicate email
        const { data: existingUser } = await supabase
          .from("users")
          .select("email")
          .eq("email", email)
          .single()

        if (existingUser) {
          return { success: false, error: "Email already exists." }
        }

        // Default permissions helper
        const allPerms = {
          dashboard: true, bookings: true, customers: true, inventory: true,
          sales: true, laundry: true, purchases: true, expenses: true,
          deliveries: true, reports: true, financials: true, invoices: true,
          franchises: true, staff: true, settings: true
        }
        const staffPerms = {
          dashboard: true, bookings: true, customers: true, inventory: true,
          sales: true, laundry: true, purchases: false, expenses: false,
          deliveries: true, reports: false, financials: false, invoices: true,
          franchises: false, staff: false, settings: false
        }
        const readonlyPerms = {
          dashboard: true, bookings: false, customers: true, inventory: false,
          sales: false, laundry: false, purchases: false, expenses: false,
          deliveries: false, reports: true, financials: false, invoices: false,
          franchises: false, staff: false, settings: false
        }
        const permissions = role === "franchise_admin" ? allPerms : role === "readonly" ? readonlyPerms : staffPerms

        // Insert
        const { data, error } = await supabase
          .from("users")
          .insert([{
            name: staffName,
            email,
            password_hash,
            role,
            franchise_id: franchiseId || null,
            permissions,
            is_active: true
          }])
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        // Sync to Supabase Auth in background (best effort)
        try {
          const { createClient: createServiceClient } = await import("@supabase/supabase-js")
          const supabaseAdmin = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              app_user_id: data.id,
              role,
              franchise_id: franchiseId || null
            }
          })
        } catch (authErr) {
          console.warn("[AI Assistant] Could not sync user to Supabase Auth:", authErr)
        }

        return {
          success: true,
          data,
          card: { type: "staff", data: { id: data.id, name: data.name, email: data.email, role: data.role, is_active: data.is_active } }
        }
      }

      case "create_customer": {
        // Enforce permissions: must have customers permission
        if (!isSuperAdmin && !auth.user.permissions.customers) {
          return { success: false, error: "Unauthorized: You do not have permission to manage customers." }
        }

        const { name: custName, phone, whatsapp, email, address, city, state, pincode, notes } = args

        const { data, error } = await supabase
          .from("customers")
          .insert({
            name: custName.trim(),
            phone: phone.trim(),
            whatsapp: whatsapp || null,
            email: email || null,
            address: address || null,
            city: city || null,
            state: state || null,
            pincode: pincode || null,
            notes: notes || null,
            franchise_id: franchiseId || null,
            created_by: userId,
          })
          .select()
          .single()

        if (error) return { success: false, error: error.message }

        return {
          success: true,
          data,
          card: { type: "customer", data }
        }
      }

      case "create_lead": {
        // Anyone can create lead
        const { name: leadName, phone, event_date, location, message, package_interest, source = "ai-assistant" } = args

        const { data, error } = await supabase
          .from("leads")
          .insert({
            name: leadName.trim(),
            phone: phone.trim(),
            event_date: event_date || null,
            location: location || null,
            message: message || null,
            package_interest: package_interest || null,
            source,
            status: "new",
            franchise_id: franchiseId || null,
          })
          .select()
          .single()

        if (error) return { success: false, error: error.message }

        return {
          success: true,
          data,
          card: { type: "lead", data }
        }
      }

      case "add_expense": {
        // Enforce permissions: must have expenses permission
        if (!isSuperAdmin && !auth.user.permissions.expenses) {
          return { success: false, error: "Unauthorized: You do not have permission to record expenses." }
        }

        const { amount, expense_date, subcategory, vendor_name, receipt_number, description, booking_number } = args

        const expenseNumber = `EXP${Date.now().toString(36).toUpperCase()}`

        const { data, error } = await supabase
          .from("expenses")
          .insert({
            expense_number: expenseNumber,
            amount: Number(amount),
            expense_date,
            subcategory,
            vendor_name: vendor_name || null,
            receipt_number: receipt_number || null,
            booking_number: booking_number || null,
            description: description || null,
            franchise_id: franchiseId || null,
            created_by: userId,
          })
          .select()
          .single()

        if (error) return { success: false, error: error.message }

        return {
          success: true,
          data,
          card: { type: "expense", data }
        }
      }

      case "create_booking": {
        if (!isSuperAdmin && !auth.user.permissions.bookings) {
          return { success: false, error: "Unauthorized: You do not have permission to manage bookings." }
        }

        const { customer_name_or_phone, event_date, venue_name, type = "rental", event_type, total_amount = 0, booking_items = [] } = args

        // 1. Find or create customer record
        let customerId = ""
        let customerData: any = null
        
        let custQuery = supabase.from("customers").select("*")
        if (!isSuperAdmin) custQuery = custQuery.eq("franchise_id", franchiseId)
        
        // Search by phone or name
        const isPhone = /^\d+$/.test(customer_name_or_phone.trim())
        if (isPhone) {
          custQuery = custQuery.eq("phone", customer_name_or_phone.trim())
        } else {
          custQuery = custQuery.ilike("name", `%${customer_name_or_phone.trim()}%`)
        }
        
        const { data: matchedCusts, error: custFindErr } = await custQuery.limit(1)

        if (matchedCusts && matchedCusts.length > 0) {
          customerData = matchedCusts[0]
          customerId = customerData.id
        } else {
          // Auto create customer with standard placeholder values
          const cleanPhone = isPhone ? customer_name_or_phone.trim() : "0000000000"
          const cleanName = isPhone ? `Customer ${cleanPhone.slice(-4)}` : customer_name_or_phone.trim()
          
          const { data: newCust, error: custErr } = await supabase
            .from("customers")
            .insert({
              name: cleanName,
              phone: cleanPhone,
              franchise_id: franchiseId,
              created_by: userId
            })
            .select()
            .single()
          
          if (custErr) return { success: false, error: `Customer not found, and failed to auto-create: ${custErr.message}` }
          customerData = newCust
          customerId = newCust.id
        }

        // 2. Map items with product names to product_ids
        const mappedItems: any[] = []
        for (const item of booking_items) {
          if (item.product_id) {
            mappedItems.push({ product_id: item.product_id, quantity: Number(item.quantity) })
          } else if (item.product_name) {
            let prodQuery = supabase.from("products").select("id").ilike("name", `%${item.product_name}%`).eq("is_active", true)
            if (!isSuperAdmin) prodQuery = prodQuery.eq("franchise_id", franchiseId)
            const { data: prods } = await prodQuery.limit(1)
            
            if (prods && prods.length > 0) {
              mappedItems.push({ product_id: prods[0].id, quantity: Number(item.quantity) })
            } else {
              return { success: false, error: `Product "${item.product_name}" not found in inventory.` }
            }
          }
        }

        // 3. Call database RPC
        const { data: booking, error: bookingErr } = await supabase.rpc(
          "create_booking_with_conflict_check",
          {
            p_customer_id: customerId,
            p_event_date: event_date,
            p_venue_name: venue_name.trim(),
            p_franchise_id: franchiseId || null,
            p_created_by: userId,
            p_booking_data: {
              type: type,
              event_type: event_type || "wedding",
              payment_type: "advance",
              total_amount: Number(total_amount),
              subtotal: Number(total_amount),
              amount_paid: 0,
              pending_amount: Number(total_amount),
            },
            p_booking_items: mappedItems,
          }
        )

        if (bookingErr) {
          return { success: false, error: bookingErr.message }
        }

        return {
          success: true,
          data: booking,
          card: {
            type: "booking",
            data: {
              id: booking.id,
              booking_number: booking.booking_number,
              customer: customerData,
              status: booking.status || "confirmed",
              total_amount: Number(total_amount),
              paid_amount: 0,
              event_date: event_date
            }
          }
        }
      }

      case "update_product_pricing": {
        if (!isSuperAdmin && !auth.user.permissions.inventory) {
          return { success: false, error: "Unauthorized: You do not have permission to manage inventory." }
        }

        const { product_name, rental_price, sale_price, stock_available, stock_total } = args

        // Search for product by name first
        let query = supabase.from("products").select("*").ilike("name", `%${product_name}%`)
        if (!isSuperAdmin) query = query.eq("franchise_id", franchiseId)
        const { data: matchedProds, error: findErr } = await query.limit(1)

        if (findErr || !matchedProds || matchedProds.length === 0) {
          return { success: false, error: `Product "${product_name}" not found.` }
        }

        const product = matchedProds[0]

        // Update fields
        const updates: any = { updated_at: new Date().toISOString() }
        if (rental_price !== undefined) updates.rental_price = Number(rental_price)
        if (sale_price !== undefined) {
          updates.sale_price = Number(sale_price)
          updates.price = Number(sale_price) // update legacy price too
        }
        if (stock_available !== undefined) updates.stock_available = Number(stock_available)
        if (stock_total !== undefined) updates.stock_total = Number(stock_total)

        let productUpdate = supabase.from("products").update(updates).eq("id", product.id)
        if (!isSuperAdmin && franchiseId) {
          productUpdate = productUpdate.eq("franchise_id", franchiseId)
        }

        const { data: updatedProd, error: updateErr } = await productUpdate.select().single()

        if (updateErr) return { success: false, error: updateErr.message }

        return {
          success: true,
          data: updatedProd,
          card: { type: "product", data: updatedProd }
        }
      }

      case "update_booking_status": {
        if (!isSuperAdmin && !auth.user.permissions.bookings) {
          return { success: false, error: "Unauthorized: You do not have permission to manage bookings." }
        }

        const { booking_number, status, amount_paid } = args
        const cleanBookingNumber = booking_number.trim()

        // 1. Search in bookings table
        let bookingsQuery = supabase.from("bookings").select("*").eq("booking_number", cleanBookingNumber)
        if (!isSuperAdmin) bookingsQuery = bookingsQuery.eq("franchise_id", franchiseId)
        const { data: matchedBookings, error: findBookingsErr } = await bookingsQuery.limit(1)

        let targetTable = ""
        let booking: any = null

        if (matchedBookings && matchedBookings.length > 0) {
          targetTable = "bookings"
          booking = matchedBookings[0]
        } else {
          // 2. Search in product_orders table
          let ordersQuery = supabase.from("product_orders").select("*").eq("order_number", cleanBookingNumber)
          if (!isSuperAdmin) ordersQuery = ordersQuery.eq("franchise_id", franchiseId)
          const { data: matchedOrders, error: findOrdersErr } = await ordersQuery.limit(1)

          if (matchedOrders && matchedOrders.length > 0) {
            targetTable = "product_orders"
            booking = matchedOrders[0]
          }
        }

        if (!booking) {
          return { success: false, error: `Booking "${booking_number}" not found in bookings or product orders.` }
        }

        // Update fields
        const updates: any = { updated_at: new Date().toISOString() }
        if (status !== undefined) updates.status = status
        if (amount_paid !== undefined) {
          updates.amount_paid = Number(amount_paid)
          updates.pending_amount = Number(booking.total_amount || 0) - Number(amount_paid)
        }

        let bookingUpdate = supabase.from(targetTable).update(updates).eq("id", booking.id)
        if (!isSuperAdmin && franchiseId) {
          bookingUpdate = bookingUpdate.eq("franchise_id", franchiseId)
        }

        const { data: updatedBooking, error: updateErr } = await bookingUpdate
          .select(`
            *,
            customer:customers(name, phone)
          `)
          .single()

        if (updateErr) return { success: false, error: updateErr.message }

        return {
          success: true,
          data: updatedBooking,
          card: { 
            type: "booking", 
            data: {
              id: updatedBooking.id,
              booking_number: targetTable === "bookings" ? updatedBooking.booking_number : updatedBooking.order_number,
              customer: updatedBooking.customer,
              status: updatedBooking.status,
              total_amount: updatedBooking.total_amount,
              paid_amount: updatedBooking.amount_paid,
              event_date: updatedBooking.event_date
            } 
          }
        }
      }

      case "update_lead_status": {
        const { lead_id, lead_name, status, notes } = args

        let findQuery = supabase.from("leads").select("*")
        if (lead_id) {
          findQuery = findQuery.eq("id", lead_id)
        } else if (lead_name) {
          findQuery = findQuery.ilike("name", `%${lead_name}%`)
        } else {
          return { success: false, error: "Either lead_id or lead_name is required." }
        }
        if (!isSuperAdmin) {
          findQuery = findQuery.eq("franchise_id", franchiseId)
        }

        const { data: matchedLeads, error: findErr } = await findQuery.limit(1)
        if (findErr || !matchedLeads || matchedLeads.length === 0) {
          return { success: false, error: "Lead not found." }
        }

        const lead = matchedLeads[0]

        const updates: any = { updated_at: new Date().toISOString() }
        if (status !== undefined) updates.status = status
        if (notes !== undefined) {
          updates.notes = lead.notes ? `${lead.notes}\n${notes}` : notes
        }

        let leadUpdate = supabase.from("leads").update(updates).eq("id", lead.id)
        if (!isSuperAdmin && franchiseId) {
          leadUpdate = leadUpdate.eq("franchise_id", franchiseId)
        }

        const { data: updatedLead, error: updateErr } = await leadUpdate.select().single()

        if (updateErr) return { success: false, error: updateErr.message }

        return {
          success: true,
          data: updatedLead,
          card: { type: "lead", data: updatedLead }
        }
      }

      case "update_offer_status": {
        if (!isSuperAdmin && auth.user.role !== "franchise_admin") {
          return { success: false, error: "Unauthorized: Only franchise admins or super admins can edit offers." }
        }

        const { code, is_active, discount_value } = args

        let findQuery = supabase.from("offers").select("*").eq("code", code.trim().toUpperCase())
        if (!isSuperAdmin) findQuery = findQuery.eq("franchise_id", franchiseId)
        const { data: matchedOffers, error: findErr } = await findQuery.limit(1)

        if (findErr || !matchedOffers || matchedOffers.length === 0) {
          return { success: false, error: `Offer code "${code}" not found.` }
        }

        const offer = matchedOffers[0]

        const updates: any = {}
        if (is_active !== undefined) updates.is_active = is_active
        if (discount_value !== undefined) updates.discount_value = Number(discount_value)

        const { data: updatedOffer, error: updateErr } = await supabase
          .from("offers")
          .update(updates)
          .eq("id", offer.id)
          .select()
          .single()

        if (updateErr) return { success: false, error: updateErr.message }

        return {
          success: true,
          data: updatedOffer,
          card: {
            type: "coupon",
            data: {
              code: updatedOffer.code,
              discount_type: updatedOffer.discount_type === "percent" ? "percentage" : "fixed_amount",
              discount_value: updatedOffer.discount_value,
              description: updatedOffer.name,
              is_active: updatedOffer.is_active
            }
          }
        }
      }

      case "update_staff_status": {
        if (!isSuperAdmin && auth.user.role !== "franchise_admin") {
          return { success: false, error: "Unauthorized: Only franchise admins or super admins can edit staff." }
        }

        const { email, role, is_active } = args

        let findQuery = supabase.from("users").select("*").eq("email", email.trim())
        if (!isSuperAdmin) findQuery = findQuery.eq("franchise_id", franchiseId)
        const { data: matchedUsers, error: findErr } = await findQuery.limit(1)

        if (findErr || !matchedUsers || matchedUsers.length === 0) {
          return { success: false, error: `Staff member with email "${email}" not found.` }
        }

        const staffMember = matchedUsers[0]

        // Enforce role hierarchy updates
        if (!isSuperAdmin && role === "super_admin") {
          return { success: false, error: "Unauthorized: Franchise admins cannot elevate users to super admin." }
        }

        const updates: any = { updated_at: new Date().toISOString() }
        if (role !== undefined) updates.role = role
        if (is_active !== undefined) updates.is_active = is_active

        const { data: updatedUser, error: updateErr } = await supabase
          .from("users")
          .update(updates)
          .eq("id", staffMember.id)
          .select()
          .single()

        if (updateErr) return { success: false, error: updateErr.message }

        return {
          success: true,
          data: updatedUser,
          card: {
            type: "staff",
            data: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              is_active: updatedUser.is_active
            }
          }
        }
      }

      // Query tools
      case "query_customers": {
        if (!isSuperAdmin && !auth.user.permissions.customers) {
          return { success: false, error: "Unauthorized: You do not have permission to view customers." }
        }
        const { search } = args
        let q = supabase.from("customers").select("id, name, phone, email, city")
        if (!isSuperAdmin) q = q.eq("franchise_id", franchiseId)
        if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
        const { data, error } = await q.limit(10)
        if (error) return { success: false, error: error.message }
        return { success: true, data }
      }

      case "query_bookings": {
        if (!isSuperAdmin && !auth.user.permissions.bookings) {
          return { success: false, error: "Unauthorized: You do not have permission to view bookings." }
        }
        const { search } = args

        let qBookings = supabase.from("bookings").select("id, booking_number, total_amount, event_date, status, created_at, customer:customers(name, phone)")
        if (!isSuperAdmin) qBookings = qBookings.eq("franchise_id", franchiseId)
        if (search) qBookings = qBookings.or(`booking_number.ilike.%${search}%`)

        const { data, error } = await qBookings.order("created_at", { ascending: false }).limit(10)
        if (error) {
          console.error("[AI Assistant] query_bookings error:", error)
          return { success: false, error: error.message }
        }

        return { success: true, data }
      }

      case "query_coupons": {
        if (!isSuperAdmin && auth.user.role !== "franchise_admin") {
          return { success: false, error: "Unauthorized: Only franchise admins or super admins can view coupons." }
        }
        let q = supabase.from("offers").select("*")
        if (!isSuperAdmin) q = q.eq("franchise_id", franchiseId)
        const { data, error } = await q.order("created_at", { ascending: false }).limit(15)
        if (error) return { success: false, error: error.message }
        return { success: true, data }
      }

      case "query_staff": {
        if (!isSuperAdmin && auth.user.role !== "franchise_admin" && !auth.user.permissions.staff) {
          return { success: false, error: "Unauthorized: You do not have permission to view staff." }
        }
        let q = supabase.from("users").select("id, name, email, role, is_active")
        if (!isSuperAdmin) q = q.eq("franchise_id", franchiseId)
        const { data, error } = await q.order("created_at", { ascending: false }).limit(15)
        if (error) return { success: false, error: error.message }
        return { success: true, data }
      }

      case "query_inventory": {
        if (!isSuperAdmin && !auth.user.permissions.inventory) {
          return { success: false, error: "Unauthorized: You do not have permission to view inventory." }
        }
        const { search } = args
        let q = supabase.from("products").select("id, name, stock_available, rental_price, category").eq("is_active", true)
        if (!isSuperAdmin) q = q.eq("franchise_id", franchiseId)
        if (search) q = q.ilike("name", `%${search}%`)
        const { data, error } = await q.order("name").limit(15)
        if (error) return { success: false, error: error.message }
        return { success: true, data }
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` }
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "readonly" })
    if (!auth.authorized) {
      return NextResponse.json({ error: "Please login to use Safawala AI" }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured. Please add OPENAI_API_KEY." }, { status: 500 })
    }

    const { message, history = [] } = await request.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const supabase = createClient()
    const franchiseId = auth.user!.franchise_id || ""
    const isSuperAdmin = auth.user!.is_super_admin || false
    const userId = auth.user!.id
    const userName = auth.user!.name || "there"

    // Fetch live CRM data
    const ctx = await getCRMContext(supabase, franchiseId, isSuperAdmin)

    const systemPrompt = `You are Safawala AI — the intelligent CRM assistant for Safawala, a premium Indian wedding accessories rental business. You are embedded inside the Safawala CRM dashboard.

The logged-in user is: ${userName} (${isSuperAdmin ? "Super Admin" : "Franchise Staff"})
Today's date: ${ctx.today}

## LIVE CRM DATA (as of right now):

### Today's Bookings (${ctx.bookingsToday.length}):
${ctx.bookingsToday.length > 0
  ? ctx.bookingsToday.map((b: any) => `- ${b.booking_number || b.order_number}: ${b.customer?.name} | Event: ${b.event_date} | ₹${b.total_amount} | ${b.status}`).join("\n")
  : "No bookings today"}

### Pending Payments (${ctx.pendingPayments.length}):
${ctx.pendingPayments.length > 0
  ? ctx.pendingPayments.map((b: any) => {
      const paid = b.paid_amount ?? b.amount_paid ?? 0;
      const due = (b.total_amount || 0) - paid;
      return `- ${b.booking_number || b.order_number}: ${b.customer?.name} | Total: ₹${b.total_amount} | Paid: ₹${paid} | Due: ₹${due}`;
    }).join("\n")
  : "No pending payments"}

### Low Stock Items (${ctx.lowStock.length}):
${ctx.lowStock.length > 0
  ? ctx.lowStock.map((p: any) => `- ${p.name} | Stock: ${p.stock_available} | Reorder at: ${p.reorder_level} | Category: ${p.category || "—"}`).join("\n")
  : "All items well stocked"}

### Today's Deliveries (${ctx.todayDeliveries.length}):
${ctx.todayDeliveries.length > 0
  ? ctx.todayDeliveries.map((d: any) => `- ${d.delivery_type} for ${d.customer?.name} | Status: ${d.status}`).join("\n")
  : "No deliveries today"}

### Recent Leads (${ctx.recentLeads.length}):
${ctx.recentLeads.length > 0
  ? ctx.recentLeads.map((l: any) => `- ${l.name} (${l.phone}) | Event: ${l.event_date || "TBD"} | Location: ${l.location || "—"} | Status: ${l.status} | Package: ${l.package_interest || "—"}`).join("\n")
  : "No leads yet"}

### Recent Bookings:
${ctx.recentBookings.length > 0
  ? ctx.recentBookings.map((b: any) => `- ${b.booking_number || b.order_number}: ${b.customer?.name} | ₹${b.total_amount} | ${b.status}`).join("\n")
  : "No recent bookings"}

## YOUR CAPABILITIES:
You can help with:
- Querying & listing bookings, customers, staff, coupons, and inventory stock
- Performing CRM actions directly:
  - Creating a coupon (e.g. "create a coupon FESTIVE10")
  - Adding staff (e.g. "add a staff Rajesh with email rajesh@safawala.com and password...")
  - Adding customers (e.g. "create customer Suresh with phone 9876543210")
  - Adding leads (e.g. "add a lead Rohit with phone 9999888877")
  - Adding expenses (e.g. "add expense of 500 ₹ for Tea & snacks")
  - Creating a new booking/order (e.g. "book a wedding rental for customer Suresh on 2026-06-25 at Grand Palace with 2 units of Red Safa")
  - Editing / updating product details (e.g. "change price of Red Bridal Safa to 1200 rupees")
  - Updating booking status or recorded payments (e.g. "mark booking ORD-0032 as delivered and record payment of 5000")
  - Editing leads, toggling discount offers, and editing staff roles or status

## RULES:
- Always respond in a friendly, helpful tone
- Use Indian context (₹ for currency, Indian names, Hindi words when appropriate)
- Keep responses concise but complete
- Use bullet points for lists
- You can execute database operations directly by calling the respective tools. Always let the user know what action you took and present the details.
- Always refer to the live data above when answering questions about the current state of the business
- Respond in the same language the user writes in (Hindi/English/Hinglish)`

    let messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8),
      { role: "user", content: message },
    ]

    const tools = [
      {
        type: "function",
        function: {
          name: "create_coupon",
          description: "Create a new discount coupon for the franchise CRM",
          parameters: {
            type: "object",
            properties: {
              code: { type: "string", description: "The coupon code (e.g. SAVE20, FESTIVE500), will be auto-capitalized" },
              discount_type: { type: "string", enum: ["percentage", "fixed_amount", "free_shipping"], description: "Type of discount" },
              discount_value: { type: "number", description: "Value of the discount. 0 for free_shipping." },
              description: { type: "string", description: "Optional description of the coupon" },
            },
            required: ["code", "discount_type", "discount_value"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_staff",
          description: "Add a new staff member or franchise admin to the current franchise",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Full name of the staff member" },
              email: { type: "string", description: "Email address for login" },
              password: { type: "string", description: "Password for login (must be at least 8 characters)" },
              role: { type: "string", enum: ["staff", "franchise_admin", "readonly"], description: "Access role of the new staff member. Defaults to staff." },
            },
            required: ["name", "email", "password"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_customer",
          description: "Add a new customer to the CRM database",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Full name of the customer" },
              phone: { type: "string", description: "Contact phone number (at least 10 digits)" },
              whatsapp: { type: "string", description: "Optional WhatsApp number" },
              email: { type: "string", description: "Optional email address" },
              address: { type: "string", description: "Optional street address" },
              city: { type: "string", description: "Optional city" },
              state: { type: "string", description: "Optional state" },
              pincode: { type: "string", description: "Optional pincode" },
              notes: { type: "string", description: "Optional descriptive notes about the customer" },
            },
            required: ["name", "phone"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_lead",
          description: "Add a new customer lead or enquiry to the database",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Name of the prospect" },
              phone: { type: "string", description: "Phone number of the prospect" },
              event_date: { type: "string", description: "Optional date of event (YYYY-MM-DD)" },
              location: { type: "string", description: "Optional event location/venue" },
              message: { type: "string", description: "Optional message or customer requirements description" },
              package_interest: { type: "string", description: "Optional package name they are interested in" },
              source: { type: "string", description: "Optional lead source. Default is website." },
            },
            required: ["name", "phone"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_expense",
          description: "Record a business expense in the current franchise",
          parameters: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Amount spent in ₹" },
              expense_date: { type: "string", description: "Date of the expense in YYYY-MM-DD format" },
              subcategory: { type: "string", description: "Category/subcategory of the expense (e.g., Tea & snacks, Fuel, Laundry, Stationery, Salary, Rent, Electricity, Repairs)" },
              vendor_name: { type: "string", description: "Optional name of the vendor or person paid" },
              receipt_number: { type: "string", description: "Optional receipt number" },
              description: { type: "string", description: "Optional description of what the expense was for" },
              booking_number: { type: "string", description: "Optional booking number associated with this expense, if any" },
            },
            required: ["amount", "expense_date", "subcategory"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_booking",
          description: "Create a new product booking/order (rental or sale) in the CRM",
          parameters: {
            type: "object",
            properties: {
              customer_name_or_phone: { type: "string", description: "The name or phone number of the customer" },
              event_date: { type: "string", description: "Date of the event (YYYY-MM-DD)" },
              venue_name: { type: "string", description: "Name of the venue or event location" },
              type: { type: "string", enum: ["rental", "sale"], description: "Booking type (rental or sale). Defaults to rental." },
              event_type: { type: "string", description: "Optional event type (e.g. Wedding, Reception, Haldi)" },
              total_amount: { type: "number", description: "Optional total booking amount in ₹" },
              booking_items: {
                type: "array",
                description: "List of items in the booking",
                items: {
                  type: "object",
                  properties: {
                    product_name: { type: "string", description: "Name of the product" },
                    product_id: { type: "string", description: "Optional product UUID" },
                    quantity: { type: "number", description: "Quantity to order" }
                  },
                  required: ["quantity"]
                }
              }
            },
            required: ["customer_name_or_phone", "event_date", "venue_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_product_pricing",
          description: "Update the pricing (rental/sale) or stock availability of a product",
          parameters: {
            type: "object",
            properties: {
              product_name: { type: "string", description: "The name of the product to update" },
              rental_price: { type: "number", description: "Optional new rental price in ₹" },
              sale_price: { type: "number", description: "Optional new sale price in ₹" },
              stock_available: { type: "number", description: "Optional new stock available quantity" },
              stock_total: { type: "number", description: "Optional new total stock quantity" },
            },
            required: ["product_name"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_booking_status",
          description: "Update the status or payment records of an order/booking",
          parameters: {
            type: "object",
            properties: {
              booking_number: { type: "string", description: "The booking/order number (e.g. ORD-0032)" },
              status: { type: "string", enum: ["confirmed", "delivered", "order_complete", "cancelled"], description: "Optional new status of the order" },
              amount_paid: { type: "number", description: "Optional total amount paid by the customer so far" },
            },
            required: ["booking_number"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_lead_status",
          description: "Update the status stage or follow-up notes of a lead",
          parameters: {
            type: "object",
            properties: {
              lead_id: { type: "string", description: "Optional unique lead ID" },
              lead_name: { type: "string", description: "Optional prospect name (used if lead_id is not known)" },
              status: { type: "string", enum: ["new", "contacted", "interested", "converted", "lost"], description: "Optional new stage status" },
              notes: { type: "string", description: "Optional text notes to add to follow-up history" },
            },
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_offer_status",
          description: "Toggle discount offers active state or change rates",
          parameters: {
            type: "object",
            properties: {
              code: { type: "string", description: "The offer code (e.g. FESTIVE20)" },
              is_active: { type: "boolean", description: "Optional toggle active status" },
              discount_value: { type: "number", description: "Optional new discount rate" },
            },
            required: ["code"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_staff_status",
          description: "Update a staff member's role or toggle account status",
          parameters: {
            type: "object",
            properties: {
              email: { type: "string", description: "The email address of the staff member" },
              role: { type: "string", enum: ["staff", "franchise_admin", "readonly"], description: "Optional new role" },
              is_active: { type: "boolean", description: "Optional toggle active status" },
            },
            required: ["email"],
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_customers",
          description: "Search or list customers in the franchise database",
          parameters: {
            type: "object",
            properties: {
              search: { type: "string", description: "Search query matching name, phone, or email" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_bookings",
          description: "Search or list recent bookings/orders",
          parameters: {
            type: "object",
            properties: {
              search: { type: "string", description: "Search query matching order number" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_coupons",
          description: "List recent discount coupons in the franchise",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_staff",
          description: "List staff members in the franchise",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_inventory",
          description: "Search products and check stock availability",
          parameters: {
            type: "object",
            properties: {
              search: { type: "string", description: "Search query matching product name" }
            }
          }
        }
      }
    ]

    let response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
        max_tokens: 600,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[AI Assistant] OpenAI error:", err)
      return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 })
    }

    let data = await response.json()
    let responseMessage = data.choices?.[0]?.message

    let executedCard: any = null

    // Check if the model wants to call functions
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      // Append the assistant's message with tool calls
      messages.push(responseMessage)

      // Execute each tool
      for (const toolCall of responseMessage.tool_calls) {
        const { name, arguments: argsString } = toolCall.function
        let args = {}
        try {
          args = JSON.parse(argsString)
        } catch (e) {
          console.error(`[AI Assistant] Failed to parse arguments for tool ${name}:`, e)
        }

        console.log(`[AI Assistant] Executing tool ${name} with args:`, args)
        const toolResult = await executeTool(name, args, supabase, auth, isSuperAdmin, franchiseId, userId)
        console.log(`[AI Assistant] Tool ${name} result:`, toolResult)

        if (toolResult.success && toolResult.card) {
          executedCard = toolResult.card
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: name,
          content: JSON.stringify(toolResult.success ? toolResult.data : { error: toolResult.error }),
        } as any)
      }

      // Call OpenAI again to summarize the results
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 600,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        console.error("[AI Assistant] OpenAI error on second call:", err)
        return NextResponse.json({ error: "AI service error on execution. Please try again." }, { status: 500 })
      }

      data = await response.json()
      responseMessage = data.choices?.[0]?.message
    }

    const reply = responseMessage?.content || "Sorry, I couldn't generate a response."
    
    // Return final reply with optional card structure
    return NextResponse.json({ reply, card: executedCard })
  } catch (err) {
    console.error("[AI Assistant] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
