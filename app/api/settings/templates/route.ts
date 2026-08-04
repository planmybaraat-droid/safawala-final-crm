import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest } from "@/lib/auth-middleware"

// GET - Fetch templates by type
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'invoice' or 'quote'

    let query = supabase
      .from('invoice_templates')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}