"use client"

import { ProductEditorModal } from "@/components/inventory/product-editor-modal"

const COLOR = "#a855f7" // warehouse portal accent, converted below to HSL for shadcn's CSS vars
const PORTAL_PRIMARY_HSL = "271 91% 65%"

interface Product {
  id?: string
  name: string
  description: string
  brand?: string
  size?: string
  color?: string
  material?: string
  price: number
  regular_price: number
  rental_price: number
  cost_price: number
  security_deposit: number
  stock_total: number
  stock_available: number
  reorder_level: number
  category_id?: string
  subcategory_id?: string
  image_url?: string
  barcode?: string
  franchise_id?: string
}

/**
 * Same product editor used by the main dashboard (pricing, photos, variants,
 * barcode designer, Safawala AI — all reused verbatim, not reimplemented) —
 * re-skinned as a warehouse-purple bottom sheet instead of a centered desktop
 * dialog, via `contentClassName`/`contentStyle` passthroughs on the shared
 * component. No logic here, just presentation.
 */
export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  onSave,
  franchiseId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSave: (data: any) => Promise<void>
  franchiseId?: string
}) {
  return (
    <ProductEditorModal
      open={open}
      onOpenChange={onOpenChange}
      product={product}
      onSave={onSave}
      franchiseId={franchiseId}
      contentStyle={{ "--primary": PORTAL_PRIMARY_HSL } as React.CSSProperties}
      contentClassName="
        max-w-full sm:max-w-3xl w-full
        left-0 right-0 top-auto bottom-0 translate-x-0 translate-y-0
        sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%]
        rounded-t-[28px] sm:rounded-lg
        max-h-[92vh]
        border-t-4 border-t-[#a855f7] sm:border-t
        data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom
        sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:slide-out-to-top-[48%]
      "
    />
  )
}
