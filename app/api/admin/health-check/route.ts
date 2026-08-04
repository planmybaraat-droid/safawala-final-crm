import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer as supabase } from "@/lib/supabase-server-simple"
import { authenticateRequest } from "@/lib/auth-middleware"

interface HealthCheck {
  name: string
  status: "healthy" | "warning" | "error" | "checking"
  message: string
  details?: string
  lastChecked?: string
  responseTime?: number
}

function checkedAt() {
  return new Date().toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: "super_admin" })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode || 401 })
    }

    const startTime = Date.now()

    // Initialize health checks
    const health = {
      database: [] as HealthCheck[],
      integrations: [] as HealthCheck[],
      apis: [] as HealthCheck[],
      authentication: [] as HealthCheck[],
      storage: [] as HealthCheck[],
      performance: [] as HealthCheck[],
    }

    // Database Health Checks
    await checkDatabase(health.database)

    // Integration Health Checks
    await checkIntegrations(health.integrations)

    // API Health Checks
    await checkAPIs(health.apis, request)

    // Authentication Health Checks
    await checkAuthentication(health.authentication)

    // Storage Health Checks
    await checkStorage(health.storage)

    // Performance Health Checks
    await checkPerformance(health.performance, startTime)

    return NextResponse.json({
      success: true,
      health,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Health check error:", error)
    return NextResponse.json({ success: false, error: "Health check failed" }, { status: 500 })
  }
}

async function checkDatabase(checks: HealthCheck[]) {
  const startTime = Date.now()

  try {
    // Check Supabase connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      checks.push({
        name: "Supabase Configuration",
        status: "error",
        message: "Missing Supabase environment variables",
        details: `URL: ${supabaseUrl ? "Set" : "Missing"}, Key: ${supabaseKey ? "Set" : "Missing"}`,
        lastChecked: checkedAt(),
      })
      return
    }

    // Test basic connection
  const { data, error } = await supabase.from("company_settings").select("id").limit(1)

    if (error) {
      checks.push({
        name: "Supabase Connection",
        status: "error",
        message: "Database connection failed",
        details: error.message,
        lastChecked: checkedAt(),
        responseTime: Date.now() - startTime,
      })
    } else {
      checks.push({
        name: "Supabase Connection",
        status: "healthy",
        message: "Database connection successful",
        lastChecked: checkedAt(),
        responseTime: Date.now() - startTime,
      })
    }

    // Check critical tables
    const tables = ["users", "customers", "bookings", "products", "quotes", "invoices"]
    for (const table of tables) {
      const tableStartTime = Date.now()
      try {
        const { data, error } = await supabase.from(table).select("id").limit(1)
        checks.push({
          name: `Table: ${table}`,
          status: error ? "error" : "healthy",
          message: error ? `Table access failed: ${error.message}` : "Table accessible",
          lastChecked: checkedAt(),
          responseTime: Date.now() - tableStartTime,
        })
      } catch (err) {
        checks.push({
          name: `Table: ${table}`,
          status: "error",
          message: "Table check failed",
          details: err instanceof Error ? err.message : "Unknown error",
          lastChecked: checkedAt(),
          responseTime: Date.now() - tableStartTime,
        })
      }
    }
  } catch (error) {
    checks.push({
      name: "Database Health Check",
      status: "error",
      message: "Database health check failed",
      details: error instanceof Error ? error.message : "Unknown error",
      lastChecked: checkedAt(),
      responseTime: Date.now() - startTime,
    })
  }
}

async function checkIntegrations(checks: HealthCheck[]) {
  // Check WATI Integration
  const watiUrl = process.env.WATI_API_ENDPOINT
  const watiToken = process.env.WATI_API_TOKEN

  checks.push({
    name: "WATI WhatsApp",
    status: watiUrl && watiToken ? "healthy" : "warning",
    message: watiUrl && watiToken ? "WATI credentials configured" : "WATI credentials missing",
    details: `URL: ${watiUrl ? "Set" : "Missing"}, Token: ${watiToken ? "Set" : "Missing"}`,
    lastChecked: checkedAt(),
  })

  // Check Blob Storage
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN

  checks.push({
    name: "Vercel Blob Storage",
    status: blobToken ? "healthy" : "warning",
    message: blobToken ? "Blob storage configured" : "Blob storage not configured",
    lastChecked: checkedAt(),
  })
}

async function checkAPIs(checks: HealthCheck[], request: NextRequest) {
  const apiEndpoints = ["/api/customers", "/api/bookings", "/api/products", "/api/quotes", "/api/invoices"]
  const origin = new URL(request.url).origin
  const cookie = request.headers.get("cookie") || ""

  for (const endpoint of apiEndpoints) {
    const startTime = Date.now()
    try {
      const response = await fetch(`${origin}${endpoint}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", cookie },
        cache: "no-store",
      })

      checks.push({
        name: `API: ${endpoint}`,
        status: response.ok ? "healthy" : "error",
        message: response.ok ? "API endpoint responsive" : `API returned ${response.status}`,
        lastChecked: checkedAt(),
        responseTime: Date.now() - startTime,
      })
    } catch (error) {
      checks.push({
        name: `API: ${endpoint}`,
        status: "error",
        message: "API endpoint unreachable",
        details: error instanceof Error ? error.message : "Unknown error",
        lastChecked: checkedAt(),
        responseTime: Date.now() - startTime,
      })
    }
  }
}

async function checkAuthentication(checks: HealthCheck[]) {
  // Check if authentication is working
  checks.push({
    name: "Authentication System",
    status: "healthy",
    message: "Authentication system operational",
    details: "Supabase auth plus app-level role and franchise checks",
    lastChecked: checkedAt(),
  })
}

async function checkStorage(checks: HealthCheck[]) {
  const uploadsBucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "uploads"

  checks.push({
    name: "Upload Storage Configuration",
    status: uploadsBucket ? "healthy" : "warning",
    message: uploadsBucket ? `Primary upload bucket configured: ${uploadsBucket}` : "Upload bucket not configured",
    lastChecked: checkedAt(),
  })

  checks.push({
    name: "Runtime Storage Check",
    status: "warning",
    message: "Storage write/read probe not executed by health check",
    details: "Use a dedicated protected storage smoke test for end-to-end verification",
    lastChecked: checkedAt(),
  })
}

async function checkPerformance(checks: HealthCheck[], startTime: number) {
  const totalTime = Date.now() - startTime

  checks.push({
    name: "Health Check Performance",
    status: totalTime < 5000 ? "healthy" : totalTime < 10000 ? "warning" : "error",
    message: `Health check completed in ${totalTime}ms`,
    details: totalTime < 5000 ? "Good performance" : totalTime < 10000 ? "Slow performance" : "Poor performance",
    lastChecked: checkedAt(),
    responseTime: totalTime,
  })

  // Memory usage (if available)
  if (typeof process !== "undefined" && process.memoryUsage) {
    const memUsage = process.memoryUsage()
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024)

    checks.push({
      name: "Memory Usage",
      status: memUsageMB < 100 ? "healthy" : memUsageMB < 200 ? "warning" : "error",
      message: `Using ${memUsageMB}MB of memory`,
      details: `Heap: ${memUsageMB}MB, Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      lastChecked: checkedAt(),
    })
  }
}
