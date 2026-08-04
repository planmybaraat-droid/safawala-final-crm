import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "staff")
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")

    if (!path) {
      return NextResponse.json({ error: "Path parameter required" }, { status: 400 })
    }

    if (path.includes("..") || path.includes("/etc/") || path.includes("\\")) {
      return NextResponse.json({ error: "Invalid path detected" }, { status: 400 })
    }

    // Additional security checks
    const dangerousPaths = ["/etc/passwd", "/etc/shadow", "/proc/", "/sys/"]
    if (dangerousPaths.some((dangerous) => path.includes(dangerous))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      message: "Path traversal prevention working",
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
