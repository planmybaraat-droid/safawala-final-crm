import { NextRequest, NextResponse } from 'next/server'
import { generateInvoiceHTML } from '@/lib/invoice-html-template'
import { requireAuth } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'staff')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const invoiceData = await request.json()
    
    // Generate HTML
    const html = generateInvoiceHTML(invoiceData)
    
    // For now, return the HTML
    // In production, you would use Puppeteer or similar to convert to PDF
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generating invoice HTML:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
