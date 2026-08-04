/**
 * PDF Data Preparation Utility for Quotes & Invoices
 * Fetches all required data and formats it for the new PDF service
 */

import type { Quote, QuoteItem } from "@/lib/types"
import type { DocumentData } from "@/lib/pdf/pdf-service"

interface PrepareQuotePDFOptions {
  quote: Quote
  franchiseId?: string
  includeNotes?: boolean
  includeTerms?: boolean
}

/**
 * Prepare quote data for PDF generation
 * Fetches company settings, branding colors, and banking details
 */
export async function prepareQuotePDFData(options: PrepareQuotePDFOptions): Promise<DocumentData> {
  const { quote, franchiseId, includeNotes = true, includeTerms = true } = options

  try {
    // Fetch company settings
    const companyResponse = await fetch("/api/company-settings")
    const companyData = companyResponse.ok ? await companyResponse.json() : null
    const companySettings = companyData?.data || companyData
    
    console.log("[PDF Data] Company settings:", companySettings)

    // Fetch branding settings (colors, logo, signature) if franchise_id available
    // Only use primary and secondary colors as per requirement
    let brandingColors = { primary: "#1a2a56", secondary: "#6b7280" }
    let logoUrl: string | null = null
    let signatureUrl: string | null = null
    
    if (franchiseId) {
      try {
        console.log(`[PDF Data] Fetching branding settings for franchise: ${franchiseId}`)
        const brandingResponse = await fetch(`/api/settings/branding?franchise_id=${franchiseId}`)
        const brandingData = brandingResponse.ok ? await brandingResponse.json() : null
        
        console.log(`[PDF Data] Branding response:`, brandingData)
        
        if (brandingData?.data) {
          brandingColors = {
            primary: brandingData.data.primary_color || brandingColors.primary,
            secondary: brandingData.data.secondary_color || brandingColors.secondary,
          }
          // Get logo and signature from branding settings
          logoUrl = brandingData.data.logo_url || null
          signatureUrl = brandingData.data.signature_url || null
          
          console.log(`[PDF Data] Logo URL: ${logoUrl}`)
          console.log(`[PDF Data] Signature URL: ${signatureUrl}`)
        } else {
          console.warn("[PDF Data] No branding data found")
        }
      } catch (error) {
        console.warn("[PDF Data] Failed to fetch branding settings, using defaults", error)
      }
    } else {
      console.warn("[PDF Data] No franchise_id provided, cannot fetch branding settings")
    }

    // Fetch banking details if franchise_id available
    let bankingInfo = null
    
    if (franchiseId) {
      try {
        const bankingResponse = await fetch(`/api/settings/banking?franchise_id=${franchiseId}`)
        const bankingData = bankingResponse.ok ? await bankingResponse.json() : null
        
        if (bankingData?.data && bankingData.data.length > 0) {
          const primaryBank = bankingData.data.find((bank: any) => bank.is_primary) || bankingData.data[0]
          
          bankingInfo = {
            bank_name: primaryBank.bank_name || "",
            account_holder: primaryBank.account_holder_name || "",
            account_number: primaryBank.account_number || "",
            ifsc_code: primaryBank.ifsc_code || "",
            branch: primaryBank.branch_name || "",
            upi_id: primaryBank.upi_id || undefined,
            // Support either qr_file_path (new) or qr_code_url (legacy)
            qr_code_url: primaryBank.qr_file_path || primaryBank.qr_code_url || undefined,
          }
        }
      } catch (error) {
        console.warn("[PDF Data] Failed to fetch banking details", error)
      }
    }

    // Calculate pricing
    const subtotal = quote.total_amount - (quote.tax_amount || 0)
    const advanceAmount = quote.total_amount * 0.5 // 50% advance
    const balanceAmount = quote.total_amount - advanceAmount

    // Prepare document data
    const documentData: DocumentData = {
      // Document info
      document_type: "quote",
      document_number: quote.quote_number,
      document_date: quote.created_at || new Date().toISOString(),
      valid_until: quote.valid_until || undefined,
      status: quote.status,

      // Company info
      company: {
        name: companySettings?.company_name || "Safawala Wedding Accessories",
        address: companySettings?.address || "123 Wedding Street",
        city: companySettings?.city || "Delhi",
        state: companySettings?.state || "Delhi",
        pincode: companySettings?.pincode || undefined,
        phone: companySettings?.phone || "+91 98765 43210",
        email: companySettings?.email || "info@safawala.com",
        website: companySettings?.website || undefined,
        gst_number: companySettings?.gst_number || undefined,
        // Logo and signature from branding settings
        logo_url: logoUrl,
        signature_url: signatureUrl,
      },

      // Customer info
      customer: {
        name: quote.customer_name || "Customer",
        phone: quote.customer_phone || "",
        email: quote.customer_email || undefined,
        whatsapp: quote.customer_whatsapp || undefined,
        address: quote.customer_address || undefined,
        city: quote.customer_city || undefined,
        state: quote.customer_state || undefined,
        pincode: quote.customer_pincode || undefined,
      },

      // Event info
      event: quote.event_type ? {
        event_type: quote.event_type,
        event_date: quote.event_date || "",
        event_for: quote.event_for || undefined,
        groom_name: quote.groom_name || undefined,
        bride_name: quote.bride_name || undefined,
        venue_name: quote.venue_name || undefined,
        venue_address: quote.venue_address || undefined,
      } : undefined,

      // Delivery info
      delivery: {
        delivery_date: quote.delivery_date || "",
        return_date: quote.return_date || "",
      },

      // Items
      items: quote.quote_items?.map((item: QuoteItem) => ({
        product_name: item.product_name || "",
        category: item.category || undefined,
        product_code: item.product_code || undefined,
        variant_name: (item as any).variant_name || undefined,
        inclusions: (item as any).variant_inclusions || (item as any).inclusions || undefined,
        extra_safas: (item as any).extra_safas || undefined,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        security_deposit: item.security_deposit || 0,
      })) || [],

      // Pricing
      pricing: {
        subtotal,
        discount: 0,
        tax_amount: quote.tax_amount || 0,
        tax_percentage: 18, // Default GST
        security_deposit: quote.security_deposit || 0,
        total_amount: quote.total_amount,
        advance_amount: advanceAmount,
        advance_percentage: 50,
        balance_amount: balanceAmount,
      },

      // Additional info
      notes: includeNotes ? (quote.notes || undefined) : undefined,
      special_instructions: quote.special_instructions || undefined,
      terms_and_conditions: includeTerms ? (
        // Use terms from company settings if available, split by newlines
        companySettings?.terms_conditions 
          ? companySettings.terms_conditions
              .split('\n')
              .map((term: string) => term.trim())
              .filter((term: string) => term.length > 0)
          : [
              "All items must be returned in the same condition as provided.",
              "Security deposit will be refunded after inspection of returned items.",
              "Any damage or loss will be charged from the security deposit.",
              "Booking confirmation requires advance payment as specified.",
              "Cancellation charges apply as per our cancellation policy.",
              "Delivery and pickup timings must be coordinated in advance.",
              "Customer is responsible for the safety of items during the rental period.",
              "Payment balance must be cleared before or on the delivery date.",
            ]
      ) : undefined,

      // Banking
      banking: bankingInfo,

      // Branding
      branding: brandingColors,
    }

    return documentData
  } catch (error) {
    console.error("[PDF Data] Error preparing quote PDF data:", error)
    throw new Error(`Failed to prepare PDF data: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Download quote as PDF
 */
export async function downloadQuotePDF(quote: Quote, franchiseId?: string): Promise<void> {
  try {
    // Import PDF service dynamically to avoid SSR issues
    const { generatePDF } = await import("@/lib/pdf/pdf-service")
    
    // Prepare data
    const pdfData = await prepareQuotePDFData({ quote, franchiseId })
    
    // Generate PDF
    const pdfBlob = await generatePDF(pdfData)
    
    // Download
    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Quote_${quote.quote_number}_${quote.customer_name?.replace(/\s+/g, "_")}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    console.log("[PDF Download] Successfully downloaded quote PDF")
  } catch (error) {
    console.error("[PDF Download] Error downloading quote PDF:", error)
    throw error
  }
}
