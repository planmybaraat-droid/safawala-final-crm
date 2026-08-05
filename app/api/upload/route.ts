import { NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { v4 as uuidv4 } from "uuid"
import { uploadToR2 } from "@/lib/r2-storage"
import { requireAuth } from "@/lib/auth-middleware"

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"])
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"])

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

    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    const isPdf = file.type === "application/pdf" || extension === "pdf"
    const isImage = IMAGE_TYPES.has(file.type) || IMAGE_EXTENSIONS.has(extension)
    if (!isPdf && !isImage) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 })
    }

    const allowedFolders = new Set(["uploads", "products", "company", "hr", "kyc", "vendors", "documents", "logos", "travel-documents"])
    const normalizedFolder = folder?.trim() || "uploads"
    if (normalizedFolder.includes("..") || normalizedFolder.includes("\\") || normalizedFolder.startsWith("/")) {
      return NextResponse.json({ error: "Invalid folder path" }, { status: 400 })
    }
    if (!allowedFolders.has(normalizedFolder)) {
      return NextResponse.json({ error: "Upload folder not allowed" }, { status: 403 })
    }

    // Generate unique filename
    const fileExtension = extension || (isPdf ? "pdf" : "bin")
    const fileName = `${uuidv4()}.${fileExtension}`
    const filePath = `${normalizedFolder}/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const contentType = file.type || (isPdf ? "application/pdf" : `image/${extension === "jpg" ? "jpeg" : extension}`)
    let publicUrl: string
    let key: string
    if (process.env.CLOUDFLARE_R2_BUCKET_NAME) {
      const uploaded = await uploadToR2(Buffer.from(buffer), fileName, contentType, normalizedFolder)
      publicUrl = uploaded.publicUrl
      key = uploaded.key
    } else {
      // Production currently has Supabase configured but no R2 credentials.
      // Use the existing public `uploads` bucket as the safe fallback.
      const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "uploads"
      key = `${normalizedFolder}/${fileName}`
      const { error: storageError } = await supabase.storage.from(bucket).upload(key, Buffer.from(buffer), {
        contentType,
        cacheControl: "3600",
        upsert: false,
      })
      if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`)
      publicUrl = supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl
    }

    console.log('[Upload API] Upload successful:', publicUrl)

    return NextResponse.json({
      success: true,
      filename: fileName,
      filePath: key,
      url: publicUrl,
      size: file.size,
      type: contentType
    })
  } catch (error) {
    console.error('[Upload API] Error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
