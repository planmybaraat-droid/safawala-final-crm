import jsPDF from 'jspdf'

export interface PDFColors {
  primary: [number, number, number]
  secondary: [number, number, number]
  text: [number, number, number]
  lightText: [number, number, number]
  border: [number, number, number]
  accent: [number, number, number]
  background: [number, number, number]
}

export interface PDFConfig {
  pageWidth: number
  pageHeight: number
  margin: number
  contentWidth: number
  colors: PDFColors
}

/**
 * 🎨 BEAUTIFUL PDF Header Component - Company info and logo with modern design
 */
export class PDFHeader {
  static async render(
    pdf: jsPDF,
    config: PDFConfig,
    yPosition: number,
    data: {
      companyName: string
      companyAddress?: string
      companyPhone?: string
      companyEmail?: string
      companyGST?: string
      companyWebsite?: string
      logoBase64?: string | null
    }
  ): Promise<number> {
    const { pageWidth, margin, colors, contentWidth } = config
    let y = yPosition

    // 🎨 Top accent bar - gradient effect with primary color
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.rect(0, 0, pageWidth, 4, 'F')
    
    // Secondary stripe
    pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
    pdf.rect(0, 4, pageWidth, 1, 'F')

    // 🖼️ Company Logo (LEFT side, prominent)
    let logoEndX = margin
    if (data.logoBase64) {
      try {
        const logoWidth = 50
        const logoHeight = 25
        const logoX = margin
        const logoY = y

        // Add subtle shadow effect
        pdf.setFillColor(230, 230, 230)
        pdf.roundedRect(logoX - 1, logoY - 1, logoWidth + 2, logoHeight + 2, 2, 2, 'F')

        let format: 'PNG' | 'JPEG' | 'JPG' = 'PNG'
        if (data.logoBase64.includes('image/jpeg') || data.logoBase64.includes('image/jpg')) {
          format = 'JPEG'
        }

        pdf.addImage(data.logoBase64, format, logoX, logoY, logoWidth, logoHeight)
        logoEndX = logoX + logoWidth + 15
        console.log('✅ Logo added to PDF (beautiful design)')
      } catch (e) {
        console.error('❌ Failed to add logo:', e)
      }
    }

    // 🏢 Company Name (Large, Bold, Brand Color)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(26)
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.text(data.companyName, logoEndX, y + 10)

    // ✨ Company Tagline (elegant subtitle)
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(9)
    pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
    pdf.text('Premium Event & Wedding Solutions', logoEndX, y + 17)
    
    y += 32

    // 📋 Company Details Card (Elegant box with gradient background)
    const cardHeight = 32
    const cardY = y
    
    // Card background with subtle gradient effect
    pdf.setFillColor(248, 250, 252) // Light blue-gray
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
    pdf.setLineWidth(0.3)
    pdf.roundedRect(margin, cardY, contentWidth, cardHeight, 3, 3, 'FD')
    
    // Left accent border
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.roundedRect(margin, cardY, 3, cardHeight, 0, 0, 'F')

    // 📍 Company Details in Two Columns
    y = cardY + 7
    const col1X = margin + 10
    const col2X = margin + contentWidth / 2 + 5
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])

    let leftY = y
    let rightY = y

    // LEFT COLUMN
    if (data.companyAddress) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
      pdf.text('📍 ADDRESS', col1X, leftY)
      leftY += 4
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      const addressLines = pdf.splitTextToSize(data.companyAddress, contentWidth / 2 - 20)
      pdf.text(addressLines, col1X, leftY)
      leftY += (addressLines.length * 4) + 1
    }

    if (data.companyPhone) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
      pdf.text('📞 PHONE', col1X, leftY)
      leftY += 4
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
      pdf.text(data.companyPhone, col1X, leftY)
      leftY += 5
    }

    // RIGHT COLUMN
    if (data.companyEmail) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
      pdf.text('✉️ EMAIL', col2X, rightY)
      rightY += 4
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
      pdf.text(data.companyEmail, col2X, rightY)
      rightY += 5
    }

    if (data.companyGST) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
      pdf.text('🏛️ GST NUMBER', col2X, rightY)
      rightY += 4
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      pdf.text(data.companyGST, col2X, rightY)
      rightY += 5
    }

    if (data.companyWebsite) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
      pdf.text('🌐 WEBSITE', col2X, rightY)
      rightY += 4
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
      pdf.text(data.companyWebsite, col2X, rightY)
      rightY += 5
    }

    y = cardY + cardHeight + 10
    return y
  }
}

