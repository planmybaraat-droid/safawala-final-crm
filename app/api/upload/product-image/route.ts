import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAuth, AuthMiddleware } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = "product-images"
const MAX_SIZE_MB = 10

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "staff")
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const user = auth.authContext!.user
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    let franchiseId = formData.get("franchiseId") as string | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (!franchiseId || franchiseId === "null" || franchiseId === "undefined" || franchiseId.trim() === "") {
      franchiseId = user.franchise_id || null
    }

    if (!franchiseId) {
      return NextResponse.json({ error: "Franchise context is required" }, { status: 400 })
    }

    if (!AuthMiddleware.canAccessFranchise(user, franchiseId)) {
      return NextResponse.json({ error: "Access denied to this franchise" }, { status: 403 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ext = file.name.split(".").pop() || "jpg"
    const path = `products/${franchiseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[upload] Storage error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl, path })
  } catch (err: any) {
    console.error("[upload] Unexpected error:", err)
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 })
  }
}
