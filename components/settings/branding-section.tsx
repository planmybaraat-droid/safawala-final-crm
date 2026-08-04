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
  signature_url: string
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
    logo_url: '',
    signature_url: ''
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
  const { toast } = useToast()

  const logoInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)
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

  const handleColorChange = (field: keyof BrandingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const uploadFile = async (file: File, type: 'logo' | 'signature') => {
    try {
      setUploading(type)
      
      // Generate unique filename
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
        [type === 'logo' ? 'logo_url' : 'signature_url']: publicUrl 
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

  const handleFileSelect = (type: 'logo' | 'signature') => {
    const input = type === 'logo' ? logoInputRef.current : signatureInputRef.current
    const file = input?.files?.[0]
    
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, or WebP image",
          variant: "destructive",
        })
        return
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
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

  const handleDocumentDataChange = (field: keyof DocumentSettingsData, value: any) => {
    setDocumentData(prev => ({ ...prev, [field]: value }))
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Branding & Design
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo & Signature Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Company Logo</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {data.logo_url ? (
                <div className="space-y-2">
                  <img 
                    src={data.logo_url} 
                    alt="Company Logo" 
                    className="max-h-24 mx-auto"
                  />
                  <p className="text-sm text-gray-600">Logo uploaded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Image className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">No logo uploaded</p>
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={() => handleFileSelect('logo')}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploading === 'logo'}
              >
                {uploading === 'logo' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Digital Signature</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {data.signature_url ? (
                <div className="space-y-2">
                  <img 
                    src={data.signature_url} 
                    alt="Digital Signature" 
                    className="max-h-24 mx-auto"
                  />
                  <p className="text-sm text-gray-600">Signature uploaded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Image className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">No signature uploaded</p>
                </div>
              )}
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={() => handleFileSelect('signature')}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => signatureInputRef.current?.click()}
                disabled={uploading === 'signature'}
              >
                {uploading === 'signature' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Signature
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="space-y-4">
          <Label>Brand Colors</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color" className="text-sm">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={data.primary_color}
                  onChange={(e) => handleColorChange('primary_color', e.target.value)}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={data.primary_color}
                  onChange={(e) => handleColorChange('primary_color', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color" className="text-sm">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={data.secondary_color}
                  onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={data.secondary_color}
                  onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                  placeholder="#EF4444"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent_color" className="text-sm">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent_color"
                  type="color"
                  value={data.accent_color}
                  onChange={(e) => handleColorChange('accent_color', e.target.value)}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={data.accent_color}
                  onChange={(e) => handleColorChange('accent_color', e.target.value)}
                  placeholder="#10B981"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="background_color" className="text-sm">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="background_color"
                  type="color"
                  value={data.background_color}
                  onChange={(e) => handleColorChange('background_color', e.target.value)}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={data.background_color}
                  onChange={(e) => handleColorChange('background_color', e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Font Selection */}
        <div className="space-y-2">
          <Label htmlFor="font_family">Font Family</Label>
          <Select value={data.font_family} onValueChange={(value) => handleColorChange('font_family', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select font family" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200">
              {fontOptions.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value }}>
                    {font.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || uploading !== null}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Branding Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}