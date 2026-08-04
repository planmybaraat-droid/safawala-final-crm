"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase"
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shirt,
  Archive,
  PackagePlus,
  User,
  Phone,
  Camera,
} from "lucide-react"

const supabase = createClient()

interface DeliveryItem {
  id: string
  product_name: string
  variant_name?: string
  quantity: number
  product_id?: string
  variant_id?: string
  // Return quantities
  lost_damaged?: number
  used?: number
  fresh?: number
  // Return notes and photo per item
  return_notes?: string
  return_photo_url?: string
}

interface ProcessReturnDialogProps {
  open: boolean
  onClose: () => void
  delivery: {
    id: string
    delivery_number?: string
    customer_name?: string
    customer_phone?: string
    booking_id?: string
    booking_source?: "product_order" | "package_booking"
  } | null
  onSuccess: () => void
}

export function ProcessReturnDialog({
  open,
  onClose,
  delivery,
  onSuccess,
}: ProcessReturnDialogProps) {
  const [items, setItems] = useState<DeliveryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Client confirmation fields
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // Load delivery items when dialog opens
  useEffect(() => {
    if (open && delivery?.booking_id) {
      // Load delivery data directly from Supabase to get latest return_notes and return_photo_url
      loadDeliveryData()
      // Then load items
      loadDeliveryItems()
    }
  }, [open, delivery?.id]) // Trigger on dialog open or delivery change

  // Fetch latest delivery data to get saved notes/photo
  const loadDeliveryData = async () => {
    if (!delivery?.id) return
    
    try {
      const { data, error } = await supabase
        .from("deliveries")
        .select("return_notes, return_photo_url, return_confirmation_name, return_confirmation_phone")
        .eq("id", delivery.id)
        .single()

      if (error) {
        return
      }

      // Set the loaded values
      setNotes(data?.return_notes || "")
      setPhotoUrl(data?.return_photo_url || null)
      setClientName(data?.return_confirmation_name || delivery.customer_name || "")
      setClientPhone(data?.return_confirmation_phone || delivery.customer_phone || "")
      setItems([])
      setPhotoFile(null)
      setShowCamera(false)
    } catch {
    }
  }

  // Additional cleanup when dialog closes
  useEffect(() => {
    if (!open) {
      // Clear state when dialog closes
      setItems([])
      setClientName("")
      setClientPhone("")
      setNotes("")
      setPhotoUrl(null)
      setPhotoFile(null)
      setShowCamera(false)
    }
  }, [open])

  // Cleanup camera on close
  useEffect(() => {
    if (!open && stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setShowCamera(false)
    }
  }, [open, stream])

  const loadDeliveryItems = async () => {
    if (!delivery?.booking_id) {
      return
    }
    
    setLoading(true)
    try {
      // Determine table and foreign key based on booking source
      const table = delivery.booking_source === "package_booking" 
        ? "package_booking_product_items" 
        : "product_order_items"
      
      // The foreign key column name - check both possible names
      const foreignKey = delivery.booking_source === "package_booking"
        ? "package_booking_id"
        : "order_id"  // product_order_items uses 'order_id' not 'product_order_id'

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(foreignKey, delivery.booking_id)

      if (error) throw error

      // Map items with return quantities (default to 0)
      const mappedItems: DeliveryItem[] = (data || []).map((item: any) => {
        const lost = item.return_lost_damaged || 0
        const used = item.return_used || 0
        // Use saved fresh value if it exists, otherwise calculate
        const fresh = item.return_fresh !== null && item.return_fresh !== undefined 
          ? item.return_fresh 
          : (item.quantity || 1) - lost - used
        
        return {
          id: item.id,
          product_name: item.product_name || item.name || "Unknown Product",
          variant_name: item.variant_name,
          quantity: item.quantity || 1,
          product_id: item.product_id,
          variant_id: item.variant_id,
          lost_damaged: lost,
          used: used,
          fresh: fresh,
          return_notes: item.return_notes || "",
          return_photo_url: item.return_photo_url || null,
        }
      })

      setItems(mappedItems)
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to load delivery items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update item quantities
  const updateItemQuantity = (
    itemId: string,
    lostDamagedValue: number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        
        const lost_damaged = Math.max(0, Math.min(lostDamagedValue, item.quantity))
        
        return {
          ...item,
          lost_damaged,
          used: 0,
          fresh: item.quantity - lost_damaged,
        }
      })
    )
  }

  // Camera functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      setStream(mediaStream)
      setShowCamera(true)
      
      // Set video source after render
      setTimeout(() => {
        if (videoRef) {
          videoRef.srcObject = mediaStream
        }
      }, 100)
    } catch {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const capturePhoto = () => {
    if (!videoRef) return
    
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.videoWidth
    canvas.height = videoRef.videoHeight
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(videoRef, 0, 0)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
      setPhotoUrl(dataUrl)
      
      // Convert to file for upload
      canvas.toBlob((blob) => {
        if (blob) {
          setPhotoFile(new File([blob], "return-photo.jpg", { type: "image/jpeg" }))
        }
      }, "image/jpeg", 0.8)
    }
    
    // Stop camera
    stream?.getTracks().forEach(track => track.stop())
    setStream(null)
    setShowCamera(false)
  }

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop())
    setStream(null)
    setShowCamera(false)
  }


  // Process return (finalizes everything)
  const handleProcessReturn = async () => {
    if (!delivery) return
    
    // Validation
    if (!clientName.trim()) {
      toast({ title: "Error", description: "Client name is required", variant: "destructive" })
      return
    }
    if (!clientPhone.trim()) {
      toast({ title: "Error", description: "Client phone is required", variant: "destructive" })
      return
    }

    setProcessing(true)
    try {
      // Call the process-return API
      const res = await fetch("/api/deliveries/process-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          delivery_id: delivery.id,
          booking_id: delivery.booking_id,
          booking_source: delivery.booking_source,
          items: items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name: item.product_name,
            variant_name: item.variant_name,
            quantity: item.quantity,
            lost_damaged: item.lost_damaged || 0,
            used: item.used || 0,
            fresh: item.fresh || 0,
          })),
          client_name: clientName,
          client_phone: clientPhone,
          notes: notes,
          photo_url: photoUrl,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to process return")
      }

      const result = await res.json()

      toast({
        title: "Return Processed!",
        description: `${result.used_to_laundry || 0} items sent to laundry, ${result.fresh_to_inventory || 0} items returned to inventory, ${result.lost_damaged_count || 0} items marked as lost/damaged.`,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to process return",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => ({
      total: acc.total + item.quantity,
      lostDamaged: acc.lostDamaged + (item.lost_damaged || 0),
      fresh: acc.fresh + (item.fresh || 0),
    }),
    { total: 0, lostDamaged: 0, fresh: 0 }
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-stone-300 rounded-xl p-6 shadow-xl">
        <DialogHeader className="border-b border-stone-100 pb-4">
          <DialogTitle className="flex items-center gap-2 text-[#113c2c] text-xl font-bold font-serif">
            <Package className="h-5 w-5 text-[#113c2c]" />
            Process Rental Return
          </DialogTitle>
          <DialogDescription className="text-stone-500 font-sans text-xs">
            {delivery?.delivery_number} • Confirm items returned and update inventory levels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Client Confirmation */}
          <Card className="p-4 bg-[#FAF8F5] border border-stone-200 shadow-none">
            <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-[#113c2c]" />
              Client Confirmation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Client Name *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                  className="mt-1.5 bg-white border-stone-300 focus:border-[#113c2c] focus:ring-1 focus:ring-[#113c2c]"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-stone-600 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone *
                </Label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Enter phone"
                  className="mt-1.5 bg-white border-stone-300 focus:border-[#113c2c] focus:ring-1 focus:ring-[#113c2c]"
                />
              </div>
            </div>
          </Card>

          {/* Photo Capture */}
          <Card className="p-4 bg-[#FAF8F5] border border-stone-200 shadow-none">
            <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4 text-[#113c2c]" />
              Rental Return Photo (Optional)
            </h3>
            {showCamera ? (
              <div className="space-y-2">
                <video
                  ref={(el) => {
                    setVideoRef(el)
                    if (el && stream) el.srcObject = stream
                  }}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-black aspect-video object-cover border border-stone-300"
                />
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1 bg-[#113c2c] hover:bg-[#0c2e22] text-white">
                    📸 Capture
                  </Button>
                  <Button variant="outline" onClick={stopCamera} className="border-stone-300 text-stone-700">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : photoUrl ? (
              <div className="space-y-2">
                <img src={photoUrl} alt="Return" className="w-full rounded-lg max-h-48 object-cover border border-stone-200" />
                <Button variant="outline" onClick={() => { setPhotoUrl(null); setPhotoFile(null) }} className="border-stone-300 text-stone-700">
                  Retake Photo
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={startCamera} className="w-full border-stone-300 text-stone-700 hover:bg-stone-50">
                <Camera className="h-4 w-4 mr-2 text-stone-500" />
                Capture Rental Return Photo
              </Button>
            )}
          </Card>

          {/* Products Table */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-stone-800">
              <Package className="h-4 w-4 text-[#113c2c]" />
              Product Conditions
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#113c2c]" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No items found</p>
            ) : (
              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider px-2">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-center">Total</div>
                  <div className="col-span-3 text-center text-amber-800">Lost / Damaged</div>
                  <div className="col-span-2 text-center text-emerald-800">Back to Inventory</div>
                </div>

                {/* Items */}
                {items.map((item) => (
                  <Card key={item.id} className="p-3 bg-[#FAF8F5] border border-stone-200 shadow-none hover:border-stone-300 transition-colors">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <p className="font-semibold text-stone-900 text-sm">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-xs text-stone-500 mt-0.5">{item.variant_name}</p>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        <Badge variant="outline" className="border-stone-300 font-mono text-stone-700 bg-white">
                          {item.quantity}
                        </Badge>
                      </div>
                      <div className="col-span-3 px-2">
                        <Input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={item.lost_damaged || 0}
                          onChange={(e) =>
                            updateItemQuantity(item.id, parseInt(e.target.value) || 0)
                          }
                          className="h-8 text-center text-red-700 border-stone-300 focus:border-[#113c2c] focus:ring-1 focus:ring-[#113c2c] bg-white rounded-md font-mono"
                        />
                      </div>
                      <div className="col-span-2 text-center">
                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-mono">
                          {item.fresh || 0}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Totals Summary */}
                <Card className="p-3 bg-[#F4F1EA] border border-stone-200 shadow-none font-semibold text-stone-900">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 text-stone-700 font-bold uppercase tracking-wider text-xs">Totals</div>
                    <div className="col-span-2 text-center font-mono">{totals.total}</div>
                    <div className="col-span-3 text-center text-red-700 font-mono">{totals.lostDamaged}</div>
                    <div className="col-span-2 text-center text-emerald-800 font-mono">{totals.fresh}</div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Action Summary */}
          <Card className="p-4 bg-[#FAF8F5] border border-stone-200 shadow-none rounded-lg">
            <h4 className="font-semibold text-stone-900 mb-3 text-sm">Summary of Return actions:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3 text-emerald-800 bg-emerald-50/50 px-3 py-2 rounded-md border border-emerald-100/50">
                <PackagePlus className="h-4 w-4 text-emerald-600" />
                <span><strong>{totals.fresh}</strong> items → Back to Inventory</span>
              </div>
              {totals.lostDamaged > 0 && (
                <div className="flex items-center gap-3 text-rose-800 bg-rose-50/50 px-3 py-2 rounded-md border border-rose-100/50">
                  <Archive className="h-4 w-4 text-rose-600" />
                  <span><strong>{totals.lostDamaged}</strong> items → Lost/Damaged (archive & update billing)</span>
                </div>
              )}
            </div>
          </Card>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about the return..."
              className="mt-1.5 bg-white border-stone-300 focus:border-[#113c2c] focus:ring-1 focus:ring-[#113c2c]"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t border-stone-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={processing} className="border-stone-300 text-stone-700">
            Cancel
          </Button>
          <Button
            onClick={handleProcessReturn}
            disabled={processing || items.length === 0}
            className="bg-[#113c2c] hover:bg-[#0c2e22] text-white"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Process Rental Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
