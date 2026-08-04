import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

const DEFAULT_PRICING = {
  defaultGstRate: 18,
  securityDepositPercent: 50,
  minBookingAmount: 5000,
  rentalPeriodDays: 3,
}

const DEFAULT_TEMPLATES = {
  booking_confirmation: "booking_confirm_v2",
  order_dispatch: "order_dispatch_update",
  return_reminder: "return_reminder_v1",
}

function parseSetting(value?: string | null) {
  try { return JSON.parse(value || "{}") } catch { return {} }
}

async function readSetting(supabase: ReturnType<typeof createClient>, franchiseId: string | undefined, key: string) {
  let query = supabase
    .from("franchise_settings")
    .select("id, setting_value")
    .eq("category", "super_admin_settings")
    .eq("setting_key", key)

  query = franchiseId ? query.eq("franchise_id", franchiseId) : query.is("franchise_id", null)
  return query.maybeSingle()
}

async function writeSetting(
  supabase: ReturnType<typeof createClient>,
  franchiseId: string | undefined,
  key: string,
  value: Record<string, any>,
) {
  const existing = await readSetting(supabase, franchiseId, key)
  const payload = {
    franchise_id: franchiseId || null,
    setting_key: key,
    setting_value: JSON.stringify(value),
    setting_type: "json",
    category: "super_admin_settings",
    description: `Super Admin ${key} configuration`,
    updated_at: new Date().toISOString(),
  }

  if (existing.data?.id) {
    return supabase.from("franchise_settings").update(payload).eq("id", existing.data.id).select("id").single()
  }
  return supabase.from("franchise_settings").insert(payload).select("id").single()
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "super_admin" })
  if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

  try {
    const supabase = createClient()
    const franchiseId = auth.user?.franchise_id

    let companyQuery = supabase
      .from("company_settings")
      .select("company_name, email, phone, address, gst_number, pan_number")
    companyQuery = franchiseId ? companyQuery.eq("franchise_id", franchiseId) : companyQuery.is("franchise_id", null)
    let companyResult = await companyQuery.maybeSingle()
    if (!companyResult.data) {
      companyResult = await supabase
        .from("company_settings")
        .select("company_name, email, phone, address, gst_number, pan_number")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    }

    const [pricingResult, watiResult] = await Promise.all([
      readSetting(supabase, franchiseId, "pricing"),
      readSetting(supabase, franchiseId, "wati"),
    ])

    const pricing = { ...DEFAULT_PRICING, ...parseSetting(pricingResult.data?.setting_value) }
    const storedWati = parseSetting(watiResult.data?.setting_value)
    const apiKeyConfigured = Boolean(storedWati.apiKey || process.env.WATI_API_TOKEN)

    return NextResponse.json({
      success: true,
      company: {
        name: companyResult.data?.company_name || "Safawala Corporate",
        email: companyResult.data?.email || "",
        phone: companyResult.data?.phone || "",
        address: companyResult.data?.address || "",
        gstin: companyResult.data?.gst_number || "",
        pan: companyResult.data?.pan_number || "",
      },
      pricing: Object.fromEntries(Object.entries(pricing).map(([key, value]) => [key, String(value)])),
      wati: {
        apiUrl: storedWati.apiUrl || process.env.WATI_API_ENDPOINT || "https://api.wati.io/api/v1",
        apiKey: "",
        apiKeyConfigured,
        templates: { ...DEFAULT_TEMPLATES, ...(storedWati.templates || {}) },
      },
    })
  } catch (error: any) {
    console.error("Admin settings GET error:", error)
    return NextResponse.json({ error: error.message || "Failed to load settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: "super_admin" })
  if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

  try {
    const { section, data } = await request.json()
    const franchiseId = auth.user?.franchise_id
    const supabase = createClient()

    if (section === "company") {
      const name = String(data?.name || "").trim()
      const email = String(data?.email || "").trim().toLowerCase()
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "A company name and valid email are required" }, { status: 400 })
      }
      const payload = {
        franchise_id: franchiseId || null,
        company_name: name,
        email,
        phone: String(data?.phone || "").trim() || null,
        address: String(data?.address || "").trim() || null,
        gst_number: String(data?.gstin || "").trim().toUpperCase() || null,
        pan_number: String(data?.pan || "").trim().toUpperCase() || null,
        updated_at: new Date().toISOString(),
      }
      let existingQuery = supabase.from("company_settings").select("id")
      existingQuery = franchiseId ? existingQuery.eq("franchise_id", franchiseId) : existingQuery.is("franchise_id", null)
      const existing = await existingQuery.maybeSingle()
      const result = existing.data?.id
        ? await supabase.from("company_settings").update(payload).eq("id", existing.data.id).select("id").single()
        : await supabase.from("company_settings").insert(payload).select("id").single()
      if (result.error) throw result.error
    } else if (section === "pricing") {
      const pricing = {
        defaultGstRate: Number(data?.defaultGstRate),
        securityDepositPercent: Number(data?.securityDepositPercent),
        minBookingAmount: Number(data?.minBookingAmount),
        rentalPeriodDays: Number(data?.rentalPeriodDays),
      }
      if (!Number.isFinite(pricing.defaultGstRate) || pricing.defaultGstRate < 0 || pricing.defaultGstRate > 100 ||
          !Number.isFinite(pricing.securityDepositPercent) || pricing.securityDepositPercent < 0 || pricing.securityDepositPercent > 100 ||
          !Number.isFinite(pricing.minBookingAmount) || pricing.minBookingAmount < 0 ||
          !Number.isInteger(pricing.rentalPeriodDays) || pricing.rentalPeriodDays < 1) {
        return NextResponse.json({ error: "Pricing values are outside their allowed range" }, { status: 400 })
      }
      const result = await writeSetting(supabase, franchiseId, "pricing", pricing)
      if (result.error) throw result.error
    } else if (section === "wati") {
      const current = await readSetting(supabase, franchiseId, "wati")
      const existing = parseSetting(current.data?.setting_value)
      const submittedKey = String(data?.apiKey || "").trim()
      const wati = {
        apiUrl: String(data?.apiUrl || "").trim(),
        apiKey: submittedKey && !submittedKey.includes("•") ? submittedKey : existing.apiKey,
        templates: {
          booking_confirmation: String(data?.templates?.booking_confirmation || "").trim(),
          order_dispatch: String(data?.templates?.order_dispatch || "").trim(),
          return_reminder: String(data?.templates?.return_reminder || "").trim(),
        },
      }
      if (!/^https:\/\//i.test(wati.apiUrl)) {
        return NextResponse.json({ error: "WATI API URL must use HTTPS" }, { status: 400 })
      }
      const result = await writeSetting(supabase, franchiseId, "wati", wati)
      if (result.error) throw result.error
    } else {
      return NextResponse.json({ error: "Unknown settings section" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Admin settings PUT error:", error)
    return NextResponse.json({ error: error.message || "Failed to save settings" }, { status: 500 })
  }
}
