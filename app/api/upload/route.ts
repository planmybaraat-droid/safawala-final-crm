import { NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { v4 as uuidv4 } from "uuid"
import { uploadToR2 } from "@/lib/r2-storage"
import { requireAuth } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'staff')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    console.log('[Upload API] File:', { name: file.name, size: file.size, type: file.type, folder })

    // File size validation (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg", 
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf"
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 })
    }

    const allowedFolders = new Set(["uploads", "products", "company", "hr", "kyc", "vendors", "documents", "logos"])
    const normalizedFolder = folder?.trim() || "uploads"
    if (normalizedFolder.includes("..") || normalizedFolder.includes("\\") || normalizedFolder.startsWith("/")) {
      return NextResponse.json({ error: "Invalid folder path" }, { status: 400 })
    }
    if (!allowedFolders.has(normalizedFolder)) {
      return NextResponse.json({ error: "Upload folder not allowed" }, { status: 403 })
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExtension}`
    const filePath = `${normalizedFolder}/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload file to Cloudflare R2
    const { publicUrl, key } = await uploadToR2(
      Buffer.from(buffer), 
      fileName, 
      file.type, 
      normalizedFolder
    )

    console.log('[Upload API] Upload successful:', publicUrl)

    return NextResponse.json({
      success: true,
      filename: fileName,
      filePath: key,
      url: publicUrl,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('[Upload API] Error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
