import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"

// Proxy /api/inventory → /api/products for portal compatibility
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  const { searchParams } = new URL(request.url)
  const params = searchParams.toString()
  const url = new URL(request.url)
  const productsUrl = `${url.origin}/api/products${params ? `?${params}` : ''}`

  const res = await fetch(productsUrl, {
    headers: {
      cookie: request.headers.get('cookie') || '',
      'content-type': 'application/json',
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
