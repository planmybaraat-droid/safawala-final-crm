import { NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"

/**
 * Save image to database as base64
 * This avoids RLS policy issues with Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'staff')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const user = auth.authContext!.user
    const formData = await request.formData()
    const file = formData.get("file") as File
    const requestedFranchiseId = formData.get("franchiseId") as string
    const franchiseId = requestedFranchiseId || user.franchise_id

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    if (!franchiseId) {
      return NextResponse.json(
        { error: "Franchise ID required" },
        { status: 400 }
      )
    }

    if (!AuthMiddleware.canAccessFranchise(user, franchiseId)) {
      return NextResponse.json(
        { error: "Access denied to this franchise" },
        { status: 403 }
      )
    }

    // File size validation (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      )
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Use JPG, PNG, GIF, or WebP" },
        { status: 400 }
      )
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`

    // Store in product_images table
    const { data, error } = await supabase
      .from("product_images")
      .insert([
        {
          franchise_id: franchiseId,
          image_data: dataUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        },
      ])
      .select()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Failed to save image" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: dataUrl,
      imageId: data?.[0]?.id,
    })
  } catch (error) {
    console.error("Image save API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
