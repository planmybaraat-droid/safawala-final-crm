import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Upload, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface ImportExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportSuccess?: () => void
}

interface ImportOptions {
  overwriteExisting: boolean
  resetStock: boolean
  importImages: boolean
  skipDuplicates: boolean
}

interface ImportResult {
  success: boolean
  summary: {
    total: number
    successful: number
    failed: number
    imagesUploaded: number
  }
  failedImports: Array<{
    code: string
    reason: string
  }>
}

export function InventoryImportExportDialog({
  open,
  onOpenChange,
  onImportSuccess,
}: ImportExportDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    overwriteExisting: false,
    resetStock: true,
    importImages: true,
    skipDuplicates: false,
  })

  const handleExport = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/inventory/export')

      if (!response.ok) {
        throw new Error('Failed to export inventory')
      }

      const data = await response.json()
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Export Successful',
        description: `Exported ${data.productCount} products with images`,
      })
    } catch (error: any) {
      console.error('Export error:', error)
      toast({
        title: 'Export Failed',
        description: error?.message || 'Failed to export inventory',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsLoading(true)
      setUploadProgress(0)
      setImportResult(null)

      const fileContent = await file.text()
      const importData = JSON.parse(fileContent)

      // Validate file format
      if (!importData.products || !Array.isArray(importData.products)) {
        throw new Error('Invalid import file format')
      }

      // Simulate progress for file reading
      setUploadProgress(20)

      // Call import API
      const response = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importData,
          options: importOptions,
        }),
      })

      // Update progress based on response status
      setUploadProgress(80)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const result = (await response.json()) as ImportResult
      setImportResult(result)
      setUploadProgress(100)

      // Reset progress after 1 second
      setTimeout(() => setUploadProgress(0), 1000)

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${result.summary.successful}/${result.summary.total} products${result.summary.failed > 0 ? ` (${result.summary.failed} failed)` : ''}`,
      })

      onImportSuccess?.()
    } catch (error: any) {
      console.error('Import error:', error)
      toast({
        title: 'Import Failed',
        description: error?.message || 'Failed to import inventory',
        variant: 'destructive',
      })
      setUploadProgress(0)
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import/Export Inventory</DialogTitle>
          <DialogDescription>
            Export all products with images or import products from a backup file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Section */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Inventory
            </h3>
            <p className="text-sm text-blue-800">
              Download all your products as a JSON file. Includes:
            </p>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>All product details (name, price, stock, etc.)</li>
              <li>Product images (embedded as base64)</li>
              <li>Categories and metadata</li>
              <li>Franchise-isolated data</li>
            </ul>
            <Button
              onClick={handleExport}
              disabled={isLoading}
              className="mt-3"
              variant="default"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Download Inventory
            </Button>
          </div>

          {/* Import Section */}
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import Inventory
            </h3>

            {/* Import Options */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Import Options</Label>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overwriteExisting"
                    checked={importOptions.overwriteExisting}
                    onCheckedChange={(checked) =>
                      setImportOptions({
                        ...importOptions,
                        overwriteExisting: checked as boolean,
                      })
                    }
                  />
                  <label
                    htmlFor="overwriteExisting"
                    className="text-sm cursor-pointer"
                  >
                    Overwrite existing products (update by product code)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="resetStock"
                    checked={importOptions.resetStock}
                    onCheckedChange={(checked) =>
                      setImportOptions({
                        ...importOptions,
                        resetStock: checked as boolean,
                      })
                    }
                  />
                  <label htmlFor="resetStock" className="text-sm cursor-pointer">
                    Reset stock to 0 (uncheck to restore exported quantities)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="importImages"
                    checked={importOptions.importImages}
                    onCheckedChange={(checked) =>
                      setImportOptions({
                        ...importOptions,
                        importImages: checked as boolean,
                      })
                    }
                  />
                  <label htmlFor="importImages" className="text-sm cursor-pointer">
                    Import images (upload product photos)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipDuplicates"
                    checked={importOptions.skipDuplicates}
                    onCheckedChange={(checked) =>
                      setImportOptions({
                        ...importOptions,
                        skipDuplicates: checked as boolean,
                      })
                    }
                  />
                  <label
                    htmlFor="skipDuplicates"
                    className="text-sm cursor-pointer"
                  >
                    Skip duplicates (don't import products with duplicate codes)
                  </label>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* Upload Progress Bar */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Uploading...</span>
                  <span className="text-sm font-semibold text-green-700">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Import Button */}
            <Button
              onClick={handleImportClick}
              disabled={isLoading}
              variant="default"
              className="mt-3 w-full"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLoading ? 'Importing...' : 'Select File to Import'}
            </Button>
          </div>

          {/* Import Result */}
          {importResult && (
            <div
              className={`p-4 rounded-lg border ${
                importResult.summary.failed === 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {importResult.summary.failed === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="space-y-2 flex-1">
                  <h4 className="font-semibold">
                    Import Summary
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Total Products:</span>{' '}
                      {importResult.summary.total}
                    </p>
                    <p className="text-green-700">
                      <span className="font-medium">Successful:</span>{' '}
                      {importResult.summary.successful}
                    </p>
                    {importResult.summary.failed > 0 && (
                      <p className="text-yellow-700">
                        <span className="font-medium">Failed:</span>{' '}
                        {importResult.summary.failed}
                      </p>
                    )}
                    {importResult.summary.imagesUploaded > 0 && (
                      <p className="text-blue-700">
                        <span className="font-medium">Images Uploaded:</span>{' '}
                        {importResult.summary.imagesUploaded}
                      </p>
                    )}
                  </div>

                  {importResult.failedImports.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="font-medium text-sm">Failed Items:</p>
                      <ul className="text-xs space-y-1">
                        {importResult.failedImports.slice(0, 5).map((item, idx) => (
                          <li key={idx} className="text-yellow-700">
                            • {item.code}: {item.reason}
                          </li>
                        ))}
                        {importResult.failedImports.length > 5 && (
                          <li className="text-yellow-700">
                            • ... and {importResult.failedImports.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
