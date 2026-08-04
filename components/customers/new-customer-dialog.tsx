"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ToastService } from "@/lib/toast-service"
import { supabase } from "@/lib/supabase"
import { lookupPincode } from "@/lib/pincode-service"
import { validatePhoneWithCountry } from "@/lib/form-validation"
import { useI18n } from "@/lib/i18n-context"

interface NewCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerCreated: (customer: any) => void
  franchises: any[]
}

export function NewCustomerDialog({ open, onOpenChange, onCustomerCreated, franchises }: NewCustomerDialogProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [formData, setFormData] = useState({
    name: "",
    phone: "+91",
    whatsapp: "+91",
    address: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    franchise_id: "",
  })

  const handlePincodeChange = async (pincode: string) => {
    setFormData((prev) => ({ ...prev, pincode }))

    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setPincodeStatus("loading")
      try {
        const result = await lookupPincode(pincode)
        if (result && (result.city || result.state || result.area)) {
          setFormData((prev) => ({
            ...prev,
            area: result.area || "",
            city: result.city || "",
            state: result.state || "",
          }))
          setPincodeStatus("success")
        } else {
          setPincodeStatus("error")
        }
      } catch (error) {
        setPincodeStatus("error")
        ToastService.warning({
          title: "Pincode lookup failed",
          description: "Please enter city and state manually"
        })
      }
    } else {
      setPincodeStatus("idle")
      if (pincode.length < 6) {
        setFormData((prev) => ({
          ...prev,
          area: "",
          city: "",
          state: "",
        }))
      }
    }
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      ToastService.error("Customer name is required")
      return
    }
    
    if (!formData.phone.trim()) {
      ToastService.error("Phone number is required")
      return
    }
    
    if (!formData.franchise_id) {
      ToastService.error("Please select a franchise")
      return
    }

    // Validate phone number format
    const phoneValidation = validatePhoneWithCountry(formData.phone)
    if (!phoneValidation.isValid) {
      ToastService.error(phoneValidation.error || "Please enter a valid phone number")
      return
    }

    try {
      setLoading(true)
      const customerCode = `CUST${Date.now().toString().slice(-6)}`

      const { data, error } = await supabase
        .from("customers")
        .insert([
          {
            ...formData,
            customer_code: customerCode,
            phone: formData.phone.replace(/\s+/g, ''), // Clean phone number
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          ToastService.operations.customerCreateFailed('A customer with this phone number already exists')
        } else {
          ToastService.operations.customerCreateFailed(error.message)
        }
        return
      }

      ToastService.operations.customerCreated()
      onCustomerCreated(data)
      onOpenChange(false)
      
      // Reset form
      setFormData({
        name: "",
        phone: "+91",
        whatsapp: "+91",
        address: "",
        area: "",
        city: "",
        state: "",
        pincode: "",
        franchise_id: "",
      })
      setPincodeStatus("idle")
    } catch (error: any) {
      ToastService.operations.customerCreateFailed('Unable to connect to server. Please check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {t("add_new_customer")}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">{t("name")} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("name")}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t("phone")} *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder={t("phone")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="whatsapp">{t("whatsapp_number")}</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))}
                placeholder={t("whatsapp_number")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">{t("address")}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder={t("address")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pincode">Pincode</Label>
              <div className="relative">
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="6-digit pincode"
                  maxLength={6}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {pincodeStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pincodeStatus === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {pincodeStatus === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                placeholder="Area/Locality"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">{t("city")}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                placeholder={t("city")}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                placeholder="State"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="franchise">Franchise *</Label>
            <Select
              value={formData.franchise_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, franchise_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select franchise" />
              </SelectTrigger>
              <SelectContent>
                {franchises.map((franchise) => (
                  <SelectItem key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? t("loading") : t("create_customer")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
