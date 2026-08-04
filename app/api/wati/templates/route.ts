import { type NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return Response.json(auth.error, { status: auth.statusCode })
  }
  try {
    const response = await fetch("https://live-mt-server.wati.io/481455/api/v1/getMessageTemplates", {
      method: "GET",
      headers: {
        Authorization:
          "Bearer REDACTED_JWT",
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`WATI API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform WATI response to our format
    const templateStatuses: Record<string, string> = {}

    if (data.messageTemplates && Array.isArray(data.messageTemplates)) {
      data.messageTemplates.forEach((template: any) => {
        if (template.name && template.status) {
          templateStatuses[template.name] = template.status.toUpperCase()
        }
      })
    }

    return Response.json({
      success: true,
      templateStatuses,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching WATI templates:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch template statuses from WATI",
        templateStatuses: {},
      },
      { status: 500 },
    )
  }
}
