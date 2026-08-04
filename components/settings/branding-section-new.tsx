"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Palette, Upload, Image, FileSignature } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BrandingData {
  primary_color: string
  secondary_color: string
  logo_url: string
  signature_url: string
}

interface BrandingSectionProps {
  franchiseId: string
}

export function BrandingSection({ franchiseId }: BrandingSectionProps) {
  const [data, setData] = useState<BrandingData>({
    primary_color: '#3B82F6',
    secondary_color: '#EF4444',
    logo_url: '',
    signature_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  
  const logoInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [franchiseId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const brandingResponse = await fetch(`/api/settings/branding?franchise_id=${franchiseId}`)
      const brandingResult = await brandingResponse.json()
      
      if (brandingResponse.ok && brandingResult.data) {
        setData({
          primary_color: brandingResult.data.primary_color || '#3B82F6',
          secondary_color: brandingResult.data.secondary_color || '#EF4444',
          logo_url: brandingResult.data.logo_url || '',
          signature_url: brandingResult.data.signature_url || ''
        })
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

  const handleDataChange = (field: keyof BrandingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  // Convert any image to PNG format
  const convertToPNG = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = document.createElement('img')
        img.onload = () => {
          // Create canvas with image dimensions
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          
          // Draw image on canvas
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }
          ctx.drawImage(img, 0, 0)
          
          // Convert to PNG blob
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Could not convert image'))
              return
            }
            // Create new File from blob with .png extension
            const pngFile = new File([blob], file.name.replace(/\.[^.]+$/, '.png'), {
              type: 'image/png',
              lastModified: Date.now()
            })
            resolve(pngFile)
          }, 'image/png', 1.0) // 1.0 = maximum quality
        }
        img.onerror = () => reject(new Error('Could not load image'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Could not read file'))
      reader.readAsDataURL(file)
    })
  }

  const uploadFile = async (file: File, type: 'logo' | 'signature') => {
    try {
      setUploading(type)
      
      // Convert to PNG first
      const pngFile = await convertToPNG(file)
      
      const fileName = `${franchiseId}/${type}-${Date.now()}.png`
      
      // Upload to Supabase storage
      const { data: uploadData, error } = await supabase.storage
        .from('settings-uploads')
        .upload(fileName, pngFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/png'
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('settings-uploads')
        .getPublicUrl(fileName)

      // Update local state
      if (type === 'logo') {
        setData(prev => ({ ...prev, logo_url: publicUrl }))
      } else {
        setData(prev => ({ ...prev, signature_url: publicUrl }))
      }

      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully (converted to PNG)`,
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
      // Validate file type - accept all common image formats
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml']
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid image file (JPEG, PNG, WebP, GIF, BMP, SVG)",
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
      
      const brandingResponse = await fetch('/api/settings/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, franchise_id: franchiseId })
      })

      if (brandingResponse.ok) {
        toast({
          title: "Success",
          description: "Branding settings saved successfully",
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
      {/* Logo & Signature Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Company Logo & Signature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div className="space-y-4">
              <Label>Company Logo</Label>
              <div className="flex flex-col gap-4">
                {data.logo_url ? (
                  <div className="relative border rounded-lg p-4 bg-gray-50">
                    <img 
                      src={data.logo_url} 
                      alt="Company Logo" 
                      className="w-full h-32 object-contain"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50">
                    <Image className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No logo uploaded</p>
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
                    className="w-full"
                  >
                    {uploading === 'logo' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Logo
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>

            {/* Signature Upload */}
            <div className="space-y-4">
              <Label>Digital Signature</Label>
              <div className="flex flex-col gap-4">
                {data.signature_url ? (
                  <div className="relative border rounded-lg p-4 bg-gray-50">
                    <img 
                      src={data.signature_url} 
                      alt="Digital Signature" 
                      className="w-full h-32 object-contain"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50">
                    <FileSignature className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No signature uploaded</p>
                  </div>
                )}
                <div>
                  <Input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/*"
                    onChange={() => handleFileSelect('signature')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => signatureInputRef.current?.click()}
                    disabled={uploading === 'signature'}
                    className="w-full"
                  >
                    {uploading === 'signature' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Signature
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-600">
            Choose your brand colors. White will be used for backgrounds and black for text automatically in all PDFs.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="primary_color"
                  type="color"
                  value={data.primary_color}
                  onChange={(e) => handleDataChange('primary_color', e.target.value)}
                  className="w-16 h-12 p-1 border rounded cursor-pointer"
                />
                <Input
                  value={data.primary_color}
                  onChange={(e) => handleDataChange('primary_color', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">Main brand color for headers and buttons</p>
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="secondary_color"
                  type="color"
                  value={data.secondary_color}
                  onChange={(e) => handleDataChange('secondary_color', e.target.value)}
                  className="w-16 h-12 p-1 border rounded cursor-pointer"
                />
                <Input
                  value={data.secondary_color}
                  onChange={(e) => handleDataChange('secondary_color', e.target.value)}
                  placeholder="#EF4444"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">Accent color for highlights and CTAs</p>
            </div>
          </div>

          {/* Color Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-medium mb-3">Color Preview</p>
            <div className="flex gap-4">
              <div className="flex-1">
                <div 
                  className="h-16 rounded border flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: data.primary_color }}
                >
                  Primary
                </div>
              </div>
              <div className="flex-1">
                <div 
                  className="h-16 rounded border flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: data.secondary_color }}
                >
                  Secondary
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || uploading !== null} size="lg">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Palette className="mr-2 h-4 w-4" />
          )}
          Save Branding Settings
        </Button>
      </div>
    </div>
  )
}
