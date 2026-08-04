"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Plus, Edit2, Trash2, Copy, Image, Barcode, Loader2, Printer } from "lucide-react"
import { toast } from "sonner"

export interface ProductVariant {
  id?: string
  variation_name: string
  color?: string
  design?: string
  material?: string
  size?: string
  sku?: string
  price_adjustment: number
  regular_price_adjustment: number
  rental_price_adjustment: number
  stock_total: number
  stock_available: number
  barcode?: string
  image_url?: string
}

interface VariantManagerProps {
  variants: ProductVariant[]
  onVariantsChange: (variants: ProductVariant[]) => void
  disabled?: boolean
  productName?: string
  productId?: string
  onPrintBarcode?: (variant: ProductVariant) => void
}

const emptyForm = (): ProductVariant => ({
  variation_name: "",
  color: "",
  design: "",
  material: "",
  size: "",
  sku: "",
  price_adjustment: 0,
  regular_price_adjustment: 0,
  rental_price_adjustment: 0,
  stock_total: 0,
  stock_available: 0,
  image_url: "",
})

async function printVariantBarcode(barcode: string, label: string) {
  const JsBarcode = (await import("jsbarcode")).default
  const labelsPerRow = 2
  const quantity = 2
  const rows = Math.ceil(quantity / labelsPerRow)
  let labelsHTML = ""

  for (let row = 0; row < rows; row++) {
    labelsHTML += `<div class="row">`
    for (let col = 0; col < labelsPerRow; col++) {
      const idx = row * labelsPerRow + col
      if (idx < quantity) {
        const canvas = document.createElement("canvas")
        JsBarcode(canvas, barcode, {
          format: "CODE128", width: 3, height: 80,
          displayValue: false, margin: 4,
          background: "#FFFFFF", lineColor: "#000000",
        })
        const barcodeImg = canvas.toDataURL("image/png")
        labelsHTML += `
          <div class="label">
            <div class="name">${label}</div>
            <img src="${barcodeImg}" class="barcode" />
            <div class="code">${barcode}</div>
            <div class="website">www.safawala.com</div>
          </div>`
      } else {
        labelsHTML += `<div class="label empty"></div>`
      }
    }
    labelsHTML += `</div>`
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: 100mm 25mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100mm; height: 25mm; font-family: 'Courier New', monospace; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .row { width: 100mm; height: 25mm; display: flex; page-break-after: always; page-break-inside: avoid; }
  .row:last-child { page-break-after: avoid; }
  .label { width: 50mm; height: 25mm; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 1mm; gap: 0.3mm; border: 0.5mm solid #ddd; }
  .label.empty { visibility: hidden; }
  .name { font-size: 8.5pt; font-weight: bold; color: #000; text-align: center; max-width: 48mm; max-height: 8mm; overflow: hidden; line-height: 1.1; word-break: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .barcode { width: 42mm; height: 10mm; display: block; image-rendering: pixelated; }
  .code { font-size: 9pt; font-weight: bold; color: #000; text-align: center; height: 3mm; line-height: 1; }
  .website { font-family: Arial, sans-serif; font-size: 8pt; font-weight: bold; color: #000; height: 2mm; line-height: 1; margin-top: 1mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>${labelsHTML}</body></html>`

  const win = window.open("", "_blank")
  if (!win) { toast.error("Please allow popups for printing"); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 500)
}

export function VariantManager({
  variants,
  onVariantsChange,
  disabled,
  productName,
  productId,
  onPrintBarcode,
}: VariantManagerProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState<ProductVariant>(emptyForm())

  const openNewForm = () => {
    setFormData(emptyForm())
    setEditingIdx(-1)
  }

  const openEditForm = (idx: number) => {
    setFormData({ ...variants[idx] })
    setEditingIdx(idx)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const file = files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData((prev) => ({ ...prev, image_url: event.target?.result as string }))
      }
      reader.readAsDataURL(file)
      toast.success("Image selected (will upload on save)")
    } catch {
      toast.error("Failed to select image")
    } finally {
      setUploading(false)
    }
  }

  const saveVariant = async () => {
    if (!formData.variation_name.trim()) {
      toast.error("Variant name is required")
      return
    }

    setSaving(true)
    try {
      if (productId) {
        const isNew = editingIdx === -1
        const url = `/api/products/${productId}/variations`

        if (isNew) {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variation_name: formData.variation_name,
              color: formData.color,
              design: formData.design,
              material: formData.material,
              size: formData.size,
              sku: formData.sku,
              price_adjustment: formData.price_adjustment || 0,
              regular_price_adjustment: formData.regular_price_adjustment || 0,
              rental_price_adjustment: formData.rental_price_adjustment || 0,
              stock_total: formData.stock_total || 0,
              stock_available: formData.stock_available || 0,
              image_url: formData.image_url || null,
            }),
          })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to create variant")
          }
          const saved = await res.json()
          onVariantsChange([...variants, saved])
          toast.success("Variant created with barcode " + (saved.barcode || ""))
        } else {
          const variantId = variants[editingIdx!].id
          const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variation_id: variantId,
              variation_name: formData.variation_name,
              color: formData.color,
              design: formData.design,
              material: formData.material,
              size: formData.size,
              sku: formData.sku,
              price_adjustment: formData.price_adjustment || 0,
              regular_price_adjustment: formData.regular_price_adjustment || 0,
              rental_price_adjustment: formData.rental_price_adjustment || 0,
              stock_total: formData.stock_total || 0,
              stock_available: formData.stock_available || 0,
              image_url: formData.image_url || null,
            }),
          })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to update variant")
          }
          const saved = await res.json()
          onVariantsChange(variants.map((v, i) => (i === editingIdx ? saved : v)))
          toast.success("Variant updated")
        }
      } else {
        // No productId (new product) — update local state only
        if (editingIdx === -1) {
          onVariantsChange([...variants, { ...formData }])
        } else {
          onVariantsChange(variants.map((v, i) => (i === editingIdx ? formData : v)))
        }
        toast.success(editingIdx === -1 ? "Variant added" : "Variant updated")
      }
      setEditingIdx(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save variant")
    } finally {
      setSaving(false)
    }
  }

  const deleteVariant = async (idx: number) => {
    const variant = variants[idx]
    if (productId && variant.id) {
      setDeleting(idx)
      try {
        const res = await fetch(
          `/api/products/${productId}/variations?variation_id=${variant.id}`,
          { method: "DELETE" }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to delete variant")
        }
        onVariantsChange(variants.filter((_, i) => i !== idx))
        toast.success("Variant deleted")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete variant")
      } finally {
        setDeleting(null)
      }
    } else {
      onVariantsChange(variants.filter((_, i) => i !== idx))
      toast.success("Variant removed")
    }
  }

  const duplicateVariant = (idx: number) => {
    const dup = { ...variants[idx] }
    delete dup.id
    delete dup.barcode
    dup.variation_name = `${dup.variation_name} (Copy)`
    onVariantsChange([...variants, dup])
    toast.success("Variant duplicated — save product to persist")
  }

  const getVariantLabel = (v: ProductVariant) => {
    const parts = [v.variation_name]
    if (v.size) parts.push(v.size)
    if (v.color) parts.push(v.color)
    return parts.join(" • ")
  }

  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <div className="space-y-2">
          {variants.map((variant, idx) => (
            <Card key={idx} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{getVariantLabel(variant)}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {variant.size && <Badge variant="outline" className="text-xs">{variant.size}</Badge>}
                    {variant.color && <Badge variant="outline" className="text-xs">{variant.color}</Badge>}
                    {variant.design && <Badge variant="outline" className="text-xs">{variant.design}</Badge>}
                    {variant.material && <Badge variant="outline" className="text-xs">{variant.material}</Badge>}
                    {variant.sku && <Badge variant="outline" className="text-xs font-mono text-[10px]">{variant.sku}</Badge>}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    {variant.stock_total > 0 && <span>Stock: {variant.stock_available}/{variant.stock_total}</span>}
                    {variant.price_adjustment !== 0 && (
                      <span>Price adj: {variant.price_adjustment > 0 ? "+" : ""}₹{variant.price_adjustment.toLocaleString()}</span>
                    )}
                    {variant.image_url && (
                      <span className="text-purple-600 flex items-center gap-1">
                        <Image className="w-3 h-3" /> Photo
                      </span>
                    )}
                  </div>
                  {/* Barcode badge */}
                  {variant.barcode && (
                    <div className="flex items-center gap-1 mt-2">
                      <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        <Barcode className="w-3 h-3" />
                        <code className="font-mono text-[10px] font-bold">{variant.barcode}</code>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-blue-600 text-[10px]"
                        onClick={() => {
                          if (onPrintBarcode) onPrintBarcode(variant)
                          else printVariantBarcode(variant.barcode!, getVariantLabel(variant))
                        }}
                        title="Print barcode label"
                      >
                        <Printer className="w-3 h-3 mr-1" />
                        Print
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="sm" variant="ghost" className="h-8 px-2"
                    onClick={() => openEditForm(idx)}
                    disabled={disabled || saving}
                    title="Edit"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-8 px-2"
                    onClick={() => duplicateVariant(idx)}
                    disabled={disabled || saving}
                    title="Duplicate"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-8 px-2 text-red-600 hover:text-red-700"
                    onClick={() => deleteVariant(idx)}
                    disabled={disabled || deleting === idx}
                    title="Delete"
                  >
                    {deleting === idx
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button
        onClick={openNewForm}
        disabled={disabled || saving}
        variant="outline"
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Variant
      </Button>

      <Dialog open={editingIdx !== null} onOpenChange={(open) => !open && setEditingIdx(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingIdx === -1 ? "Add Variant" : "Edit Variant"}
              {productName && <span className="text-sm text-muted-foreground ml-2">({productName})</span>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Variant Name *</Label>
              <Input
                placeholder="e.g., Red XL, Summer 2024"
                value={formData.variation_name}
                onChange={(e) => setFormData({ ...formData, variation_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Size</Label>
                <Input placeholder="e.g., XL, 42" value={formData.size || ""}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input placeholder="e.g., Red, Navy" value={formData.color || ""}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Design</Label>
                <Input placeholder="e.g., Floral, Stripes" value={formData.design || ""}
                  onChange={(e) => setFormData({ ...formData, design: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Material</Label>
                <Input placeholder="e.g., Cotton, Silk" value={formData.material || ""}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input placeholder="e.g., SKU-001" value={formData.sku || ""}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <h4 className="font-semibold text-sm">Price Adjustments</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Regular Price Adjustment <span className="text-muted-foreground text-[10px]">(MRP, shown struck-through)</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input type="number" step="0.01" value={formData.regular_price_adjustment}
                      onChange={(e) => setFormData({ ...formData, regular_price_adjustment: parseFloat(e.target.value) || 0 })}
                      className="pl-7" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sale Price Adjustment <span className="text-muted-foreground text-[10px]">(shown in bold)</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input type="number" step="0.01" value={formData.price_adjustment}
                      onChange={(e) => setFormData({ ...formData, price_adjustment: parseFloat(e.target.value) || 0 })}
                      className="pl-7" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rental Price Adjustment</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input type="number" step="0.01" value={formData.rental_price_adjustment}
                      onChange={(e) => setFormData({ ...formData, rental_price_adjustment: parseFloat(e.target.value) || 0 })}
                      className="pl-7" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <h4 className="font-semibold text-sm">Stock</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Stock</Label>
                  <Input type="number" min="0" value={formData.stock_total}
                    onChange={(e) => setFormData({ ...formData, stock_total: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Available Stock</Label>
                  <Input type="number" min="0" max={formData.stock_total} value={formData.stock_available}
                    onChange={(e) => setFormData({ ...formData, stock_available: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <h4 className="font-semibold text-sm">Variant Photo</h4>
              {formData.image_url ? (
                <div className="space-y-2">
                  <div className="border rounded-lg overflow-hidden bg-gray-50 p-2">
                    <img src={formData.image_url} alt="Variant" className="w-full h-40 object-cover rounded" />
                  </div>
                  <Button onClick={() => setFormData({ ...formData, image_url: "" })}
                    variant="outline" size="sm" className="w-full text-red-600">
                    <X className="w-3 h-3 mr-2" /> Remove Photo
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition">
                  <input type="file" accept="image/*" onChange={handleImageUpload}
                    disabled={uploading} className="hidden" id="var_image" />
                  <label htmlFor="var_image" className="block cursor-pointer">
                    <Image className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {uploading ? "Processing..." : "Click to upload variant photo"}
                    </p>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end border-t pt-4">
            <Button variant="outline" onClick={() => setEditingIdx(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveVariant} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? "Saving..." : editingIdx === -1 ? "Add Variant" : "Update Variant"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
