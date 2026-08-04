import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import AuditLogger from "@/lib/audit-logger"
import { generateSettlementInvoicePDF } from "@/lib/settlement-invoice"
import { uploadToR2 } from "@/lib/r2-storage"
import { authenticateRequest, AuthMiddleware } from "@/lib/auth-middleware"

// Input JSON:
// {
//   feeOverrides?: Record<product_id, { damage_fee?: number, lost_fee?: number }> ,
//   payment?: { method: string },
//   notes?: string,
//   user?: { id?: string, email?: string }
// }

export async function POST(request: NextRequest, { params }: { params: { bookingId: string } }) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  const requesterUser = auth.user!
  const supabase = createClient()
  try {
    const bookingId = params.bookingId
    const body = await request.json()
    const { feeOverrides, payment, notes, user } = body || {}

    // Load booking, items, returns summary
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*, settlement_details, deposit_amount")
      .eq("id", bookingId)
      .single()
    if (bErr) throw bErr

    if (!AuthMiddleware.canAccessFranchise(requesterUser, booking.franchise_id)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    if (booking.settlement_locked) {
      return NextResponse.json({ success: false, error: "Settlement already finalized" }, { status: 400 })
    }

    // Gather damaged/lost counts from rental_return_items joined via rental_returns
    const { data: retItems, error: rErr } = await supabase
      .from("rental_return_items")
      .select("product_id, qty_damaged, qty_lost")
      .in("return_id", (
        await supabase.from("rental_returns").select("id").eq("booking_id", bookingId)
      ).data?.map((r: any) => r.id) || [] )

    if (rErr) throw rErr

    // Early if no returns
    const items = retItems || []

    // Build product fee map from products
    const productIds = Array.from(new Set(items.map((it: any) => it.product_id))).filter(Boolean)
    const { data: products } = await supabase
      .from("products")
      .select("id, damage_fee, lost_fee, franchise_id")
      .in("id", productIds)
      .eq("franchise_id", booking.franchise_id)
    const productFeeMap = new Map<string, { damage_fee: number; lost_fee: number }>()
    products?.forEach((p: any) => productFeeMap.set(p.id, { damage_fee: Number(p.damage_fee || 0), lost_fee: Number(p.lost_fee || 0) }))

    // Compute totals
    let totalDeductions = 0
    const breakdown: Array<{ product_id: string; damaged: number; lost: number; damage_fee: number; lost_fee: number; subtotal: number }> = []

    for (const it of items) {
      const base = productFeeMap.get(it.product_id) || { damage_fee: 0, lost_fee: 0 }
      const override = feeOverrides?.[it.product_id] || {}
      const damage_fee = Number(override.damage_fee ?? base.damage_fee)
      const lost_fee = Number(override.lost_fee ?? base.lost_fee)

      const subtotal = Number(it.qty_damaged || 0) * damage_fee + Number(it.qty_lost || 0) * lost_fee
      totalDeductions += subtotal
      breakdown.push({ product_id: it.product_id, damaged: it.qty_damaged || 0, lost: it.qty_lost || 0, damage_fee, lost_fee, subtotal })
    }

    const deposit = Number(booking.deposit_amount || 0)
    const refundDue = Math.max(0, deposit - totalDeductions)
    const extraPayable = Math.max(0, totalDeductions - deposit)

    // Lock settlement and store details
    const settlement_details = {
      ...booking.settlement_details,
      settlement: {
        breakdown,
        notes: notes || null,
        payment_method: payment?.method || null,
      },
    }

    const { error: upErr } = await supabase
      .from("bookings")
      .update({
        deductions_total: totalDeductions,
        refund_amount: refundDue,
        extra_charge: extraPayable,
        settled_by: user?.id || null,
        settled_at: new Date().toISOString(),
        settlement_locked: true,
        settlement_details,
        status: 'Settled',
      })
      .eq("id", bookingId)

    if (upErr) throw upErr

    // Create settlement invoice record
    const invoiceNumber = `SETTLE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        booking_id: bookingId,
        customer_id: booking.customer_id,
        franchise_id: booking.franchise_id,
        issue_date: new Date().toISOString().slice(0,10),
        due_date: new Date().toISOString().slice(0,10),
        subtotal: totalDeductions,
        tax_rate: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: totalDeductions,
        paid_amount: 0,
        balance_amount: totalDeductions,
        status: 'sent',
        notes: 'Settlement Invoice',
      })
      .select("id, invoice_number")
      .single()
    if (invErr) throw invErr

    // Record financial transaction: refund or charge
    // Payment method mapping: string -> payment_methods.id lookup (best-effort)
    let payment_method_id: string | null = null
    if (payment?.method) {
      const { data: pm } = await supabase.from("payment_methods").select("id").ilike("name", payment.method).maybeSingle()
      payment_method_id = pm?.id || null
    }

    if (refundDue > 0) {
      await supabase.from("financial_transactions").insert({
        transaction_date: new Date().toISOString().slice(0,10),
        amount: refundDue,
        type: 'expense',
        description: `Deposit refund for booking ${booking.booking_number}`,
        reference_number: invoice.invoice_number,
        booking_id: bookingId,
        invoice_id: invoice.id,
        settlement_reference: invoice.invoice_number,
        subtype: 'deposit_refund',
        payment_method_id: payment_method_id,
        franchise_id: booking.franchise_id,
        created_by: user?.id || null,
      })
    }
    if (extraPayable > 0) {
      await supabase.from("financial_transactions").insert({
        transaction_date: new Date().toISOString().slice(0,10),
        amount: extraPayable,
        type: 'income',
        description: `Settlement charge for booking ${booking.booking_number}`,
        reference_number: invoice.invoice_number,
        booking_id: bookingId,
        invoice_id: invoice.id,
        settlement_reference: invoice.invoice_number,
        subtype: 'settlement_charge',
        payment_method_id: payment_method_id,
        franchise_id: booking.franchise_id,
        created_by: user?.id || null,
      })
    }

    // Generate and upload settlement PDF, store pdf_url
    try {
      // Compose data for PDF
      // Aggregate breakdown with product names for readability
      const productNamesMap = new Map<string, string>()
      if (productIds.length > 0) {
        const { data: prodNames } = await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds)
          .eq("franchise_id", booking.franchise_id)
        prodNames?.forEach((p: any) => productNamesMap.set(p.id, p.name))
      }

      const returnsAgg = items.reduce(
        (acc: any, it: any) => {
          acc.damaged += Number(it.qty_damaged || 0)
          acc.lost += Number(it.qty_lost || 0)
          return acc
        },
        { damaged: 0, lost: 0 }
      )

      const pdfData = {
        invoiceNumber: invoice.invoice_number as string,
        booking: booking,
        customer: { name: (booking as any).customer_name || (booking as any).customer?.name || "" },
        returns: {
          damaged: returnsAgg.damaged,
          lost: returnsAgg.lost,
          breakdown: breakdown.map((b) => ({
            name: productNamesMap.get(b.product_id) || b.product_id,
            damaged: b.damaged,
            lost: b.lost,
            damage_fee: b.damage_fee,
            lost_fee: b.lost_fee,
            subtotal: b.subtotal,
          })),
        },
        deposit: deposit,
        deductions: totalDeductions,
        refundDue,
        extraPayable,
        notes: notes || undefined,
      }

      const pdfBlob = await generateSettlementInvoicePDF(pdfData)
      // Convert Blob to Uint8Array for server-side upload
      const arrayBuffer = await (pdfBlob as Blob).arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      // Choose storage bucket and path
      const key = `invoices/settlements/${invoice.invoice_number}.pdf`

      try {
        const { publicUrl } = await uploadToR2(buffer, key, "application/pdf", "invoices/settlements")
        const pdfUrl = publicUrl || null
        if (pdfUrl) {
          await supabase.from("invoices").update({ pdf_url: pdfUrl, pdf_generated: true }).eq("id", invoice.id)
        }
      } catch (uploadErr) {
        console.warn("PDF upload to R2 failed:", uploadErr)
      }
    } catch (pdfError) {
      console.warn("Settlement PDF generation failed:", pdfError)
    }

    try {
      await AuditLogger.logUpdate("bookings", bookingId, { settlement_locked: false }, { settlement_locked: true, deductions_total: totalDeductions, refund_amount: refundDue, extra_charge: extraPayable }, { userId: user?.id, userEmail: user?.email })
      await AuditLogger.logCreate("invoices", invoice.id, { invoice_number: invoice.invoice_number, booking_id: bookingId }, { userId: user?.id, userEmail: user?.email })
    } catch (e) {
      console.warn("Audit log failed for settlement", e)
    }

    return NextResponse.json({ success: true, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, totals: { deductions: totalDeductions, refundDue, extraPayable } })
  } catch (error: any) {
    console.error("Finalize settlement failed:", error)
    return NextResponse.json({ success: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}
