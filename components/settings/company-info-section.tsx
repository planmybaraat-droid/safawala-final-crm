"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Building2, MapPin, CheckCircle, XCircle } from 'lucide-react'
import { ToastService } from '@/lib/toast-service'
import { PincodeService } from '@/lib/pincode-service'
import { toast } from 'sonner'

interface CompanyInfoData {
  company_name: string
  email: string
  phone: string
  gst_number: string
  gst_percentage: number
  address: string
  city: string
  state: string
  pincode: string
  pan_number: string
  website: string
  terms_conditions: string
}

interface CompanyInfoSectionProps {
  franchiseId: string
}

export function CompanyInfoSection({ franchiseId }: CompanyInfoSectionProps) {
  const [data, setData] = useState<CompanyInfoData>({
    company_name: '',
    email: '',
    phone: '',
    gst_number: '',
    gst_percentage: 5.0,
    address: '',
    city: '',
    state: '',
    pincode: '',
    pan_number: '',
    website: '',
    terms_conditions: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "valid" | "invalid">("idle")
  const { toast } = useToast()

  useEffect(() => {
    if (franchiseId) {
      fetchCompanyInfo()
    }
  }, [franchiseId])

  const fetchCompanyInfo = async () => {
    if (!franchiseId) {
      console.error('[Company Settings] No franchise ID provided')
      return
    }
    
    try {
      setLoading(true)
      const response = await fetch(`/api/settings/company?franchise_id=${franchiseId}`)
      
      if (!response.ok) {
        await ToastService.handleApiError(response, 'load company information')
        return
      }
      
      const result = await response.json()
      
      if (result.data) {
        setData({
          company_name: result.data.company_name || '',
          email: result.data.email || '',
          phone: result.data.phone || '',
          gst_number: result.data.gst_number || '',
          gst_percentage: result.data.gst_percentage !== undefined ? Number(result.data.gst_percentage) : 5.0,
          address: result.data.address || '',
          city: result.data.city || '',
          state: result.data.state || '',
          pincode: result.data.pincode || '',
          pan_number: result.data.pan_number || '',
          website: result.data.website || '',
          terms_conditions: result.data.terms_conditions || ''
        })
      }
    } catch (error) {
      console.error('Error fetching company info:', error)
      ToastService.operations.loadFailed('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CompanyInfoData, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const handlePincodeChange = async (pincode: string) => {
    handleInputChange("pincode", pincode)
    setPincodeStatus("idle")

    // Clear city and state if pincode is less than 6 digits
    if (pincode.length < 6) {
      setData((prev) => ({
        ...prev,
        city: "",
        state: "",
      }))
    }

    // Auto-lookup when pincode is exactly 6 digits
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setPincodeLoading(true)

      try {
        const pincodeData = await PincodeService.lookup(pincode)

        if (pincodeData) {
          setData((prev) => ({
            ...prev,
            city: pincodeData.city,
            state: pincodeData.state,
          }))
          setPincodeStatus("valid")
          toast.success(`Location found: ${pincodeData.city}, ${pincodeData.state}`)
        } else {
          setPincodeStatus("invalid")
          toast.error("Invalid pincode or location not found")
        }
      } catch (error) {
        console.error("Pincode lookup error:", error)
        setPincodeStatus("invalid")
        toast.error("Failed to lookup pincode")
      } finally {
        setPincodeLoading(false)
      }
    } else if (pincode.length > 6) {
      setPincodeStatus("invalid")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate franchise ID first
    if (!franchiseId) {
      ToastService.error('No franchise ID available. Please refresh the page.')
      return
    }
    
    // Basic validation
    if (!data.company_name.trim()) {
      ToastService.error('Company name is required')
      return
    }
    
    if (!data.email.trim()) {
      ToastService.error('Email is required')
      return
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      ToastService.error('Please enter a valid email address')
      return
    }
    
    // Validate GST percentage
    if (data.gst_percentage < 0 || data.gst_percentage > 100) {
      ToastService.error('GST percentage must be between 0 and 100')
      return
    }
    
    try {
      setSaving(true)
      const response = await fetch('/api/settings/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          franchise_id: franchiseId
        }),
      })

      if (response.ok) {
        ToastService.operations.settingsSaved()
      } else {
        const errorData = await response.json()
        
        // Check if error is about missing gst_percentage column
        if (errorData.message?.includes('gst_percentage column may be missing')) {
          ToastService.error(
            'Database schema issue. Please run the GST migration in Supabase SQL Editor:\n' +
            'ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 5.00;'
          )
        } else {
          await ToastService.handleApiError(response, 'save company information')
        }
      }
    } catch (error: any) {
      console.error('Error saving company info:', error)
      ToastService.operations.settingsSaveFailed('Unable to connect to server')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    const form = document.createElement('form')
    handleSubmit({ preventDefault: () => {}, target: form } as any)
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
          <Building2 className="h-5 w-5" />
          Company Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={data.company_name}
              onChange={(e) => handleInputChange('company_name', e.target.value)}
              placeholder="Safawala Rental Services"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="contact@safawala.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={data.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={data.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://www.safawala.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={data.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Enter complete business address"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pincode">
            Pincode <span className="text-xs text-muted-foreground">(Auto-fills city & state)</span>
          </Label>
          <div className="relative">
            <Input
              id="pincode"
              value={data.pincode}
              onChange={(e) => handlePincodeChange(e.target.value)}
              placeholder="400001"
              maxLength={6}
              className={
                pincodeStatus === "valid"
                  ? "border-green-500"
                  : pincodeStatus === "invalid"
                  ? "border-red-500"
                  : ""
              }
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {pincodeLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              {pincodeStatus === "valid" && <CheckCircle className="h-4 w-4 text-green-500" />}
              {pincodeStatus === "invalid" && <XCircle className="h-4 w-4 text-red-500" />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={data.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="Mumbai"
              disabled={pincodeLoading || (data.pincode.length === 6 && pincodeStatus === "valid")}
              className={pincodeLoading || (data.pincode.length === 6 && pincodeStatus === "valid") ? "bg-muted" : ""}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={data.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              placeholder="Maharashtra"
              disabled={pincodeLoading || (data.pincode.length === 6 && pincodeStatus === "valid")}
              className={pincodeLoading || (data.pincode.length === 6 && pincodeStatus === "valid") ? "bg-muted" : ""}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gst_number">GST Number</Label>
            <Input
              id="gst_number"
              value={data.gst_number}
              onChange={(e) => handleInputChange('gst_number', e.target.value)}
              placeholder="29ABCDE1234F1Z5"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gst_percentage">
              GST Percentage (%)
              <span className="text-xs text-muted-foreground ml-2">Used in bookings & billing</span>
            </Label>
            <Input
              id="gst_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={data.gst_percentage}
              onChange={(e) => {
                const value = e.target.value === '' ? 5.0 : parseFloat(e.target.value)
                handleInputChange('gst_percentage', value)
              }}
              placeholder="5.00"
            />
            <p className="text-xs text-gray-500">
              Common rates: 5%, 12%, 18%, 28%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pan_number">PAN Number</Label>
            <Input
              id="pan_number"
              value={data.pan_number}
              onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          </div>
          
          <div className="space-y-2">
            {/* Empty div for grid alignment */}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="terms_conditions">Terms & Conditions</Label>
          <Textarea
            id="terms_conditions"
            value={data.terms_conditions}
            onChange={(e) => handleInputChange('terms_conditions', e.target.value)}
            placeholder="Enter default terms and conditions for invoices and quotes..."
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            These terms will be automatically included in all invoices and quotes
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Company Information
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}