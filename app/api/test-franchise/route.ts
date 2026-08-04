import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest } from '@/lib/auth-middleware'

function isLocalDevRequest(request: NextRequest) {
  const host = request.nextUrl.hostname
  return process.env.NODE_ENV !== "production" && (
    host === "localhost" || host === "127.0.0.1" || host === "::1"
  )
}

export async function GET(request: NextRequest) {
  try {
    if (!isLocalDevRequest(request)) {
      return NextResponse.json({ error: "This endpoint is only available in local development" }, { status: 403 })
    }

    const auth = await authenticateRequest(request, { minRole: 'super_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const supabase = createClient()
    
    // Try to get all franchises
    const { data, error } = await supabase
      .from('franchises')
      .select('id, email, name')
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ franchises: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
