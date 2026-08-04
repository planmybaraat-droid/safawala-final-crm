/**
 * Professional Quote PDF Generator
 * Complete redesign with all customer, event, payment, and branding information
 * Fetches company settings, branding colors, logo, contact details, and T&C
 */

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"

export interface CompactPDFData {
  id: string
  quote_number: string
  event_type: string
  event_date?: string
  event_time?: string
  delivery_date?: string
  delivery_time?: string
  return_date?: string
  return_time?: string
  venue_address?: string
  customer_name?: string
  customer_phone?: string
  customer_whatsapp?: string
  customer_email?: string
  customer_address?: string
  customer_city?: string
  customer_state?: string
  customer_pincode?: string
  groom_name?: string
  groom_whatsapp?: string
  groom_address?: string
  bride_name?: string
  bride_whatsapp?: string
  bride_address?: string
  booking_type?: 'package' | 'product' // 'package' = rental, 'product' = selling
  booking_subtype?: 'rental' | 'sale'
  items: Array<{
    sr: number
    packageName: string
    quantity: number
    unitPrice: number
    amount: number
  }>
  selected_products?: Array<{
    name: string
    quantity: number
  }>
  subtotal: number
  discount: number
  gst: number
  grandTotal: number
  paymentDue: number
  paymentType?: string
  salesStaffName?: string
  notes?: string
  franchise_id?: string
  created_at?: string
}

interface CompanySettings {
  company_name?: string
  phone?: string
  email?: string
  website?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gst_number?: string
  logo_url?: string
  terms_conditions?: string
  primary_color?: string
  secondary_color?: string
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [27, 94, 32] // Default green
}

