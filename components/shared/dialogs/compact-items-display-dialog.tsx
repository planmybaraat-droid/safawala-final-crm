"use client"

/**
 * Compact Items Display Dialog
 * Shows selected items in a clean, compact format with minimal spacing
 * Features: Product images with hover preview, scrollbar, pricing
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit3, Plus, Package } from 'lucide-react'
import type { SelectedItem } from '../types/items'
import { formatCurrency } from '@/lib/utils'

interface CompactItemsDisplayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: SelectedItem[]
  title?: string
  onEditProducts?: () => void
  onRemoveItem?: (itemId: string) => void
  showPricing?: boolean
}

export function CompactItemsDisplayDialog({
  open,
  onOpenChange,
  items,
  title = "Selected Items",
  onEditProducts,
  onRemoveItem,
  showPricing = true,
}: CompactItemsDisplayDialogProps) {
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)
  const [imagePreviewPos, setImagePreviewPos] = useState({ x: 0, y: 0 })
  
  const totalPrice = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {items.length} item{items.length !== 1 ? 's' : ''} selected • {totalQty} pcs
              </DialogDescription>
            </div>
            <Badge className="bg-blue-100 text-blue-800 text-sm font-bold">
              {items.length}
            </Badge>
          </div>
        </DialogHeader>

        {/* Items List with Visible Scrollbar */}
        <div className="h-max max-h-[450px] border rounded-lg overflow-y-scroll">
          {items.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No items selected</p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {items.map((item) => {
              const productName = 'product' in item && item.product?.name 
                ? item.product.name
                : 'package' in item && item.package?.name 
                  ? item.package.name
                  : 'Unknown Item'

              const productImage = 'product' in item && item.product?.image_url
                ? item.product.image_url
                : null

              const handleImageHover = (e: React.MouseEvent, itemId: string) => {
                setHoveredImageId(itemId)
                const rect = e.currentTarget.getBoundingClientRect()
                setImagePreviewPos({
                  x: rect.left + rect.width + 15,
                  y: rect.top - 50,
                })
              }

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors relative"
                >
                  {/* Product Image Thumbnail - Increased to 1.7x */}
                  <div className="relative flex-shrink-0">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={productName}
                        className="h-16 w-16 object-cover rounded border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition-colors shadow-sm"
                        onMouseEnter={(e) => handleImageHover(e, item.id)}
                        onMouseLeave={() => setHoveredImageId(null)}
                      />
                    ) : (
                      <div className="h-16 w-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded border-2 border-gray-300 flex items-center justify-center shadow-sm">
                        <Package className="h-8 w-8 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Item Name and Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {productName}
                    </p>
                    <p className="text-xs text-gray-600">
                      Qty: <span className="font-bold">{item.quantity}</span>
                      {showPricing && (
                        <>
                          {' '} • {formatCurrency(item.unit_price)} ea
                        </>
                      )}
                    </p>
                  </div>

                  {/* Price and Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {showPricing && (
                      <div className="text-right mr-2">
                        <p className="text-sm font-bold text-blue-600">
                          {formatCurrency(item.total_price)}
                        </p>
                      </div>
                    )}
                    {onRemoveItem && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveItem(item.id)
                        }}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Image Preview Popup on Hover - Larger 1.7x */}
                  {hoveredImageId === item.id && productImage && (
                    <div
                      className="fixed z-50 bg-white border-3 border-blue-500 rounded-lg shadow-2xl p-2 pointer-events-none"
                      style={{
                        left: `${imagePreviewPos.x}px`,
                        top: `${imagePreviewPos.y}px`,
                        width: '220px',
                        height: '220px',
                      }}
                    >
                      <img
                        src={productImage}
                        alt={productName}
                        className="w-full h-full object-cover rounded"
                      />
                      <div className="absolute -top-7 left-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded shadow-lg whitespace-nowrap truncate max-w-xs">
                        {productName}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            </div>
          )}
        </div>

        {/* Summary */}
        {showPricing && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 space-y-1 border border-blue-200 mt-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-700">Subtotal</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-blue-200">
              <span className="font-bold text-sm text-gray-900">Total</span>
              <span className="font-bold text-lg text-blue-600">{formatCurrency(totalPrice)}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3">
          {onEditProducts && (
            <Button
              onClick={onEditProducts}
              variant="outline"
              className="flex-1 h-10 text-sm font-semibold border-2"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add More
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            variant="default"
            className="flex-1 h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700"
          >
            UPDATE PRODUCTS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
