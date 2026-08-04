"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Save,
  Loader2,
  MapPin,
  CheckCircle,
  XCircle,
  Building2,
  Phone,
  MessageCircle,
  Mail,
} from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { lookupPincode } from "@/lib/pincode-service"

interface FranchiseFormData {
  franchise_name: string
  phone: string
  whatsapp: string
  email: string
  address: string
  pincode: string
  city: string
  state: string
}

export default function NewFranchisePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "valid" | "invalid">("idle")
  const [formData, setFormData] = useState<FranchiseFormData>({
    franchise_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
  })

  const handleInputChange = (field: keyof FranchiseFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Auto-fill city and state based on pincode
  const handlePincodeChange = async (pincode: string) => {
    handleInputChange("pincode", pincode)
    setPincodeStatus("idle")

    // Clear city and state when pincode is being modified
    if (pincode.length < 6) {
      setFormData((prev) => ({
        ...prev,
        city: "",
        state: "",
      }))
    }

    // Only lookup if pincode is 6 digits
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setPincodeLoading(true)

      try {
        const pincodeData = await lookupPincode(pincode)

        if (pincodeData) {
          setFormData((prev) => ({
            ...prev,
            city: pincodeData.city,
            state: pincodeData.state,
          }))
          setPincodeStatus("valid")
          toast.success(`Found: ${pincodeData.city}, ${pincodeData.state}`)
        } else {
          setPincodeStatus("invalid")
          toast.error("Invalid pincode or area not found")
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
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("franchises")
        .insert([
          {
            name: formData.franchise_name,
            phone: formData.phone,
            whatsapp: formData.whatsapp,
            email: formData.email,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()

      if (error) throw error

      toast.success("Franchise created successfully!")
      router.push("/franchises")
    } catch (error) {
      console.error("Error creating franchise:", error)
      toast.error("Failed to create franchise")
    } finally {
      setLoading(false)
    }
  }

  const getPincodeIcon = () => {
    if (pincodeLoading) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    if (pincodeStatus === "valid") return <CheckCircle className="h-4 w-4 text-green-500" />
    if (pincodeStatus === "invalid") return <XCircle className="h-4 w-4 text-red-500" />
    return <MapPin className="h-4 w-4 text-gray-400" />
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              Add New Franchise
            </h1>
            <p className="text-muted-foreground">Create a new franchise location</p>
          </div>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Franchise Information
            </CardTitle>
            <CardDescription>
              Enter the franchise details below. City and state will be auto-filled when you enter the pincode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="franchise_name" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Franchise Name *
                  </Label>
                  <Input
                    id="franchise_name"
                    value={formData.franchise_name}
                    onChange={(e) => handleInputChange("franchise_name", e.target.value)}
                    placeholder="Enter franchise name"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+91 9876543210"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp Number *
                  </Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                    placeholder="+91 9876543210"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="franchise@example.com"
                    className="h-11"
                  />
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter complete address (Street, Area, Landmark)"
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pincode" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Pincode *<span className="text-xs text-muted-foreground">(Auto-fills city & state)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="pincode"
                        value={formData.pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        required
                        className={`pr-10 h-11 ${
                          pincodeStatus === "valid"
                            ? "border-green-500 bg-green-50"
                            : pincodeStatus === "invalid"
                              ? "border-red-500 bg-red-50"
                              : ""
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">{getPincodeIcon()}</div>
                    </div>
                    {pincodeStatus === "invalid" && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Please enter a valid 6-digit pincode
                      </p>
                    )}
                    {pincodeLoading && (
                      <p className="text-xs text-blue-500 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Looking up location...
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="City"
                      readOnly={pincodeStatus === "valid"}
                      className={`h-11 ${
                        pincodeStatus === "valid" ? "bg-green-50 border-green-200 text-green-800" : ""
                      }`}
                    />
                    {pincodeStatus === "valid" && formData.city && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Auto-filled from pincode
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      placeholder="State"
                      readOnly={pincodeStatus === "valid"}
                      className={`h-11 ${
                        pincodeStatus === "valid" ? "bg-green-50 border-green-200 text-green-800" : ""
                      }`}
                    />
                    {pincodeStatus === "valid" && formData.state && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Auto-filled from pincode
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button variant="outline" onClick={() => router.back()} className="h-11 px-6">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    pincodeStatus === "invalid" ||
                    !formData.franchise_name ||
                    !formData.phone ||
                    !formData.whatsapp ||
                    !formData.pincode
                  }
                  className="h-11 px-6"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Creating..." : "Create Franchise"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
