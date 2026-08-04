import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { authenticateRequest, AuthMiddleware } from '@/lib/auth-middleware'

// Validation constants
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 
  'image/jpg', 
  'image/png', 
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff'
]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const BUCKET_NAME = 'banks' // Supabase storage bucket

// Fallback response when bucket doesn't exist
function createFallbackResponse(key: string, mime: string) {
  console.log('Creating fallback response for local development')
  
  // Create a data URL placeholder for development
  const fallbackUrl = `/api/uploads/fallback?key=${encodeURIComponent(key)}`
  
  return NextResponse.json({
    success: true,
    uploadUrl: fallbackUrl,
    publicUrl: fallbackUrl,
    key,
    fallback: true,
    development: true,
    note: 'Using fallback URL - create storage bucket in production'
  })
}

// POST /api/uploads/presign - Generate presigned URL for file upload
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const user = auth.user!
    const body = await request.json()
    const { key, mime, size, org_id } = body
    const effectiveOrgId = user.is_super_admin ? (org_id || null) : (user.franchise_id || null)

    console.log('Presign request:', { key, mime, size, org_id: effectiveOrgId })

    // Validation
    if (!key || !mime || !size) {
      console.error('Missing required fields:', { key: !!key, mime: !!mime, size: !!size })
      return NextResponse.json(
        { error: 'Missing required fields: key, mime, size' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(mime.toLowerCase())) {
      console.error('Invalid file type:', mime, 'Allowed:', ALLOWED_MIME_TYPES)
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (size > MAX_FILE_SIZE) {
      console.error('File too large:', size, 'Max:', MAX_FILE_SIZE)
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // Validate key format (should be: banks/{org_id}/{uuid}.{ext})
    const keyParts = key.split('/')
    if (keyParts.length !== 3 || keyParts[0] !== 'banks') {
      console.error('Invalid key format:', key, 'Parts:', keyParts)
      return NextResponse.json(
        { error: 'Invalid key format. Expected: banks/{org_id}/{filename}' },
        { status: 400 }
      )
    }

    // More flexible org_id validation - allow the key to define the org_id
    const keyOrgId = keyParts[1]
    console.log('Key org_id:', keyOrgId, 'Provided org_id:', effectiveOrgId)

    if (!effectiveOrgId) {
      return NextResponse.json(
        { error: 'Organization context is required' },
        { status: 400 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(user, effectiveOrgId)) {
      return NextResponse.json(
        { error: 'Access denied to this organization' },
        { status: 403 }
      )
    }

    if (keyOrgId !== effectiveOrgId) {
      return NextResponse.json(
        { error: 'Upload key organization does not match authenticated organization' },
        { status: 403 }
      )
    }

    // Generate file extension from mime type
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg', 
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff'
    }
    const expectedExt = extMap[mime.toLowerCase()]
    const actualExt = key.split('.').pop()?.toLowerCase()

    console.log('Extension validation:', { mime, expectedExt, actualExt })

    // More flexible extension validation - allow common variations
    const isValidExt = actualExt === expectedExt || 
                      (mime.toLowerCase() === 'image/jpeg' && (actualExt === 'jpeg' || actualExt === 'jpg')) ||
                      (actualExt === 'jpeg' && (expectedExt === 'jpg' || expectedExt === 'jpeg'))

    if (!isValidExt) {
      console.error('Extension mismatch:', actualExt, 'expected:', expectedExt)
      return NextResponse.json(
        { error: `File extension must match MIME type. Expected: .${expectedExt} for ${mime}` },
        { status: 400 }
      )
    }

    try {
      // First, try to check if the bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()
      
      if (listError) {
        console.warn('Cannot list buckets:', listError)
        return createFallbackResponse(key, mime)
      }
      
  const banksBucket = buckets?.find((bucket: any) => bucket.name === BUCKET_NAME)
      
      if (!banksBucket) {
        console.warn(`Bucket '${BUCKET_NAME}' does not exist. Creating fallback response.`)
        return createFallbackResponse(key, mime)
      }

      // Create presigned URL for upload
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(key, {
          upsert: true // Allow overwriting existing files
        })

      if (uploadError) {
        console.error('Supabase upload URL error:', uploadError)
        return createFallbackResponse(key, mime)
      }

      // Get public URL for the file
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(key)

      const response = {
        success: true,
        uploadUrl: uploadData.signedUrl,
        publicUrl: publicUrlData.publicUrl,
        key,
        expiresIn: '1 hour',
        instructions: {
          method: 'PUT',
          headers: {
            'Content-Type': mime
          },
          note: 'Use the uploadUrl to PUT the file directly'
        }
      }

      return NextResponse.json(response)

    } catch (storageError) {
      console.error('Storage error:', storageError)
      console.log('Using fallback response due to storage error')
      return createFallbackResponse(key, mime)
    }

  } catch (error) {
    console.error('Error in presign POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/uploads/presign - Get upload configuration (optional helper)
export async function GET() {
  return NextResponse.json({
    success: true,
    config: {
      allowedTypes: ALLOWED_MIME_TYPES,
      maxSize: MAX_FILE_SIZE,
      maxSizeMB: MAX_FILE_SIZE / (1024 * 1024),
      bucket: BUCKET_NAME,
      keyFormat: 'banks/{org_id}/{uuid}.{ext}',
      note: 'POST to this endpoint with key, mime, and size to get presigned upload URL'
    }
  })
}
