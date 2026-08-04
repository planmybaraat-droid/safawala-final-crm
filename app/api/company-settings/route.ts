import { NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user and get franchise context
    const authResult = await requireAuth(request, 'readonly')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const { authContext } = authResult
    const franchiseId = authContext!.user.franchise_id
    const userId = authContext!.user.id
    
    if (!userId || !franchiseId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`[Company Settings] Fetching for franchise: ${franchiseId}`)

    // Get company settings for the user's franchise
    const { data: settings, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('franchise_id', franchiseId)
      .single()
    
    console.log('[Company Settings] Retrieved settings:', settings)

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching company settings:', error)
      return NextResponse.json(
        { error: "Failed to fetch company settings" },
        { status: 500 }
      )
    }

    // If no settings exist for this franchise, return franchise name as default
    if (!settings) {
      const { data: franchise } = await supabase
        .from('franchises')
        .select('name, code, city')
        .eq('id', franchiseId)
        .single()

      const defaultSettings = {
        id: null,
        franchise_id: franchiseId,
        company_name: franchise?.name || 'Safawala CRM',
        email: '',
        phone: '',
        address: '',
        city: franchise?.city || '',
        state: '',
        gst_number: '',
        pincode: '',
        pan_number: '',
        logo_url: null,
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        website: null,
        language: null,
        date_format: null,
        terms_conditions: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      return NextResponse.json(defaultSettings)
    }

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Company settings API error:', error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Authenticate user and get franchise context
    const authResult = await requireAuth(request, 'franchise_admin')
    if (!authResult.success) {
      return NextResponse.json(authResult.response, { status: 401 })
    }
    const { authContext } = authResult
    const franchiseId = authContext!.user.franchise_id
    const userId = authContext!.user.id
    
    if (!userId || !franchiseId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      company_name,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      gst_number,
      pan_number,
      logo_url,
      timezone,
      currency,
      website,
      language,
      date_format,
      terms_conditions
    } = body

    // Validate required fields
    if (!company_name || !email) {
      return NextResponse.json(
        { error: "Company name and email are required" },
        { status: 400 }
      )
    }

    // Check if company settings exist for this franchise
    const { data: existingSettings } = await supabase
      .from('company_settings')
      .select('id')
      .eq('franchise_id', franchiseId)
      .single()

    const settingsData: any = {
      franchise_id: franchiseId,
      company_name,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      gst_number,
      pan_number,
      logo_url,
      timezone: timezone || 'Asia/Kolkata',
      currency: currency || 'INR',
      website,
      language,
      date_format,
      terms_conditions,
      updated_at: new Date().toISOString()
    }

    let result

    if (existingSettings) {
      // Update existing settings
      result = await supabase
        .from('company_settings')
        .update(settingsData)
        .eq('id', existingSettings.id)
        .eq('franchise_id', franchiseId)
        .select()
        .single()
    } else {
      // Create new settings
      result = await supabase
        .from('company_settings')
        .insert({
          ...settingsData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error saving company settings:', result.error)
      return NextResponse.json(
        { error: "Failed to save company settings" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error('Company settings API error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