function formatDate(dateString?: string): string {
  if (!dateString) return "N/A"
  try {
    return format(new Date(dateString), "dd/MM/yyyy")
  } catch {
    return "N/A"
  }
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export async function generateProfessionalQuotePDF(
  data: CompactPDFData
): Promise<Blob> {
  // Fetch company settings and branding
  let companySettings: CompanySettings = {
    company_name: "SAFAWALA",
    phone: "Ph:",
    email: "Email:",
    primary_color: "#1b5e20",
    secondary_color: "#4caf50",
  }

  try {
    const { data: settings } = await supabase
      .from("company_settings")
      .select("*")
      .single()

    if (settings) {
      companySettings = {
        company_name: settings.company_name || companySettings.company_name,
        phone: settings.phone || companySettings.phone,
        email: settings.email || companySettings.email,
        website: settings.website,
        address: settings.address,
        city: settings.city,
        state: settings.state,
        pincode: settings.pincode,
        gst_number: settings.gst_number,
        logo_url: settings.logo_url,
        terms_conditions: settings.terms_conditions,
        primary_color: settings.primary_color || "#1b5e20",
        secondary_color: settings.secondary_color || "#4caf50",
      }
    }
  } catch (error) {
    console.warn("Failed to fetch company settings:", error)
  }

  const primaryColor = companySettings.primary_color || "#1b5e20"
  const [r, g, b] = hexToRgb(primaryColor)

  // Create PDF (A4 size)
  const doc = new jsPDF("p", "mm", "a4")
  let yPosition = 10

  // ========== HEADER SECTION WITH LOGO ==========
  // Add logo if available
  if (companySettings.logo_url) {
    try {
      doc.addImage(companySettings.logo_url, "PNG", 15, yPosition, 25, 15)
      yPosition += 20
    } catch (error) {
      console.warn("Failed to load logo:", error)
    }
  }

  // Company name and quote number in header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(r, g, b)
  const logoXOffset = companySettings.logo_url ? 45 : 15
  doc.text(companySettings.company_name || "SAFAWALA", logoXOffset, yPosition - 10)

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Ph: ${companySettings.phone || "N/A"}`, logoXOffset, yPosition - 4)
  doc.text(`Email: ${companySettings.email || "N/A"}`, logoXOffset, yPosition + 1)

  // Right side - Quote number and date
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(r, g, b)
  doc.text(`Quote # ${data.quote_number}`, 195, yPosition - 10, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Date: ${formatDate(data.created_at)}`, 195, yPosition - 4, { align: "right" })

  // Booking type badge
  const bookingType = data.booking_subtype === 'rental' ? '📦 Rental' : data.booking_subtype === 'sale' ? '💰 Sale' : 'Quote'
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(r, g, b)
  doc.text(bookingType, 195, yPosition + 2, { align: "right" })

  yPosition += 15

  // ========== CUSTOMER & EVENT SECTION ==========
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(15, yPosition, 195, yPosition)

  yPosition += 3

  // Customer Information (Left column)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(r, g, b)
  doc.text("Customer Details:", 15, yPosition)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)

  yPosition += 5
  doc.text(`Name: ${data.customer_name || "N/A"}`, 15, yPosition)
  yPosition += 4
  doc.text(`Phone: ${data.customer_phone || "N/A"}`, 15, yPosition)
  yPosition += 4
  doc.text(`WhatsApp: ${data.customer_whatsapp || "N/A"}`, 15, yPosition)
  yPosition += 4
  doc.text(`Email: ${data.customer_email || "N/A"}`, 15, yPosition)
  yPosition += 4
  doc.text(`Address: ${data.customer_address || "N/A"}`, 15, yPosition, { maxWidth: 80 })
  yPosition += 5
  const cityLine = `${data.customer_city || ""}, ${data.customer_state || ""} ${data.customer_pincode || ""}`.trim()
  doc.text(cityLine || "N/A", 15, yPosition)

  // Event Information (Right column - 105mm start)
  const eventYStart = yPosition - 28

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(r, g, b)
  doc.text("Event Information:", 110, eventYStart)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)

  let eventY = eventYStart + 5
  doc.text(`Type: ${data.event_type || "N/A"}`, 110, eventY)
  eventY += 4
  const eventDateTime = data.event_date ? `${formatDate(data.event_date)}${data.event_time ? ` ${data.event_time}` : ""}` : "N/A"
  doc.text(`Event: ${eventDateTime}`, 110, eventY)
  eventY += 4

  // Show delivery/return dates only for rentals
  if (data.booking_subtype === 'rental') {
    const deliveryDateTime = data.delivery_date ? `${formatDate(data.delivery_date)}${data.delivery_time ? ` ${data.delivery_time}` : ""}` : "N/A"
    doc.text(`Delivery: ${deliveryDateTime}`, 110, eventY)
    eventY += 4
    const returnDateTime = data.return_date ? `${formatDate(data.return_date)}${data.return_time ? ` ${data.return_time}` : ""}` : "N/A"
    doc.text(`Return: ${returnDateTime}`, 110, eventY)
  }

  eventY += 4
  doc.text(`Venue: ${data.venue_address || "N/A"}`, 110, eventY, { maxWidth: 85 })

  yPosition += 5

  // ========== BRIDE/GROOM INFORMATION ==========
  if (
    data.groom_name ||
    data.bride_name ||
    data.groom_address ||
    data.bride_address
  ) {
    yPosition += 5
    doc.setDrawColor(200, 200, 200)
    doc.line(15, yPosition, 195, yPosition)
    yPosition += 3

    // Groom info (Left)
    if (data.groom_name) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(r, g, b)
      doc.text("Groom:", 15, yPosition)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(50, 50, 50)
      yPosition += 4
      doc.text(`Name: ${data.groom_name}`, 15, yPosition)
      yPosition += 3
      if (data.groom_whatsapp) {
        doc.text(`WhatsApp: ${data.groom_whatsapp}`, 15, yPosition)
        yPosition += 3
      }
      if (data.groom_address) {
        doc.text(`Address: ${data.groom_address}`, 15, yPosition, { maxWidth: 80 })
        yPosition += 3
      }
    }

    // Bride info (Right)
    const brideYStart = yPosition - (data.groom_name ? 10 : 0)
    if (data.bride_name) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(r, g, b)
      doc.text("Bride:", 110, brideYStart)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(50, 50, 50)
      let brideY = brideYStart + 4
      doc.text(`Name: ${data.bride_name}`, 110, brideY)
      brideY += 3
      if (data.bride_whatsapp) {
        doc.text(`WhatsApp: ${data.bride_whatsapp}`, 110, brideY)
        brideY += 3
      }
      if (data.bride_address) {
        doc.text(`Address: ${data.bride_address}`, 110, brideY, { maxWidth: 85 })
        brideY += 3
      }
    }
    yPosition += 5
  }

  // ========== SELECTED PRODUCTS SECTION ==========
  if (data.selected_products && data.selected_products.length > 0) {
    yPosition += 5
    doc.setDrawColor(200, 200, 200)
    doc.line(15, yPosition, 195, yPosition)
    yPosition += 3

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(r, g, b)
    doc.text("Selected Products:", 15, yPosition)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(50, 50, 50)

    let productY = yPosition + 4
    for (const product of data.selected_products) {
      if (productY > 270) {
        doc.addPage()
        productY = 15
      }
      doc.text(`• ${product.name} (Qty: ${product.quantity})`, 15, productY)
      productY += 3
    }
    yPosition = productY
  } else if (data.booking_type === 'product') {
    // Show "Selection Pending" only for product bookings if no products selected
    yPosition += 5
    doc.setDrawColor(200, 200, 200)
    doc.line(15, yPosition, 195, yPosition)
    yPosition += 3

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(255, 152, 0) // Orange color for pending
    doc.text("⚠ Product Selection: PENDING", 15, yPosition)

    yPosition += 5
  }

  yPosition += 10

  // ========== ITEMS TABLE ==========
  doc.setDrawColor(r, g, b)
  doc.setLineWidth(1)
  doc.line(15, yPosition, 195, yPosition)

  const tableData = data.items.map((item) => [
    item.sr.toString(),
    item.packageName,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.amount),
  ])

  autoTable(doc, {
    head: [["Sr.", "Package Details", "Qty", "Unit Price", "Amount"]],
    body: tableData,
    startY: yPosition + 2,
    margin: { left: 15, right: 15 },
    theme: "plain",
    headStyles: {
      fillColor: hexToRgb(primaryColor),
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [50, 50, 50],
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { halign: "left", cellWidth: 90 },
      2: { halign: "center", cellWidth: 15 },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "right", cellWidth: 30 },
    },
    didDrawPage: (data) => {
      // Footer
      const pageCount = (doc as any).internal.pages.length - 1
      if (pageCount > 1) {
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Page ${pageCount}`,
          195,
          doc.internal.pageSize.getHeight() - 10,
          { align: "right" }
        )
      }
    },
  })

  yPosition = (doc as any).lastAutoTable.finalY + 5

  // ========== TOTALS SECTION ==========
  yPosition += 3
  doc.setDrawColor(200, 200, 200)
  doc.line(15, yPosition, 195, yPosition)

  yPosition += 5

  // Right-aligned totals
  const totalX = 160
  const labelX = 110

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)

  doc.text("Subtotal:", labelX, yPosition)
  doc.text(formatCurrency(data.subtotal), totalX, yPosition, { align: "right" })

  if (data.discount > 0) {
    yPosition += 4
    doc.text("Discount:", labelX, yPosition)
    doc.text(formatCurrency(data.discount), totalX, yPosition, { align: "right" })
  }

  yPosition += 4
  doc.text("GST (5%):", labelX, yPosition)
  doc.text(formatCurrency(data.gst), totalX, yPosition, { align: "right" })

  // Grand Total
  yPosition += 6
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(r, g, b)
  doc.setFillColor(240, 240, 240)
  doc.rect(labelX - 2, yPosition - 3, 90, 8, "F")
  doc.text("GRAND TOTAL:", labelX, yPosition)
  doc.text(formatCurrency(data.grandTotal), totalX, yPosition, { align: "right" })

  yPosition += 10

  // ========== PAYMENT SECTION ==========
  doc.setDrawColor(200, 200, 200)
  doc.line(15, yPosition, 195, yPosition)

  yPosition += 3

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(r, g, b)
  doc.text("Payment Terms:", 15, yPosition)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(50, 50, 50)

  yPosition += 4
  doc.text(`Payment Type: ${data.paymentType || "N/A"}`, 15, yPosition)
  yPosition += 4
  doc.text(`Full Payment Due: ${formatCurrency(data.paymentDue)}`, 15, yPosition)

  // Right side payment info
  yPosition -= 8
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(r, g, b)
  doc.text("Sales Closed By:", 110, yPosition)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(50, 50, 50)
  yPosition += 4
  doc.text(data.salesStaffName || "N/A", 110, yPosition)

  yPosition += 10

  // ========== NOTES SECTION ==========
  if (data.notes && data.notes.trim() !== "nothing to note" && data.notes.trim() !== "") {
    yPosition += 3
    doc.setDrawColor(200, 200, 200)
    doc.line(15, yPosition, 195, yPosition)

    yPosition += 3

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(r, g, b)
    doc.text("Notes:", 15, yPosition)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(50, 50, 50)
    yPosition += 4
    doc.text(data.notes, 15, yPosition, { maxWidth: 180 })

    yPosition += 10
  }

  // ========== TERMS & CONDITIONS SECTION ==========
  if (companySettings.terms_conditions && companySettings.terms_conditions.trim() !== "") {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 15
    }

    doc.setDrawColor(200, 200, 200)
    doc.line(15, yPosition, 195, yPosition)

    yPosition += 3

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(r, g, b)
    doc.text("Terms & Conditions:", 15, yPosition)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(80, 80, 80)

    yPosition += 4

    const termsLines = doc.splitTextToSize(companySettings.terms_conditions, 180)
    doc.text(termsLines, 15, yPosition)
  }

  // ========== FOOTER ==========
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.line(15, pageHeight - 12, 195, pageHeight - 12)
  doc.text(`Generated on ${formatDate(new Date().toISOString())}`, 15, pageHeight - 8)
  doc.text("Thank you for your business!", 195, pageHeight - 8, { align: "right" })

  return doc.output("blob")
}

export async function downloadProfessionalQuotePDF(data: CompactPDFData): Promise<void> {
  const blob = await generateProfessionalQuotePDF(data)
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${data.quote_number}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
