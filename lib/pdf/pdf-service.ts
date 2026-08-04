/**
 * Professional PDF Generation Service
 * Used for Quotes and Invoices
 * Supports multi-page documents with proper page breaks
 */

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface BrandingColors {
  primary: string
  secondary: string
}

interface CompanyInfo {
  name: string
  address: string
  city: string
  state: string
  pincode?: string
  phone: string
  email: string
  website?: string
  gst_number?: string
  logo_url?: string | null
  signature_url?: string | null
}

interface BankingInfo {
  bank_name: string
  account_holder: string
  account_number: string
  ifsc_code: string
  branch: string
  upi_id?: string
  qr_code_url?: string
}

interface CustomerInfo {
  name: string
  phone: string
  email?: string
  whatsapp?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
}

interface EventInfo {
  event_type: string
  event_date: string
  event_for?: string
  groom_name?: string
  bride_name?: string
  venue_name?: string
  venue_address?: string
}

interface DeliveryInfo {
  delivery_date: string
  return_date: string
}

interface QuoteItem {
  product_name: string
  category?: string
  product_code?: string
  variant_name?: string // Package variant name
  inclusions?: string[] // Package variant inclusions
  extra_safas?: number // Extra safas for packages
  quantity: number
  unit_price: number
  total_price: number
  security_deposit?: number
}

interface PricingInfo {
  subtotal: number
  discount?: number
  tax_amount: number
  tax_percentage?: number
  security_deposit: number
  total_amount: number
  advance_amount?: number
  advance_percentage?: number
  balance_amount?: number
}

interface DocumentData {
  // Document info
  document_type: "quote" | "invoice"
  document_number: string
  document_date: string
  valid_until?: string
  status?: string
  
  // Company & Customer
  company: CompanyInfo
  customer: CustomerInfo
  
  // Event & Delivery
  event?: EventInfo
  delivery?: DeliveryInfo
  
  // Items & Pricing
  items: QuoteItem[]
  pricing: PricingInfo
  
  // Additional Info
  notes?: string
  special_instructions?: string
  terms_and_conditions?: string[]
  
  // Banking (optional)
  banking?: BankingInfo | null
  
  // Branding
  branding?: BrandingColors
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [25, 42, 86] // Default navy blue
}

