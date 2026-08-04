"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ImageIcon, MoreHorizontal, Edit, Trash2, Barcode, Copy, Tag } from "lucide-react"
import { toast } from "sonner"

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
    <Card className="group overflow-hidden flex flex-col h-full border-slate-200 bg-white hover:shadow-md transition-shadow duration-200 rounded-xl">

      {/* Image */}
      <div className="relative w-full aspect-square bg-slate-100 overflow-hidden flex items-center justify-center">
        {product.image_url ? (
          <>
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const t = e.target as HTMLImageElement
                t.style.display = "none"
                ;(t.nextElementSibling as HTMLElement)?.style.setProperty("display", "flex")
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
        <div className={`absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full ${getStockDot()} ring-2 ring-white shadow-sm`} />

        {/* Category badge */}
        {product.category_name && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="text-[9px] font-medium bg-white/90 border-slate-200 text-slate-600 shadow-sm px-1.5 py-0.5">
              <Tag className="w-2.5 h-2.5 mr-1" />
              {product.category_name}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1 gap-2">

        {/* Name + menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate text-slate-900">
              {product.name}
            </h3>
            {product.brand && (
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{product.brand}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 rounded-lg">
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
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
          <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 ${getStockColor()}`}>
            {getStockLabel()}
          </Badge>
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
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
        <div className="border-t border-slate-100 pt-2 mt-auto space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Rental</span>
            <span className="font-bold text-slate-900">₹{product.rental_price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Sale</span>
            <span className="font-semibold text-slate-600">₹{product.price.toLocaleString()}</span>
          </div>
        </div>

        {/* Barcode */}
        {product.barcode && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-md mt-1">
            <Barcode className="w-3 h-3 text-slate-400" />
            <code className="font-mono text-[9px] font-bold tracking-wide">{product.barcode}</code>
          </div>
        )}
      </div>
    </Card>
  )
}
