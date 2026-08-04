"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Loader2, FileText, Eye } from 'lucide-react'

interface DocumentSettingsData {
  invoice_number_format: string
  quote_number_format: string
  invoice_template_id: string
  quote_template_id: string
  default_payment_terms: string
  default_tax_rate: number
  show_gst_breakdown: boolean
  default_terms_conditions: string
  allow_invoice_number_edit: boolean
}

interface Template {
  id: string
  name: string
  type: string
  template_data: any
  thumbnail_url?: string
}

interface DocumentSettingsSectionProps {
  franchiseId: string
}

const paymentTermsOptions = [
  { value: 'Net 7', label: 'Net 7 Days' },
  { value: 'Net 15', label: 'Net 15 Days' },
  { value: 'Net 30', label: 'Net 30 Days' },
  { value: 'Due on Receipt', label: 'Due on Receipt' },
  { value: 'Custom', label: 'Custom Terms' }
]

export function DocumentSettingsSection({ franchiseId }: DocumentSettingsSectionProps) {
  const [data, setData] = useState<DocumentSettingsData>({
    invoice_number_format: 'INV-{YYYY}-{0001}',
    quote_number_format: 'QTE-{YYYY}-{0001}',
    invoice_template_id: '',
    quote_template_id: '',
    default_payment_terms: 'Net 15',
    default_tax_rate: 18.00,
    show_gst_breakdown: true,
    default_terms_conditions: '',
    allow_invoice_number_edit: false
  })
  const [invoiceTemplates, setInvoiceTemplates] = useState<Template[]>([])
  const [quoteTemplates, setQuoteTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([
      fetchDocumentSettings(),
      fetchTemplates()
    ])
  }, [franchiseId])

  const fetchDocumentSettings = async () => {
    try {
      const response = await fetch(`/api/settings/documents?franchise_id=${franchiseId}`)
      const result = await response.json()
      
      if (response.ok && result.data) {
        setData({
          invoice_number_format: result.data.invoice_number_format || 'INV-{YYYY}-{0001}',
          quote_number_format: result.data.quote_number_format || 'QTE-{YYYY}-{0001}',
          invoice_template_id: result.data.invoice_template_id || '',
          quote_template_id: result.data.quote_template_id || '',
          default_payment_terms: result.data.default_payment_terms || 'Net 15',
          default_tax_rate: result.data.default_tax_rate || 18.00,
          show_gst_breakdown: result.data.show_gst_breakdown ?? true,
          default_terms_conditions: result.data.default_terms_conditions || '',
          allow_invoice_number_edit: result.data.allow_invoice_number_edit ?? false
        })
      }
    } catch (error) {
      console.error('Error fetching document settings:', error)
      toast({
        title: "Error",
        description: "Failed to load document settings",
        variant: "destructive",
      })
    }
  }

  const fetchTemplates = async () => {
    try {
      const [invoiceResponse, quoteResponse] = await Promise.all([
        fetch('/api/settings/templates?type=invoice'),
        fetch('/api/settings/templates?type=quote')
      ])

      const [invoiceResult, quoteResult] = await Promise.all([
        invoiceResponse.json(),
        quoteResponse.json()
      ])

      if (invoiceResponse.ok) {
        setInvoiceTemplates(invoiceResult.data || [])
      }
      if (quoteResponse.ok) {
        setQuoteTemplates(quoteResult.data || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof DocumentSettingsData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, franchise_id: franchiseId })
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Document settings saved successfully",
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error saving document settings:', error)
      toast({
        title: "Error",
        description: "Failed to save document settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const generatePreviewNumber = (format: string) => {
    const currentYear = new Date().getFullYear()
    return format
      .replace('{YYYY}', currentYear.toString())
      .replace('{YY}', currentYear.toString().slice(-2))
      .replace('{MM}', '01')
      .replace('{0001}', '0001')
      .replace('{001}', '001')
      .replace('{01}', '01')
  }

  const TemplateGrid = ({ templates, selectedId, onSelect, type }: {
    templates: Template[]
    selectedId: string
    onSelect: (id: string) => void
    type: 'invoice' | 'quote'
  }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {templates.map((template) => (
        <div
          key={template.id}
          className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
            selectedId === template.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onSelect(template.id)}
        >
          <div className="aspect-[3/4] bg-gray-100 rounded mb-2 flex items-center justify-center">
            {template.thumbnail_url ? (
              <img
                src={template.thumbnail_url}
                alt={template.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <FileText className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div className="text-sm font-medium text-center">{template.name}</div>
          <div className="flex gap-1 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewTemplate(template)
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
          </div>
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoice & Quote Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Number Formats */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold">Document Number Formats</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="invoice_number_format">Invoice Number Format</Label>
              <Input
                id="invoice_number_format"
                value={data.invoice_number_format}
                onChange={(e) => handleInputChange('invoice_number_format', e.target.value)}
                placeholder="INV-{YYYY}-{0001}"
              />
              <p className="text-sm text-gray-600">
                Preview: {generatePreviewNumber(data.invoice_number_format)}
              </p>
              <p className="text-xs text-gray-500">
                Use: {'{YYYY}'} for year, {'{MM}'} for month, {'{0001}'} for sequential number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote_number_format">Quote Number Format</Label>
              <Input
                id="quote_number_format"
                value={data.quote_number_format}
                onChange={(e) => handleInputChange('quote_number_format', e.target.value)}
                placeholder="QTE-{YYYY}-{0001}"
              />
              <p className="text-sm text-gray-600">
                Preview: {generatePreviewNumber(data.quote_number_format)}
              </p>
              <p className="text-xs text-gray-500">
                Use: {'{YYYY}'} for year, {'{MM}'} for month, {'{0001}'} for sequential number
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow_invoice_number_edit" className="text-sm font-semibold text-slate-800">Allow Manual Invoice Number Editing</Label>
                <p className="text-xs text-gray-500 max-w-xl">
                  Allow franchise staff to edit invoice/order numbers manually when creating bookings/invoices. If disabled, numbers are locked to the auto-generated sequence.
                </p>
              </div>
              <Switch
                id="allow_invoice_number_edit"
                checked={data.allow_invoice_number_edit}
                onCheckedChange={(checked) => handleInputChange('allow_invoice_number_edit', checked)}
              />
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold">Invoice Templates</h4>
          <TemplateGrid
            templates={invoiceTemplates}
            selectedId={data.invoice_template_id}
            onSelect={(id) => handleInputChange('invoice_template_id', id)}
            type="invoice"
          />
        </div>

        <div className="space-y-6">
          <h4 className="text-lg font-semibold">Quote Templates</h4>
          <TemplateGrid
            templates={quoteTemplates}
            selectedId={data.quote_template_id}
            onSelect={(id) => handleInputChange('quote_template_id', id)}
            type="quote"
          />
        </div>

        {/* Payment & Tax Settings */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold">Payment & Tax Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_payment_terms">Default Payment Terms</Label>
              <Select 
                value={data.default_payment_terms} 
                onValueChange={(value) => handleInputChange('default_payment_terms', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                  {paymentTermsOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
              <Input
                id="default_tax_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={data.default_tax_rate}
                onChange={(e) => handleInputChange('default_tax_rate', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="show_gst_breakdown">Show GST Breakdown</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="show_gst_breakdown"
                  checked={data.show_gst_breakdown}
                  onCheckedChange={(checked) => handleInputChange('show_gst_breakdown', checked)}
                />
                <Label htmlFor="show_gst_breakdown" className="text-sm">
                  Display detailed GST breakdown on documents
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="space-y-2">
          <Label htmlFor="default_terms_conditions">Default Terms & Conditions</Label>
          <Textarea
            id="default_terms_conditions"
            value={data.default_terms_conditions}
            onChange={(e) => handleInputChange('default_terms_conditions', e.target.value)}
            placeholder="Enter your default terms and conditions..."
            rows={6}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Document Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}