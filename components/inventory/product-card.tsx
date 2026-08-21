"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ImageIcon, MoreHorizontal, Edit, Trash2, Barcode, Copy, Tag } from "lucide-react"
import { toast } from "sonner"
import { OptimizedImage } from "@/components/ui/optimized-image"

interface Product {
  id: string
  name: string
  brand?: string
  price: number
  rental_price: number
  stock_available: number
  stock_total: number
  reorder_level: number
  image_url?: string
  barcode?: string
  is_custom?: boolean
  category_name?: string
  _variation_count?: number
}

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (productId: string, productName: string) => void
  onGenerateBarcode: (product: Product) => void
}

export function ProductCard({ product, onEdit, onDelete, onGenerateBarcode }: ProductCardProps) {
  const isLowStock = product.stock_available <= product.reorder_level && product.stock_available > 0
  const isOutOfStock = product.stock_available <= 0

  const getStockColor = () => {
    if (isOutOfStock) return "bg-red-50 border-red-200 text-red-700"
    if (isLowStock) return "bg-amber-50 border-amber-200 text-amber-700"
    return "bg-green-50 border-green-200 text-green-700"
  }

  const getStockLabel = () => {
    if (isOutOfStock) return "Out of Stock"
    if (isLowStock) return "Low Stock"
    return "In Stock"
  }

  const getStockDot = () => {
    if (isOutOfStock) return "bg-red-500"
    if (isLowStock) return "bg-amber-500"
    return "bg-green-500"
  }

  const copyBarcodeToClipboard = () => {
    if (product.barcode) {
      navigator.clipboard.writeText(product.barcode)
      toast.success("Barcode copied to clipboard")
    }
  }

  return (
    <Card className="group overflow-hidden flex flex-col h-full rounded-2xl border border-[#e5ddf3] bg-white shadow-[0_10px_28px_rgba(30,20,70,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#c7b5ee] hover:shadow-[0_18px_38px_rgba(64,35,140,0.12)]">

      {/* Image */}
      <div className="relative w-full aspect-[1.08/1] bg-[#f8f6fb] overflow-hidden flex items-center justify-center">
        {product.image_url ? (
          <>
            <OptimizedImage
              src={product.image_url}
              alt={product.name}
              webpWidth={500}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
              onError={(e) => {
                const t = e.target as HTMLImageElement
                t.style.display = "none"
                const fallback = (t.closest("picture")?.nextElementSibling ?? t.nextElementSibling) as HTMLElement | null
                fallback?.style.setProperty("display", "flex")
              }}
            />
            <div className="hidden w-full h-full items-center justify-center">
              <ImageIcon className="w-8 h-8 text-slate-300" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-slate-300">
            <ImageIcon className="w-10 h-10" />
            <span className="text-[10px] uppercase tracking-wider text-slate-400">No Image</span>
          </div>
        )}

        {/* Stock dot */}
        <div className="absolute top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/85 shadow-[0_8px_18px_rgba(15,23,42,0.16)] backdrop-blur-md">
          <div className={`h-2.5 w-2.5 rounded-full ${getStockDot()} ring-2 ring-white`} />
        </div>

        {/* Category badge */}
        {product.category_name && (
          <div className="absolute top-3 right-3 max-w-[72%]">
            <Badge variant="outline" className="max-w-full rounded-full border-white/70 bg-white/92 px-2.5 py-1 text-[9px] font-semibold text-[#20133f] shadow-[0_8px_20px_rgba(15,23,42,0.14)] backdrop-blur-md">
              <Tag className="mr-1 h-2.5 w-2.5 shrink-0 text-[#6d28d9]" />
              {product.category_name}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-3.5">

        {/* Name + menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-[14px] font-semibold leading-tight tracking-[-0.01em] text-[#120d29]">
              {product.name}
            </h3>
            {product.brand && (
              <p className="mt-1 truncate text-[11px] font-medium text-[#7b7190]">{product.brand}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"
                className="h-8 w-8 rounded-full border border-[#eadff8] bg-[#fbf8ff] p-0 text-[#4c1d95] opacity-100 shadow-sm transition-all hover:bg-[#f1e9ff] hover:text-[#2e1065] md:opacity-0 md:group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit className="mr-2 h-3.5 w-3.5" />Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGenerateBarcode(product)}>
                <Barcode className="mr-2 h-3.5 w-3.5" />Print Barcode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyBarcodeToClipboard} disabled={!product.barcode}>
                <Copy className="mr-2 h-3.5 w-3.5" />Copy Barcode
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(product.id, product.name)} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stock status */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-[0_6px_16px_rgba(15,23,42,0.06)] ${getStockColor()}`}>
            {getStockLabel()}
          </Badge>
          <span className="whitespace-nowrap rounded-full bg-[#f8f5ff] px-2 py-1 text-[11px] font-semibold text-[#7b7190]">
            {product.stock_available}/{product.stock_total} units
          </span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          {product.is_custom && (
            <Badge variant="outline" className="text-[9px] bg-violet-50 border-violet-200 text-violet-700 px-1.5 py-0">
              Custom
            </Badge>
          )}
          {(product._variation_count ?? 0) > 0 && (
            <Badge variant="outline" className="text-[9px] bg-blue-50 border-blue-200 text-blue-700 px-1.5 py-0">
              {product._variation_count} variant{product._variation_count !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Pricing */}
        <div className="mt-auto space-y-2 rounded-xl border border-[#eee7fb] bg-[#fbf9ff] p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#8a809b]">Rental</span>
            <span className="text-sm font-bold text-[#120d29]">₹{product.rental_price.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#8a809b]">Sale</span>
            <span className="text-sm font-semibold text-[#3f3654]">₹{product.price.toLocaleString()}</span>
          </div>
        </div>

        {/* Barcode */}
        {product.barcode && (
          <div className="mt-0.5 flex items-center gap-1.5 rounded-xl bg-[#f6f2fb] px-2.5 py-1.5 text-[10px] text-[#6a607a]">
            <Barcode className="h-3 w-3 text-[#8b5cf6]" />
            <code className="truncate font-mono text-[9px] font-bold tracking-wide">{product.barcode}</code>
          </div>
        )}
      </div>
    </Card>
  )
}
