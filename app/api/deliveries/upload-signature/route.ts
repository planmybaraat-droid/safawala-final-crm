import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateRequest } from "@/lib/auth-middleware"
import { uploadToR2 } from "@/lib/r2-storage"

export const dynamic = "force-dynamic"

/**
 * POST /api/deliveries/upload-signature
 * Upload handover signature to Supabase storage
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "staff", requirePermission: "deliveries" })
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

    // Create unique file path
    const fileName = `handover-signature-${deliveryId}-${Date.now()}.png`
    const filePath = `deliveries/${deliveryId}`

    // Upload to R2 storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))
    
    const { publicUrl, key } = await uploadToR2(
      buffer,
      fileName,
      file.type || "image/png",
      filePath
    )

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: key
    })

  } catch (error: any) {
    console.error("Error uploading signature:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
