import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { autoAssignBarcodes } from "@/lib/barcode-assignment-utils"
import { requireAuth } from "@/lib/auth-middleware"
import { supabaseServer } from "@/lib/supabase-server-simple"
import type { UserPermissions } from "@/lib/types"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  try {
    const { data, error } = await supabaseServer
      .from('users')
      .select('permissions')
      .eq('id', userId)
      .single()
    if (error) return null
    return (data?.permissions as UserPermissions) || null
  } catch {
    return null
  }
}

function hasModuleAccess(perms: UserPermissions | null, key: keyof UserPermissions) {
  if (!perms) return false
  return Boolean(perms[key])
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const { authContext } = authResult
    const permissions = authContext!.user.permissions
    if (!permissions.bookings) {
      return NextResponse.json(
        { error: 'You do not have permission to view bookings' },
        { status: 403 }
      )
    }

    const franchiseId = authContext!.user.franchise_id
    const isSuperAdmin = authContext!.user.role === 'super_admin'
    const supabase = createClient()

    // ============ PRODUCT ORDERS (RENTALS ONLY) ============
    let productQuery = supabase
      .from("product_orders")
      .select(`
        id, order_number, customer_id, franchise_id, status, event_date, delivery_date, delivery_time, return_date, booking_type,
        event_type, venue_address, total_amount, amount_paid, notes, created_at, has_modifications, modifications_details, modification_date, is_archived,
        customer:customers(id, customer_code, name, phone, whatsapp, email, address, city, state, pincode, created_at)
      `)
      .eq('franchise_id', franchiseId)
      .eq('booking_type', 'rental')
      .neq('is_quote', true)
      .order("created_at", { ascending: false })

    // ============ PRODUCT ORDERS (SALES ONLY) ============
    // Sales created via create-invoice are stored in product_orders with booking_type='sale'
    let productSalesQuery = supabase
      .from("product_orders")
      .select(`
        id, order_number, customer_id, franchise_id, status, event_date, delivery_date, delivery_time, return_date, booking_type,
        event_type, venue_address, total_amount, amount_paid, notes, created_at, has_modifications, modifications_details, modification_date, is_archived,
        customer:customers(id, customer_code, name, phone, whatsapp, email, address, city, state, pincode, created_at)
      `)
      .eq('franchise_id', franchiseId)
      .eq('booking_type', 'sale')
      .neq('is_quote', true)
      .order("created_at", { ascending: false })

    // ============ DIRECT SALES ORDERS (FROM DIRECT_SALES_ORDERS TABLE) ============
    // Query the direct_sales_orders table directly - this table has the direct sales data
    let directSalesQuery = supabase
      .from("direct_sales_orders")
      .select(`
        id, sale_number, customer_id, franchise_id, status, sale_date, delivery_date, venue_address,
        total_amount, amount_paid, notes, created_at,
        subtotal_amount, discount_amount, coupon_code, coupon_discount, tax_amount, is_archived,
        customer:customers(name, phone, email)
      `)
      .eq('franchise_id', franchiseId)
      .order("created_at", { ascending: false })

    // ============ PACKAGE BOOKINGS ============
    let packageQuery = supabase
      .from("package_bookings")
      .select(`
        id, package_number, customer_id, franchise_id, status, event_date, delivery_date, delivery_time, return_date, return_time,
        event_type, venue_address, venue_name, total_amount, amount_paid, notes, created_at, from_quote_id,
        groom_name, groom_address, groom_whatsapp, bride_name, bride_address, bride_whatsapp, event_participant,
        subtotal_amount, distance_amount, distance_km, discount_amount, coupon_code, coupon_discount, 
        tax_amount, gst_percentage, security_deposit, event_time, is_archived, category_id,
        customer:customers(id, customer_code, name, phone, whatsapp, email, address, city, state, pincode, created_at)
      `)
      .eq('franchise_id', franchiseId)
      .order("created_at", { ascending: false })

    // Execute all four queries in parallel
    const [productRes, productSalesRes, directSalesRes, packageRes] = await Promise.all([
      productQuery,
      productSalesQuery,
      directSalesQuery,
      packageQuery
    ])

    // Compute item quantity totals for each booking
    const productIds = [...(productRes.data || []).map((r: any) => r.id), ...(productSalesRes.data || []).map((r: any) => r.id)]
    const packageIds = (packageRes.data || []).map((r: any) => r.id)

    let productTotals: Record<string, number> = {}
    let packageTotals: Record<string, number> = {}
    const ordersWithAnyItems = new Set<string>()
    const packagesWithAnyItems = new Set<string>()

    if (productIds.length > 0) {
      // Fetch items with product details to identify Safa products
      const { data: poItems } = await supabase
        .from('product_order_items')
        .select(`
          order_id, 
          quantity,
          product_id
        `)
        .in('order_id', productIds)
      
      if (poItems) {
        for (const item of poItems) {
          if (item.order_id) ordersWithAnyItems.add(item.order_id)
        }
      }
      
      // Get all unique product IDs
      const productItemIds = [...new Set(poItems?.map(i => i.product_id).filter(Boolean) || [])]
      
      // Fetch product details with category info
      let productCategoryMap: Record<string, string> = {}
      if (productItemIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, category_id')
          .in('id', productItemIds)
        
        // Get category IDs
        const categoryIds = [...new Set(products?.map(p => p.category_id).filter(Boolean) || [])]
        
        // Fetch category names
        if (categoryIds.length > 0) {
          const { data: cats } = await supabase
            .from('categories')
            .select('id, name')
            .in('id', categoryIds)
          
          // Build product -> category name map
          const catIdToName: Record<string, string> = {}
          for (const cat of cats || []) {
            catIdToName[cat.id] = cat.name
          }
          
          for (const product of products || []) {
            productCategoryMap[product.id] = catIdToName[product.category_id] || ''
          }
        }
      }
      
      // Count only Safa products (category name contains "SAFA")
      for (const row of poItems || []) {
        const categoryName = productCategoryMap[row.product_id] || ''
        const isSafa = categoryName.toUpperCase().includes('SAFA')
        if (isSafa) {
          productTotals[row.order_id] = (productTotals[row.order_id] || 0) + (Number(row.quantity) || 0)
        }
      }
      
    }

    // Initialize package data variables
    let pkgItems: any[] = []
    let categoryMap: Record<string, string> = {}
    let packageMap: Record<string, { name: string; description: string; base_price: number }> = {}
    let variantMap: Record<string, string> = {}

    if (packageIds.length > 0) {
      const { data: pkgItemsData } = await supabase
        .from('package_booking_items')
        .select('booking_id, quantity, extra_safas, category_id, package_id, variant_id')
        .in('booking_id', packageIds)
      
      pkgItems = pkgItemsData || []
      
      if (pkgItemsData) {
        for (const item of pkgItemsData) {
          if (item.booking_id) packagesWithAnyItems.add(item.booking_id)
        }
      }

      // Also check package_booking_product_items to see if product items are assigned
      const { data: pkgProdItems } = await supabase
        .from('package_booking_product_items')
        .select('package_booking_id')
        .in('package_booking_id', packageIds)
      
      if (pkgProdItems) {
        for (const item of pkgProdItems) {
          if (item.package_booking_id) packagesWithAnyItems.add(item.package_booking_id)
        }
      }
      
      // Get unique category IDs
      const categoryIds = [...new Set(pkgItems.map(item => item.category_id).filter(Boolean) || [])]
      
      // Get unique package IDs
      const packageIdsFromItems = [...new Set(pkgItems.map(item => item.package_id).filter(Boolean) || [])]
      
      // Get unique variant IDs
      const variantIds = [...new Set(pkgItems.map(item => item.variant_id).filter(Boolean) || [])]
      
      // Fetch category names
      if (categoryIds.length > 0) {
        const { data: categories } = await supabase
          .from('packages_categories')
          .select('id, name')
          .in('id', categoryIds)
        
        for (const cat of categories || []) {
          categoryMap[cat.id] = cat.name
        }
      }
      
      // Fetch package details
      if (packageIdsFromItems.length > 0) {
        const { data: packages } = await supabase
          .from('package_sets')
          .select('id, name, description, base_price')
          .in('id', packageIdsFromItems)
        
        for (const pkg of packages || []) {
          packageMap[pkg.id] = {
            name: pkg.name,
            description: pkg.description,
            base_price: pkg.base_price
          }
        }
      }
      
      // Fetch variant details
      if (variantIds.length > 0) {
        const { data: variants } = await supabase
          .from('package_variants')
          .select('id, name')
          .in('id', variantIds)
        
        for (const variant of variants || []) {
          variantMap[variant.id] = variant.name
        }
      }
      
      // Process each booking
      const processedBookings = new Set<string>()
      for (const row of pkgItems) {
        // Only process each booking once
        if (!processedBookings.has(row.booking_id) && row.category_id && categoryMap[row.category_id]) {
          const categoryName = categoryMap[row.category_id]
          // Extract number from category name (e.g., "21 Safas" -> 21)
          const match = categoryName.match(/(\d+)/)
          if (match) {
            packageTotals[row.booking_id] = parseInt(match[1])
            processedBookings.add(row.booking_id)
          }
        }
        
        // Fallback: sum quantities if category not found
        if (!processedBookings.has(row.booking_id)) {
          const base = Number(row.quantity) || 0
          const extra = Number(row.extra_safas) || 0
          packageTotals[row.booking_id] = (packageTotals[row.booking_id] || 0) + base + extra
        }
      }
    }

    // FALLBACK: For package bookings that still have 0 safas (no items assigned yet),
    // use the category_id directly from the booking record to get the safa count.
    if (packageIds.length > 0) {
      // Collect category_ids from bookings that have no total yet
      const missingPackageIds = (packageRes.data || []).filter((r: any) => !packageTotals[r.id] && r.category_id)
      const missingCategoryIds = [...new Set(missingPackageIds.map((r: any) => r.category_id).filter(Boolean))]
      
      if (missingCategoryIds.length > 0) {
        const { data: fallbackCats } = await supabase
          .from('packages_categories')
          .select('id, name')
          .in('id', missingCategoryIds)
        
        const fallbackCatMap: Record<string, string> = {}
        for (const cat of fallbackCats || []) {
          fallbackCatMap[cat.id] = cat.name
        }
        
        // Extract safa number from category name and store in categoryMap too
        for (const r of missingPackageIds) {
          const catName = fallbackCatMap[r.category_id] || ''
          if (!categoryMap[r.category_id]) {
            categoryMap[r.category_id] = catName
          }
          const match = catName.match(/(\d+)/)
          if (match) {
            packageTotals[r.id] = parseInt(match[1])
          }
        }
      }
    }

    // Map package bookings to unified Booking shape
    const packageRows = (packageRes.data || []).map((r: any) => {
      // Get package details for this booking
      const packageItem = pkgItems?.find((item: any) => item.booking_id === r.id)
      const packageDetails = packageItem?.package_id && packageMap[packageItem.package_id] ? packageMap[packageItem.package_id] : null
      const variantName = packageItem?.variant_id && variantMap[packageItem.variant_id] ? variantMap[packageItem.variant_id] : null
      const extraSafas = packageItem?.extra_safas || 0
      
      return {
      id: r.id,
      booking_number: r.package_number,
      customer_id: r.customer_id,
      franchise_id: r.franchise_id,
      event_date: r.event_date,
      event_time: r.event_time || null,
      delivery_date: r.delivery_date,
      delivery_time: r.delivery_time || null,
      delivery_address: r.venue_address || null,
      pickup_date: r.return_date,
      return_date: r.return_date,
      return_time: r.return_time || null,
      event_type: r.event_type || null,
      event_participant: r.event_participant || null,
      status: r.status,
      total_amount: Number(r.total_amount) || 0,
      paid_amount: Number(r.amount_paid) || 0,
      subtotal_amount: Number(r.subtotal_amount || 0),
      distance_amount: Number(r.distance_amount || 0),
      distance_km: Number(r.distance_km || 0),
      discount_amount: Number(r.discount_amount || 0),
      coupon_code: r.coupon_code || null,
      coupon_discount: Number(r.coupon_discount || 0),
      tax_amount: Number(r.tax_amount || 0),
      gst_percentage: Number(r.gst_percentage || 0),
      security_deposit: Number(r.security_deposit || 0),
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.created_at,
      customer: r.customer || null,
      venue_address: r.venue_address || null,
      venue_name: r.venue_name || null,
      groom_name: r.groom_name || null,
      groom_address: r.groom_address || null,
      groom_whatsapp: r.groom_whatsapp || null,
      bride_name: r.bride_name || null,
      bride_address: r.bride_address || null,
      bride_whatsapp: r.bride_whatsapp || null,
      // Align source label with UI checks ('package_bookings')
      source: 'package_bookings' as const,
      type: 'package' as const,
      booking_kind: 'package' as const,
      total_safas: packageTotals[r.id] || 0,
      has_items: packagesWithAnyItems.has(r.id),
      is_archived: r.is_archived || false,
      // Add package details
      package_details: packageDetails,
      variant_name: variantName,
      extra_safas: extraSafas,
    }})

    // Map to unified Booking shape with total_safas
    // Combine product rentals and product sales
    const allProductOrders = [...(productRes.data || []), ...(productSalesRes.data || [])]
    const productRows = allProductOrders.map((r: any) => ({
      id: r.id,
      booking_number: r.order_number,
      customer_id: r.customer_id,
      franchise_id: r.franchise_id,
      event_date: r.event_date,
      event_time: r.event_time || null,
      delivery_date: r.delivery_date,
      delivery_time: r.delivery_time || null,
      delivery_address: r.venue_address || null,
      pickup_date: r.return_date,
      return_date: r.return_date,
      return_time: r.return_time || null,
      event_type: r.event_type || null,
      event_participant: r.event_participant || null,
      status: r.status,
      total_amount: Number(r.total_amount) || 0,
      paid_amount: Number(r.amount_paid) || 0,
      subtotal_amount: Number(r.subtotal_amount || 0),
      distance_amount: Number(r.distance_amount || 0),
      distance_km: Number(r.distance_km || 0),
      discount_amount: Number(r.discount_amount || 0),
      coupon_code: r.coupon_code || null,
      coupon_discount: Number(r.coupon_discount || 0),
      tax_amount: Number(r.tax_amount || 0),
      gst_percentage: Number(r.gst_percentage || 0),
      security_deposit: Number((r as any).security_deposit || 0),
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.created_at,
      customer: r.customer || null,
      venue_address: r.venue_address || null,
      venue_name: r.venue_name || null,
      groom_name: r.groom_name || null,
      groom_address: r.groom_address || null,
      groom_whatsapp: r.groom_whatsapp || null,
      bride_name: r.bride_name || null,
      bride_address: r.bride_address || null,
      bride_whatsapp: r.bride_whatsapp || null,
      source: 'product_orders' as const,
      type: r.booking_type === 'sale' ? 'sale' : 'rental',
      booking_kind: 'product' as const,
      total_safas: productTotals[r.id] || 0,
      has_items: ordersWithAnyItems.has(r.id),
      is_archived: r.is_archived || false,
      // Modification fields for calendar tab
      has_modifications: r.has_modifications || false,
      modifications_details: r.modifications_details || null,
      modification_date: r.modification_date || null,
    }))

    // Compute item totals for direct sales (only Safa products)
    const directSalesIds = (directSalesRes.data || []).map((r: any) => r.id)
    let directSalesTotals: Record<string, number> = {}
    const directSalesWithAnyItems = new Set<string>()

    if (directSalesIds.length > 0) {
      // Fetch from direct_sales_items with product_id
      const { data: dsiItems } = await supabase
        .from('direct_sales_items')
        .select('sale_id, quantity, product_id')
        .in('sale_id', directSalesIds)
      
      // Also check product_order_items for orders that came from product_orders table with booking_type='sale'
      const { data: poiItems } = await supabase
        .from('product_order_items')
        .select('order_id, quantity, product_id')
        .in('order_id', directSalesIds)
      
      if (dsiItems) {
        for (const item of dsiItems) {
          if (item.sale_id) directSalesWithAnyItems.add(item.sale_id)
        }
      }
      if (poiItems) {
        for (const item of poiItems) {
          if (item.order_id) directSalesWithAnyItems.add(item.order_id)
        }
      }
      
      // Collect all product IDs from both sources
      const allProductIds = [
        ...(dsiItems?.map(i => i.product_id).filter(Boolean) || []),
        ...(poiItems?.map(i => i.product_id).filter(Boolean) || [])
      ]
      const uniqueProductIds = [...new Set(allProductIds)]
      
      // Fetch product details with category info
      let dsCategoryMap: Record<string, string> = {}
      if (uniqueProductIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, category_id')
          .in('id', uniqueProductIds)
        
        const categoryIds = [...new Set(products?.map(p => p.category_id).filter(Boolean) || [])]
        
        if (categoryIds.length > 0) {
          const { data: cats } = await supabase
            .from('categories')
            .select('id, name')
            .in('id', categoryIds)
          
          const catIdToName: Record<string, string> = {}
          for (const cat of cats || []) {
            catIdToName[cat.id] = cat.name
          }
          
          for (const product of products || []) {
            dsCategoryMap[product.id] = catIdToName[product.category_id] || ''
          }
        }
      }
      
      // Count only Safa products
      for (const row of dsiItems || []) {
        const categoryName = dsCategoryMap[row.product_id] || ''
        const isSafa = categoryName.toUpperCase().includes('SAFA')
        if (isSafa) {
          directSalesTotals[row.sale_id] = (directSalesTotals[row.sale_id] || 0) + (Number(row.quantity) || 0)
        }
      }
      for (const row of poiItems || []) {
        const categoryName = dsCategoryMap[row.product_id] || ''
        const isSafa = categoryName.toUpperCase().includes('SAFA')
        if (isSafa) {
          directSalesTotals[row.order_id] = (directSalesTotals[row.order_id] || 0) + (Number(row.quantity) || 0)
        }
      }
    }

    // Map direct sales orders to unified Booking shape
    const directSalesRows = (directSalesRes.data || []).map((r: any) => ({
      id: r.id,
      booking_number: r.sale_number,
      customer_id: r.customer_id,
      franchise_id: r.franchise_id,
      event_date: r.sale_date,
      event_time: r.event_time || null,
      delivery_date: r.delivery_date,
      delivery_time: r.delivery_time || null,
      delivery_address: r.venue_address || null,
      pickup_date: null,
      return_date: null,
      return_time: null,
      event_type: r.event_type || 'Direct Sale',
      event_participant: null,
      status: r.status,
      total_amount: Number(r.total_amount) || 0,
      paid_amount: Number(r.amount_paid) || 0,
      subtotal_amount: Number(r.subtotal_amount || 0),
      distance_amount: Number(r.distance_amount || 0),
      distance_km: Number(r.distance_km || 0),
      discount_amount: Number(r.discount_amount || 0),
      coupon_code: r.coupon_code || null,
      coupon_discount: Number(r.coupon_discount || 0),
      tax_amount: Number(r.tax_amount || 0),
      gst_percentage: Number(r.gst_percentage || 0),
      security_deposit: 0,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.created_at,
      customer: r.customer || null,
      venue_address: r.venue_address || null,
      venue_name: r.venue_name || null,
      groom_name: null,
      groom_address: null,
      groom_whatsapp: null,
      bride_name: null,
      bride_address: null,
      bride_whatsapp: null,
      // Mark as direct_sales source for tab filtering
      source: 'direct_sales' as const,
      type: 'sale' as const,
      booking_kind: 'product' as const,
      total_safas: directSalesTotals[r.id] || 0,
      has_items: directSalesWithAnyItems.has(r.id),
      is_archived: r.is_archived || false,
    }))

    const data = [...productRows, ...directSalesRows, ...packageRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[Bookings API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const { authContext } = authResult
    const permissions = authContext!.user.permissions
    if (!permissions.bookings) {
      return NextResponse.json(
        { error: 'You do not have permission to create bookings' },
        { status: 403 }
      )
    }

    const userId = authContext!.user.id
    const franchiseId = authContext!.user.franchise_id
    if (!franchiseId) {
      return NextResponse.json({ error: "User has no franchise assigned" }, { status: 403 })
    }
    const supabase = createClient()

    const body = await request.json()
    const { customer_id, event_date, venue_name, booking_items = [] } = body

    if (!customer_id || typeof customer_id !== "string") {
      return NextResponse.json({ error: "Customer ID is required and must be valid" }, { status: 400 })
    }

    if (!event_date || !Date.parse(event_date)) {
      return NextResponse.json({ error: "Valid event date is required" }, { status: 400 })
    }

    if (!venue_name || typeof venue_name !== "string" || venue_name.trim().length === 0) {
      return NextResponse.json({ error: "Venue name is required" }, { status: 400 })
    }

    if (booking_items.length > 0) {
      for (const item of booking_items) {
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
          return NextResponse.json(
            { error: "All booking items must have valid product_id and quantity" },
            { status: 400 },
          )
        }
        if (typeof item.quantity !== "number" || item.quantity > 1000) {
          return NextResponse.json({ error: "Invalid quantity. Must be a number between 1 and 1000" }, { status: 400 })
        }
      }
    }

    const { data: transactionResult, error: transactionError } = await supabase.rpc(
      "create_booking_with_conflict_check",
      {
        p_customer_id: customer_id,
        p_event_date: event_date,
        p_venue_name: venue_name.trim(),
        p_franchise_id: franchiseId,
        p_created_by: userId,
        p_booking_data: JSON.stringify({
          type: body.type || "rental",
          event_type: body.event_type || null,
          payment_type: body.payment_type || "advance_payment",
          delivery_date: body.delivery_date || null,
          return_date: body.return_date || null,
          event_for: body.event_for || null,
          groom_name: body.groom_name || null,
          groom_home_address: body.groom_home_address || null,
          groom_additional_whatsapp: body.groom_additional_whatsapp || null,
          bride_name: body.bride_name || null,
          bride_home_address: body.bride_home_address || null,
          bride_additional_whatsapp: body.bride_additional_whatsapp || null,
          venue_address: body.venue_address || null,
          special_instructions: body.special_instructions || null,
          total_amount: body.total_amount || 0,
          subtotal: body.subtotal || 0,
          gst_amount: body.gst_amount || 0,
          other_amount: body.other_amount || 0,
        }),
        p_booking_items: JSON.stringify(booking_items),
      },
    )

    if (transactionError) {
      if (transactionError.message.includes("conflict")) {
        return NextResponse.json({ error: transactionError.message }, { status: 409 })
      }
      if (transactionError.message.includes("stock")) {
        return NextResponse.json({ error: transactionError.message }, { status: 400 })
      }
      if (transactionError.message.includes("not found")) {
        return NextResponse.json({ error: transactionError.message }, { status: 404 })
      }
      return NextResponse.json({ error: transactionError.message }, { status: 500 })
    }

    const booking = transactionResult

    // Auto-assign barcodes for booking items (if available)
    if (booking && booking.id && booking_items && booking_items.length > 0) {
      for (const item of booking_items) {
        if (item.product_id && item.quantity) {
          const assignResult = await autoAssignBarcodes(
            booking.id,
            'product', // or 'package' based on booking type
            item.product_id,
            item.quantity,
            franchiseId,
            userId
          )
          
          if (!assignResult.success) {
            console.warn(`[Booking API] Could not auto-assign barcodes for product ${item.product_id}:`, assignResult.error)
          }
        }
      }
    }

    try {
      const { NotificationService } = await import("@/lib/notification-service")
      const { data: customer } = await supabase
        .from("customers")
        .select("name, phone")
        .eq("id", customer_id)
        .single()

      await NotificationService.notifyBookingCreated({
        ...booking,
        customer_name: customer?.name || null,
        customer_phone: customer?.phone || null,
        venue: body.venue_name || body.venue_address || null,
        booking_type: body.type || "rental",
        type: body.type || "rental",
      })
    } catch (notificationError) {
      console.error("[v0] WATI notification failed:", notificationError)
      // Don't fail the booking creation if notification fails
    }

    return NextResponse.json({
      success: true,
      data: booking,
    })
  } catch (error) {
    console.error("[v0] Booking creation error:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
