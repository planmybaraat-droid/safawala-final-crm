'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X, Printer } from 'lucide-react'

interface PDFViewerProps {
  pdfBytes: Uint8Array | ArrayBuffer | Blob | any
  filename?: string
  onClose?: () => void
}

export function InlinePDFViewer({ pdfBytes, filename = 'document.pdf', onClose }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Create blob from PDF bytes
    let blob: Blob
    try {
      if (pdfBytes instanceof Blob) {
        blob = pdfBytes
      } else if (pdfBytes instanceof ArrayBuffer) {
        blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      } else if (ArrayBuffer.isView(pdfBytes)) {
        blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      } else {
        blob = new Blob([pdfBytes], { type: 'application/pdf' })
      }
    } catch (e) {
      blob = new Blob([pdfBytes], { type: 'application/pdf' })
    }
    
    const url = URL.createObjectURL(blob)
    setPdfUrl(url)
    setLoading(false)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [pdfBytes])

  const handleDownload = () => {
    let blob: Blob
    try {
      if (pdfBytes instanceof Blob) {
        blob = pdfBytes
      } else if (pdfBytes instanceof ArrayBuffer) {
        blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      } else if (ArrayBuffer.isView(pdfBytes)) {
        blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      } else {
        blob = new Blob([pdfBytes], { type: 'application/pdf' })
      }
    } catch (e) {
      blob = new Blob([pdfBytes], { type: 'application/pdf' })
    }
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print()
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{filename}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading PDF...</div>
          </div>
        ) : pdfUrl ? (
          <div className="flex justify-center">
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              className="w-full h-full min-h-96 border-4 border-white shadow-lg"
              title={filename}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Failed to load PDF</div>
          </div>
        )}
      </div>
    </div>
  )
}
