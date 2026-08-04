/**
 * Bulk Barcode PDF Download Service
 * Generates professional PDF documents with multiple barcodes
 * Supports labels, sheets, and custom layouts
 */

import { jsPDF } from 'jspdf'

export interface BarcodeItem {
  id: string
  item_code: string
  barcode: string
  product_name?: string
  status?: string
  location?: string
}

export type PDFLayout = 'labels' | 'sheet' | 'list'

export interface BulkDownloadOptions {
  layout?: PDFLayout
  includeProductName?: boolean
  includeItemCode?: boolean
  includeLocation?: boolean
  labelsPerPage?: number
  orientation?: 'portrait' | 'landscape'
}

/**
 * Generate barcode as data URL using JsBarcode
 */
function generateBarcodeDataURL(code: string): string {
  const canvas = document.createElement('canvas')
  const JsBarcode = require('jsbarcode')
  
  JsBarcode(canvas, code, {
    format: 'CODE128',
    width: 4,
    height: 80,
    displayValue: false,
    margin: 8,
  })
  
  return canvas.toDataURL('image/png')
}

/**
 * Download barcodes as PDF - Labels Layout (Avery-style)
 * Perfect for printing on adhesive label sheets
 */
async function downloadAsLabels(
  items: BarcodeItem[],
  options: BulkDownloadOptions,
  filename: string
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  // Label configuration (Avery 5160 compatible - 3 columns x 10 rows)
  const cols = 3
  const rows = 10
  const labelWidth = (pageWidth - 10) / cols
  const labelHeight = (pageHeight - 20) / rows
  const labelsPerPage = cols * rows
  
  let itemIndex = 0
  
  while (itemIndex < items.length) {
    if (itemIndex > 0) {
      pdf.addPage()
    }
    
    for (let row = 0; row < rows && itemIndex < items.length; row++) {
      for (let col = 0; col < cols && itemIndex < items.length; col++) {
        const item = items[itemIndex]
        const x = 5 + col * labelWidth
        const y = 10 + row * labelHeight
        
        // Draw label border (optional, for debugging)
        // pdf.setDrawColor(200, 200, 200)
        // pdf.rect(x, y, labelWidth, labelHeight)
        
        // Generate and add barcode
        const barcodeDataURL = generateBarcodeDataURL(item.barcode)
        const barcodeWidth = labelWidth - 4
        const barcodeHeight = 12
        
        pdf.addImage(
          barcodeDataURL,
          'PNG',
          x + 2,
          y + 3,
          barcodeWidth,
          barcodeHeight
        )
        
        // Add item code
        if (options.includeItemCode !== false) {
          pdf.setFontSize(8)
          pdf.setFont('helvetica', 'bold')
          pdf.text(
            item.item_code,
            x + labelWidth / 2,
            y + barcodeHeight + 7,
            { align: 'center' }
          )
        }
        
        // Add product name ABOVE barcode for better optimization
        if (options.includeProductName && item.product_name) {
          pdf.setFontSize(2.8) // Reduced by 0.8x (was 3pt, now 2.8pt)
          pdf.setFont('helvetica', 'bold')
          const productName = item.product_name.substring(0, 30)
          pdf.text(
            productName,
            x + labelWidth / 2,
            y - 1,
            { align: 'center', maxWidth: labelWidth }
          )
        }
        
        itemIndex++
      }
    }
  }
  
  pdf.save(filename)
}

/**
 * Download barcodes as PDF - Sheet Layout
 * Optimized for Zebra ZD230 Thermal Printer (4" width, 203 dpi)
 * 2 columns × 2 rows = 4 barcodes per 4" × 6" thermal label
 */
