/**
 * Modern Professional PDF Generation Service
 * Alternative design for Quotes and Invoices
 * Features: Clean layout, card-based design, better spacing
 */

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface BrandingColors {
  primary: string
  secondary: string
  accent: string
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
  groom_whatsapp?: string
  groom_address?: string
  bride_name?: string
  bride_whatsapp?: string
  bride_address?: string
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
  quantity: number
  unit_price: number
  total_price: number
  security_deposit?: number
  variant_name?: string
  inclusions?: string[]
  extra_safas?: number
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
    : [59, 130, 246] // Default blue
}

function formatCurrency(amount: number): string {
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
// MODERN PDF GENERATOR CLASS
// ============================================================================

class ModernPDFGenerator {
  private doc: jsPDF
  private data: DocumentData
  private assets: { logo?: string; signature?: string; qr?: string } = {}
  private colors: {
    primary: [number, number, number]
    secondary: [number, number, number]
    white: [number, number, number]
    lightBg: [number, number, number]
    darkText: [number, number, number]
    borderGray: [number, number, number]
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
    
    this.data = data
    this.pageWidth = 210
    this.pageHeight = 297
    this.margin = 15
    this.currentY = this.margin
    this.currentPage = 1

    // Setup colors - only use primary and secondary from branding
    const branding = data.branding || { primary: "#3b82f6", secondary: "#64748b" }
    this.colors = {
      primary: hexToRgb(branding.primary),
      secondary: hexToRgb(branding.secondary),
      white: [255, 255, 255],
      lightBg: [249, 250, 251],
      darkText: [17, 24, 39],
      borderGray: [229, 231, 235],
    }
  }

  // ==========================================================================
  // ASSET LOADING
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
    if (this.currentY + requiredSpace > this.pageHeight - this.margin - 15) {
      this.addNewPage()
    }
  }

  private addNewPage(): void {
    this.doc.addPage()
    this.currentPage++
    this.currentY = this.margin
    this.addPageHeader()
    this.currentY += 8
  }

  private addPageHeader(): void {
    if (this.currentPage === 1) return

    // Minimal header on subsequent pages
    this.doc.setFontSize(9)
    this.doc.setTextColor(...this.colors.secondary)
    this.doc.setFont("helvetica", "normal")
    this.doc.text(
      `${this.data.company.name} - ${this.data.document_type.toUpperCase()} ${this.data.document_number}`,
      this.margin,
      this.margin - 5
    )
    
    this.doc.text(
      `Page ${this.currentPage}`,
      this.pageWidth - this.margin,
      this.margin - 5,
      { align: "right" }
    )

    this.doc.setDrawColor(...this.colors.borderGray)
    this.doc.setLineWidth(0.2)
    this.doc.line(this.margin, this.margin, this.pageWidth - this.margin, this.margin)
  }

  // ==========================================================================
  // HEADER SECTION - MODERN DESIGN
  // ==========================================================================

  private addHeader(): void {
    // Clean white header with bottom border
    const headerHeight = 45

    // Logo section
    if (this.assets.logo) {
      try {
        this.doc.addImage(this.assets.logo, "PNG", this.margin, this.currentY, 20, 20)
      } catch {
        this.addLogoPlaceholder()
      }
    } else {
      this.addLogoPlaceholder()
    }

    // Company name and info
    const companyX = this.margin + 25
    this.doc.setFontSize(18)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(this.data.company.name, companyX, this.currentY + 8)

    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.colors.secondary)
    this.doc.setFont("helvetica", "normal")
    this.doc.text(
      `${this.data.company.address}, ${this.data.company.city}, ${this.data.company.state}`,
      companyX,
      this.currentY + 14
    )
    
    this.doc.text(
      `Phone: ${this.data.company.phone} | Email: ${this.data.company.email}`,
      companyX,
      this.currentY + 18
    )

    if (this.data.company.gst_number) {
      this.doc.text(`GSTIN: ${this.data.company.gst_number}`, companyX, this.currentY + 22)
    }

    // Document type badge (top right)
    const badgeText = this.data.document_type.toUpperCase()
    const badgeWidth = 35
    const badgeX = this.pageWidth - this.margin - badgeWidth
    const badgeY = this.currentY + 3

    this.doc.setFillColor(...this.colors.primary)
    this.doc.roundedRect(badgeX, badgeY, badgeWidth, 12, 2, 2, "F")
    
    this.doc.setFontSize(14)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(badgeText, badgeX + badgeWidth / 2, badgeY + 8.5, { align: "center" })

    // Document number
    this.doc.setFontSize(10)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(this.data.document_number, badgeX + badgeWidth / 2, badgeY + 15, { align: "center" })

    // Bottom border
    this.currentY += headerHeight
    this.doc.setDrawColor(...this.colors.primary)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    
    this.currentY += 8
  }

  private addLogoPlaceholder(): void {
    this.doc.setFillColor(...this.colors.primary)
    this.doc.roundedRect(this.margin, this.currentY, 20, 20, 3, 3, "F")
    
    this.doc.setFontSize(16)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "bold")
    const initial = this.data.company.name.charAt(0).toUpperCase()
    this.doc.text(initial, this.margin + 10, this.currentY + 13, { align: "center" })
  }

  // ==========================================================================
  // DOCUMENT INFO CARDS - SIDE BY SIDE
  // ==========================================================================

  private addDocumentInfoCards(): void {
    this.checkPageBreak(55)

    const cardWidth = (this.pageWidth - 2 * this.margin - 5) / 2
    const cardHeight = 50
    const leftX = this.margin
    const rightX = this.margin + cardWidth + 5

    // Customer Card (Left)
    this.addCard(leftX, this.currentY, cardWidth, cardHeight, "Customer Details")
    
    let yPos = this.currentY + 12
    this.doc.setFontSize(11)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(this.data.customer.name, leftX + 5, yPos)

    yPos += 6
    this.doc.setFontSize(9)
    this.doc.setFont("helvetica", "normal")
    this.doc.setTextColor(...this.colors.secondary)
    this.doc.text(`Phone: ${this.data.customer.phone}`, leftX + 5, yPos)

    if (this.data.customer.whatsapp) {
      yPos += 5
      this.doc.text(`WhatsApp: ${this.data.customer.whatsapp}`, leftX + 5, yPos)
    }

    if (this.data.customer.email) {
      yPos += 5
      this.doc.text(`Email: ${this.data.customer.email}`, leftX + 5, yPos)
    }

    if (this.data.customer.address) {
      yPos += 5
      // Build complete address with city, state, and pincode
      let fullAddress = this.data.customer.address
      if (this.data.customer.city) fullAddress += `, ${this.data.customer.city}`
      if (this.data.customer.state) fullAddress += `, ${this.data.customer.state}`
      if (this.data.customer.pincode) fullAddress += ` - ${this.data.customer.pincode}`
      
      const addressLines = wrapText(
        this.doc,
        fullAddress,
        cardWidth - 10
      )
      addressLines.forEach((line, idx) => {
        this.doc.text(line, leftX + 5, yPos + idx * 4)
      })
    }

    // Document Info Card (Right)
    this.addCard(rightX, this.currentY, cardWidth, cardHeight, `${this.data.document_type === "quote" ? "Quote" : "Invoice"} Information`)

    yPos = this.currentY + 12
    this.doc.setFontSize(9)
    this.doc.setTextColor(...this.colors.secondary)
    this.doc.setFont("helvetica", "normal")

    const docInfo = [
      ["Date:", formatDate(this.data.document_date)],
    ]

    if (this.data.valid_until) {
      docInfo.push(["Valid Until:", formatDate(this.data.valid_until)])
    }

    docInfo.forEach(([label, value]) => {
      this.doc.setFont("helvetica", "bold")
      this.doc.text(label, rightX + 5, yPos)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(value, rightX + 30, yPos)
      yPos += 5
    })

    this.currentY += cardHeight + 8
  }

  // ==========================================================================
  // EVENT & DELIVERY CARDS
  // ==========================================================================

  private addEventDeliveryCards(): void {
    if (!this.data.event && !this.data.delivery) return

    this.checkPageBreak(70)

    const cardWidth = (this.pageWidth - 2 * this.margin - 5) / 2
    const cardHeight = 65
    const leftX = this.margin
    const rightX = this.margin + cardWidth + 5

    if (this.data.event) {
      this.addCard(leftX, this.currentY, cardWidth, cardHeight, "Event Details")
      
      let yPos = this.currentY + 12
      this.doc.setFontSize(9)
      this.doc.setTextColor(...this.colors.secondary)
      this.doc.setFont("helvetica", "normal")

      const eventInfo = [
        ["Type:", this.data.event.event_type],
        ["Date:", formatDate(this.data.event.event_date)],
      ]

      eventInfo.forEach(([label, value]) => {
        this.doc.setFont("helvetica", "bold")
        this.doc.text(label, leftX + 5, yPos)
        this.doc.setFont("helvetica", "normal")
        this.doc.text(value, leftX + 20, yPos)
        yPos += 5
      })

      // Groom details
      if (this.data.event.groom_name) {
        yPos += 2
        this.doc.setFont("helvetica", "bold")
        this.doc.text("Groom:", leftX + 5, yPos)
        this.doc.setFont("helvetica", "normal")
        this.doc.text(this.data.event.groom_name, leftX + 20, yPos)
        yPos += 4
        
        if (this.data.event.groom_whatsapp) {
          this.doc.setFontSize(8)
          this.doc.text(`WhatsApp: ${this.data.event.groom_whatsapp}`, leftX + 7, yPos)
          yPos += 4
        }
        
        if (this.data.event.groom_address) {
          const groomAddressLines = wrapText(this.doc, this.data.event.groom_address, cardWidth - 14)
          groomAddressLines.forEach((line, idx) => {
            this.doc.text(line, leftX + 7, yPos + idx * 3.5)
          })
          yPos += groomAddressLines.length * 3.5 + 1
        }
        this.doc.setFontSize(9)
      }

      // Bride details
      if (this.data.event.bride_name) {
        yPos += 2
        this.doc.setFont("helvetica", "bold")
        this.doc.text("Bride:", leftX + 5, yPos)
        this.doc.setFont("helvetica", "normal")
        this.doc.text(this.data.event.bride_name, leftX + 20, yPos)
        yPos += 4
        
        if (this.data.event.bride_whatsapp) {
          this.doc.setFontSize(8)
          this.doc.text(`WhatsApp: ${this.data.event.bride_whatsapp}`, leftX + 7, yPos)
          yPos += 4
        }
        
        if (this.data.event.bride_address) {
          const brideAddressLines = wrapText(this.doc, this.data.event.bride_address, cardWidth - 14)
          brideAddressLines.forEach((line, idx) => {
            this.doc.text(line, leftX + 7, yPos + idx * 3.5)
          })
          yPos += brideAddressLines.length * 3.5
        }
        this.doc.setFontSize(9)
      }
    }

    if (this.data.delivery) {
      this.addCard(rightX, this.currentY, cardWidth, cardHeight, "Delivery Schedule")
      
      let yPos = this.currentY + 12
      this.doc.setFontSize(9)
      this.doc.setTextColor(...this.colors.secondary)
      this.doc.setFont("helvetica", "normal")

      this.doc.setFont("helvetica", "bold")
      this.doc.text("Delivery:", rightX + 5, yPos)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(formatDate(this.data.delivery.delivery_date), rightX + 25, yPos)

      yPos += 5
      this.doc.setFont("helvetica", "bold")
      this.doc.text("Return:", rightX + 5, yPos)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(formatDate(this.data.delivery.return_date), rightX + 25, yPos)
    }

    this.currentY += cardHeight + 8
  }

  // ==========================================================================
  // HELPER: CARD DRAWING
  // ==========================================================================

  private addCard(x: number, y: number, width: number, height: number, title: string): void {
    // Card background
    this.doc.setFillColor(...this.colors.lightBg)
    this.doc.roundedRect(x, y, width, height, 2, 2, "F")
    
    // Card border
    this.doc.setDrawColor(...this.colors.borderGray)
    this.doc.setLineWidth(0.3)
    this.doc.roundedRect(x, y, width, height, 2, 2, "S")

    // Card title bar
    this.doc.setFillColor(...this.colors.white)
    this.doc.rect(x + 1, y + 1, width - 2, 8, "F")
    
    this.doc.setFontSize(9)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(title, x + 5, y + 6)
  }

  // ==========================================================================
  // ITEMS TABLE - CLEAN MODERN DESIGN
  // ==========================================================================

  private addItemsTable(): void {
    this.checkPageBreak(50)

    // Section title
    this.doc.setFontSize(12)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Items & Services", this.margin, this.currentY)

    this.currentY += 6

    const headers = [["#", "Description", "Category", "Qty", "Rate", "Amount", "Deposit"]]
    const rows = this.data.items.map((item, index) => {
      // Build enhanced description with variant and inclusions
      let description = item.product_name
      
      if (item.variant_name) {
        description += `\nVariant: ${item.variant_name}`
      }
      
      if (item.extra_safas && item.extra_safas > 0) {
        description += ` (+${item.extra_safas} Extra Safas)`
      }
      
      if (item.inclusions && item.inclusions.length > 0) {
        const inclusionText = item.inclusions.slice(0, 3).join(', ')
        description += `\nIncludes: ${inclusionText}`
        if (item.inclusions.length > 3) {
          description += `... +${item.inclusions.length - 3} more`
        }
      }

      return [
        (index + 1).toString(),
        description,
        item.category || "-",
        item.quantity.toString(),
        formatCurrency(item.unit_price),
        formatCurrency(item.total_price),
        formatCurrency(item.security_deposit || 0),
      ]
    })

    autoTable(this.doc, {
      head: headers,
      body: rows,
      startY: this.currentY,
      theme: "plain",
      headStyles: {
        fillColor: this.colors.primary as any,
        textColor: this.colors.white as any,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: this.colors.darkText as any,
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: this.colors.lightBg as any,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 25 },
        3: { cellWidth: 12, halign: "center" },
        4: { cellWidth: 28, halign: "right" },
        5: { cellWidth: 28, halign: "right" },
        6: { cellWidth: 27, halign: "right" },
      },
      margin: { left: this.margin, right: this.margin },
      didDrawPage: (data) => {
        this.currentY = data.cursor?.y || this.currentY
      },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8
  }

  // ==========================================================================
  // PRICING SUMMARY - MODERN CARD
  // ==========================================================================

  private addPricingSummary(): void {
    this.checkPageBreak(60)

    const summaryWidth = 75
    const summaryX = this.pageWidth - this.margin - summaryWidth
    const summaryY = this.currentY

    // Summary card
    this.doc.setFillColor(...this.colors.lightBg)
    this.doc.roundedRect(summaryX, summaryY, summaryWidth, 55, 3, 3, "F")
    
    this.doc.setDrawColor(...this.colors.borderGray)
    this.doc.setLineWidth(0.3)
    this.doc.roundedRect(summaryX, summaryY, summaryWidth, 55, 3, 3, "S")

    let yPos = summaryY + 8
    this.doc.setFontSize(9)
    this.doc.setTextColor(...this.colors.darkText)

    // Line items
    const summaryItems = [
      ["Subtotal", formatCurrency(this.data.pricing.subtotal)],
    ]

    if (this.data.pricing.discount && this.data.pricing.discount > 0) {
      summaryItems.push(["Discount", `-${formatCurrency(this.data.pricing.discount)}`])
    }

    const taxLabel = this.data.pricing.tax_percentage 
      ? `GST (${this.data.pricing.tax_percentage}%)`
      : "GST (18%)"
    summaryItems.push([taxLabel, formatCurrency(this.data.pricing.tax_amount)])

    summaryItems.forEach(([label, value]) => {
      this.doc.setFont("helvetica", "normal")
      this.doc.text(label, summaryX + 5, yPos)
      this.doc.setFont("helvetica", "bold")
      this.doc.text(value, summaryX + summaryWidth - 5, yPos, { align: "right" })
      yPos += 6
    })

    // Divider
    yPos += 2
    this.doc.setDrawColor(...this.colors.borderGray)
    this.doc.line(summaryX + 5, yPos, summaryX + summaryWidth - 5, yPos)
    yPos += 5

    // Total Amount (with green background)
    this.doc.setFillColor(...this.colors.secondary)
    this.doc.roundedRect(summaryX + 3, yPos - 5, summaryWidth - 6, 10, 2, 2, "F")
    
    this.doc.setFontSize(12)
    this.doc.setTextColor(...this.colors.white)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("TOTAL AMOUNT:", summaryX + 8, yPos + 2)
    this.doc.text(formatCurrency(this.data.pricing.total_amount), summaryX + summaryWidth - 8, yPos + 2, { align: "right" })

    yPos += 12

    // Payment breakdown section
    if (this.data.pricing.advance_amount && this.data.pricing.advance_amount > 0) {
      this.doc.setFontSize(9)
      this.doc.setFont("helvetica", "normal")

      const advLabel = this.data.pricing.advance_percentage 
        ? `Pay Now (${this.data.pricing.advance_percentage}%):`
        : "Pay Now:"
      
      this.doc.setTextColor(...this.colors.primary)
      this.doc.text(advLabel, summaryX + 5, yPos)
      this.doc.setFont("helvetica", "bold")
      this.doc.text(formatCurrency(this.data.pricing.advance_amount), summaryX + summaryWidth - 5, yPos, { align: "right" })

      if (this.data.pricing.balance_amount && this.data.pricing.balance_amount > 0) {
        yPos += 6
        this.doc.setFont("helvetica", "normal")
        this.doc.setTextColor(...this.colors.darkText)
        this.doc.text("Remaining:", summaryX + 5, yPos)
        this.doc.setFont("helvetica", "bold")
        this.doc.text(formatCurrency(this.data.pricing.balance_amount), summaryX + summaryWidth - 5, yPos, { align: "right" })
      }
    }

    // Security deposit section (if applicable)
    if (this.data.pricing.security_deposit > 0) {
      yPos += 10
      
      // Small divider
      this.doc.setDrawColor(...this.colors.borderGray)
      this.doc.setLineWidth(0.2)
      this.doc.line(summaryX + 5, yPos, summaryX + summaryWidth - 5, yPos)
      yPos += 6
      
      this.doc.setFontSize(8)
      this.doc.setTextColor(...this.colors.secondary)
      this.doc.setFont("helvetica", "bold")
      this.doc.text("Security Deposit (Refundable):", summaryX + 5, yPos)
      this.doc.setFont("helvetica", "bold")
      this.doc.text(formatCurrency(this.data.pricing.security_deposit), summaryX + summaryWidth - 5, yPos, { align: "right" })
    }

    this.currentY += 60
  }

  // ==========================================================================
  // BANKING & QR - MODERN LAYOUT
  // ==========================================================================

  private addBankingDetails(): void {
    if (!this.data.banking) return

    this.checkPageBreak(40)

    const cardWidth = this.pageWidth - 2 * this.margin
    const cardHeight = 35

    // Banking card
    this.doc.setFillColor(...this.colors.lightBg)
    this.doc.roundedRect(this.margin, this.currentY, cardWidth, cardHeight, 3, 3, "F")
    
    this.doc.setDrawColor(...this.colors.secondary)
    this.doc.setLineWidth(0.4)
    this.doc.roundedRect(this.margin, this.currentY, cardWidth, cardHeight, 3, 3, "S")

    // Title
    this.doc.setFontSize(10)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Payment Information", this.margin + 5, this.currentY + 8)

    // Banking details
    let yPos = this.currentY + 15
    const leftCol = this.margin + 5
    const midCol = this.margin + 75
    const rightCol = this.margin + 145

    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.colors.secondary)
    this.doc.setFont("helvetica", "normal")

    const details = [
      ["Bank:", this.data.banking.bank_name],
      ["Account Holder:", this.data.banking.account_holder],
      ["Account Number:", this.data.banking.account_number],
      ["IFSC Code:", this.data.banking.ifsc_code],
    ]

    if (this.data.banking.upi_id) {
      details.push(["UPI ID:", this.data.banking.upi_id])
    }

    details.forEach(([label, value], idx) => {
      const col = idx < 3 ? leftCol : midCol
      const row = yPos + (idx % 3) * 5
      
      this.doc.setFont("helvetica", "bold")
      this.doc.text(label, col, row)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(value, col + 35, row)
    })

    // QR Code
    if (this.assets.qr) {
      try {
        this.doc.addImage(this.assets.qr, "PNG", rightCol, this.currentY + 10, 22, 22)
        this.doc.setFontSize(7)
        this.doc.setTextColor(...this.colors.secondary)
        this.doc.text("Scan to Pay", rightCol + 11, this.currentY + 34, { align: "center" })
      } catch {
        // Ignore image errors
      }
    }

    this.currentY += cardHeight + 8
  }

  // ==========================================================================
  // NOTES & TERMS - CLEAN CARDS
  // ==========================================================================

  private addNotesAndInstructions(): void {
    if (!this.data.notes && !this.data.special_instructions) return

    if (this.data.special_instructions) {
      this.checkPageBreak(25)
      
      const width = this.pageWidth - 2 * this.margin
      this.doc.setFillColor(...this.colors.lightBg)
      this.doc.roundedRect(this.margin, this.currentY, width, 22, 2, 2, "F")
      
      this.doc.setDrawColor(...this.colors.secondary)
      this.doc.setLineWidth(0.3)
      this.doc.roundedRect(this.margin, this.currentY, width, 22, 2, 2, "S")

      this.doc.setFontSize(9)
      this.doc.setTextColor(...this.colors.primary)
      this.doc.setFont("helvetica", "bold")
      this.doc.text("Special Instructions", this.margin + 5, this.currentY + 6)

      this.doc.setFontSize(8)
      this.doc.setTextColor(...this.colors.darkText)
      this.doc.setFont("helvetica", "normal")
      
      const lines = wrapText(this.doc, this.data.special_instructions, width - 10)
      lines.forEach((line, idx) => {
        this.doc.text(line, this.margin + 5, this.currentY + 12 + idx * 4)
      })

      this.currentY += 25
    }

    if (this.data.notes) {
      this.checkPageBreak(20)
      
      const width = this.pageWidth - 2 * this.margin
      this.doc.setFillColor(...this.colors.lightBg)
      this.doc.roundedRect(this.margin, this.currentY, width, 18, 2, 2, "F")
      
      this.doc.setDrawColor(...this.colors.primary)
      this.doc.setLineWidth(0.3)
      this.doc.roundedRect(this.margin, this.currentY, width, 18, 2, 2, "S")

      this.doc.setFontSize(9)
      this.doc.setTextColor(...this.colors.primary)
      this.doc.setFont("helvetica", "bold")
      this.doc.text("Notes", this.margin + 5, this.currentY + 6)

      this.doc.setFontSize(10)
      this.doc.setTextColor(100, 100, 100)
      this.doc.setFont("helvetica", "normal")
      
      // Normalize text to remove weird spacing
      const normalizedNotes = this.data.notes.replace(/\s+/g, ' ').trim()
      const lines = wrapText(this.doc, normalizedNotes, width - 10)
      lines.forEach((line, idx) => {
        this.doc.text(line, this.margin + 5, this.currentY + 11 + idx * 4)
      })

      this.currentY += 21
    }
  }

  // ==========================================================================
  // TERMS & CONDITIONS - SIMPLE LIST
  // ==========================================================================

  private addTermsAndConditions(): void {
    if (!this.data.terms_and_conditions || this.data.terms_and_conditions.length === 0) {
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

    this.doc.setFontSize(10)
    this.doc.setTextColor(...this.colors.darkText)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Terms & Conditions", this.margin, this.currentY)

    this.currentY += 6

    this.doc.setFontSize(7.5)
    this.doc.setTextColor(...this.colors.secondary)
    this.doc.setFont("helvetica", "normal")

    this.data.terms_and_conditions.forEach((term, index) => {
      this.checkPageBreak(10)
      
      const termLines = wrapText(this.doc, `${index + 1}. ${term}`, this.pageWidth - 2 * this.margin - 5)
      termLines.forEach((line, lineIndex) => {
        this.doc.text(line, this.margin + 3, this.currentY + lineIndex * 4)
      })
      this.currentY += termLines.length * 4 + 1
    })

    this.currentY += 5
  }

  // ==========================================================================
  // FOOTER - CLEAN & MINIMAL
  // ==========================================================================

  private addFooter(): void {
    const footerY = this.pageHeight - 20

    if (this.currentY > footerY - 10) {
      this.addNewPage()
    }

    // Signature lines
    const signatureY = footerY - 15
    const leftSigX = this.margin + 20
    const rightSigX = this.pageWidth - this.margin - 40

    this.doc.setDrawColor(...this.colors.borderGray)
    this.doc.setLineWidth(0.3)
    
    // Customer signature
    this.doc.line(leftSigX, signatureY, leftSigX + 40, signatureY)
    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.colors.secondary)
    this.doc.setFont("helvetica", "normal")
    this.doc.text("Customer Signature", leftSigX + 20, signatureY + 5, { align: "center" })

    // Company signature
    this.doc.line(rightSigX, signatureY, rightSigX + 40, signatureY)
    
    if (this.assets.signature) {
      try {
        this.doc.addImage(this.assets.signature, "PNG", rightSigX + 8, signatureY - 14, 24, 12)
      } catch {
        // Ignore
      }
    }
    
    this.doc.text("Authorized Signature", rightSigX + 20, signatureY + 5, { align: "center" })

    // Footer bar
    this.doc.setFillColor(...this.colors.lightBg)
    this.doc.rect(0, footerY, this.pageWidth, 20, "F")

    this.doc.setDrawColor(...this.colors.borderGray)
    this.doc.line(0, footerY, this.pageWidth, footerY)

    this.doc.setFontSize(7)
    this.doc.setTextColor(...this.colors.secondary)
    this.doc.setFont("helvetica", "normal")
    
    const footerText = `${this.data.company.name} | ${this.data.company.phone} | ${this.data.company.email}`
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
      await this.loadAssets()

      this.addHeader()
      this.addDocumentInfoCards()
      this.addEventDeliveryCards()
      this.addItemsTable()
      this.addPricingSummary()
      this.addNotesAndInstructions()
      this.addBankingDetails()
      this.addTermsAndConditions()
      this.addFooter()

      return this.doc.output("blob")
    } catch (error) {
      console.error("[Modern PDF Generator] Error:", error)
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function generateModernPDF(data: DocumentData): Promise<Blob> {
  const generator = new ModernPDFGenerator(data)
  return await generator.generate()
}

export type { DocumentData, CompanyInfo, CustomerInfo, EventInfo, QuoteItem, PricingInfo, BrandingColors }
