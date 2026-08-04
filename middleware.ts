import { NextRequest, NextResponse } from "next/server"
import { verifyPdfToken } from "@/lib/pdf-token"

// Unified middleware: protect all pages by default; allow public paths and API
const PUBLIC_PATH_PREFIXES = [
  "/auth/login",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/portals",
  "/login",
  "/franchise-enquiry",
  "/_next",
  "/favicon",
  "/public",
  "/assets",
  "/sizebar",
  "/packages",
]

function isPublic(pathname: string) {
  // Root path "/" is the login page - always public
  if (pathname === "/") return true
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))
}

function hasSupabaseCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => c.name.startsWith("sb-"))
}

function isAuthDisabled() {
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Optional global switch to turn off auth quickly in dev
  if (isAuthDisabled()) {
    return NextResponse.next()
  }

  const hasUserCookie = request.cookies.has("safawala_user")
  const hasLegacySession = request.cookies.has("safawala_session")
  const hasSb = hasSupabaseCookie(request)

  // Any of these cookies indicates an authenticated browser session
  const isAuthed = hasUserCookie || hasLegacySession || hasSb

  // If user is already logged in, redirect them to their specific landing page if they go to the login pages
  const isLoginPage = pathname === "/" || pathname === "/auth/login"
  if (isLoginPage && isAuthed) {
    let redirectUrl = "/dashboard"
    if (hasUserCookie) {
      try {
        const rawUser = request.cookies.get("safawala_user")?.value
        if (rawUser) {
          const parsed = JSON.parse(rawUser)
          if (parsed?.role === "super_admin") {
            redirectUrl = "/admin"
          } else if (parsed?.department) {
            redirectUrl = `/portal/${parsed.department}`
          }
        }
      } catch (e) {
        console.error("[Middleware] Cookie parse error:", e)
      }
    }
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // Allow API routes and public paths
  if (pathname.startsWith("/api/") || isPublic(pathname)) {
    return NextResponse.next()
  }

  if (!isAuthed) {
    // Check for valid PDF token — allows Puppeteer to render invoice without login
    const pdfToken = request.nextUrl.searchParams.get("pdfToken")
    if (pdfToken && (await verifyPdfToken(pdfToken))) {
      return NextResponse.next()
    }
    const loginUrl = new URL("/", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Basic validation of legacy cookie if present
  if (hasLegacySession) {
    try {
      const raw = request.cookies.get("safawala_session")?.value || "{}"
      const parsed = JSON.parse(raw)
      if (!parsed?.id || !parsed?.email) {
        throw new Error("invalid")
      }
    } catch {
      const loginUrl = new URL("/", request.url)
      const resp = NextResponse.redirect(loginUrl)
      resp.cookies.set("safawala_session", "", { maxAge: 0, path: "/" })
      return resp
    }
  }

  return NextResponse.next()
}

export const config = {
  // Protect all routes except static files, images, favicon, and api
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
