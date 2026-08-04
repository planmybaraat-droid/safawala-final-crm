'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Camera, PenTool, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface ProductItem {
  product_id: string
  product_name: string
  qty_delivered: number
  category?: string
}

interface UnifiedHandoverDialogProps {
  open: boolean
  onClose: () => void
  delivery: any | null
  onSaved: () => void
}

export function UnifiedHandoverDialog({
  open,
  onClose,
  delivery,
  onSaved,
}: UnifiedHandoverDialogProps) {
  const { toast } = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state
  const [loading, setLoading] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  
  // RECIPIENT INFORMATION
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  
  // DELIVERY INFORMATION
  const [deliveryCondition, setDeliveryCondition] = useState('good')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  
  // PHOTO & SIGNATURE
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  
  // ITEMS
  const [items, setItems] = useState<(ProductItem & {
    qty_used: number
    qty_not_used: number
    qty_damaged: number
    qty_lost: number
    condition_before?: string
    condition_after?: string
    damage_reason?: string
    damage_notes?: string
    item_notes?: string
  })[]>([])
  
  // ADDITIONAL NOTES
  const [generalNotes, setGeneralNotes] = useState('')
  const [issues, setIssues] = useState('')
  const [feedback, setFeedback] = useState('')

  // Initialize form
  useEffect(() => {
    const loadData = async () => {
      if (!open || !delivery) return
      setLoading(true)
      try {
        // Get booking items
        let productItems: any[] = []
        
        if (!delivery.booking_id || !delivery.booking_source) {
          setItems([])
          setLoading(false)
          return
        }

        if (delivery.booking_source === 'product_order') {
          const res = await fetch(`/api/product-orders/${delivery.booking_id}`)
          if (res.ok) {
            const json = await res.json()
            productItems = json.items || json.data?.items || []
          } else {
          }
        } else if (delivery.booking_source === 'package_booking') {
          const res = await fetch(`/api/package-bookings/${delivery.booking_id}`)
          if (res.ok) {
            const json = await res.json()
            productItems = json.items?.flatMap((it: any) => 
              (it.selected_products || []).map((pid: string) => ({ 
                product_id: pid, 
                quantity: 1 
              }))
            ) || []
          } else {
          }
        }

        if (productItems.length === 0) {
          setItems([])
          setLoading(false)
          return
        }

        // Fetch product details
        const withDetails = await Promise.all(
          productItems.map(async (pi: any) => {
            const pr = await fetch(`/api/products/${pi.product_id}`)
            const p = pr.ok ? await pr.json() : null
            return {
              product_id: pi.product_id,
              product_name: p?.name || p?.data?.name || 'Unknown Product',
              qty_delivered: pi.quantity || 1,
              category: p?.category,
              qty_used: 0,
              qty_not_used: 0,
              qty_damaged: 0,
              qty_lost: 0,
              damage_reason: undefined,
              damage_notes: undefined,
            }
          })
        )

        setItems(withDetails)
        setLoading(false)
      } catch {
        setItems([])
        setLoading(false)
      }
    }

    loadData()
  }, [open, delivery])

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(x, y)
    ctx.stroke()

    setHasSignature(true)
  }

  const startTouchDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const touch = e.touches[0]
    ctx.beginPath()
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
  }

  const drawTouchSignature = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const touch = e.touches[0]
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
  }

  const clearSignature = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
    setHasSignature(false)
  }

  // Photo handlers
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setPhotoUrl(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Update item quantities
  const updateItem = (idx: number, field: string, value: number) => {
    setItems(prev => {
      const updated = [...prev]
      const item = updated[idx]
      
      // Update field
      ;(item as any)[field] = Math.max(0, Math.min(value, item.qty_delivered))
      
      // Recalculate validation
      const total = item.qty_used + item.qty_not_used + item.qty_damaged + item.qty_lost
      if (total > item.qty_delivered) {
        // Scale down the recently changed field
        ;(item as any)[field] = Math.max(0, item.qty_delivered - (total - value))
      }
      
      return updated
    })
  }

  // Validate form
  const validateForm = () => {
    if (!recipientName.trim()) {
      toast({ title: 'Error', description: 'Recipient name is required', variant: 'destructive' })
      return false
    }
    if (!recipientPhone.trim()) {
      toast({ title: 'Error', description: 'Recipient phone is required', variant: 'destructive' })
      return false
    }
    if (!photoUrl) {
      toast({ title: 'Error', description: 'Photo is required', variant: 'destructive' })
      return false
    }
    if (!hasSignature) {
      toast({ title: 'Error', description: 'Signature is required', variant: 'destructive' })
      return false
    }

    // Validate items sum to delivered
    for (const item of items) {
      const total = item.qty_used + item.qty_not_used + item.qty_damaged + item.qty_lost
      if (total !== item.qty_delivered) {
        toast({
          title: 'Error',
          description: `${item.product_name}: Total quantities (${total}) must equal delivered (${item.qty_delivered})`,
          variant: 'destructive'
        })
        return false
      }
      if (item.qty_damaged > 0 && !item.damage_reason) {
        toast({
          title: 'Error',
          description: `${item.product_name}: Damage reason required when items are damaged`,
          variant: 'destructive'
        })
        return false
      }
    }

    return true
  }

  // Save handover
  const handleSave = async () => {
    if (!validateForm() || !delivery || !canvasRef.current) return

    setLoading(true)
    try {
      // Get signature as data URL
      const signatureUrl = canvasRef.current.toDataURL('image/png')

      // Upload photo and signature to Supabase storage
      let photoStoragePath = null
      let signatureStoragePath = null

      if (photoFile) {
        const photoFormData = new FormData()
        photoFormData.append('file', photoFile)
        photoFormData.append('delivery_id', delivery.id)
        
        const photoRes = await fetch('/api/deliveries/upload-photo', {
          method: 'POST',
          body: photoFormData,
        })
        if (photoRes.ok) {
          const photoJson = await photoRes.json()
          photoStoragePath = photoJson.url
        }
      }

      if (hasSignature) {
        // Convert signature canvas to blob
        const signatureBlob = await new Promise<Blob>(resolve => 
          canvasRef.current!.toBlob(blob => resolve(blob!), 'image/png')
        )
        const signatureFile = new File([signatureBlob], `signature-${delivery.id}.png`, { type: 'image/png' })
        
        const sigFormData = new FormData()
        sigFormData.append('file', signatureFile)
        sigFormData.append('delivery_id', delivery.id)
        
        const sigRes = await fetch('/api/deliveries/upload-signature', {
          method: 'POST',
          body: sigFormData,
        })
        if (sigRes.ok) {
          const sigJson = await sigRes.json()
          signatureStoragePath = sigJson.url
        }
      }

      // Save handover to database
      const payload = {
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        photo_url: photoStoragePath || photoUrl,
        signature_url: signatureStoragePath,
        items: items.map(it => ({
          product_id: it.product_id,
          qty_used: it.qty_used,
          qty_not_used: it.qty_not_used,
          qty_damaged: it.qty_damaged,
          qty_lost: it.qty_lost,
          damage_reason: it.damage_reason || null,
          damage_notes: it.damage_notes || null,
        })),
      }

      const res = await fetch(`/api/deliveries/${delivery.id}/unified-handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save handover')
      }

      toast({ title: 'Success', description: 'Handover completed and inventory updated!' })
      onSaved()
      onClose()
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to save handover',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Delivery Handover</DialogTitle>
          <DialogDescription>
            All information in one form - recipient details, photo, items, and signature
          </DialogDescription>
        </DialogHeader>

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] pr-4">
            
            {/* SECTION 1: RESPONSIBLE PERSON */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Responsible Person</h3>
              
              <div>
                <Label htmlFor="recipient-name" className="font-medium">Name *</Label>
                <Input
                  id="recipient-name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Name of responsible person"
                  disabled={loading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="recipient-phone" className="font-medium">Phone Number *</Label>
                <Input
                  id="recipient-phone"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="Phone number"
                  disabled={loading}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* SECTION 2: SAFA IMAGES */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Safa Images Photo *</h3>

              <div className="border-2 border-dashed rounded-lg p-6 text-center bg-gray-50">
                {photoUrl ? (
                  <>
                    <img src={photoUrl} alt="Safa photo" className="w-full max-h-48 object-contain mx-auto rounded mb-3" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        fileInputRef.current?.click()
                      }}
                      disabled={loading}
                    >
                      <Camera className="h-4 w-4 mr-2" /> Retake Photo
                    </Button>
                  </>
                ) : (
                  <>
                    <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium mb-2">Capture Photo</p>
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      <Camera className="h-4 w-4 mr-2" /> Capture Photo
                    </Button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </div>
            </div>

            <Separator />

            {/* SECTION 3: SAFA CATEGORIZATION */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Safa Categorization *</h3>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No items found for this delivery</p>
              ) : (
                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <div key={item.product_id} className="border rounded-lg p-4 space-y-3 bg-white">
                      <div>
                        <h4 className="font-medium text-base">{item.product_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Total: <span className="font-semibold">{item.qty_delivered} units</span>
                        </p>
                      </div>

                      {/* Quantity inputs */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm font-medium">Used Safa</Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.qty_delivered}
                            value={item.qty_used}
                            onChange={(e) => updateItem(idx, 'qty_used', parseInt(e.target.value) || 0)}
                            className="text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Fresh Safa</Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.qty_delivered}
                            value={item.qty_not_used}
                            onChange={(e) => updateItem(idx, 'qty_not_used', parseInt(e.target.value) || 0)}
                            className="text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Damage/Lost</Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.qty_delivered}
                            value={item.qty_damaged + item.qty_lost}
                            onChange={(e) => {
                              const total = parseInt(e.target.value) || 0
                              updateItem(idx, 'qty_damaged', Math.ceil(total / 2))
                              updateItem(idx, 'qty_lost', Math.floor(total / 2))
                            }}
                            className="text-sm mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* SECTION 4: RECIPIENT SIGNATURE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-base">Recipient Signature *</Label>
                {hasSignature && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSignature}
                    className="text-red-500 hover:text-red-700 h-8 px-2"
                  >
                    Clear Signature
                  </Button>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full h-[200px] cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={drawSignature}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startTouchDrawing}
                  onTouchMove={drawTouchSignature}
                  onTouchEnd={stopDrawing}
                />
              </div>
            </div>

          </div>
        )}

        <DialogFooter className="mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || items.length === 0} size="lg">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Complete Handover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
