"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { validatePhoneWithCountry } from "@/lib/form-validation"
import { useI18n } from "@/lib/i18n-context"

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerCreated?: (customer: any) => void
  mode?: "create" | "edit"
  customer?: any
}

interface CustomerFormData {
  name: string
  phone: string
  whatsapp: string
  address: string
  city: string
  state: string
  pincode: string
}

export function CustomerFormDialog({ 
  open, 
  onOpenChange, 
  onCustomerCreated, 
  mode = "create", 
  customer 
}: CustomerFormDialogProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    phone: "+91",
    whatsapp: "+91",
    address: "",
    city: "",
    state: "",
    pincode: "",
  })

  // Pre-fill form data when in edit mode
  useEffect(() => {
    if (mode === "edit" && customer && open) {
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        whatsapp: customer.whatsapp || customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        pincode: customer.pincode || "",
      })
    } else if (mode === "create" && !open) {
      // Reset form when dialog closes in create mode
      setFormData({
        name: "",
        phone: "+91",
        whatsapp: "+91",
        address: "",
        city: "",
        state: "",
        pincode: "",
      })
    }
  }, [mode, customer, open])

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.name.trim()) {
        throw new Error("Customer name is required")
      }

      const phoneValidation = validatePhoneWithCountry(formData.phone)
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.error || "Please enter a valid phone number")
      }

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp?.trim() || null,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        pincode: formData.pincode?.trim() || null,
      }

      if (mode === "edit" && customer) {
        const response = await fetch(`/api/customers`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ id: customer.id, ...payload }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errorData.error || `Failed to update customer (${response.status})`)
        }

        const result = await response.json()
        if (!result.success || !result.data) {
          throw new Error(result.error || "No data returned from update")
        }

        toast.success("Customer updated successfully!")
        if (onCustomerCreated) {
          onCustomerCreated(result.data)
        }
      } else {
        const response = await fetch("/api/customers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errorData.error || `Failed to create customer (${response.status})`)
        }

        const result = await response.json()
        if (!result.success || !result.data) {
          throw new Error(result.error || "No data returned from create")
        }

        toast.success("Customer created successfully!")
        if (onCustomerCreated) {
          onCustomerCreated(result.data)
        }
      }

      // Close dialog
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-5 rounded-xl border border-slate-100 bg-white">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
            {mode === "edit" ? t("edit_customer_details") : t("new_customer_profile")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t("name")} *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g. John Doe"
              required
              className="h-9 bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("phone")} *
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+91 98765 43210"
                required
                className="h-9 bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-lg text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t("whatsapp_number")}
              </Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                placeholder="Optional"
                className="h-9 bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t("address")}
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Full delivery/billing address"
              rows={2}
              className="bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-lg text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9 px-4 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 text-sm font-medium"
            >
              {t("cancel")}
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="h-9 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? (
                <div className="flex items-center space-x-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("loading")}</span>
                </div>
              ) : (
                <span>{mode === "edit" ? t("update_profile") : t("create_profile")}</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
