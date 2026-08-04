/**
 * Compact Single-Page Quote PDF Generator
 * Professional invoice format: QUO-10001
 * All information on one page with optimized spacing
 */

import jsPDF from 'jspdf'
import { format } from 'date-fns'

interface CompactPDFData {
  quoteNumber: string
  date: string
  customerName: string
  customerPhone: string
  customerAddress: string
  customerPincode: string
  eventDate: string
  deliveryDate: string
  returnDate: string
  eventType: string
  venueAddress: string
  items: Array<{
    sr: number
    packageName: string
    quantity: number
    unitPrice: number
    amount: number
  }>
  subtotal: number
  discount: number
  gst: number
  grandTotal: number
  paymentType: string
  paymentDue: number
  notes?: string
  companyName?: string
  companyPhone?: string
  companyEmail?: string
  gstNumber?: string
}

export async function generateCompactQuotePDF(data: CompactPDFData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210x297mm
  })

  const pageWidth = 210
  const pageHeight = 297
  const margin = 8
  const contentWidth = pageWidth - margin * 2
  let yPos = margin

  const colors = {
    primary: '#1b5e20', // Green
    text: '#000000',
    lightGray: '#f5f5f5',
    border: '#ddd',
  }

  // =========================================================================
  // HEADER
  // =========================================================================
  
  // Company Name & Quote Number
  doc.setFontSize(14)
  doc.setTextColor(colors.primary)
  doc.setFont('helvetica', 'bold')
  doc.text(`${data.companyName || 'SAFAWALA'}`, margin, yPos)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  doc.text(`Ph: ${data.companyPhone || ''}`, margin, yPos + 5)
  doc.text(`Email: ${data.companyEmail || ''}`, margin, yPos + 10)
  
  // Quote Number on right
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary)
  const qnWidth = doc.getTextWidth(`Quote # ${data.quoteNumber}`)
  doc.text(`Quote # ${data.quoteNumber}`, pageWidth - margin - qnWidth, yPos + 3)
  
  // Date
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  const dateWidth = doc.getTextWidth(`Date: ${data.date}`)
  doc.text(`Date: ${data.date}`, pageWidth - margin - dateWidth, yPos + 9)
  
  yPos += 18

  // =========================================================================
  // CUSTOMER & EVENT DETAILS (Compact)
  // =========================================================================
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary)
  doc.text('Customer Details:', margin, yPos)
  
  yPos += 3
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  
  // Two column layout for details
  const col1X = margin
  const col2X = margin + contentWidth / 2
  
  doc.text(`Name: ${data.customerName}`, col1X, yPos)
  doc.text(`Phone: ${data.customerPhone}`, col2X, yPos)
  yPos += 3
  
  doc.text(`Address: ${data.customerAddress}, ${data.customerPincode}`, col1X, yPos)
  doc.text(`Event: ${data.eventType}`, col2X, yPos)
  yPos += 3
  
  doc.text(`Venue: ${data.venueAddress}`, col1X, yPos)
  yPos += 4
  
  // Event Dates
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary)
  doc.text('Rental Dates:', margin, yPos)
  yPos += 3
  
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  doc.text(`Event: ${data.eventDate}  |  Delivery: ${data.deliveryDate}  |  Return: ${data.returnDate}`, margin, yPos)
  yPos += 5

  // =========================================================================
  // ITEMS TABLE
  // =========================================================================
  
  const tableStartY = yPos
  const tableHeaderHeight = 6
  const tableRowHeight = 5
  
  // Table header
  doc.setFillColor(colors.primary)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  
  const colWidths = {
    sr: 8,
    name: contentWidth - 8 - 15 - 15 - 15,
    qty: 15,
    unitPrice: 15,
    amount: 15,
  }
  
  let colX = margin
  doc.rect(colX, tableStartY, contentWidth, tableHeaderHeight, 'F')
  
  doc.text('Sr.', colX + 1, tableStartY + tableHeaderHeight - 1)
  colX += colWidths.sr
  
  doc.text('Package Details', colX + 1, tableStartY + tableHeaderHeight - 1)
  colX += colWidths.name
  
  doc.text('Qty', colX + 1, tableStartY + tableHeaderHeight - 1, { align: 'center' })
  colX += colWidths.qty
  
  doc.text('Unit Price', colX + 1, tableStartY + tableHeaderHeight - 1, { align: 'center' })
  colX += colWidths.unitPrice
  
  doc.text('Amount', colX + 1, tableStartY + tableHeaderHeight - 1, { align: 'right' })
  
  // Table rows
  yPos = tableStartY + tableHeaderHeight
  doc.setTextColor(colors.text)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  
  data.items.forEach((item) => {
    // Check if need to move to next page
    if (yPos + tableRowHeight > pageHeight - 40) {
      doc.addPage()
      yPos = margin
    }
    
    colX = margin
    
    // Sr.
    doc.text(item.sr.toString(), colX + 1, yPos + tableRowHeight - 1)
    colX += colWidths.sr
    
    // Package Name (truncate if too long)
    const packageName = item.packageName.length > 40 
      ? item.packageName.substring(0, 37) + '...' 
      : item.packageName
    doc.text(packageName, colX + 1, yPos + tableRowHeight - 1)
    colX += colWidths.name
    
    // Qty
    doc.text(item.quantity.toString(), colX + 1, yPos + tableRowHeight - 1, { align: 'center' })
    colX += colWidths.qty
    
    // Unit Price
    doc.text(`₹${item.unitPrice.toFixed(0)}`, colX + 1, yPos + tableRowHeight - 1, { align: 'center' })
    colX += colWidths.unitPrice
    
    // Amount
    doc.text(`₹${item.amount.toFixed(0)}`, colX + 1, yPos + tableRowHeight - 1, { align: 'right' })
    
    // Separator line
    doc.setDrawColor(colors.border)
    doc.setLineWidth(0.3)
    doc.line(margin, yPos + tableRowHeight, pageWidth - margin, yPos + tableRowHeight)
    
    yPos += tableRowHeight
  })

  yPos += 2

  // =========================================================================
  // TOTALS SECTION
  // =========================================================================
  
  const totalsX = margin + contentWidth - 60
  const totalsLabelWidth = 25
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  
  // Subtotal
  doc.text('Subtotal:', totalsX, yPos)
  doc.text(`₹${data.subtotal.toFixed(0)}`, totalsX + totalsLabelWidth + 5, yPos, { align: 'right' })
  yPos += 4
  
  // Discount
  if (data.discount > 0) {
    doc.text('Discount:', totalsX, yPos)
    doc.text(`-₹${data.discount.toFixed(0)}`, totalsX + totalsLabelWidth + 5, yPos, { align: 'right' })
    yPos += 4
  }
  
  // GST (5%)
  doc.text('GST (5%):', totalsX, yPos)
  doc.text(`₹${data.gst.toFixed(0)}`, totalsX + totalsLabelWidth + 5, yPos, { align: 'right' })
  yPos += 5
  
  // Grand Total (Bold, highlighted)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(colors.primary)
  doc.rect(totalsX - 3, yPos - 3, 63, 6, 'F') // Background box (light green)
  doc.setTextColor(colors.primary)
  doc.text('Grand Total:', totalsX, yPos)
  doc.text(`₹${data.grandTotal.toFixed(0)}`, totalsX + totalsLabelWidth + 5, yPos, { align: 'right' })
  
  yPos += 7

  // =========================================================================
  // PAYMENT TERMS
  // =========================================================================
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary)
  doc.text('Payment Terms:', margin, yPos)
  yPos += 3
  
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  doc.setFontSize(7)
  
  const paymentText = `${data.paymentType === 'advance' ? '50% Advance' : 'Full Payment'} Due: ₹${data.paymentDue.toFixed(0)}`
  doc.text(paymentText, margin, yPos)
  yPos += 3

  // =========================================================================
  // NOTES (if present)
  // =========================================================================
  
  if (data.notes) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(colors.primary)
    doc.text('Special Notes:', margin, yPos)
    yPos += 3
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(colors.text)
    doc.setFontSize(7)
    const lines = doc.splitTextToSize(data.notes, contentWidth - 4)
    doc.text(lines, margin, yPos)
    yPos += lines.length * 2.5
  }

  yPos += 3

  // =========================================================================
  // FOOTER / TERMS & CONDITIONS
  // =========================================================================
  
  const footerY = pageHeight - 12
  doc.setFontSize(7)
  doc.setTextColor(colors.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('Terms & Conditions:', margin, footerY)
  
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  doc.setFontSize(6)
  const tcLines = [
    '1. Advance payment to confirm the booking.',
    '2. Security deposit (if applicable) is refundable.',
    '3. Please inform any changes 7 days in advance.',
    '4. Cancellation policy applies as per company norms.',
  ]
  
  let tcY = footerY + 3
  tcLines.forEach((line) => {
    if (tcY > pageHeight - 3) return // Don't overflow
    doc.text(line, margin, tcY)
    tcY += 2.5
  })

  // Convert to blob
  const pdfBlob = doc.output('blob')
  return pdfBlob
}

/**
 * Download the compact quote PDF
 */
export async function downloadCompactQuotePDF(data: CompactPDFData): Promise<void> {
  const blob = await generateCompactQuotePDF(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${data.quoteNumber}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
