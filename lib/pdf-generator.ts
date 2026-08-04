import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Note: autoTable extends jsPDF prototype automatically when imported

interface QuoteTemplate {
  id: string
  name: string
  description: string
  style: "modern" | "classic" | "minimal" | "elegant" | "corporate" | "creative" | "premium"
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  layout: "standard" | "compact" | "detailed" | "summary"
}

interface QuoteData {
  customer: {
    name: string
    phone: string
    whatsapp?: string
    email?: string
    address: string
  }
  items: Array<{
    product: {
      name: string
      category: string
      product_code?: string
    }
    quantity: number
    unit_price: number
    total_price: number
    security_deposit: number
  }>
  bookingDetails: {
    type: string
    event_type: string
    payment_type: string
    event_date?: string
    delivery_date?: string
    pickup_date?: string
    groom_name?: string
    groom_whatsapp?: string
    groom_address?: string
    bride_name?: string
    bride_whatsapp?: string
    bride_address?: string
    venue_name?: string
    venue_address?: string
    special_instructions?: string
  }
  pricing: {
    subtotal: number
    taxAmount: number
    totalAmount: number
    totalSecurityDeposit: number
    paymentBreakdown: {
      payNow: number
      payLater: number
      description: string
    }
  }
  franchise: {
    name: string
    address: string
    phone: string
    email: string
    gst_number: string
  }
  template?: QuoteTemplate
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [Number.parseInt(result[1], 16), Number.parseInt(result[2], 16), Number.parseInt(result[3], 16)]
    : [27, 94, 32] // Default dark green
}

function safeCapitalize(str: string | null | undefined): string {
  if (!str || typeof str !== "string" || str.trim() === "") return "N/A"
  const trimmed = str.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function safeFormatDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== "string" || dateStr.trim() === "") return "N/A"
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return "Invalid Date"
    return date.toLocaleDateString("en-IN")
  } catch {
    return "Invalid Date"
  }
}

