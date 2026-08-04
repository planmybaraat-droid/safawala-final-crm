import { generateInvoiceHTML } from './invoice-html-template'

export interface InvoiceData {
  bookingId: string
  bookingNumber: string
  bookingDate: string
  eventDate: string
  bookingType: 'package' | 'product_rental' | 'product_sale' | 'direct_sale'
  paymentType: 'full' | 'advance' | 'partial'
  bookingStatus?: string
  isQuote?: boolean
  
  // Customer details
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerWhatsApp?: string
  customerAddress?: string
  customerCity?: string
  customerState?: string
  customerPincode?: string
  customerCode?: string
  
  // Event details
  eventType?: string
  eventParticipant?: string
  eventFor?: string
  venueName?: string
  venueAddress?: string
  groomName?: string
  groomPhone?: string
  groomAddress?: string
  brideName?: string
  bridePhone?: string
  brideAddress?: string
  deliveryDate?: string
  deliveryTime?: string
  returnDate?: string
  returnTime?: string
  eventTime?: string
  
  // Package details
  packageName?: string
  packageDescription?: string
  variantName?: string
  categoryName?: string
  extraSafas?: number
  variantInclusions?: Array<{ name: string; description?: string }>
  
  // Financial details
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
  paidAmount: number
  securityDeposit?: number
  pendingAmount?: number
  paymentMethod?: string
  
  // Items
  items: InvoiceItem[]
  
  // Company details
  companyName?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
  companyCity?: string
  companyState?: string
  companyGST?: string
  companyLogo?: string
  companyWebsite?: string
  companySignature?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  termsAndConditions?: string
  
  // Banking details
  bankingDetails?: Array<{
    bankName: string
    accountHolderName: string
    accountNumber: string
    ifscCode: string
    upiId?: string
    qrCodeUrl?: string
    isPrimary: boolean
  }>
}

export interface InvoiceItem {
  name: string
  description?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category?: string
  barcode?: string
}

/**
 * Simple HTML-based Invoice Generator
 * Uses browser's print functionality for PDF generation
 */
export class InvoiceGenerator {
  /**
   * Generate HTML invoice and return as object
   * Compatible with existing PDF viewer dialog
   */
  static async generatePDF(invoiceData: InvoiceData): Promise<{ output: (format: string) => string }> {
    // DEBUG: Log invoice data
    console.log('🔍 DEBUG: Invoice Data Received')
    console.log('🖼️ Company Logo:', invoiceData.companyLogo)
    console.log('🏢 Company Name:', invoiceData.companyName)
    console.log('🎨 Primary Color:', invoiceData.primaryColor)
    console.log('🎨 Secondary Color:', invoiceData.secondaryColor)
    console.log('🎨 Accent Color:', invoiceData.accentColor)
    console.log('📄 Full Invoice Data:', invoiceData)
    
    const html = generateInvoiceHTML(invoiceData)
    
    // Return a mock PDF-like object that contains the HTML
    return {
      output: (format: string) => {
        if (format === 'dataurlstring' || format === 'datauri') {
          // Return HTML as data URL for preview
          return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
        }
        return html
      }
    }
  }
  
  /**
   * Generate and open in print dialog
   */
  static async printInvoice(invoiceData: InvoiceData): Promise<void> {
    const html = generateInvoiceHTML(invoiceData)
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      
      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    } else {
      throw new Error('Failed to open print window. Please allow popups for this site.')
    }
  }

  /**
   * Generate HTML and return as blob
   */
  static async generateHTMLBlob(invoiceData: InvoiceData): Promise<Blob> {
    const html = generateInvoiceHTML(invoiceData)
    return new Blob([html], { type: 'text/html' })
  }

  /**
   * Download invoice as HTML file
   */
  static downloadHTML(invoiceData: InvoiceData, filename: string) {
    const html = generateInvoiceHTML(invoiceData)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.replace('.pdf', '.html')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Preview invoice in new tab without printing
   */
  static previewInvoice(invoiceData: InvoiceData) {
    const html = generateInvoiceHTML(invoiceData)
    const previewWindow = window.open('', '_blank')
    if (previewWindow) {
      previewWindow.document.write(html)
      previewWindow.document.close()
    } else {
      throw new Error('Failed to open preview window. Please allow popups for this site.')
    }
  }

  /**
   * Legacy method - kept for compatibility
   * Now just calls generatePDF
   */
  static downloadPDF(invoiceData: InvoiceData, filename: string) {
    return this.generatePDF(invoiceData)
  }
}
