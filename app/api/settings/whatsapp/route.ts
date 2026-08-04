import { NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'

/**
 * GET /api/settings/whatsapp
 * Get WhatsApp notification settings for a franchise
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req, 'staff')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const franchiseId = searchParams.get('franchiseId') || authResult.authContext!.user.franchise_id

    if (!franchiseId) {
      return NextResponse.json({ error: "franchiseId is required for this user context" }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(authResult.authContext!.user, franchiseId)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("whatsapp_notification_settings")
      .select("*")
      .eq("franchise_id", franchiseId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error("[API] Error fetching WhatsApp settings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return defaults if no settings exist
    const settings = data || {
      booking_confirmation: true,
      payment_received: true,
      delivery_reminder: true,
      return_reminder: true,
      invoice_sent: true,
      delivery_reminder_hours: 24,
      return_reminder_hours: 24,
      business_hours_only: true,
      business_start_time: '09:00:00',
      business_end_time: '18:00:00',
    }

    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    console.error("[API] /api/settings/whatsapp GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/settings/whatsapp
 * Save WhatsApp notification settings for a franchise
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req, 'franchise_admin')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }

    const body = await req.json()
    const { franchiseId, settings } = body

    if (!franchiseId) {
      return NextResponse.json({ error: "franchiseId is required" }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(authResult.authContext!.user, franchiseId)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("whatsapp_notification_settings")
      .upsert({
        franchise_id: franchiseId,
        booking_confirmation: settings.booking_confirmation ?? true,
        payment_received: settings.payment_received ?? true,
        delivery_reminder: settings.delivery_reminder ?? true,
        return_reminder: settings.return_reminder ?? true,
        invoice_sent: settings.invoice_sent ?? true,
        delivery_reminder_hours: settings.delivery_reminder_hours ?? 24,
        return_reminder_hours: settings.return_reminder_hours ?? 24,
        business_hours_only: settings.business_hours_only ?? true,
        business_start_time: settings.business_start_time || '09:00:00',
        business_end_time: settings.business_end_time || '18:00:00',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'franchise_id',
      })
      .select()

    if (error) {
      console.error("[API] Error saving WhatsApp settings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: data?.[0] })
  } catch (error: any) {
    console.error("[API] /api/settings/whatsapp POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