function safeCurrency(amount: number | null | undefined): string {
  if (typeof amount !== "number" || isNaN(amount) || amount === null || amount === undefined) return "₹0.00"
  return `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function safeString(str: string | null | undefined, fallback = "N/A"): string {
  if (!str || typeof str !== "string" || str.trim() === "") return fallback
  return str.trim()
}

function safeNumber(num: number | null | undefined, fallback = 0): number {
  if (typeof num !== "number" || isNaN(num) || num === null || num === undefined) return fallback
  return num
}

export async function generateQuotePDF(data: QuoteData): Promise<Blob> {
  try {
    console.log("[v0] Starting PDF generation with enhanced null safety...")

    const sanitizedData = {
      customer: {
        name: safeString(data.customer?.name, "Customer"),
        phone: safeString(data.customer?.phone, "N/A"),
        whatsapp: safeString(data.customer?.whatsapp, ""),
        email: safeString(data.customer?.email, ""),
        address: safeString(data.customer?.address, "Address not provided"),
      },
      items: (data.items || []).map((item) => ({
        product: {
          name: safeString(item?.product?.name, "Product"),
          category: safeString(item?.product?.category, "general"),
          product_code: safeString(item?.product?.product_code, ""),
        },
        quantity: safeNumber(item?.quantity, 1),
        unit_price: safeNumber(item?.unit_price, 0),
        total_price: safeNumber(item?.total_price, 0),
        security_deposit: safeNumber(item?.security_deposit, 0),
      })),
      bookingDetails: {
        type: safeString(data.bookingDetails?.type, "rental"),
        event_type: safeString(data.bookingDetails?.event_type, "wedding"),
        payment_type: safeString(data.bookingDetails?.payment_type, "full_payment"),
        event_date: safeString(data.bookingDetails?.event_date, ""),
        delivery_date: safeString(data.bookingDetails?.delivery_date, ""),
        pickup_date: safeString(data.bookingDetails?.pickup_date, ""),
        groom_name: safeString(data.bookingDetails?.groom_name, ""),
        groom_whatsapp: safeString(data.bookingDetails?.groom_whatsapp, ""),
        groom_address: safeString(data.bookingDetails?.groom_address, ""),
        bride_name: safeString(data.bookingDetails?.bride_name, ""),
        bride_whatsapp: safeString(data.bookingDetails?.bride_whatsapp, ""),
        bride_address: safeString(data.bookingDetails?.bride_address, ""),
        venue_name: safeString(data.bookingDetails?.venue_name, ""),
        venue_address: safeString(data.bookingDetails?.venue_address, ""),
        special_instructions: safeString(data.bookingDetails?.special_instructions, ""),
      },
      pricing: {
        subtotal: safeNumber(data.pricing?.subtotal, 0),
        taxAmount: safeNumber(data.pricing?.taxAmount, 0),
        totalAmount: safeNumber(data.pricing?.totalAmount, 0),
        totalSecurityDeposit: safeNumber(data.pricing?.totalSecurityDeposit, 0),
        paymentBreakdown: {
          payNow: safeNumber(data.pricing?.paymentBreakdown?.payNow, 0),
          payLater: safeNumber(data.pricing?.paymentBreakdown?.payLater, 0),
          description: safeString(data.pricing?.paymentBreakdown?.description, "Payment"),
        },
      },
      franchise: {
        name: safeString(data.franchise?.name, "Safawala Wedding Accessories"),
        address: safeString(data.franchise?.address, "Address not provided"),
        phone: safeString(data.franchise?.phone, "N/A"),
        email: safeString(data.franchise?.email, "N/A"),
        gst_number: safeString(data.franchise?.gst_number, "N/A"),
      },
      template: data.template,
    }

    const doc = new jsPDF()

    // Premium color scheme - Elegant gold and navy
    const navyBlue: [number, number, number] = [25, 42, 86] // Deep navy blue
    const goldAccent: [number, number, number] = [212, 175, 55] // Elegant gold
    const lightGold: [number, number, number] = [245, 237, 220] // Light cream/gold
    const darkText: [number, number, number] = [33, 33, 33] // Almost black
    const grayText: [number, number, number] = [100, 100, 100] // Gray for secondary text
    const successGreen: [number, number, number] = [16, 185, 129] // Modern green

    // Decorative header with gradient effect
    doc.setFillColor(...navyBlue)
    doc.rect(0, 0, 210, 50, "F")
    
    // Gold accent bar
    doc.setFillColor(...goldAccent)
    doc.rect(0, 48, 210, 2, "F")
    
    // Company Logo placeholder (decorative circle)
    doc.setFillColor(255, 255, 255)
    doc.circle(25, 25, 12, "F")
    doc.setFillColor(...goldAccent)
    doc.circle(25, 25, 10, "F")
    doc.setTextColor(...navyBlue)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("S", 22, 28)

    // Company name - elegant typography
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont("helvetica", "bold")
    doc.text(sanitizedData.franchise.name.toUpperCase(), 42, 22)
    
    // Tagline
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text("Making Your Special Moments Memorable", 42, 30)

    // QUOTATION badge
    doc.setFillColor(...goldAccent)
    doc.roundedRect(150, 15, 45, 20, 3, 3, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("QUOTATION", 172.5, 25, { align: "center" })
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`QT-${Date.now().toString().slice(-8)}`, 172.5, 31, { align: "center" })

    let yPos = 60

    // Contact info bar with icons simulation
    doc.setFillColor(248, 249, 250)
    doc.rect(0, yPos, 210, 15, "F")
    
    doc.setTextColor(...grayText)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`📍 ${sanitizedData.franchise.address}`, 10, yPos + 5)
    doc.text(`📞 ${sanitizedData.franchise.phone}`, 10, yPos + 10)
    doc.text(`✉️  ${sanitizedData.franchise.email}`, 80, yPos + 5)
    doc.text(`🏢 GST: ${sanitizedData.franchise.gst_number}`, 80, yPos + 10)
    
    const currentDate = new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })
    const validDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })
    doc.text(`📅 Date: ${currentDate}`, 150, yPos + 5)
    doc.text(`⏰ Valid: ${validDate}`, 150, yPos + 10)

    yPos += 25

    // Two-column layout for customer and event info
    // Left column - Customer Information
    doc.setFillColor(...goldAccent)
    doc.rect(10, yPos, 90, 8, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("👤 CUSTOMER DETAILS", 12, yPos + 5.5)

    yPos += 12
    doc.setTextColor(...darkText)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(sanitizedData.customer.name, 12, yPos)
    
    yPos += 5
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...grayText)
    doc.text(`📱 ${sanitizedData.customer.phone}`, 12, yPos)
    
    if (sanitizedData.customer.email && sanitizedData.customer.email !== "") {
      yPos += 4
      doc.text(`✉️  ${sanitizedData.customer.email}`, 12, yPos)
    }
    
    yPos += 4
    const addressLines = doc.splitTextToSize(`📍 ${sanitizedData.customer.address}`, 85)
    doc.text(addressLines, 12, yPos)
    const customerBoxHeight = 12 + addressLines.length * 4 + (sanitizedData.customer.email ? 17 : 13)

    // Right column - Event Information
    let rightYPos = 90 + 25
    doc.setFillColor(...goldAccent)
    doc.rect(110, rightYPos, 90, 8, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("🎉 EVENT DETAILS", 112, rightYPos + 5.5)

    rightYPos += 12
    doc.setTextColor(...darkText)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    
    doc.text(`Type: ${safeCapitalize(sanitizedData.bookingDetails.event_type)}`, 112, rightYPos)
    rightYPos += 4
    doc.text(`Mode: ${sanitizedData.bookingDetails.type === "rental" ? "🔄 Rental" : "💳 Purchase"}`, 112, rightYPos)
    
    if (sanitizedData.bookingDetails.event_date && sanitizedData.bookingDetails.event_date !== "") {
      rightYPos += 4
      doc.text(`📅 Event: ${safeFormatDate(sanitizedData.bookingDetails.event_date)}`, 112, rightYPos)
    }
    
    if (sanitizedData.bookingDetails.delivery_date && sanitizedData.bookingDetails.delivery_date !== "") {
      rightYPos += 4
      doc.text(`🚚 Delivery: ${safeFormatDate(sanitizedData.bookingDetails.delivery_date)}`, 112, rightYPos)
    }
    
    if (sanitizedData.bookingDetails.pickup_date && sanitizedData.bookingDetails.pickup_date !== "") {
      rightYPos += 4
      doc.text(`📦 Pickup: ${safeFormatDate(sanitizedData.bookingDetails.pickup_date)}`, 112, rightYPos)
    }
    
    if (sanitizedData.bookingDetails.groom_name && sanitizedData.bookingDetails.groom_name !== "") {
      rightYPos += 4
      doc.text(`🤵 Groom: ${sanitizedData.bookingDetails.groom_name}`, 112, rightYPos)
    }
    
    if (sanitizedData.bookingDetails.bride_name && sanitizedData.bookingDetails.bride_name !== "") {
      rightYPos += 4
      doc.text(`👰 Bride: ${sanitizedData.bookingDetails.bride_name}`, 112, rightYPos)
    }
    
    if (sanitizedData.bookingDetails.venue_name && sanitizedData.bookingDetails.venue_name !== "") {
      rightYPos += 4
      doc.text(`🏛️  Venue: ${sanitizedData.bookingDetails.venue_name}`, 112, rightYPos)
    }
    
    if (sanitizedData.bookingDetails.venue_address && sanitizedData.bookingDetails.venue_address !== "") {
      rightYPos += 4
      const venueLines = doc.splitTextToSize(`📍 ${sanitizedData.bookingDetails.venue_address}`, 85)
      doc.text(venueLines, 112, rightYPos)
    }

    yPos = Math.max(yPos + addressLines.length * 4 + 5, rightYPos + 10)

    // Items Table Header
    doc.setFillColor(...navyBlue)
    doc.rect(10, yPos, 190, 10, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("📋 QUOTATION ITEMS", 15, yPos + 7)

    yPos += 15

    // Prepare table data
    const tableHeaders = ["Item", "Category", "Qty", "Rate (₹)", "Amount (₹)"]
    if (sanitizedData.bookingDetails.type === "rental") {
      tableHeaders.push("Deposit (₹)")
    }

    const tableData = sanitizedData.items.map((item) => {
      const row = [
        item.product.name,
        safeCapitalize(item.product.category),
        item.quantity.toString(),
        safeCurrency(item.unit_price),
        safeCurrency(item.total_price),
      ]

      if (sanitizedData.bookingDetails.type === "rental") {
        row.push(safeCurrency(item.security_deposit * item.quantity))
      }

      return row
    })

    // Add table
    let currentColumnStyles: any = {
      0: { cellWidth: 65 }, // Item name
      1: { cellWidth: 30 }, // Category
      2: { cellWidth: 15, halign: "center" }, // Quantity
      3: { cellWidth: 30, halign: "right" }, // Rate
      4: { cellWidth: 30, halign: "right" }, // Amount
    }

    if (sanitizedData.bookingDetails.type === "rental") {
      currentColumnStyles = {
        0: { cellWidth: 55 }, // Item name
        1: { cellWidth: 25 }, // Category
        2: { cellWidth: 15, halign: "center" }, // Quantity
        3: { cellWidth: 25, halign: "right" }, // Rate
        4: { cellWidth: 25, halign: "right" }, // Amount
        5: { cellWidth: 25, halign: "right" }, // Deposit
      }
    }
    
    // Use autoTable as a direct function call
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      theme: "striped",
      headStyles: {
        fillColor: navyBlue as any,
        textColor: [255, 255, 255] as any,
        fontSize: 10,
        fontStyle: "bold",
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: darkText as any,
      },
      alternateRowStyles: {
        fillColor: [252, 252, 253] as any,
      },
      columnStyles: currentColumnStyles,
      margin: { left: 10, right: 10 }
    })

    // Get the final Y position after the table
    yPos = (doc as any).lastAutoTable.finalY + 15

    // Pricing Summary with elegant box
    const summaryX = 120
    const summaryBoxTop = yPos - 5
    
    doc.setFillColor(...lightGold)
    doc.roundedRect(summaryX - 5, summaryBoxTop, 85, 45, 3, 3, "F")
    
    doc.setDrawColor(...goldAccent)
    doc.setLineWidth(0.5)
    doc.roundedRect(summaryX - 5, summaryBoxTop, 85, 45, 3, 3, "S")

    const basePrice = sanitizedData.pricing.subtotal
    const gstAmount = sanitizedData.pricing.taxAmount
    const totalAmount = sanitizedData.pricing.totalAmount

    doc.setTextColor(...darkText)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")

    doc.text(`Subtotal:`, summaryX, yPos)
    doc.text(safeCurrency(basePrice), 195, yPos, { align: "right" })

    yPos += 6
    doc.text(`Tax (GST):`, summaryX, yPos)
    doc.text(safeCurrency(gstAmount), 195, yPos, { align: "right" })

    if (sanitizedData.bookingDetails.type === "rental" && sanitizedData.pricing.totalSecurityDeposit > 0) {
      yPos += 6
      doc.text(`Security Deposit:`, summaryX, yPos)
      doc.text(safeCurrency(sanitizedData.pricing.totalSecurityDeposit), 195, yPos, { align: "right" })
    }

    // Total line with emphasis
    yPos += 8
    doc.setDrawColor(...goldAccent)
    doc.setLineWidth(1)
    doc.line(summaryX, yPos - 2, 200, yPos - 2)

    doc.setFillColor(...successGreen)
    doc.rect(summaryX, yPos - 5, 80, 10, "F")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.text(`TOTAL AMOUNT:`, summaryX + 2, yPos + 2)
    doc.text(safeCurrency(totalAmount), 198, yPos + 2, { align: "right" })

    yPos += 15

    // Payment Terms with icon
    doc.setFillColor(...navyBlue)
    doc.rect(10, yPos, 190, 10, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("💳 PAYMENT TERMS", 15, yPos + 7)

    yPos += 15
    doc.setTextColor(...grayText)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")

    doc.text(`💰 Payment Type: ${sanitizedData.pricing.paymentBreakdown.description}`, 15, yPos)
    yPos += 5
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...successGreen)
    doc.text(`✓ Pay Now: ${safeCurrency(sanitizedData.pricing.paymentBreakdown.payNow)}`, 15, yPos)

    if (sanitizedData.pricing.paymentBreakdown.payLater > 0) {
      yPos += 5
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...grayText)
      doc.text(`⏰ Remaining: ${safeCurrency(sanitizedData.pricing.paymentBreakdown.payLater)}`, 15, yPos)
    }

    if (sanitizedData.bookingDetails.special_instructions && sanitizedData.bookingDetails.special_instructions !== "") {
      yPos += 15
      doc.setFillColor(...navyBlue)
      doc.rect(10, yPos, 190, 10, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("📝 SPECIAL INSTRUCTIONS", 15, yPos + 7)

      yPos += 15
      doc.setTextColor(...darkText)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")

      const instructionLines = doc.splitTextToSize(sanitizedData.bookingDetails.special_instructions, 180)
      doc.text(instructionLines, 15, yPos)
      yPos += instructionLines.length * 5
    }

    // Check if we need a new page for terms
    if (yPos > 210) {
      doc.addPage()
      yPos = 20
    } else {
      yPos += 15
    }

    // Terms and Conditions with elegant header
    doc.setFillColor(...navyBlue)
    doc.rect(10, yPos, 190, 10, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("📋 TERMS & CONDITIONS", 15, yPos + 7)

    yPos += 15
    doc.setTextColor(...darkText)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")

    const terms = [
      "1. This quotation is valid for 30 days from the date of issue.",
      "2. All prices are inclusive of applicable taxes unless otherwise specified.",
      "3. Security deposit is refundable upon return of items in good condition.",
      "4. Any damage to rented items will be charged separately as per actual cost.",
      "5. Delivery and pickup charges may apply based on location.",
      "6. Advance payment is required to confirm the booking.",
      "7. Cancellation charges may apply as per our cancellation policy.",
      "8. Items must be returned on the agreed pickup date to avoid additional charges.",
      "9. Customer is responsible for the safety and security of rented items.",
      "10. All disputes are subject to Delhi jurisdiction only.",
    ]

    terms.forEach((term) => {
      if (yPos > 265) {
        doc.addPage()
        yPos = 20
      }
      doc.text(term, 15, yPos)
      yPos += 5
    })

    // Elegant footer with golden bar
    yPos = 280
    doc.setFillColor(...goldAccent)
    doc.rect(0, yPos, 210, 2, "F")

    yPos += 8
    doc.setTextColor(...grayText)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("✨ Thank You for Choosing Safawala Wedding Accessories! ✨", 105, yPos, { align: "center" })

    yPos += 5
    doc.setFontSize(7)
    doc.setFont("helvetica", "italic")
    doc.text(`Generated on ${new Date().toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short', hour12: true })}`, 105, yPos, { align: "center" })

    // Add watermark on first page
    doc.setPage(1)
    doc.setTextColor(200, 200, 200)
    doc.setFontSize(60)
    doc.setFont("helvetica", "bold")
    doc.text("QUOTATION", 105, 150, { align: "center", angle: 45 })

    // Convert to blob
    console.log("[v0] PDF generation completed successfully with enhanced null safety")
    const pdfBlob = doc.output("blob")
    return pdfBlob
  } catch (error) {
    console.error("[v0] Error in PDF generation:", error)
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
