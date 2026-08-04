'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { InlinePDFViewer } from './inline-pdf-viewer'
import { useInvoiceGenerator } from '@/hooks/use-invoice-generator'

interface InvoiceFormatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: any
  bookingItems: any[]
}

export function InvoiceFormatDialog({
  open,
  onOpenChange,
  booking,
  bookingItems
}: InvoiceFormatDialogProps) {
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Pass franchise_id to the hook if available
  const { generatePDFObject } = useInvoiceGenerator(booking?.franchise_id)

  // Auto-generate invoice when dialog opens
  useEffect(() => {
    const generateInvoice = async () => {
      if (open && !htmlUrl) {
        setIsLoading(true)
        try {
          console.log('📄 Starting invoice generation...')
          const result = await generatePDFObject(booking, bookingItems)
          console.log('✅ Invoice generated, creating blob...')
          
          // Get HTML from the output method
          const html = result.output('html')
          console.log('📝 HTML output type:', typeof html, 'Length:', html.length)
          
          // Create blob and object URL
          const blob = new Blob([html], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          console.log('🔗 Blob URL created:', url)
          
          setHtmlUrl(url)
        } catch (error) {
          console.error('❌ Error generating invoice:', error)
          alert(`Error generating invoice: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
          setIsLoading(false)
        }
      }
    }

    generateInvoice()
    
    // Reset when dialog closes
    if (!open) {
      if (htmlUrl) {
        URL.revokeObjectURL(htmlUrl)
      }
      setHtmlUrl(null)
    }
  }, [open, booking, bookingItems, htmlUrl, generatePDFObject])

  const handlePrint = () => {
    if (htmlUrl) {
      const printWindow = window.open(htmlUrl, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            // Show alert to guide user to remove headers/footers
            alert('📋 Print Tip: When the print dialog opens:\n\n1. Click "More Settings" (bottom left)\n2. Uncheck "Headers and footers"\n3. Save as PDF\n\nThis will remove the date/filename from the PDF.')
            printWindow.print()
          }, 250)
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {htmlUrl ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Invoice Preview</h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Print / Save as PDF
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              src={htmlUrl}
              className="w-full flex-1 border-0"
              title="Invoice Preview"
            />
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating invoice...</p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
