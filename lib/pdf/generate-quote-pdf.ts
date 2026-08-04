/**
 * Quote PDF Generation with Multiple Design Options
 * Allows switching between Classic and Modern PDF designs
 */

import { Quote } from "@/lib/types"
import { prepareQuotePDFData } from "./prepare-quote-pdf"
import { generatePDF as generateClassicPDF } from "./pdf-service"
import { generateModernPDF } from "./pdf-service-modern"

export type PDFDesignType = "classic" | "modern"

/**
 * Generate and download a quote PDF
 * @param quote - The quote data
 * @param franchiseId - Current franchise ID for fetching branding/banking settings
 * @param design - PDF design type: "classic" or "modern" (default: "classic")
 */
export async function downloadQuotePDF(
  quote: Quote,
  franchiseId: string | undefined,
  design: PDFDesignType = "classic"
): Promise<void> {
  try {
    console.log(`[PDF Download] Generating ${design} PDF for quote ${quote.quote_number}`)

    // Prepare data (same for both designs)
    const pdfData = await prepareQuotePDFData({ quote, franchiseId })

    // Generate PDF based on selected design
    let pdfBlob: Blob
    if (design === "modern") {
      pdfBlob = await generateModernPDF(pdfData)
    } else {
      pdfBlob = await generateClassicPDF(pdfData)
    }

    // Create download link
    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${quote.quote_number}_${design}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log(`[PDF Download] ${design} PDF downloaded successfully`)
  } catch (error) {
    console.error(`[PDF Download] Error generating ${design} PDF:`, error)
    throw error
  }
}

/**
 * Generate PDF blob without downloading (for preview)
 */
export async function generateQuotePDFBlob(
  quote: Quote,
  franchiseId: string | undefined,
  design: PDFDesignType = "classic"
): Promise<Blob> {
  const pdfData = await prepareQuotePDFData({ quote, franchiseId })
  
  if (design === "modern") {
    return await generateModernPDF(pdfData)
  } else {
    return await generateClassicPDF(pdfData)
  }
}
