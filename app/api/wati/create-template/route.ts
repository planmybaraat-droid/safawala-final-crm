import { type NextRequest, NextResponse } from "next/server"
import { SAFAWALA_TEMPLATES } from "@/lib/wati-templates"
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'franchise_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }
  try {
    const { templateName, bulkSubmit } = await request.json()

    // WATI doesn't support programmatic template creation via API
    // Templates must be created manually through WATI dashboard

    if (bulkSubmit) {
      // Generate manual submission format for all templates
      const manualFormats = SAFAWALA_TEMPLATES.map((template) => ({
        templateName: template.name,
        category: template.category,
        language: template.language,
        components: template.components,
        manualFormat: generateManualSubmissionFormat(template),
      }))

      return NextResponse.json({
        success: false,
        message:
          "WATI API doesn't support programmatic template creation. Please use the export feature and submit manually through WATI dashboard.",
        requiresManualSubmission: true,
        templates: manualFormats,
      })
    } else {
      // Generate manual submission format for single template
      const template = SAFAWALA_TEMPLATES.find((t) => t.name === templateName)
      if (!template) {
        return NextResponse.json({ success: false, message: `Template ${templateName} not found` }, { status: 404 })
      }

      return NextResponse.json({
        success: false,
        message:
          "WATI API doesn't support programmatic template creation. Please submit manually through WATI dashboard.",
        requiresManualSubmission: true,
        template: {
          name: template.name,
          category: template.category,
          language: template.language,
          manualFormat: generateManualSubmissionFormat(template),
        },
      })
    }
  } catch (error) {
    console.error("[v0] Template processing error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to process template",
      },
      { status: 500 },
    )
  }
}

function generateManualSubmissionFormat(template: any) {
  return {
    name: template.name,
    language: template.language || "en",
    category: template.category,
    components: template.components.map((component: any) => ({
      type: component.type,
      format: component.format,
      text: component.text,
      example: component.example,
      buttons: component.buttons,
    })),
  }
}
