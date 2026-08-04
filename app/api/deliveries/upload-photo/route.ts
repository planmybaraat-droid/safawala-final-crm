import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { uploadToR2 } from "@/lib/r2-storage"

export const dynamic = "force-dynamic"
export const runtime = 'nodejs'

/**
 * POST /api/deliveries/upload-photo
 * Upload handover photo to Supabase storage
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "staff" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const deliveryId = formData.get("delivery_id") as string

    if (!file || !deliveryId) {
      return NextResponse.json(
        { error: "File and delivery_id are required" },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // Create unique file path
    const fileName = `handover-photo-${deliveryId}-${Date.now()}.jpg`
    const filePath = `deliveries/${deliveryId}/${fileName}`

    // Upload to R2 storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))
    
    const { publicUrl, key } = await uploadToR2(
      buffer,
      fileName,
      file.type || "image/jpeg",
      `deliveries/${deliveryId}`
    )

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: key
    })

  } catch (error: any) {
    console.error("Error uploading photo:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