/**
 * 📄 BEAUTIFUL PDF Invoice Title Component with modern badge design
 */
export class PDFInvoiceTitle {
  static render(
    pdf: jsPDF,
    config: PDFConfig,
    yPosition: number,
    data: {
      invoiceNumber: string
      bookingId: string
      date: string
      type: string
      status?: string
    }
  ): number {
    const { margin, colors, pageWidth, contentWidth } = config
    let y = yPosition

    // 🎯 INVOICE Title (Large, Bold, Centered accent)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(28)
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    const invoiceText = 'INVOICE'
    const titleWidth = pdf.getTextWidth(invoiceText)
    pdf.text(invoiceText, margin, y)
    
    // Decorative underline
    pdf.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
    pdf.setLineWidth(2)
    pdf.line(margin, y + 2, margin + titleWidth, y + 2)
    
    // 🏷️ Status Badge (Right side, elevated design)
    if (data.status) {
      const statusText = data.status.toUpperCase()
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      const textWidth = pdf.getTextWidth(statusText)
      const badgeWidth = textWidth + 16
      const badgeX = pageWidth - margin - badgeWidth
      const badgeY = y - 8
      
      // Badge background with shadow
      const statusLower = data.status.toLowerCase()
      if (statusLower.includes('confirm') || statusLower.includes('paid') || statusLower.includes('complete')) {
        pdf.setFillColor(34, 197, 94) // Green
        pdf.setTextColor(255, 255, 255)
      } else if (statusLower.includes('pending')) {
        pdf.setFillColor(251, 191, 36) // Amber
        pdf.setTextColor(0, 0, 0)
      } else if (statusLower.includes('cancel')) {
        pdf.setFillColor(239, 68, 68) // Red
        pdf.setTextColor(255, 255, 255)
      } else {
        pdf.setFillColor(148, 163, 184) // Gray
        pdf.setTextColor(255, 255, 255)
      }
      
      // Shadow
      pdf.setFillColor(200, 200, 200)
      pdf.roundedRect(badgeX + 0.5, badgeY + 0.5, badgeWidth, 8, 2, 2, 'F')
      
      // Badge
      if (statusLower.includes('confirm') || statusLower.includes('paid') || statusLower.includes('complete')) {
        pdf.setFillColor(34, 197, 94)
      } else if (statusLower.includes('pending')) {
        pdf.setFillColor(251, 191, 36)
      } else if (statusLower.includes('cancel')) {
        pdf.setFillColor(239, 68, 68)
      } else {
        pdf.setFillColor(148, 163, 184)
      }
      
      pdf.roundedRect(badgeX, badgeY, badgeWidth, 8, 2, 2, 'F')
      pdf.text(statusText, badgeX + 8, badgeY + 5.5)
    }
    
    y += 14

    // 📦 Invoice Details Cards (Two beautiful cards side by side)
    const boxY = y
    const box1X = margin
    const box2X = margin + contentWidth / 2 + 4
    const boxWidth = contentWidth / 2 - 4
    const boxHeight = 24
    
    // CARD 1 - Invoice & Booking Number
    pdf.setFillColor(255, 255, 255) // White
    pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.setLineWidth(0.5)
    pdf.roundedRect(box1X, boxY, boxWidth, boxHeight, 3, 3, 'FD')
    
    // Top accent strip
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.rect(box1X + 3, boxY, boxWidth - 6, 3, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
    pdf.text('INVOICE NUMBER', box1X + 6, boxY + 9)
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.text(data.invoiceNumber, box1X + 6, boxY + 15)
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
    pdf.text(`Booking: ${data.bookingId}`, box1X + 6, boxY + 20)
    
    // CARD 2 - Date & Type
    pdf.setFillColor(255, 255, 255)
    pdf.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
    pdf.setLineWidth(0.5)
    pdf.roundedRect(box2X, boxY, boxWidth, boxHeight, 3, 3, 'FD')
    
    // Top accent strip
    pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
    pdf.rect(box2X + 3, boxY, boxWidth - 6, 3, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
    pdf.text('INVOICE DATE', box2X + 6, boxY + 9)
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])
    pdf.text(data.date, box2X + 6, boxY + 15)
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
    pdf.text(`Type: ${data.type}`, box2X + 6, boxY + 20)
    
    y += boxHeight + 12

    return y
  }
}

