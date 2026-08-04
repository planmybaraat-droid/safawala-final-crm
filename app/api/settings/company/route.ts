import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiResponseBuilder, validateRequiredFields, validateEmail } from '@/lib/api-response'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

// GET - Fetch company settings
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin', requirePermission: 'settings' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const franchiseId = searchParams.get('franchise_id')

    if (!franchiseId) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Franchise ID is required', 'franchise_id'),
        { status: 400 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(auth.user!, franchiseId)) {
      return NextResponse.json(
        ApiResponseBuilder.forbiddenError('Access denied to this franchise'),
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('franchise_id', franchiseId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Database error fetching company settings:', error)
      return NextResponse.json(
        ApiResponseBuilder.databaseError(error, 'fetch company settings'),
        { status: 500 }
      )
    }

    return NextResponse.json(
      ApiResponseBuilder.success(data || {}, 'Company settings retrieved successfully')
    )
  } catch (error) {
    console.error('Unexpected error fetching company settings:', error)
    return NextResponse.json(
      ApiResponseBuilder.serverError('Failed to fetch company settings'),
      { status: 500 }
    )
  }
}

// POST/PUT - Create or update company settings
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin', requirePermission: 'settings' })
    if (!auth.authorized) return NextResponse.json(auth.error, { status: auth.statusCode || 401 })

    const supabase = createClient()
    const body = await request.json()

    // Validate required fields including franchise_id
    const requiredFields = ['franchise_id', 'company_name', 'email']
    const validation = validateRequiredFields(body, requiredFields)
    if (validation) {
      return NextResponse.json(
        ApiResponseBuilder.multiFieldValidationError(validation),
        { status: 422 }
      )
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return NextResponse.json(
        ApiResponseBuilder.validationError('Please enter a valid email address', 'email'),
        { status: 422 }
      )
    }

    const {
      franchise_id,
      company_name,
      email,
      phone,
      gst_number,
      gst_percentage,
      address,
      city,
      state,
      pincode,
      pan_number,
      website,
      logo_url,
      terms_conditions
    } = body

    if (!AuthMiddleware.canAccessFranchise(auth.user!, franchise_id)) {
      return NextResponse.json(
        ApiResponseBuilder.forbiddenError('Access denied to this franchise'),
        { status: 403 }
      )
    }

    // Check if settings exist for this franchise
    const { data: existing, error: fetchError } = await supabase
      .from('company_settings')
      .select('id')
      .eq('franchise_id', franchise_id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Database error checking existing settings:', fetchError)
      return NextResponse.json(
        ApiResponseBuilder.databaseError(fetchError, 'check existing settings'),
        { status: 500 }
      )
    }

    const settingsData = {
      franchise_id,
      company_name: company_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      gst_number: gst_number?.trim() || null,
      gst_percentage: gst_percentage !== undefined ? Number(gst_percentage) : 5.0,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      pincode: pincode?.trim() || null,
      pan_number: pan_number ? pan_number.trim().toUpperCase() : null,
      website: website?.trim() || null,
      logo_url: logo_url?.trim() || null,
      terms_conditions: terms_conditions?.trim() || null,
      updated_at: new Date().toISOString()
    }

    let result
    if (existing) {
      // Update existing
      result = await supabase
        .from('company_settings')
        .update(settingsData)
        .eq('id', existing.id)
        .eq('franchise_id', franchise_id)
        .select()
        .single()
    } else {
      // Create new
      result = await supabase
        .from('company_settings')
        .insert(settingsData)
        .select()
        .single()
    }

    if (result.error) {
      console.error('Database error saving company settings:', result.error)
      console.error('Full error details:', JSON.stringify(result.error, null, 2))
      
      // Check if error is about missing gst_percentage column
      if (result.error.message?.includes('gst_percentage') || result.error.message?.includes('column')) {
        return NextResponse.json({
          error: 'Database schema issue: gst_percentage column may be missing',
          message: 'Please run the GST percentage migration in Supabase',
          sql: `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 5.00;`,
          details: result.error.message
        }, { status: 400 })
      }
      
      return NextResponse.json(
        ApiResponseBuilder.databaseError(result.error, 'save company settings'),
        { status: 500 }
      )
    }

    return NextResponse.json(
      ApiResponseBuilder.success(result.data, 'Company settings saved successfully')
    )
  } catch (error) {
    console.error('Unexpected error saving company settings:', error)
    return NextResponse.json(
      ApiResponseBuilder.serverError('Failed to save company settings'),
      { status: 500 }
    )
  }
}
