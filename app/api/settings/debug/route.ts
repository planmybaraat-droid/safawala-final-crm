import { NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { authenticateRequest, AuthMiddleware } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "super_admin" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseId = searchParams.get('franchise_id')

    if (franchiseId && !AuthMiddleware.canAccessFranchise(auth.user!, franchiseId)) {
      return NextResponse.json(
        { error: "Access denied to this franchise" },
        { status: 403 }
      )
    }

    console.log('🔍 [Settings Debug API] Checking data for franchise:', franchiseId)

    // Fetch all from each table
    const [companyResult, brandingResult, documentResult] = await Promise.all([
      supabase.from('company_settings').select('*'),
      supabase.from('branding_settings').select('*'),
      supabase.from('document_settings').select('*')
    ])

    // Handle errors
    if (companyResult.error) {
      console.error('❌ Company settings error:', companyResult.error)
    }
    if (brandingResult.error) {
      console.error('❌ Branding settings error:', brandingResult.error)
    }
    if (documentResult.error) {
      console.error('❌ Document settings error:', documentResult.error)
    }

    const companyData = companyResult.data || []
    const brandingData = brandingResult.data || []
    const documentData = documentResult.data || []

    console.log('📦 [Company Settings] Total rows:', companyData.length)
    console.log('📦 [Branding Settings] Total rows:', brandingData.length)
    console.log('📦 [Document Settings] Total rows:', documentData.length)

    // Filter by franchise if provided
    let brandingForFranchise = brandingData
    let documentForFranchise = documentData

    if (franchiseId) {
      brandingForFranchise = brandingData.filter((b: any) => b.franchise_id === franchiseId)
      documentForFranchise = documentData.filter((d: any) => d.franchise_id === franchiseId)

      console.log(`\n🎯 [${franchiseId}] Branding rows:`, brandingForFranchise.length)
      console.log(`🎯 [${franchiseId}] Document rows:`, documentForFranchise.length)
    }

    return NextResponse.json(
      {
        franchise_id: franchiseId,
        company_settings: {
          total: companyData.length,
          data: companyData.map((c: any) => ({
            id: c.id,
            company_name: c.company_name,
            email: c.email,
            phone: c.phone,
            gst_number: c.gst_number,
            address: c.address,
            logo_url: c.logo_url ? '✅ HAS VALUE' : '❌ NULL',
            website: c.website,
            created_at: c.created_at,
            updated_at: c.updated_at
          }))
        },
        branding_settings: {
          total: brandingData.length,
          for_franchise: franchiseId ? brandingForFranchise.length : 'N/A',
          data: brandingForFranchise.map((b: any) => ({
            id: b.id,
            franchise_id: b.franchise_id,
            primary_color: b.primary_color,
            secondary_color: b.secondary_color,
            accent_color: b.accent_color,
            background_color: b.background_color,
            font_family: b.font_family,
            logo_url: b.logo_url ? '✅ HAS VALUE' : '❌ NULL',
            created_at: b.created_at,
            updated_at: b.updated_at
          }))
        },
        document_settings: {
          total: documentData.length,
          for_franchise: franchiseId ? documentForFranchise.length : 'N/A',
          data: documentForFranchise.map((d: any) => ({
            id: d.id,
            franchise_id: d.franchise_id,
            invoice_number_format: d.invoice_number_format,
            quote_number_format: d.quote_number_format,
            invoice_template_id: d.invoice_template_id,
            quote_template_id: d.quote_template_id,
            default_payment_terms: d.default_payment_terms,
            default_tax_rate: d.default_tax_rate,
            show_gst_breakdown: d.show_gst_breakdown,
            default_terms_conditions: d.default_terms_conditions ? `✅ HAS VALUE (${d.default_terms_conditions.substring(0, 50)}...)` : '❌ NULL',
            created_at: d.created_at,
            updated_at: d.updated_at
          }))
        },
        summary: {
          message: franchiseId 
            ? `Checking data for franchise: ${franchiseId}`
            : 'Showing all data from all franchises',
          recommendations: [
            companyData.length === 0 ? '⚠️ Company settings table is EMPTY - need to add data' : '✅ Company settings has data',
            brandingData.length === 0 ? '⚠️ Branding settings table is EMPTY - need to add data' : `✅ Branding settings has ${brandingData.length} row(s)`,
            documentData.length === 0 ? '⚠️ Document settings table is EMPTY - need to add data' : `✅ Document settings has ${documentData.length} row(s)`,
            franchiseId && brandingForFranchise.length === 0 ? `⚠️ No branding data for franchise ${franchiseId}` : '✅ Branding data found for franchise',
            franchiseId && documentForFranchise.length === 0 ? `⚠️ No document data for franchise ${franchiseId}` : '✅ Document data found for franchise'
          ]
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Debug API error:', error)
    return NextResponse.json(
      { error: 'Failed to check settings data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