/**
 * 👤 BEAUTIFUL PDF Customer Details Component
 */
export class PDFCustomerDetails {
  static render(
    pdf: jsPDF,
    config: PDFConfig,
    yPosition: number,
    data: {
      customerName: string
      customerCode?: string
      customerPhone: string
      customerWhatsApp?: string
      customerEmail?: string
      customerAddress?: string
      customerCity?: string
      customerState?: string
      customerPincode?: string
    }
  ): number {
    const { margin, contentWidth, colors } = config
    let y = yPosition

    // 🎯 Section Header with Icon
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.rect(margin, y, 4, 8, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.text('BILL TO', margin + 7, y + 6)
    
    y += 12

    // 🎨 Customer Details Card
    const cardHeight = 30
    pdf.setFillColor(252, 252, 254) // Very light purple tint
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
    pdf.setLineWidth(0.3)
    pdf.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, 'FD')
    
    // Left accent
    pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
    pdf.rect(margin, y, 3, cardHeight, 'F')
    
    y += 7
    const detailsX = margin + 8

    // Customer Name (Large, Bold)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])
    pdf.text(data.customerName, detailsX, y)
    y += 5

    // Customer Code (if available)
    if (data.customerCode) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
      pdf.text(`Customer ID: ${data.customerCode}`, detailsX, y)
      y += 4
    }

    // Contact Details (Two columns)
    const col2X = margin + contentWidth / 2 + 5
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])

    let contactY = y
    pdf.text(`📱 ${data.customerPhone}`, detailsX, contactY)
    contactY += 4

    if (data.customerWhatsApp && data.customerWhatsApp !== data.customerPhone) {
      pdf.text(`💬 ${data.customerWhatsApp}`, detailsX, contactY)
      contactY += 4
    }

    if (data.customerEmail) {
      pdf.text(`✉️ ${data.customerEmail}`, detailsX, contactY)
      contactY += 4
    }

    // Address (if available)
    if (data.customerAddress || data.customerCity) {
      let addressText = data.customerAddress || ''
      if (data.customerCity) addressText += (addressText ? ', ' : '') + data.customerCity
      if (data.customerState) addressText += ', ' + data.customerState
      if (data.customerPincode) addressText += ' - ' + data.customerPincode

      if (addressText) {
        pdf.setFontSize(8)
        pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        const addressLines = pdf.splitTextToSize(`📍 ${addressText}`, contentWidth - 20)
        pdf.text(addressLines, detailsX, contactY)
      }
    }

    y += cardHeight + 10
    return y
  }
}

/**
 * 📦 Package Details Component (remains the same with minor styling improvements)
 */
export class PDFPackageDetails {
  static render(
    pdf: jsPDF,
    config: PDFConfig,
    yPosition: number,
    data: {
      packageName?: string
      variantName?: string
      categoryName?: string
      extraSafas?: number
      packageDescription?: string
    }
  ): number {
    const { margin, contentWidth, colors } = config
    let y = yPosition

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.text('PACKAGE DETAILS:', margin, y)
    y += 6

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])

    if (data.packageName) {
      pdf.text(`Package: ${data.packageName}`, margin, y)
      y += 4
    }
    if (data.variantName) {
      pdf.text(`Variant: ${data.variantName}`, margin, y)
      y += 4
    }
    if (data.categoryName) {
      pdf.text(`Category: ${data.categoryName}`, margin, y)
      y += 4
    }
    if (data.extraSafas) {
      pdf.text(`Extra Safas: ${data.extraSafas}`, margin, y)
      y += 4
    }
    if (data.packageDescription) {
      const descLines = pdf.splitTextToSize(`Description: ${data.packageDescription}`, contentWidth)
      pdf.text(descLines, margin, y)
      y += descLines.length * 4
    }

    y += 6
    return y
  }
}

/**
 * 🎉 Event Details Component
 */
