import { NextRequest, NextResponse } from "next/server"
import { processDeliveryReminders, processReturnReminders } from "@/lib/services/whatsapp-triggers"

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for processing

/**
 * POST /api/cron/whatsapp-reminders
 * Process and send WhatsApp reminders for upcoming deliveries and returns
 * 
 * This should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 * Recommended: Run daily at 9 AM IST
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron] Starting WhatsApp reminder processing...")

    // Process delivery reminders
    const deliveryResults = await processDeliveryReminders()
    console.log("[Cron] Delivery reminders:", deliveryResults)

    // Process return reminders
    const returnResults = await processReturnReminders()
    console.log("[Cron] Return reminders:", returnResults)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      delivery: {
        processed: deliveryResults.processed,
        sent: deliveryResults.sent,
        failed: deliveryResults.processed - deliveryResults.sent,
        errors: deliveryResults.errors.slice(0, 10), // Limit error list
      },
      returns: {
        processed: returnResults.processed,
        sent: returnResults.sent,
        failed: returnResults.processed - returnResults.sent,
        errors: returnResults.errors.slice(0, 10),
      },
    })
  } catch (error: any) {
    console.error("[Cron] WhatsApp reminders error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Failed to process reminders" 
    }, { status: 500 })
  }
}

// GET endpoint for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "WhatsApp Reminders Cron Endpoint",
    usage: "POST to this endpoint to process delivery and return reminders",
    schedule: "Recommended: Daily at 9 AM IST",
  })
}
