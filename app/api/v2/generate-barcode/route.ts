import type { NextApiRequest, NextApiResponse } from 'next'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '@/lib/auth-middleware'

type ResponseData = {
  success?: boolean
  barcode?: string
  error?: string
}

/**
 * Generate a random 11-digit barcode
 */
function generateRandomBarcode(): string {
  let barcode = ''
  for (let i = 0; i < 11; i++) {
    barcode += Math.floor(Math.random() * 10)
  }
  return barcode
}

/**
 * Generate unique barcode by checking existing ones
 */
async function generateUniqueBarcode(supabase: any): Promise<string> {
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    const barcode = generateRandomBarcode()

    // Check if barcode already exists
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('barcode_number', barcode)
      .single()

    if (error && error.code === 'PGRST116') {
      // Not found - this barcode is unique
      return barcode
    }

    attempts++
  }

  throw new Error('Failed to generate unique barcode after 100 attempts')
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
  try {
    const barcode = await generateUniqueBarcode(supabase)

    return new Response(
      JSON.stringify({
        success: true,
        barcode
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Generate barcode error:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'staff' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
  try {
    const body = await request.json()
    const { product_id } = body

    if (!product_id) {
      return new Response(
        JSON.stringify({ error: 'product_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique barcode
    const barcode = await generateUniqueBarcode(supabase)

    // Update product with barcode
    const { data: product, error } = await supabase
      .from('products')
      .update({ barcode_number: barcode })
      .eq('id', product_id)
      .select('id, barcode_number')
      .single()

    if (error) throw error

    // Also create entry in barcodes table for reference
    await supabase.from('barcodes').insert({
      product_id,
      barcode_number: barcode,
      barcode_type: 'CODE128',
      is_active: true
    })

    return new Response(
      JSON.stringify({
        success: true,
        barcode
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Generate barcode error:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