export class PDFEventDetails {
  static render(
    pdf: jsPDF,
    config: PDFConfig,
    yPosition: number,
    data: {
      eventType?: string
      eventFor?: string
      eventParticipant?: string
      eventTime?: string
      venueName?: string
      venueAddress?: string
      deliveryDate?: string
      deliveryTime?: string
      returnDate?: string
      returnTime?: string
      groomName?: string
      brideName?: string
    }
  ): number {
    const { margin, contentWidth, colors } = config
    let y = yPosition

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.text('EVENT DETAILS:', margin, y)
    y += 6

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])

    if (data.eventType) {
      pdf.text(`Event Type: ${data.eventType}`, margin, y)
      y += 4
    }
    if (data.eventFor) {
      pdf.text(`Event For: ${data.eventFor}`, margin, y)
      y += 4
    }
    if (data.eventParticipant) {
      pdf.text(`Participant: ${data.eventParticipant}`, margin, y)
      y += 4
    }
    if (data.groomName) {
      pdf.text(`Groom: ${data.groomName}`, margin, y)
      y += 4
    }
    if (data.brideName) {
      pdf.text(`Bride: ${data.brideName}`, margin, y)
      y += 4
    }
    if (data.venueName) {
      pdf.text(`Venue: ${data.venueName}`, margin, y)
      y += 4
    }
    if (data.venueAddress) {
      const venueLines = pdf.splitTextToSize(`Address: ${data.venueAddress}`, contentWidth)
      pdf.text(venueLines, margin, y)
      y += venueLines.length * 4
    }
    if (data.deliveryDate) {
      const deliveryText = `Delivery: ${new Date(data.deliveryDate).toLocaleDateString('en-IN')}${data.deliveryTime ? ' at ' + data.deliveryTime : ''}`
      pdf.text(deliveryText, margin, y)
      y += 4
    }
    if (data.returnDate) {
      const returnText = `Return: ${new Date(data.returnDate).toLocaleDateString('en-IN')}${data.returnTime ? ' at ' + data.returnTime : ''}`
      pdf.text(returnText, margin, y)
      y += 4
    }

    y += 6
    return y
  }
}

/**
 * 💰 Financial Summary Component
 */
export class PDFFinancialSummary {
  static render(
    pdf: jsPDF,
    config: PDFConfig,
    yPosition: number,
    data: {
      subtotal: number
      discountAmount?: number
      discountPercentage?: number
      couponCode?: string
      couponDiscount?: number
      distanceAmount?: number
      customAmount?: number
      taxAmount?: number
      taxPercentage?: number
      totalAmount: number
      securityDeposit?: number
    }
  ): number {
    const { pageWidth, margin, colors } = config
    let y = yPosition

    const labelX = pageWidth - margin - 80
    const valueX = pageWidth - margin - 5

    // Summary box
    const summaryHeight = 45
    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
    pdf.setLineWidth(0.3)
    pdf.roundedRect(labelX - 5, y, 80, summaryHeight, 2, 2, 'FD')

    y += 6

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])

    // Subtotal
    pdf.text('Subtotal:', labelX, y)
    pdf.text(`₹${data.subtotal.toFixed(2)}`, valueX, y, { align: 'right' })
    y += 5

    // Discount
    if (data.discountAmount && data.discountAmount > 0) {
      pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
      const discountText = data.discountPercentage 
        ? `Discount (${data.discountPercentage}%):`
        : 'Discount:'
      pdf.text(discountText, labelX, y)
      pdf.text(`-₹${data.discountAmount.toFixed(2)}`, valueX, y, { align: 'right' })
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      y += 5
    }

    // Coupon
    if (data.couponDiscount && data.couponDiscount > 0) {
      pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
      const couponText = data.couponCode ? `Coupon (${data.couponCode}):` : 'Coupon:'
      pdf.text(couponText, labelX, y)
      pdf.text(`-₹${data.couponDiscount.toFixed(2)}`, valueX, y, { align: 'right' })
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      y += 5
    }

    // Distance charges
    if (data.distanceAmount && data.distanceAmount > 0) {
      pdf.text('Distance Charges:', labelX, y)
      pdf.text(`₹${data.distanceAmount.toFixed(2)}`, valueX, y, { align: 'right' })
      y += 5
    }

    // Custom amount
    if (data.customAmount && data.customAmount !== 0) {
      const customLabel = data.customAmount > 0 ? 'Additional Charges:' : 'Adjustment:'
      pdf.text(customLabel, labelX, y)
      pdf.text(`₹${data.customAmount.toFixed(2)}`, valueX, y, { align: 'right' })
      y += 5
    }

    // Tax
    if (data.taxAmount && data.taxAmount > 0) {
      const taxText = data.taxPercentage ? `GST (${data.taxPercentage}%):` : 'GST:'
      pdf.text(taxText, labelX, y)
      pdf.text(`₹${data.taxAmount.toFixed(2)}`, valueX, y, { align: 'right' })
      y += 5
    }

    // Line separator
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
    pdf.line(labelX, y, valueX, y)
    y += 4

    // Total (Bold, larger)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.text('TOTAL AMOUNT:', labelX, y)
    pdf.text(`₹${data.totalAmount.toFixed(2)}`, valueX, y, { align: 'right' })
    y += 5

    // Security Deposit
    if (data.securityDeposit && data.securityDeposit > 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2])
      pdf.text('Security Deposit:', labelX, y)
      pdf.text(`₹${data.securityDeposit.toFixed(2)}`, valueX, y, { align: 'right' })
      y += 5
    }

    y += 8
    return y
  }
}

