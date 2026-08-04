"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Palette, Upload, Image, FileText, Eye, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BrandingData {
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  font_family: string
  logo_url: string
}

interface DocumentSettingsData {
  invoice_number_format: string
  quote_number_format: string
  invoice_template_id: string
  quote_template_id: string
  default_payment_terms: string
  default_tax_rate: number
  show_gst_breakdown: boolean
  default_terms_conditions: string
}

interface Template {
  id: string
  name: string
  type: string
  template_data: any
  thumbnail_url?: string
}

interface BrandingSectionProps {
  franchiseId: string
}

const fontOptions = [
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Arial', label: 'Arial (Classic)' },
  { value: 'Helvetica', label: 'Helvetica (Clean)' },
  { value: 'Times New Roman', label: 'Times New Roman (Traditional)' },
  { value: 'Georgia', label: 'Georgia (Elegant)' },
  { value: 'Roboto', label: 'Roboto (Professional)' },
  { value: 'Open Sans', label: 'Open Sans (Friendly)' },
  { value: 'Lato', label: 'Lato (Corporate)' }
]

const paymentTermsOptions = [
  { value: 'Net 7', label: 'Net 7 Days' },
  { value: 'Net 15', label: 'Net 15 Days' },
  { value: 'Net 30', label: 'Net 30 Days' },
  { value: 'Due on Receipt', label: 'Due on Receipt' },
  { value: 'Custom', label: 'Custom Terms' }
]