function formatCurrency(amount: number): string {
  // Use 'Rs.' prefix to avoid font issues with the rupee glyph on some viewers
  return `Rs. ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateString: string): string {
  if (!dateString) return "N/A"
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return dateString
  }
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = ""

  words.forEach((word) => {
    const testLine = currentLine + (currentLine ? " " : "") + word
    const textWidth = doc.getTextWidth(testLine)
    
    if (textWidth > maxWidth) {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  })
  
  if (currentLine) lines.push(currentLine)
  return lines
}

// ============================================================================
// PDF GENERATION CLASS
// ============================================================================

class PDFGenerator {
  private doc: jsPDF
  private data: DocumentData
  private assets: { logo?: string; signature?: string; qr?: string } = {}
  private colors: {
    primary: [number, number, number]
    secondary: [number, number, number]
    white: [number, number, number]
    lightGray: [number, number, number]
    lightCream: [number, number, number]
    darkText: [number, number, number]
  }
  private pageWidth: number
  private pageHeight: number
  private margin: number
  private currentY: number
  private currentPage: number

  constructor(data: DocumentData) {
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })
    
    // Set default font to Poppins (use helvetica as fallback)
    try {
      this.doc.setFont("helvetica")  // jsPDF uses helvetica which renders similarly
    } catch {
      this.doc.setFont("helvetica")
    }
    
    this.data = data
    this.pageWidth = 210 // A4 width in mm
    this.pageHeight = 297 // A4 height in mm
    this.margin = 15
    this.currentY = this.margin
    this.currentPage = 1

    // Setup colors from branding or defaults - ONLY use primary and secondary
    const branding = data.branding || { primary: "#1a2a56", secondary: "#6b7280" }
    this.colors = {
      primary: hexToRgb(branding.primary),
      secondary: hexToRgb(branding.secondary),
      white: [255, 255, 255],
      lightGray: [245, 245, 245],
      lightCream: [253, 251, 247], // #fdfbf7 for header
      darkText: [30, 30, 30],
    }
  }

  // ==========================================================================
  // ASSET LOADING (logo, signature, QR)
  // ==========================================================================

  private async fetchAsDataURL(url: string): Promise<string | undefined> {
    try {
      const res = await fetch(url)
      if (!res.ok) return undefined
      const blob = await res.blob()
      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(blob)
      })
    } catch {
      return undefined
    }
  }

  private async loadAssets(): Promise<void> {
    const promises: Promise<void>[] = []

    if (this.data.company.logo_url) {
      promises.push(
        (async () => {
          const dataUrl = await this.fetchAsDataURL(this.data.company.logo_url as string)
          if (dataUrl) this.assets.logo = dataUrl
        })()
      )
    }

    if (this.data.company.signature_url) {
      promises.push(
        (async () => {
          const dataUrl = await this.fetchAsDataURL(this.data.company.signature_url as string)
          if (dataUrl) this.assets.signature = dataUrl
        })()
      )
    }

    if (this.data.banking?.qr_code_url) {
      promises.push(
        (async () => {
          const dataUrl = await this.fetchAsDataURL(this.data.banking!.qr_code_url as string)
          if (dataUrl) this.assets.qr = dataUrl
        })()
      )
    }

    await Promise.all(promises)
  }

  // ==========================================================================
  // PAGE MANAGEMENT
  // ==========================================================================

  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.addNewPage()
    }
  }

  private addNewPage(): void {
    this.doc.addPage()
    this.currentPage++
    this.currentY = this.margin
    this.addPageHeader()
    this.currentY += 10
  }

  private addPageHeader(): void {
    if (this.currentPage === 1) return

    // Add small header on subsequent pages
    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.colors.secondary)
    this.doc.text(
      `${this.data.company.name} - ${this.data.document_type.toUpperCase()} ${this.data.document_number}`,
      this.margin,
      this.margin - 5
    )
    
    // Page number
    this.doc.text(
      `Page ${this.currentPage}`,
      this.pageWidth - this.margin,
      this.margin - 5,
      { align: "right" }
    )

    // Separator line
    this.doc.setDrawColor(...this.colors.lightGray)
    this.doc.setLineWidth(0.3)
    this.doc.line(this.margin, this.margin, this.pageWidth - this.margin, this.margin)
  }

  // ==========================================================================
  // HEADER SECTION
  // ==========================================================================

  private addHeader(): void {
    const startY = this.currentY

    // Light cream background header bar (#fdfbf7)
    this.doc.setFillColor(...this.colors.lightCream)
    this.doc.rect(0, 0, this.pageWidth, 50, "F")

    // Company logo or placeholder
    if (this.assets.logo) {
      try {
        // Add logo image (max 18x18 mm area)
        this.doc.addImage(this.assets.logo, "PNG", this.margin, 10, 18, 18)
      } catch {
        // Fallback to initial circle if image fails
        this.doc.setFillColor(...this.colors.primary)
        this.doc.circle(this.margin + 10, 20, 8, "F")
      }
    } else {
      // Company initial circle
      this.doc.setFillColor(...this.colors.primary)
      this.doc.circle(this.margin + 10, 20, 8, "F")
      this.doc.setFontSize(14)
      this.doc.setTextColor(...this.colors.white)
      this.doc.setFont("helvetica", "bold")
      const initial = this.data.company.name.charAt(0).toUpperCase()
      this.doc.text(initial, this.margin + 10, 22, { align: "center" })
    }

    // Company name and tagline (now in dark text)
    this.doc.setFontSize(18)
    this.doc.setTextColor(...this.colors.primary)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(this.data.company.name, this.margin + 25, 18)

    this.doc.setFontSize(8)
    this.doc.setFont("helvetica", "normal")
    this.doc.setTextColor(...this.colors.secondary)
    this.doc.text("Premium Wedding & Event Accessories", this.margin + 25, 24)

    // Document type badge
    const docType = this.data.document_type.toUpperCase()
    const badgeX = this.pageWidth - this.margin - 35
    const badgeY = 12

    this.doc.setFillColor(...this.colors.primary)
    this.doc.roundedRect(badgeX, badgeY, 35, 10, 2, 2, "F")
    
    this.doc.setFontSize(12)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(docType, badgeX + 17.5, badgeY + 7, { align: "center" })

    // Contact info bar - slightly darker shade of cream
    this.doc.setFillColor(...this.colors.lightCream)
    this.doc.rect(0, 35, this.pageWidth, 15, "F")

    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.colors.darkText) // Dark text for readability
    this.doc.setFont("helvetica", "normal")

    const contactY = 43
    // Phone
    let xPos = this.margin
    this.doc.text(`Phone: ${this.data.company.phone}`, xPos, contactY)

    // Email
    xPos = this.margin + 60
    this.doc.text(`Email: ${this.data.company.email}` , xPos, contactY)

    // Website
    if (this.data.company.website) {
      xPos = this.pageWidth - this.margin - 40
      this.doc.text(`${this.data.company.website}`, xPos, contactY)
    }

    this.currentY = 55
  }

  // ==========================================================================
  // DOCUMENT INFO & PARTIES
  // ==========================================================================

  private addDocumentInfo(): void {
    this.checkPageBreak(40)

    const leftCol = this.margin
    const rightCol = this.pageWidth / 2 + 5
    const colWidth = this.pageWidth / 2 - this.margin - 5
    const boxHeight = 38

    // Customer Info Box
    this.doc.setFillColor(...this.colors.lightGray)
    this.doc.roundedRect(leftCol, this.currentY, colWidth, boxHeight, 2, 2, "F")
    
    this.doc.setDrawColor(...this.colors.secondary)
    this.doc.setLineWidth(0.3)
    this.doc.roundedRect(leftCol, this.currentY, colWidth, boxHeight, 2, 2, "S")

    // Customer header
    this.doc.setFillColor(...this.colors.primary)
    this.doc.roundedRect(leftCol, this.currentY, colWidth, 8, 2, 2, "F")
    
    this.doc.setFontSize(10)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "bold")
  this.doc.text("CUSTOMER DETAILS", leftCol + 3, this.currentY + 5.5)

    // Customer details
    let yPos = this.currentY + 13
    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(this.data.customer.name, leftCol + 3, yPos)
    
    yPos += 4
    this.doc.setFont("helvetica", "normal")
  this.doc.text(`Phone: ${this.data.customer.phone}`, leftCol + 3, yPos)
    
    if (this.data.customer.email) {
      yPos += 4
  this.doc.text(`Email: ${this.data.customer.email}`, leftCol + 3, yPos)
    }

    if (this.data.customer.address) {
      yPos += 4
      // Build complete address with city, state, and pincode
      let fullAddress = this.data.customer.address
      if (this.data.customer.city) fullAddress += `, ${this.data.customer.city}`
      if (this.data.customer.state) fullAddress += `, ${this.data.customer.state}`
      if (this.data.customer.pincode) fullAddress += ` - ${this.data.customer.pincode}`
      
      const addressLines = wrapText(this.doc, fullAddress, colWidth - 6)
      addressLines.forEach((line, index) => {
        this.doc.text(line, leftCol + 3, yPos + (index * 4))
      })
    }

    // Document Info Box
    this.doc.setFillColor(...this.colors.lightGray)
    this.doc.roundedRect(rightCol, this.currentY, colWidth, boxHeight, 2, 2, "F")
    
    this.doc.setDrawColor(...this.colors.secondary)
    this.doc.setLineWidth(0.3)
    this.doc.roundedRect(rightCol, this.currentY, colWidth, boxHeight, 2, 2, "S")

    // Document header
    this.doc.setFillColor(...this.colors.primary)
    this.doc.roundedRect(rightCol, this.currentY, colWidth, 8, 2, 2, "F")
    
    this.doc.setFontSize(10)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "bold")
  this.doc.text(`${this.data.document_type.toUpperCase()} INFO`, rightCol + 3, this.currentY + 5.5)

    // Document details
    yPos = this.currentY + 13
    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "normal")

    const docInfo = [
      [`${this.data.document_type === "quote" ? "Quote" : "Invoice"} #:`, this.data.document_number],
      ["Date:", formatDate(this.data.document_date)],
    ]

    if (this.data.valid_until) {
      docInfo.push(["Valid Until:", formatDate(this.data.valid_until)])
    }

    if (this.data.status) {
      docInfo.push(["Status:", this.data.status.toUpperCase()])
    }

    docInfo.forEach(([label, value], index) => {
      this.doc.setFont("helvetica", "bold")
      this.doc.text(label, rightCol + 3, yPos + (index * 4.5))
      this.doc.setFont("helvetica", "normal")
      this.doc.text(value, rightCol + 25, yPos + (index * 4.5))
    })

    this.currentY += boxHeight + 8
  }

  // ==========================================================================
  // EVENT & DELIVERY INFO
  // ==========================================================================

  private addEventAndDeliveryInfo(): void {
    if (!this.data.event && !this.data.delivery) return

    this.checkPageBreak(35)

    const leftCol = this.margin
    const rightCol = this.pageWidth / 2 + 5
    const colWidth = this.pageWidth / 2 - this.margin - 5

    // Event Info
    if (this.data.event) {
      const eventBoxHeight = 30

      this.doc.setFillColor(...this.colors.lightGray)
      this.doc.roundedRect(leftCol, this.currentY, colWidth, eventBoxHeight, 2, 2, "F")
      
      this.doc.setDrawColor(...this.colors.secondary)
      this.doc.setLineWidth(0.3)
      this.doc.roundedRect(leftCol, this.currentY, colWidth, eventBoxHeight, 2, 2, "S")

      // Header - use secondary color (matcha green)
      this.doc.setFillColor(...this.colors.secondary)
      this.doc.roundedRect(leftCol, this.currentY, colWidth, 7, 2, 2, "F")
      
      this.doc.setFontSize(9)
      this.doc.setTextColor(...this.colors.white)
      this.doc.setFont("helvetica", "bold")
  this.doc.text("EVENT DETAILS", leftCol + 3, this.currentY + 5)

      let yPos = this.currentY + 12
      this.doc.setFontSize(8)
      this.doc.setTextColor(...this.colors.darkText)
      this.doc.setFont("helvetica", "normal")

      const eventInfo = [
        ["Type:", this.data.event.event_type],
        ["Date:", formatDate(this.data.event.event_date)],
      ]

      if (this.data.event.groom_name) eventInfo.push(["Groom:", this.data.event.groom_name])
      if (this.data.event.bride_name) eventInfo.push(["Bride:", this.data.event.bride_name])
      if (this.data.event.venue_name) eventInfo.push(["Venue:", this.data.event.venue_name])

      eventInfo.forEach(([label, value], index) => {
        if (yPos > this.currentY + eventBoxHeight - 3) return
        this.doc.setFont("helvetica", "bold")
        this.doc.text(label, leftCol + 3, yPos)
        this.doc.setFont("helvetica", "normal")
        this.doc.text(value, leftCol + 20, yPos)
        yPos += 4
      })
    }

    // Delivery Info
    if (this.data.delivery) {
      const deliveryBoxHeight = 20

      this.doc.setFillColor(...this.colors.lightGray)
      this.doc.roundedRect(rightCol, this.currentY, colWidth, deliveryBoxHeight, 2, 2, "F")
      
      this.doc.setDrawColor(...this.colors.primary)
      this.doc.setLineWidth(0.3)
      this.doc.roundedRect(rightCol, this.currentY, colWidth, deliveryBoxHeight, 2, 2, "S")

      // Header - use secondary color (matcha green)
      this.doc.setFillColor(...this.colors.secondary)
      this.doc.roundedRect(rightCol, this.currentY, colWidth, 7, 2, 2, "F")
      
      this.doc.setFontSize(9)
      this.doc.setTextColor(...this.colors.white)
      this.doc.setFont("helvetica", "bold")
  this.doc.text("DELIVERY INFO", rightCol + 3, this.currentY + 5)

      let yPos = this.currentY + 12
      this.doc.setFontSize(8)
      this.doc.setTextColor(...this.colors.darkText)
      this.doc.setFont("helvetica", "normal")

      this.doc.setFont("helvetica", "bold")
      this.doc.text("Delivery:", rightCol + 3, yPos)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(formatDate(this.data.delivery.delivery_date), rightCol + 20, yPos)

      yPos += 4
      this.doc.setFont("helvetica", "bold")
      this.doc.text("Return:", rightCol + 3, yPos)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(formatDate(this.data.delivery.return_date), rightCol + 20, yPos)
    }

    this.currentY += 35
  }

  // ==========================================================================
  // ITEMS TABLE
  // ==========================================================================

  private addItemsTable(): void {
    this.checkPageBreak(50)

    // Section header
    this.doc.setFillColor(...this.colors.primary)
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, "F")
    
    this.doc.setFontSize(11)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "bold")
  this.doc.text("ITEMS & SERVICES", this.margin + 3, this.currentY + 5.5)

    this.currentY += 10

    // Prepare table data with enhanced item descriptions including inclusions
    const headers = [["#", "Item Description", "Category", "Qty", "Rate", "Amount", "Deposit"]]
    const rows = this.data.items.map((item, index) => {
      // Build item description with variant and inclusions
      let description = item.product_name
      
      if (item.variant_name) {
        description += `\nVariant: ${item.variant_name}`
      }
      
      if (item.extra_safas && item.extra_safas > 0) {
        description += ` (+${item.extra_safas} Extra Safas)`
      }
      
      if (item.inclusions && item.inclusions.length > 0) {
        // Add first 3 inclusions inline
        const inclusionText = item.inclusions.slice(0, 3).join(", ")
        description += `\nIncludes: ${inclusionText}`
        if (item.inclusions.length > 3) {
          description += `... +${item.inclusions.length - 3} more`
        }
      }

      return [
        (index + 1).toString(),
        description,
        item.category || "General",
        item.quantity.toString(),
        formatCurrency(item.unit_price),
        formatCurrency(item.total_price),
        formatCurrency(item.security_deposit || 0),
      ]
    })

    // Generate table
    autoTable(this.doc, {
      head: headers,
      body: rows,
      startY: this.currentY,
      theme: "grid",
      headStyles: {
        fillColor: this.colors.primary as any,
        textColor: this.colors.white as any,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: this.colors.darkText as any,
        cellPadding: 3,
        lineColor: [200, 200, 200] as any,
        lineWidth: 0.1,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250] as any,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 55, cellPadding: { top: 2, right: 2, bottom: 2, left: 2 } },
        2: { cellWidth: 25 },
        3: { cellWidth: 15, halign: "center" },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 28, halign: "right" },
        6: { cellWidth: 27, halign: "right" },
      },
      margin: { left: this.margin, right: this.margin },
      didDrawPage: (data) => {
        // Update current Y position after table
        this.currentY = data.cursor?.y || this.currentY
      },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8
  }

  // ==========================================================================
  // PRICING SUMMARY
  // ==========================================================================

  private addPricingSummary(): void {
    this.checkPageBreak(55)

    const summaryX = this.pageWidth - this.margin - 70
    const summaryWidth = 70
    const lineHeight = 6

    // Summary box background
    this.doc.setFillColor(...this.colors.lightGray)
    this.doc.roundedRect(summaryX, this.currentY, summaryWidth, 50, 3, 3, "F")
    
    this.doc.setDrawColor(...this.colors.secondary)
    this.doc.setLineWidth(0.5)
    this.doc.roundedRect(summaryX, this.currentY, summaryWidth, 50, 3, 3, "S")

    let yPos = this.currentY + 8
    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.colors.darkText)

    // Subtotal
    this.doc.setFont("helvetica", "normal")
    this.doc.text("Subtotal:", summaryX + 5, yPos)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(formatCurrency(this.data.pricing.subtotal), summaryX + summaryWidth - 5, yPos, { align: "right" })

    // Discount
    if (this.data.pricing.discount && this.data.pricing.discount > 0) {
      yPos += lineHeight
      this.doc.setFont("helvetica", "normal")
      this.doc.setTextColor(...this.colors.secondary) // Use secondary for discount
      this.doc.text("Discount:", summaryX + 5, yPos)
      this.doc.text(`-${formatCurrency(this.data.pricing.discount)}`, summaryX + summaryWidth - 5, yPos, { align: "right" })
      this.doc.setTextColor(...this.colors.darkText)
    }

    // Tax
    yPos += lineHeight
    this.doc.setFont("helvetica", "normal")
    const taxLabel = this.data.pricing.tax_percentage ? `GST (${this.data.pricing.tax_percentage}%):` : "Tax:"
    this.doc.text(taxLabel, summaryX + 5, yPos)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(formatCurrency(this.data.pricing.tax_amount), summaryX + summaryWidth - 5, yPos, { align: "right" })

    // Security Deposit
    if (this.data.pricing.security_deposit > 0) {
      yPos += lineHeight
      this.doc.setFont("helvetica", "normal")
      this.doc.text("Security Deposit:", summaryX + 5, yPos)
      this.doc.setFont("helvetica", "bold")
      this.doc.text(formatCurrency(this.data.pricing.security_deposit), summaryX + summaryWidth - 5, yPos, { align: "right" })
    }

    // Separator
    yPos += 3
    this.doc.setDrawColor(...this.colors.secondary)
    this.doc.setLineWidth(0.5)
    this.doc.line(summaryX + 5, yPos, summaryX + summaryWidth - 5, yPos)

    // Total - use secondary color (matcha green)
    yPos += 5
    this.doc.setFillColor(...this.colors.secondary)
    this.doc.roundedRect(summaryX + 3, yPos - 4, summaryWidth - 6, 8, 2, 2, "F")
    
    this.doc.setFontSize(10)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("TOTAL AMOUNT:", summaryX + 5, yPos + 1)
    this.doc.setFontSize(11)
    this.doc.text(formatCurrency(this.data.pricing.total_amount), summaryX + summaryWidth - 5, yPos + 1, { align: "right" })

    // Payment breakdown if applicable
    if (this.data.pricing.advance_amount && this.data.pricing.advance_amount > 0) {
      yPos += 10
      this.doc.setFontSize(8)
      this.doc.setTextColor(...this.colors.darkText)
      this.doc.setFont("helvetica", "normal")

      const advLabel = this.data.pricing.advance_percentage 
        ? `Pay Now (${this.data.pricing.advance_percentage}%):`
        : "Pay Now:"
      this.doc.text(advLabel, summaryX + 5, yPos)
      this.doc.setFont("helvetica", "bold")
      this.doc.setTextColor(...this.colors.primary)
      this.doc.text(formatCurrency(this.data.pricing.advance_amount), summaryX + summaryWidth - 5, yPos, { align: "right" })

      if (this.data.pricing.balance_amount) {
        yPos += 5
        this.doc.setFont("helvetica", "normal")
        this.doc.setTextColor(...this.colors.darkText)
        this.doc.text("Remaining:", summaryX + 5, yPos)
        this.doc.setFont("helvetica", "bold")
        this.doc.text(formatCurrency(this.data.pricing.balance_amount), summaryX + summaryWidth - 5, yPos, { align: "right" })
      }
    }

    this.currentY += 55
  }

  // ==========================================================================
  // NOTES & SPECIAL INSTRUCTIONS
  // ==========================================================================

  private addNotesAndInstructions(): void {
    if (!this.data.notes && !this.data.special_instructions) return

    this.checkPageBreak(30)

    if (this.data.special_instructions) {
      // Special Instructions box
      this.doc.setFillColor(...this.colors.lightGray)
      this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 25, 2, 2, "F")
      
      this.doc.setDrawColor(...this.colors.secondary)
      this.doc.setLineWidth(0.3)
      this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 25, 2, 2, "S")

      // Header
      this.doc.setFontSize(9)
      this.doc.setTextColor(...this.colors.primary)
      this.doc.setFont("helvetica", "bold")
  this.doc.text("SPECIAL INSTRUCTIONS", this.margin + 3, this.currentY + 5)

      // Content
      this.doc.setFontSize(8)
      this.doc.setTextColor(...this.colors.darkText)
      this.doc.setFont("helvetica", "normal")
      
      const instructionLines = wrapText(this.doc, this.data.special_instructions, this.pageWidth - 2 * this.margin - 10)
      instructionLines.forEach((line, index) => {
        this.doc.text(line, this.margin + 3, this.currentY + 12 + (index * 4))
      })

      this.currentY += 28
    }

    if (this.data.notes) {
      this.checkPageBreak(25)

      // Notes box
      this.doc.setFillColor(...this.colors.lightGray)
      this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 20, 2, 2, "F")
      
      this.doc.setDrawColor(...this.colors.primary)
      this.doc.setLineWidth(0.3)
      this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 20, 2, 2, "S")

      // Header
      this.doc.setFontSize(9)
      this.doc.setTextColor(...this.colors.primary)
      this.doc.setFont("helvetica", "bold")
  this.doc.text("NOTES", this.margin + 3, this.currentY + 5)

      // Content - larger, lighter text
      this.doc.setFontSize(10)
      this.doc.setTextColor(100, 100, 100)
      this.doc.setFont("helvetica", "normal")
      
      // Normalize text - remove extra spaces and weird characters
      const cleanNotes = this.data.notes.replace(/\s+/g, ' ').trim()
      const notesLines = wrapText(this.doc, cleanNotes, this.pageWidth - 2 * this.margin - 10)
      notesLines.forEach((line, index) => {
        this.doc.text(line, this.margin + 3, this.currentY + 10 + (index * 4))
      })

      this.currentY += 23
    }
  }

  // ==========================================================================
  // BANKING DETAILS
  // ==========================================================================

  private addBankingDetails(): void {
    if (!this.data.banking) return

    this.checkPageBreak(35)

    const boxWidth = this.pageWidth - 2 * this.margin
    const boxHeight = 42  // Increased by 30% for better spacing

    this.doc.setFillColor(...this.colors.lightGray)
    this.doc.roundedRect(this.margin, this.currentY, boxWidth, boxHeight, 2, 2, "F")
    
    this.doc.setDrawColor(...this.colors.primary)
    this.doc.setLineWidth(0.5)
    this.doc.roundedRect(this.margin, this.currentY, boxWidth, boxHeight, 2, 2, "S")

    // Header - use secondary color (matcha green)
    this.doc.setFillColor(...this.colors.secondary)
    this.doc.roundedRect(this.margin, this.currentY, boxWidth, 8, 2, 2, "F")
    
    this.doc.setFontSize(10)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "bold")
  this.doc.text("PAYMENT INFORMATION", this.margin + 3, this.currentY + 5.5)

    // Banking details in two columns
    let yPos = this.currentY + 13
    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "normal")

    const leftCol = this.margin + 5
  const rightCol = this.margin + (boxWidth / 2)

    // Left column
    const leftDetails = [
      ["Bank Name:", this.data.banking.bank_name],
      ["Account Holder:", this.data.banking.account_holder],
      ["Account Number:", this.data.banking.account_number],
    ]

    leftDetails.forEach(([label, value], index) => {
      const y = yPos + (index * 5)
      this.doc.setFont("helvetica", "bold")
      this.doc.text(label, leftCol, y)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(value, leftCol + 30, y)
    })

    // Right column
    const rightDetails = [
      ["IFSC Code:", this.data.banking.ifsc_code],
      ["Branch:", this.data.banking.branch],
    ]

    if (this.data.banking.upi_id) {
      rightDetails.push(["UPI ID:", this.data.banking.upi_id])
    }

    rightDetails.forEach(([label, value], index) => {
      const y = yPos + (index * 5)
      this.doc.setFont("helvetica", "bold")
      this.doc.text(label, rightCol, y)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(value, rightCol + 20, y)
    })

    // Draw QR code if available - position in top right of banking box
    if (this.assets.qr) {
      try {
        const qrSize = 25
        const qrX = this.pageWidth - this.margin - qrSize - 5
        const qrY = this.currentY + 10
        
        this.doc.addImage(this.assets.qr, "PNG", qrX, qrY, qrSize, qrSize)
        this.doc.setFontSize(7)
        this.doc.setTextColor(...this.colors.darkText)
        this.doc.text("Scan to Pay", qrX + (qrSize / 2), qrY + qrSize + 3, { align: "center" })
      } catch {
        // ignore image errors
      }
    }

    this.currentY += boxHeight + 5
  }

  // ==========================================================================
  // TERMS & CONDITIONS
  // ==========================================================================

  private addTermsAndConditions(): void {
    if (!this.data.terms_and_conditions || this.data.terms_and_conditions.length === 0) {
      // Add default terms
      this.data.terms_and_conditions = [
        "All items must be returned in the same condition as provided.",
        "Security deposit will be refunded after inspection of returned items.",
        "Any damage or loss will be charged from the security deposit.",
        "Booking confirmation requires advance payment as specified.",
        "Cancellation charges apply as per our cancellation policy.",
        "Delivery and pickup timings must be coordinated in advance.",
        "Customer is responsible for the safety of items during the rental period.",
        "Payment balance must be cleared before or on the delivery date.",
      ]
    }

    this.checkPageBreak(50)

    // Section header
    this.doc.setFillColor(...this.colors.secondary)
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 7, "F")
    
    this.doc.setFontSize(10)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "bold")
  this.doc.text("TERMS & CONDITIONS", this.margin + 3, this.currentY + 5)

    this.currentY += 12  // Increased from 10 to 12 for more space

    this.doc.setFontSize(7.5)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "normal")

    this.data.terms_and_conditions.forEach((term, index) => {
      this.checkPageBreak(10)
      
      const termLines = wrapText(this.doc, `${index + 1}. ${term}`, this.pageWidth - 2 * this.margin - 5)
      termLines.forEach((line, lineIndex) => {
        this.doc.text(line, this.margin + 3, this.currentY + (lineIndex * 4))
      })
      this.currentY += termLines.length * 4 + 1
    })

    this.currentY += 5
  }

  // ==========================================================================
  // FOOTER
  // ==========================================================================

  private addFooter(): void {
    const footerY = this.pageHeight - 20

    // Check if we need a new page
    if (this.currentY > footerY - 10) {
      this.addNewPage()
    }

    // Signature section
    const signatureY = footerY - 15
    const leftSigX = this.margin + 20
    const rightSigX = this.pageWidth - this.margin - 40

    this.doc.setDrawColor(...this.colors.secondary)
    this.doc.setLineWidth(0.3)
    
    // Customer signature
    this.doc.line(leftSigX, signatureY, leftSigX + 40, signatureY)
    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "normal")
    this.doc.text("Customer Signature", leftSigX + 20, signatureY + 5, { align: "center" })

    // Company signature
    this.doc.line(rightSigX, signatureY, rightSigX + 40, signatureY)
    // Signature image (optional)
    if (this.assets.signature) {
      try {
        this.doc.addImage(this.assets.signature, "PNG", rightSigX + 8, signatureY - 14, 24, 12)
      } catch {
        // ignore image errors
      }
    }
    this.doc.text("Authorized Signature", rightSigX + 20, signatureY + 5, { align: "center" })

    // Footer bar
    this.doc.setFillColor(...this.colors.primary)
    this.doc.rect(0, footerY, this.pageWidth, 20, "F")

    // Footer content
    this.doc.setFontSize(7)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "normal")
    
    const footerText = `${this.data.company.name} | ${this.data.company.address}, ${this.data.company.city}, ${this.data.company.state}`
    this.doc.text(footerText, this.pageWidth / 2, footerY + 7, { align: "center" })

    if (this.data.company.gst_number) {
      this.doc.text(`GSTIN: ${this.data.company.gst_number}`, this.pageWidth / 2, footerY + 12, { align: "center" })
    }

    this.doc.setFontSize(6)
    this.doc.text("This is a computer-generated document", this.pageWidth / 2, footerY + 16, { align: "center" })
  }

  // ==========================================================================
  // MAIN GENERATION METHOD
  // ==========================================================================

  public async generate(): Promise<Blob> {
    try {
      // Load any external assets (logo, signature, QR)
      await this.loadAssets()

      // Generate all sections
      this.addHeader()
      this.addDocumentInfo()
      this.addEventAndDeliveryInfo()
      this.addItemsTable()
      this.addPricingSummary()
      this.addNotesAndInstructions()
      this.addBankingDetails()
      this.addTermsAndConditions()
      this.addFooter()

      // Return PDF as blob
      return this.doc.output("blob")
    } catch (error) {
      console.error("[PDF Generator] Error:", error)
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function generatePDF(data: DocumentData): Promise<Blob> {
  const generator = new PDFGenerator(data)
  return await generator.generate()
}

export type { DocumentData, CompanyInfo, CustomerInfo, EventInfo, QuoteItem, PricingInfo, BrandingColors }
