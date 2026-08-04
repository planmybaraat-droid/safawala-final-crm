import { NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const user = auth.user!
    const franchiseId = user.franchise_id
    if (!franchiseId) {
      return NextResponse.json({ error: 'Franchise context is required' }, { status: 400 })
    }
    // Get company settings
    const { data: settings, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('franchise_id', franchiseId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching company settings:', error)
      return NextResponse.json(
        { error: "Failed to fetch company settings" },
        { status: 500 }
      )
    }

    // Return settings or default values
    const defaultSettings = {
      id: 1,
      franchise_id: franchiseId,
      company_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      gst_number: '',
      logo_url: null,
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      website: null,
      language: null,
      date_format: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return NextResponse.json(settings || defaultSettings)
  } catch (error) {
    console.error('Company settings API error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const user = auth.user!
    const franchiseId = user.franchise_id
    if (!franchiseId) {
      return NextResponse.json({ error: 'Franchise context is required' }, { status: 400 })
    }
    const body = await request.json()
    const {
      company_name,
      email,
      phone,
      address,
      city,
      state,
      gst_number,
      logo_url,
      timezone,
      currency,
      website,
      language,
      date_format
    } = body

    // Validate required fields
    if (!company_name || !email) {
      return NextResponse.json(
        { error: "Company name and email are required" },
        { status: 400 }
      )
    }

    // Check if company settings exist
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
      gst_number,
      logo_url,
      timezone: timezone || 'Asia/Kolkata',
      currency: currency || 'INR',
      website,
      language,
      date_format,
      updated_at: new Date().toISOString()
    }

    // Add city and state only if they exist in the request and are supported by the database
    if (city !== undefined) {
      settingsData.city = city
    }
    if (state !== undefined) {
      settingsData.state = state
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
