import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'

// Fallback upload endpoint for development when storage bucket doesn't exist
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'staff')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 })
    }

    if (key.includes('..') || key.includes('\\') || key.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid key parameter' }, { status: 400 })
    }

    // Read the file data
    const buffer = await request.arrayBuffer()
    const file = new Uint8Array(buffer)
    
    console.log(`Fallback upload: ${key} (${file.length} bytes)`)
    
    // In a real implementation, you might save to local filesystem
    // For now, we'll just return success with a placeholder URL
    const publicUrl = `/uploads/fallback/${key}`
    
    return new Response(null, { 
      status: 200,
      headers: {
        'x-uploaded-key': key,
        'x-public-url': publicUrl
      }
    })
    
  } catch (error) {
    console.error('Fallback upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// Handle GET requests to serve placeholder images
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  
  // Return a simple SVG placeholder
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f3f4f6"/>
      <text x="100" y="100" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14" fill="#6b7280">
        QR Code Placeholder
      </text>
      <text x="100" y="120" text-anchor="middle" dy=".3em" font-family="Arial" font-size="10" fill="#9ca3af">
        ${key?.split('/').pop() || 'image.png'}
      </text>
    </svg>
  `
  
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache'
    }
  })
}