async function downloadAsSheet(
  items: BarcodeItem[],
  options: BulkDownloadOptions,
  filename: string
): Promise<void> {
  // Zebra ZD230 thermal label dimensions
  const pageWidthMM = 101.6 // 4 inches (usable width)
  const pageHeightMM = 152.4 // 6 inches (standard thermal label height)
  
  const pdf = new jsPDF('p', 'mm', [pageWidthMM, pageHeightMM])
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  // 2 columns × 6 rows configuration (12 barcodes per label with better spacing)
  const margin = 2
  const cols = 2
  const rows = 6
  const itemWidth = (pageWidth - 2 * margin) / cols
  const itemHeight = (pageHeight - 2 * margin) / rows
  const itemsPerPage = cols * rows
  
  let itemIndex = 0
  
  while (itemIndex < items.length) {
    if (itemIndex > 0) {
      pdf.addPage()
    }
    
    // Page title
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Product Barcodes', pageWidth / 2, 10, { align: 'center' })
    
    for (let row = 0; row < rows && itemIndex < items.length; row++) {
      for (let col = 0; col < cols && itemIndex < items.length; col++) {
        const item = items[itemIndex]
        // CENTER within each cell
        const cellX = margin + col * (itemWidth + 5)
        const cellWidth = itemWidth
        const x = cellX + (cellWidth - itemWidth) / 2
        const y = margin + 10 + row * (itemHeight + 5)
        
        // Draw box
        pdf.setDrawColor(220, 220, 220)
        pdf.setLineWidth(0.5)
        pdf.rect(x, y, itemWidth, itemHeight)
        
        // Generate and add barcode
        const barcodeDataURL = generateBarcodeDataURL(item.barcode)
        const barcodeWidth = itemWidth - 10
        const barcodeHeight = 20
        
        pdf.addImage(
          barcodeDataURL,
          'PNG',
          x + 5,
          y + 8,
          barcodeWidth,
          barcodeHeight
        )
        
        // Add item code
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text(
          item.item_code,
          x + itemWidth / 2,
          y + barcodeHeight + 16,
          { align: 'center' }
        )
        
        // Add product name ABOVE barcode for better optimization
        if (item.product_name) {
          pdf.setFontSize(3.6) // Reduced by 0.8x (was 4.5pt, now 3.6pt)
          pdf.setFont('helvetica', 'bold')
          pdf.text(
            item.product_name.substring(0, 30),
            x + itemWidth / 2,
            y - 2,
            { align: 'center', maxWidth: itemWidth + 1 }
          )
        }
        
        // Add status badge
        if (item.status) {
          pdf.setFontSize(8)
          pdf.setTextColor(100, 100, 100)
          pdf.text(
            item.status.toUpperCase(),
            x + itemWidth / 2,
            y + itemHeight - 5,
            { align: 'center' }
          )
          pdf.setTextColor(0, 0, 0)
        }
        
        itemIndex++
      }
    }
    
    // Page number
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.text(
      `Page ${Math.floor(itemIndex / itemsPerPage)}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
    pdf.setTextColor(0, 0, 0)
  }
  
  pdf.save(filename)
}

/**
 * Download barcodes as PDF - List Layout
 * Detailed list with all information, best for inventory reports
 */
async function downloadAsList(
  items: BarcodeItem[],
  options: BulkDownloadOptions,
  filename: string
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  const margin = 15
  const rowHeight = 25
  const itemsPerPage = Math.floor((pageHeight - margin * 2 - 20) / rowHeight)
  
  let itemIndex = 0
  let currentY = margin + 20
  
  while (itemIndex < items.length) {
    if (itemIndex > 0 && itemIndex % itemsPerPage === 0) {
      pdf.addPage()
      currentY = margin + 20
    }
    
    // Page title (first page or new page)
    if (itemIndex % itemsPerPage === 0) {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Barcode Inventory List', pageWidth / 2, margin, { align: 'center' })
      
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        margin + 5,
        { align: 'center' }
      )
      pdf.setTextColor(0, 0, 0)
    }
    
    const item = items[itemIndex]
    
    // Row background (alternating)
    if (itemIndex % 2 === 0) {
      pdf.setFillColor(248, 248, 248)
      pdf.rect(margin, currentY - 3, pageWidth - margin * 2, rowHeight, 'F')
    }
    
    // Generate and add barcode
    const barcodeDataURL = generateBarcodeDataURL(item.barcode)
    pdf.addImage(barcodeDataURL, 'PNG', margin + 5, currentY, 50, 12)
    
    // Item details
    const detailsX = margin + 60
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(item.item_code, detailsX, currentY + 4)
    
    if (item.product_name) {
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text(item.product_name, detailsX, currentY + 9)
    }
    
    if (item.status) {
      pdf.setFontSize(7)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Status: ${item.status}`, detailsX, currentY + 13)
    }
    
    if (options.includeLocation && item.location) {
      pdf.setFontSize(7)
      pdf.text(`Location: ${item.location}`, detailsX + 40, currentY + 13)
    }
    
    pdf.setTextColor(0, 0, 0)
    
    currentY += rowHeight
    itemIndex++
  }
  
  pdf.save(filename)
}

/**
 * Main function: Download barcodes as PDF
 */
export async function downloadBarcodesAsPDF(
  items: BarcodeItem[],
  filename: string = 'barcodes.pdf',
  options: BulkDownloadOptions = {}
): Promise<void> {
  const layout = options.layout || 'labels'
  
  try {
    switch (layout) {
      case 'labels':
        await downloadAsLabels(items, options, filename)
        break
      case 'sheet':
        await downloadAsSheet(items, options, filename)
        break
      case 'list':
        await downloadAsList(items, options, filename)
        break
      default:
        await downloadAsLabels(items, options, filename)
    }
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate barcode PDF')
  }
}

/**
 * Convenience functions for specific layouts
 */
export const downloadBarcodLabels = (items: BarcodeItem[], filename?: string) =>
  downloadBarcodesAsPDF(items, filename, { layout: 'labels' })

export const downloadBarcodeSheet = (items: BarcodeItem[], filename?: string) =>
  downloadBarcodesAsPDF(items, filename, { layout: 'sheet', includeProductName: true })

export const downloadBarcodeList = (items: BarcodeItem[], filename?: string) =>
  downloadBarcodesAsPDF(items, filename, { 
    layout: 'list', 
    includeProductName: true,
    includeLocation: true
  })
