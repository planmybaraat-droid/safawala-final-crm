'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Camera, CheckCircle2, Package, User, Phone, X, Image as ImageIcon } from 'lucide-react'
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface ProductItem {
  product_id: string
  product_name: string
  quantity: number
  barcode?: string
  category?: string
}

interface MarkDeliveredDialogProps {
  open: boolean
  onClose: () => void
  delivery: any | null
  onSuccess: () => void
}

export function MarkDeliveredDialog({
  open,
  onClose,
  delivery,
  onSuccess,
}: MarkDeliveredDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Form state
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  
  // Client Information (pre-filled from delivery)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  
  // Photo capture
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  
  // Products
  const [items, setItems] = useState<ProductItem[]>([])
  const [allItemsVerified, setAllItemsVerified] = useState(false)
  
  // Notes
  const [notes, setNotes] = useState('')

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && delivery) {
      // Pre-fill client info from delivery
      setClientName(delivery.customer_name || '')
      setClientPhone(delivery.customer_phone || '')
      setPhotoUrl(null)
      setPhotoFile(null)
      setNotes('')
      setAllItemsVerified(false)
      setShowCamera(false)
      
      // Load products
      loadDeliveryItems()
    }
    
    // Cleanup camera stream when dialog closes
    if (!open && stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [open, delivery])

  // Load delivery items - directly from product_order_items table
  const loadDeliveryItems = async () => {
    if (!delivery?.booking_id) {
      setItems([])
      return
    }

    setLoadingItems(true)
    try {
      const supabase = createClientComponentClient()

      // Fetch items directly from product_order_items table (same as View dialog)
      const { data, error } = await supabase
        .from("product_order_items")
        .select("*")
        .eq("order_id", delivery.booking_id)

      if (error) {
        setItems([])
        return
      }

      if (data && data.length > 0) {
        // Map items to our format - use denormalized product info
        const mappedItems = data.map((item: any) => ({
          product_id: item.product_id,
          product_name: item.product_name || 'Unknown Product',
          quantity: item.quantity || 1,
          barcode: item.barcode || '',
          category: item.category || '',
        }))
        setItems(mappedItems)
      } else {
        setItems([])
      }
    } catch {
      setItems([])
    } finally {
      setLoadingItems(false)
    }
  }

  // Start camera for mobile
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setShowCamera(true)
    } catch {
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please allow camera permissions or use file upload.',
        variant: 'destructive',
      })
    }
  }

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      setPhotoUrl(dataUrl)
      
      // Convert to file for upload
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `delivery-${delivery.id}-${Date.now()}.jpg`, { type: 'image/jpeg' })
          setPhotoFile(file)
        }
      }, 'image/jpeg', 0.8)
    }

    // Stop camera
    stopCamera()
  }

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  // Handle file upload (fallback for desktop)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setPhotoUrl(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Remove photo
  const removePhoto = () => {
    setPhotoUrl(null)
    setPhotoFile(null)
  }

  // Validate form
  const validateForm = () => {
    if (!clientName.trim()) {
      toast({ title: 'Error', description: 'Client name is required', variant: 'destructive' })
      return false
    }
    if (!clientPhone.trim()) {
      toast({ title: 'Error', description: 'Client phone is required', variant: 'destructive' })
      return false
    }
    if (!photoUrl) {
      toast({ title: 'Error', description: 'Photo is required for delivery confirmation', variant: 'destructive' })
      return false
    }
    if (!allItemsVerified) {
      toast({ title: 'Error', description: 'Please verify all items have been delivered', variant: 'destructive' })
      return false
    }
    return true
  }

  // Handle Mark as Delivered
  const handleMarkDelivered = async () => {
    if (!validateForm() || !delivery) return

    setLoading(true)
    try {
      // Skip photo upload for now if it fails - use base64 instead
      let photoStoragePath = photoUrl // Use the captured photo URL directly
      
      // Try to upload photo, but don't fail if it doesn't work
      if (photoFile) {
        try {
          const photoFormData = new FormData()
          photoFormData.append('file', photoFile)
          photoFormData.append('delivery_id', delivery.id)
          
          const photoRes = await fetch('/api/deliveries/upload-photo', {
            method: 'POST',
            credentials: 'include',
            body: photoFormData,
          })
          if (photoRes.ok) {
            const photoJson = await photoRes.json()
            photoStoragePath = photoJson.url || photoUrl
          }
        } catch {
          // Continue with base64 photo URL
        }
      }

      // Update delivery status using update-status endpoint (workaround for dynamic route 404)
      const res = await fetch(`/api/deliveries/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          delivery_id: delivery.id,
          status: 'delivered',
          delivery_confirmation_name: clientName,
          delivery_confirmation_phone: clientPhone,
          delivery_photo_url: photoStoragePath,
          delivery_notes: notes,
          delivery_items_count: items.reduce((sum, item) => sum + item.quantity, 0),
          delivery_items_confirmed: allItemsVerified,
          delivered_at: new Date().toISOString(),
        }),
      })

      if (!res.ok) {
        const contentType = res.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const err = await res.json()
          throw new Error(err.error || err.message || 'Failed to mark as delivered')
        } else {
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
      }

      toast({ title: 'Success', description: 'Delivery marked as delivered!' })
      onSuccess()
      onClose()
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to mark as delivered',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Mark as Delivered
          </DialogTitle>
          <DialogDescription>
            Confirm delivery completion with client details and photo proof
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Client Information */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Client Information
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="client-name" className="text-sm font-medium">Client Name *</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                  disabled={loading}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label htmlFor="client-phone" className="text-sm font-medium flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone Number *
                </Label>
                <Input
                  id="client-phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Enter phone number"
                  disabled={loading}
                  className="mt-1 bg-white"
                />
              </div>
            </div>
          </Card>

          {/* Photo Capture */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photo Proof *
            </h3>
            
            {!photoUrl && !showCamera && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="flex-1"
                  disabled={loading}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Open Camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                  disabled={loading}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {showCamera && (
              <div className="space-y-3">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1" variant="default">
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </Button>
                  <Button onClick={stopCamera} variant="outline">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {photoUrl && (
              <div className="space-y-2">
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img src={photoUrl} alt="Delivery proof" className="w-full h-full object-cover" />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Photo captured successfully
                </p>
              </div>
            )}

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} className="hidden" />
          </Card>

          {/* Products Verification */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products to Deliver ({totalItems} items)
            </h3>
            
            {loadingItems ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading products...
              </div>
            ) : items.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.product_name}</div>
                      {item.barcode && <div className="text-xs text-muted-foreground">Barcode: {item.barcode}</div>}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      Qty: {item.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No products found</p>
            )}

            {/* All Items Verified Checkbox */}
            <div className="flex items-center space-x-2 mt-4 pt-3 border-t">
              <Checkbox
                id="items-verified"
                checked={allItemsVerified}
                onCheckedChange={(checked) => setAllItemsVerified(checked as boolean)}
                disabled={loading}
              />
              <Label
                htmlFor="items-verified"
                className="text-sm font-medium cursor-pointer select-none"
              >
                I confirm all {totalItems} item(s) have been delivered ✓
              </Label>
            </div>
          </Card>

          {/* Notes */}
          <div>
            <Label htmlFor="delivery-notes" className="text-sm font-medium">Notes (Optional)</Label>
            <Textarea
              id="delivery-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any issues or comments during delivery..."
              disabled={loading}
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleMarkDelivered} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Delivered
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
