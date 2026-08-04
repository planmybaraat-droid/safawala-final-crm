"use client"

/**
 * ItemsDisplayDialog
 * 
 * A reusable dialog component to display selected items (products or packages)
 * with capabilities to:
 * - View all selected items with details
 * - Edit quantities inline
 * - Remove items
 * - Add more items
 * - Show pricing breakdown
 * - Display availability warnings
 * 
 * Usage:
 * <ItemsDisplayDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   items={selectedItems}
 *   context={{
 *     bookingType: 'rental',
 *     eventDate: '2025-10-23',
 *     isEditable: true,
 *     showPricing: true
 *   }}
 *   onQuantityChange={(id, qty) => updateQuantity(id, qty)}
 *   onRemoveItem={(id) => removeItem(id)}
 *   onAddItems={() => openSelectionDialog()}
 * />
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Package, 
  Plus, 
  Minus, 
  X, 
  AlertTriangle, 
  CheckCircle,
  ShoppingCart,
  Edit,
  Trash2
} from 'lucide-react'
import type { 
  SelectedItem, 
  SelectedProductItem, 
  SelectedPackageItem,
  ItemsDisplayContext 
} from '../types/items'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ItemsDisplayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: SelectedItem[]
  context: ItemsDisplayContext
  // Callbacks
  onQuantityChange?: (itemId: string, quantity: number) => void
  onRemoveItem?: (itemId: string) => void
  onAddItems?: () => void
  onItemEdit?: (itemId: string) => void
  onEditProducts?: () => void
  // Display options
  title?: string
  description?: string
  showSummary?: boolean
  summaryData?: {
    subtotal?: number
    discount?: number
    gst?: number
    total?: number
    securityDeposit?: number
  }
}

export function ItemsDisplayDialog({
  open,
  onOpenChange,
  items,
  context,
  onQuantityChange,
  onRemoveItem,
  onAddItems,
  onItemEdit,
  onEditProducts,
  title = 'Selected Items',
  description,
  showSummary = true,
  summaryData,
}: ItemsDisplayDialogProps) {
  const isEditable = context.isEditable ?? true
  const showPricing = context.showPricing ?? true

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = items.find(i => i.id === itemId)
    if (item && onQuantityChange) {
      onQuantityChange(itemId, item.quantity + delta)
    }
  }

  const renderProductItem = (item: SelectedProductItem) => (
    <div className="p-4 border border-gray-200 rounded-xl space-y-3 hover:shadow-md transition-all bg-white">
      <div className="flex items-start gap-4">
        {/* Product Image - Enhanced */}
        <div className="relative flex-shrink-0">
          {item.product.image_url ? (
            <img 
              src={item.product.image_url} 
              alt={item.product.name}
              className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
              <Package className="h-10 w-10 text-gray-400" />
            </div>
          )}
          {item.product.stock_available !== undefined && item.product.stock_available > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
              {item.product.stock_available} in stock
            </Badge>
          )}
        </div>

        {/* Product Info - Enhanced */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-bold text-base text-gray-900 truncate">
                {item.product.name}
              </h4>
              {(item.product.barcode || item.product.product_code) && (
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  Barcode: {item.product.barcode || item.product.product_code}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {item.product.category && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    📁 {item.product.category}
                  </Badge>
                )}
                {item.variant_name && (
                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                    ◆ {item.variant_name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Remove Button */}
            {isEditable && onRemoveItem && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                onClick={() => onRemoveItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Stock Warning */}
          {item.product.stock_available !== undefined && 
           item.quantity > item.product.stock_available && (
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Exceeds stock ({item.product.stock_available} available)</span>
            </div>
          )}
        </div>
      </div>

      {/* Quantity and Price Controls - Enhanced */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        {isEditable && onQuantityChange ? (
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-white"
              onClick={() => handleQuantityChange(item.id, -1)}
              disabled={item.quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={item.quantity}
              onChange={(e) => onQuantityChange?.(item.id, parseInt(e.target.value) || 1)}
              className="w-14 h-7 text-center text-sm border-0 bg-white font-semibold"
              min={1}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-white"
              onClick={() => handleQuantityChange(item.id, 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="text-sm">
            Qty: <span className="font-bold text-base">{item.quantity}</span>
          </div>
        )}

        {showPricing && (
          <div className="text-right">
            <div className="text-xs text-gray-500">
              {formatCurrency(item.unit_price)} × {item.quantity}
            </div>
            <div className="font-bold text-base text-blue-600">
              {formatCurrency(item.total_price)}
            </div>
          </div>
        )}
      </div>

      {/* Edit Button */}
      {onItemEdit && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs hover:bg-blue-50"
          onClick={() => onItemEdit(item.id)}
        >
          <Edit className="h-3.5 w-3.5 mr-1.5" />
          Edit Product
        </Button>
      )}
    </div>
  )

  const renderPackageItem = (item: SelectedPackageItem) => {
    // Parse inclusions
    const inclusions: string[] = Array.isArray(item.variant.inclusions)
      ? item.variant.inclusions
      : typeof item.variant.inclusions === 'string'
        ? item.variant.inclusions.split(',').map(s => s.trim()).filter(Boolean)
        : []

    return (
      <div className="p-4 border border-green-200 rounded-xl space-y-3 hover:shadow-md transition-all bg-gradient-to-br from-white to-green-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            {/* Package Category Badge */}
            {item.package.category && (
              <Badge className="bg-green-100 text-green-800 border-green-300 font-semibold">
                📦 {item.package.category}
              </Badge>
            )}

            {/* Package Name */}
            <h4 className="font-bold text-lg text-gray-900">
              {item.package.name}
            </h4>

            {/* Variant Info */}
            {item.variant && (
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs text-blue-700 bg-blue-50 border-blue-300 font-semibold">
                  ◆ {item.variant.variant_name || item.variant.name}
                  {item.variant.size && ` - ${item.variant.size}`}
                </Badge>

                {/* Inclusions - Enhanced */}
                {inclusions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {inclusions.map((inc, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1.5 bg-white border border-green-200 text-green-700 rounded-lg font-medium"
                      >
                        ✓ {inc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Extra Safas */}
            {item.extra_safas && item.extra_safas > 0 && (
              <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg font-semibold">
                🎉 Extra Safas: {item.extra_safas}
              </div>
            )}

            {/* Products Pending Warning */}
            {item.products_pending && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">Products selection pending</span>
              </div>
            )}
          </div>

          {/* Remove Button */}
          {isEditable && onRemoveItem && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
              onClick={() => onRemoveItem(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Quantity and Price Controls - Enhanced */}
        <div className="flex items-center justify-between pt-2 border-t border-green-200">
          {isEditable && onQuantityChange ? (
            <div className="flex items-center gap-1 bg-green-100 rounded-lg p-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:bg-white"
                onClick={() => handleQuantityChange(item.id, -1)}
                disabled={item.quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => onQuantityChange?.(item.id, parseInt(e.target.value) || 1)}
                className="w-14 h-7 text-center text-sm border-0 bg-white font-semibold"
                min={1}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:bg-white"
                onClick={() => handleQuantityChange(item.id, 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="text-sm">
              Qty: <span className="font-bold text-base">{item.quantity}</span>
            </div>
          )}

          {showPricing && (
            <div className="text-right">
              <div className="text-xs text-gray-500">
                {formatCurrency(item.unit_price)} × {item.quantity}
              </div>
              <div className="font-bold text-base text-green-600">
                {formatCurrency(item.total_price)}
              </div>
            </div>
          )}
        </div>

        {/* Security Deposit */}
        {item.security_deposit && item.security_deposit > 0 && (
          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg font-semibold">
            🔐 Security Deposit: {formatCurrency(item.security_deposit)} per item
          </div>
        )}

        {/* Distance Addon */}
        {item.distance_addon && item.distance_addon > 0 && (
          <div className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-3 py-2 rounded-lg font-semibold">
            📍 Distance Addon: {formatCurrency(item.distance_addon)}
          </div>
        )}

        {/* Edit Button */}
        {onItemEdit && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs hover:bg-green-50"
            onClick={() => onItemEdit(item.id)}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit Package
          </Button>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between w-full">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
                {title}
                <Badge className="ml-2 bg-blue-100 text-blue-800">
                  {items.length} {items.length === 1 ? 'Item' : 'Items'}
                </Badge>
              </DialogTitle>
              {description && (
                <DialogDescription className="mt-2 text-sm">
                  {description}
                </DialogDescription>
              )}
            </div>
            
            {/* Add Items Button */}
            {isEditable && onAddItems && (
              <Button
                onClick={onAddItems}
                className="shrink-0 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Items
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Items List */}
        <ScrollArea className="flex-1">
          {items.length === 0 ? (
            <div className="text-center py-16 px-6 text-gray-500">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-1">No items added yet</p>
              <p className="text-sm text-gray-400 mb-6">Start by adding items to your booking</p>
              {onAddItems && (
                <Button
                  onClick={onAddItems}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Items
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-6">
              {items.map((item) => (
                <div key={item.id}>
                  {'product' in item 
                    ? renderProductItem(item as SelectedProductItem)
                    : renderPackageItem(item as SelectedPackageItem)
                  }
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Summary Section */}
        {showSummary && summaryData && items.length > 0 && (
          <>
            <Separator />
            <div className="p-6 space-y-3 text-sm bg-gray-50">
              {summaryData.subtotal !== undefined && (
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Subtotal</span>
                  <span>{formatCurrency(summaryData.subtotal)}</span>
                </div>
              )}
              
              {summaryData.discount !== undefined && summaryData.discount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Discount</span>
                  <span>-{formatCurrency(summaryData.discount)}</span>
                </div>
              )}
              
              {summaryData.gst !== undefined && (
                <div className="flex justify-between text-gray-600">
                  <span>GST (5%)</span>
                  <span>{formatCurrency(summaryData.gst)}</span>
                </div>
              )}
              
              {summaryData.securityDeposit !== undefined && summaryData.securityDeposit > 0 && (
                <div className="flex justify-between text-amber-600 font-semibold">
                  <span>🔐 Security Deposit</span>
                  <span>{formatCurrency(summaryData.securityDeposit)}</span>
                </div>
              )}
              
              {summaryData.total !== undefined && (
                <>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-lg bg-white p-3 rounded-lg border-2 border-blue-200">
                    <span>💰 Total Amount</span>
                    <span className="text-blue-600">{formatCurrency(summaryData.total)}</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t px-6 pb-6">
          <div className="text-sm text-gray-500">
            {items.length} item(s) selected
          </div>
          <div className="flex items-center gap-2">
            {onEditProducts && (
              <Button 
                onClick={onEditProducts}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Products
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="min-w-24"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