export function BrandingSection({ franchiseId }: BrandingSectionProps) {
  const [data, setData] = useState<BrandingData>({
    primary_color: '#3B82F6',
    secondary_color: '#EF4444',
    accent_color: '#10B981',
    background_color: '#FFFFFF',
    font_family: 'Inter',
    logo_url: ''
  })
  const [documentData, setDocumentData] = useState<DocumentSettingsData>({
    invoice_number_format: 'INV-{YYYY}-{0001}',
    quote_number_format: 'QTE-{YYYY}-{0001}',
    invoice_template_id: '',
    quote_template_id: '',
    default_payment_terms: 'Net 30',
    default_tax_rate: 18,
    show_gst_breakdown: true,
    default_terms_conditions: ''
  })
  const [invoiceTemplates, setInvoiceTemplates] = useState<Template[]>([])
  const [quoteTemplates, setQuoteTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  
  const logoInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    fetchTemplates()
  }, [franchiseId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch branding data
      const brandingResponse = await fetch(`/api/settings/branding?franchise_id=${franchiseId}`)
      const brandingResult = await brandingResponse.json()
      
      if (brandingResponse.ok && brandingResult.data) {
        setData(brandingResult.data)
      }

      // Fetch document settings data
      const documentsResponse = await fetch(`/api/settings/documents?franchise_id=${franchiseId}`)
      const documentsResult = await documentsResponse.json()
      
      if (documentsResponse.ok && documentsResult.data) {
        setDocumentData(documentsResult.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to load branding settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      // Fetch invoice templates
      const invoiceResponse = await fetch(`/api/settings/templates?type=invoice`)
      const invoiceResult = await invoiceResponse.json()
      if (invoiceResponse.ok) {
        setInvoiceTemplates(invoiceResult.data || [])
      }

      // Fetch quote templates
      const quoteResponse = await fetch(`/api/settings/templates?type=quote`)
      const quoteResult = await quoteResponse.json()
      if (quoteResponse.ok) {
        setQuoteTemplates(quoteResult.data || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleDataChange = (field: keyof BrandingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const handleDocumentDataChange = (field: keyof DocumentSettingsData, value: any) => {
    setDocumentData(prev => ({ ...prev, [field]: value }))
  }

  const uploadFile = async (file: File, type: 'logo') => {
    try {
      setUploading(type)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${franchiseId}/${type}-${Date.now()}.${fileExt}`
      
      // Upload to Supabase storage
      const { data: uploadData, error } = await supabase.storage
        .from('settings-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('settings-uploads')
        .getPublicUrl(fileName)

      // Update local state
      setData(prev => ({ 
        ...prev, 
        logo_url: publicUrl
      }))

      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`,
      })
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      toast({
        title: "Error",
        description: `Failed to upload ${type}`,
        variant: "destructive",
      })
    } finally {
      setUploading(null)
    }
  }

  const handleFileSelect = (type: 'logo') => {
    const input = logoInputRef.current
    const file = input?.files?.[0]
    
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid image file (JPEG, PNG, WebP)",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        })
        return
      }

      uploadFile(file, type)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Save branding data
      const brandingResponse = await fetch('/api/settings/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, franchise_id: franchiseId })
      })

      // Save document settings data
      const documentsResponse = await fetch('/api/settings/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...documentData, franchise_id: franchiseId })
      })

      if (brandingResponse.ok && documentsResponse.ok) {
        toast({
          title: "Success",
          description: "Branding and template settings saved successfully",
        })
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

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
    <div className="space-y-6">
      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding & Design
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice & Quote Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Brand Colors & Typography
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Settings */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={data.primary_color}
                      onChange={(e) => handleDataChange('primary_color', e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={data.primary_color}
                      onChange={(e) => handleDataChange('primary_color', e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={data.secondary_color}
                      onChange={(e) => handleDataChange('secondary_color', e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={data.secondary_color}
                      onChange={(e) => handleDataChange('secondary_color', e.target.value)}
                      placeholder="#EF4444"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent_color">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="accent_color"
                      type="color"
                      value={data.accent_color}
                      onChange={(e) => handleDataChange('accent_color', e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={data.accent_color}
                      onChange={(e) => handleDataChange('accent_color', e.target.value)}
                      placeholder="#10B981"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="background_color">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="background_color"
                      type="color"
                      value={data.background_color}
                      onChange={(e) => handleDataChange('background_color', e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={data.background_color}
                      onChange={(e) => handleDataChange('background_color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Font Selection */}
              <div className="space-y-2">
                <Label htmlFor="font_family">Font Family</Label>
                <Select value={data.font_family} onValueChange={(value) => handleDataChange('font_family', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Logo Upload */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {data.logo_url ? (
                      <div className="relative">
                        <img 
                          src={data.logo_url} 
                          alt="Company Logo" 
                          className="w-24 h-24 object-contain border rounded-lg bg-white"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <Image className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <Input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={() => handleFileSelect('logo')}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploading === 'logo'}
                      >
                        {uploading === 'logo' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Upload Logo
                      </Button>
                      <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Templates & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Number Formats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_number_format">Invoice Number Format</Label>
                  <Input
                    id="invoice_number_format"
                    value={documentData.invoice_number_format}
                    onChange={(e) => handleDocumentDataChange('invoice_number_format', e.target.value)}
                    placeholder="INV-{YYYY}-{0001}"
                  />
                  <p className="text-xs text-gray-500">Use {"{YYYY}"} for year, {"{0001}"} for number</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote_number_format">Quote Number Format</Label>
                  <Input
                    id="quote_number_format"
                    value={documentData.quote_number_format}
                    onChange={(e) => handleDocumentDataChange('quote_number_format', e.target.value)}
                    placeholder="QTE-{YYYY}-{0001}"
                  />
                  <p className="text-xs text-gray-500">Use {"{YYYY}"} for year, {"{0001}"} for number</p>
                </div>
              </div>

              {/* Template Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_template">Invoice Template</Label>
                  <Select 
                    value={documentData.invoice_template_id} 
                    onValueChange={(value) => handleDocumentDataChange('invoice_template_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select invoice template" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoiceTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote_template">Quote Template</Label>
                  <Select 
                    value={documentData.quote_template_id} 
                    onValueChange={(value) => handleDocumentDataChange('quote_template_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quote template" />
                    </SelectTrigger>
                    <SelectContent>
                      {quoteTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Terms & Tax */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Default Payment Terms</Label>
                  <Select 
                    value={documentData.default_payment_terms} 
                    onValueChange={(value) => handleDocumentDataChange('default_payment_terms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTermsOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Default Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={documentData.default_tax_rate}
                    onChange={(e) => handleDocumentDataChange('default_tax_rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show_gst_breakdown"
                      checked={documentData.show_gst_breakdown}
                      onCheckedChange={(checked) => handleDocumentDataChange('show_gst_breakdown', checked)}
                    />
                    <Label htmlFor="show_gst_breakdown">Show GST Breakdown</Label>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="space-y-2">
                <Label htmlFor="terms_conditions">Default Terms & Conditions</Label>
                <Textarea
                  id="terms_conditions"
                  value={documentData.default_terms_conditions}
                  onChange={(e) => handleDocumentDataChange('default_terms_conditions', e.target.value)}
                  placeholder="Enter default terms and conditions for invoices and quotes..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || uploading !== null}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Settings className="mr-2 h-4 w-4" />
          )}
          Save All Settings
        </Button>
      </div>
    </div>
  )
}