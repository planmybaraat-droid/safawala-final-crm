/**
 * Quote PDF Download API
 * Generates and returns professional quote PDF with all details and branding
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthMiddleware } from '@/lib/auth-middleware'
import { supabaseServer } from '@/lib/supabase-server-simple'
import { generateProfessionalQuotePDF } from '@/lib/pdf/generate-quote-pdf-professional'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'staff')
  if (!auth.success || !auth.authContext?.user) {
    return NextResponse.json(auth.response, { status: 401 })
  }

  const user = auth.authContext.user
  const supabase = supabaseServer
  try {
    const searchParams = request.nextUrl.searchParams
    const quoteId = searchParams.get('id')

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      )
    }

    // Fetch quote data from package_bookings
    const { data: quote, error: quoteError } = await supabase
      .from('package_bookings')
      .select('*')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(user, quote.franchise_id)) {
      return NextResponse.json(
        { error: 'Access denied to this quote' },
        { status: 403 }
      )
    }

    // Fetch quote items
    const { data: items, error: itemsError } = await supabase
      .from('package_booking_items')
      .select('*')
      .eq('booking_id', quoteId)

    if (itemsError) {
      return NextResponse.json(
        { error: 'Failed to fetch quote items' },
        { status: 500 }
      )
    }

    // Fetch selected products if product booking
    let selectedProducts: Array<{ name: string; quantity: number }> = []
    if (quote.booking_type === 'product' && items && items.length > 0) {
      const productIds = items.map((item: any) => item.product_id).filter(Boolean)
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds)

        if (products) {
          selectedProducts = products.map((product: any) => ({
            name: product.name,
            quantity: items.find((item: any) => item.product_id === product.id)?.quantity || 1,
          }))
        }
      }
    }

    // Fetch customer info
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', quote.customer_id)
      .eq('franchise_id', quote.franchise_id)
      .single()

    // Format items for PDF - include extra_safas info
    const pdfItems = (items || []).map((item, index) => ({
      sr: index + 1,
      packageName: `${item.variant_name || 'Package'}${item.extra_safas ? ` +${item.extra_safas} Extra Safas` : ''}`,
      quantity: item.quantity || 0,
      unitPrice: item.unit_price || 0,
      amount: (item.quantity || 0) * (item.unit_price || 0),
    }))

    // Calculate totals
    const subtotal = pdfItems.reduce((sum, item) => sum + item.amount, 0)
    const discount = quote.discount_amount || 0
    const gst = subtotal > 0 ? (subtotal - discount) * 0.05 : 0
    const grandTotal = subtotal - discount + gst

    // Determine payment due based on payment_type
    let paymentDue = grandTotal
    if (quote.payment_type === 'advance') {
      paymentDue = grandTotal * 0.5
    } else if (quote.payment_type === 'partial') {
      paymentDue = quote.custom_amount || 0
    } else if (quote.payment_type === 'full') {
      paymentDue = grandTotal
    }

    // Prepare PDF data object matching CompactPDFData interface
    const pdfData = {
      id: quote.id,
      quote_number: quote.package_number || `QUO-${new Date().getTime()}`,
      event_type: quote.event_type || 'N/A',
      event_date: quote.event_date,
      event_time: quote.event_date ? new Date(quote.event_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : undefined,
      delivery_date: quote.delivery_date,
      delivery_time: quote.delivery_date ? new Date(quote.delivery_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : undefined,
      return_date: quote.return_date,
      return_time: quote.return_date ? new Date(quote.return_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : undefined,
      venue_address: quote.venue_address,
      customer_name: customer?.name || quote.groom_name || quote.bride_name || 'N/A',
      customer_phone: customer?.phone || quote.groom_whatsapp || quote.bride_whatsapp || 'N/A',
      customer_whatsapp: customer?.whatsapp || quote.groom_whatsapp || quote.bride_whatsapp,
      customer_email: customer?.email,
      customer_address: customer?.address,
      customer_city: customer?.city,
      customer_state: customer?.state,
      customer_pincode: customer?.pincode,
      groom_name: quote.groom_name,
      groom_whatsapp: quote.groom_whatsapp,
      groom_address: quote.groom_address,
      bride_name: quote.bride_name,
      bride_whatsapp: quote.bride_whatsapp,
      bride_address: quote.bride_address,
      booking_type: quote.booking_type,
      booking_subtype: quote.booking_subtype,
      items: pdfItems,
      selected_products: selectedProducts.length > 0 ? selectedProducts : undefined,
      subtotal,
      discount,
      gst,
      grandTotal,
      paymentDue,
      paymentType: quote.payment_type || 'Full',
      salesStaffName: quote.sales_staff_name,
      notes: quote.notes,
      franchise_id: quote.franchise_id,
      created_at: quote.created_at,
    }

    // Generate PDF
    const pdfBlob = await generateProfessionalQuotePDF(pdfData)

    // Return PDF as response
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfData.quote_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