/**
 * 💳 Payment Status Component
 */
export class PDFPaymentStatus {
  static render(
    pdf: jsPDF,
    config: PDFConfig,
    yPosition: number,
    data: {
      paidAmount: number
      pendingAmount?: number
      paymentMethod?: string
      paymentType?: string
    }
  ): number {
    const { pageWidth, margin, colors } = config
    let y = yPosition

    const labelX = pageWidth - margin - 80
    const valueX = pageWidth - margin - 5

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])
    pdf.text('PAYMENT SUMMARY:', labelX, y)
    y += 6

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)

    // Paid amount
    pdf.setTextColor(34, 197, 94) // Green
    pdf.text('Paid Amount:', labelX, y)
    pdf.text(`₹${data.paidAmount.toFixed(2)}`, valueX, y, { align: 'right' })
    y += 5

    // Pending amount
    if (data.pendingAmount && data.pendingAmount > 0) {
      pdf.setTextColor(239, 68, 68) // Red
      pdf.text('Pending Amount:', labelX, y)
      pdf.text(`₹${data.pendingAmount.toFixed(2)}`, valueX, y, { align: 'right' })
      y += 5
    }

    // Payment details
    if (data.paymentMethod || data.paymentType) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
      
      if (data.paymentMethod) {
        pdf.text(`Method: ${data.paymentMethod}`, labelX, y)
        y += 4
      }
      if (data.paymentType) {
        pdf.text(`Type: ${data.paymentType}`, labelX, y)
        y += 4
      }
    }

    y += 8
    return y
  }
}

/**
 * 📝 Footer Component
 */
export class PDFFooter {
  static async render(
    pdf: jsPDF,
    config: PDFConfig,
    yPosition: number,
    data: {
      termsAndConditions?: string
      signatureBase64?: string | null
      companyName?: string
    }
  ): Promise<number> {
    const { pageWidth, pageHeight, margin, colors, contentWidth } = config
    let y = Math.max(yPosition, pageHeight - 60)

    // Terms and conditions
    if (data.termsAndConditions) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      pdf.text('Terms & Conditions:', margin, y)
      y += 5

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
      const termsLines = pdf.splitTextToSize(data.termsAndConditions, contentWidth - 10)
      pdf.text(termsLines, margin, y)
      y += (termsLines.length * 4) + 8
    }

    // Signature
    if (data.signatureBase64) {
      try {
        const signatureWidth = 40
        const signatureHeight = 20
        const signatureX = pageWidth - margin - signatureWidth
        const signatureY = y

        let format: 'PNG' | 'JPEG' | 'JPG' = 'PNG'
        if (data.signatureBase64.includes('image/jpeg') || data.signatureBase64.includes('image/jpg')) {
          format = 'JPEG'
        }

        pdf.addImage(data.signatureBase64, format, signatureX, signatureY, signatureWidth, signatureHeight)
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2])
        pdf.text('Authorized Signature', signatureX, signatureY + signatureHeight + 4)
        
        y = signatureY + signatureHeight + 10
      } catch (e) {
        console.error('Failed to add signature:', e)
      }
    }

    // Footer accent bar
    const footerY = pageHeight - 5
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
    pdf.rect(0, footerY, pageWidth, 1, 'F')
    
    pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
    pdf.rect(0, footerY + 1, pageWidth, 4, 'F')

    // Footer text
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(255, 255, 255)
    const footerText = data.companyName 
      ? `© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.`
      : 'Thank you for your business!'
    const footerTextWidth = pdf.getTextWidth(footerText)
    pdf.text(footerText, (pageWidth - footerTextWidth) / 2, footerY + 3.5)

    return y
  }
}
