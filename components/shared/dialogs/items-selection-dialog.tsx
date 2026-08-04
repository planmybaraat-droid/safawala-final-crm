"use client"

/**
 * ItemsSelectionDialog - Two Column Layout
 * Left: Scrollable product grid
 * Right: Fixed product summary
 */

import { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Package,
  Search,
  Filter,
  Plus,
} from 'lucide-react'
import type {
  Product,
  PackageSet,
  Category,
  Subcategory,
  ProductSelectionContext,
  SelectedItem,
} from '../types/items'
import { useProductFilter, useAvailabilityCheck } from '../hooks/useItems'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { InventoryAvailabilityPopup } from '@/components/bookings/inventory-availability-popup'

interface ItemsSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'product' | 'package'
  items: (Product | PackageSet)[]
  categories?: Category[]
  subcategories?: Subcategory[]
  context: ProductSelectionContext
  selectedItems?: SelectedItem[]
  title?: string
  description?: string
  mode?: 'select' | 'edit' // 'select' for initial selection, 'edit' for editing existing
  onBarcodeSearch?: (barcode: string) => void
  buttonText?: string // Custom button text instead of "Add to Cart"
}

export function ItemsSelectionDialog({
  open,
  onOpenChange,
  type,
  items,
  categories = [],
  subcategories = [],
  context,
  selectedItems = [],
  title,
  description,
  mode = 'select',
  onBarcodeSearch,
  buttonText = 'Add to Cart',
}: ItemsSelectionDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [availabilityModalItem, setAvailabilityModalItem] = useState<string | null>(null)

  const {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    inStockOnly,
    setInStockOnly,
    filteredItems,
  } = useProductFilter(items)

  const {
    loading: availabilityLoading,
    data: availabilityData,
    checkSingleProduct,
  } = useAvailabilityCheck()

  const getSelectedQuantity = (itemId: string) => {
    return selectedItems.find(si =>
      'product_id' in si ? si.product_id === itemId : si.package_id === itemId
    )?.quantity || 0
  }

  const updateQuantity = (itemId: string, qty: number) => {
    // Call the parent's onQuantityChange if available
    if (qty <= 0) {
      handleRemoveItem(itemId)
    } else if (context.onQuantityChange) {
      context.onQuantityChange(itemId, qty)
    }
  }

  const handleSelectItem = (item: Product | PackageSet) => {
    context.onItemSelect?.(item)
  }

  const handleRemoveItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (item) {
      context.onItemSelect?.(item)
    }
  }

  const renderProductCard = (product: Product) => {
    const selectedQty = getSelectedQuantity(product.id)
    const availableStock = product.stock_available || 0
    const isOutOfStock = availableStock === 0
    const isInCart = selectedQty > 0

    return (
      <div className={cn(
        "border rounded-lg overflow-hidden hover:shadow-md transition-all bg-white",
        isOutOfStock && "opacity-60 bg-gray-50"
      )} key={product.id}>
        <div className="relative aspect-square">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Package className="h-8 w-8 text-gray-300" />
            </div>
          )}
          
          <Badge
            className={cn(
              "absolute top-1 right-1 text-[10px] px-1.5 py-0",
              availableStock > 10 ? "bg-green-500 text-white" :
              availableStock > 0 ? "bg-yellow-500 text-white" :
              "bg-red-500 text-white"
            )}
          >
            {availableStock} left
          </Badge>
          
          {isInCart && (
            <Badge className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0">
              {selectedQty} in cart
            </Badge>
          )}
        </div>

        <div className="p-2 space-y-1.5">
          <h4 className="font-semibold text-xs line-clamp-2 min-h-[2rem]">
            {product.name}
          </h4>
          
          {(product.barcode || product.product_code) && (
            <p className="text-[10px] text-gray-500">
              {product.barcode || product.product_code}
            </p>
          )}

          <div className="font-bold text-sm text-green-700">
            {formatCurrency(
              context.bookingType === 'rental' 
                ? (product.rental_price ?? 0)
                : (product.sale_price ?? 0)
            )}
          </div>

          {context.eventDate && (
            <InventoryAvailabilityPopup
              productId={product.id}
              eventDate={new Date(context.eventDate)}
              deliveryDate={context.deliveryDate ? new Date(context.deliveryDate) : undefined}
              returnDate={context.returnDate ? new Date(context.returnDate) : undefined}
            >
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-[11px] border-blue-200 hover:bg-blue-50"
              >
                <Search className="h-3.5 w-3.5 mr-1.5" />
                Check Availability
              </Button>
            </InventoryAvailabilityPopup>
          )}

          {!isInCart ? (
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => handleSelectItem(product)}
              disabled={isOutOfStock}
            >
              <Plus className="h-3 w-3 mr-1" />
              {buttonText}
            </Button>
          ) : (
            <div className="flex items-center gap-1 bg-blue-50 rounded p-1.5">
              <Button
                size="icon"
                variant="outline"
                className="h-6 w-6"
                onClick={() => updateQuantity(product.id, selectedQty - 1)}
              >
                <Plus className="h-3 w-3 rotate-45" />
              </Button>
              <span className="flex-1 text-center text-sm font-bold text-blue-700 px-1">{selectedQty}</span>
              <Button
                size="icon"
                variant="outline"
                className="h-6 w-6"
                onClick={() => updateQuantity(product.id, selectedQty + 1)}
                disabled={selectedQty >= availableStock}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderPackageCard = (pkg: PackageSet) => {
    const selectedQty = getSelectedQuantity(pkg.id)

    return (
      <div key={pkg.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold">{pkg.name}</h4>
            {pkg.category && (
              <Badge variant="outline" className="mt-1">{pkg.category}</Badge>
            )}
          </div>
          {selectedQty > 0 && (
            <Badge className="bg-blue-100 text-blue-800">{selectedQty} selected</Badge>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          {pkg.description}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="font-bold text-green-700">{formatCurrency(pkg.base_price)}</div>
          <Button size="sm" onClick={() => handleSelectItem(pkg)}>
            <Plus className="h-3 w-3 mr-1" />
            Select Package
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[95vh] max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {title || `Select ${type === 'product' ? 'Products' : 'Packages'}`}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Two Column Layout */}
        <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">
          {/* LEFT SIDE - Product Selection (Scrollable) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 border-r scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            <div className="px-6 py-4 space-y-4">
              {/* Filters Section - Sticky */}
              <div className="space-y-3 sticky top-0 bg-white z-10 pb-4 border-b">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={`Search ${type}s...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {categories.length > 0 && (
                    <Select value={selectedCategory || 'all'} onValueChange={(v) => {
                      setSelectedCategory(v === 'all' ? '' : v)
                      if (v === 'all' || v !== selectedCategory) {
                        setSelectedSubcategory('')
                      }
                    }}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {type === 'product' && selectedCategory && subcategories.filter(sub => sub.parent_id === selectedCategory).length > 0 && (
                    <Select value={selectedSubcategory || 'all'} onValueChange={(v) => setSelectedSubcategory(v === 'all' ? '' : v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Subcategories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subcategories</SelectItem>
                        {subcategories
                          .filter(sub => sub.parent_id === selectedCategory)
                          .map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Button
                    size="sm"
                    variant={inStockOnly ? 'default' : 'outline'}
                    onClick={() => setInStockOnly(!inStockOnly)}
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    In Stock Only
                  </Button>
                </div>
              </div>

              {/* Products Grid */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No {type}s found</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 auto-rows-fr">
                  {filteredItems.map((item) =>
                    type === 'product'
                      ? renderProductCard(item as Product)
                      : renderPackageCard(item as PackageSet)
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE - Product Summary (Fixed) */}
          <div className="w-96 flex-shrink-0 border-l bg-gradient-to-b from-blue-50 to-white flex flex-col overflow-hidden">
            {/* Summary Header */}
            <div className="px-4 py-4 border-b bg-white flex-shrink-0">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Selected Summary ({selectedItems.length})
              </h3>
            </div>

            {/* Summary Content - Scrollable */}
            {selectedItems.length > 0 ? (
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50 hover:scrollbar-thumb-blue-400">
                {selectedItems.map((selectedItem) => {
                  const itemName = 'package_id' in selectedItem 
                    ? selectedItem.package?.name 
                    : selectedItem.product?.name
                  const itemCode = 'package_id' in selectedItem 
                    ? selectedItem.package?.id
                    : (selectedItem as any).product?.barcode || (selectedItem as any).product?.product_code
                  const quantity = selectedItem.quantity || 1
                  const price = 'package_id' in selectedItem 
                    ? (selectedItem.package?.base_price ?? 0)
                    : ((selectedItem as any).product?.rental_price ?? 0)
                  const totalPrice = (price || 0) * quantity

                  return (
                    <div key={selectedItem.id} className="bg-white border border-blue-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs truncate">{itemName}</p>
                          {itemCode && (
                            <p className="text-[10px] text-gray-600 truncate">{itemCode}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 text-red-600 hover:bg-red-50 flex-shrink-0 p-0"
                          onClick={() => {
                            handleRemoveItem('package_id' in selectedItem ? selectedItem.package_id! : (selectedItem as any).product_id!)
                          }}
                        >
                          <Plus className="h-2.5 w-2.5 rotate-45" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Price:</span>
                          <span>{formatCurrency(price)}</span>
                        </div>
                        
                        {/* Quantity Adjuster */}
                        <div className="flex items-center justify-between bg-gray-50 rounded p-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => {
                              const newQty = Math.max(1, quantity - 1)
                              updateQuantity(
                                'package_id' in selectedItem ? selectedItem.package_id! : (selectedItem as any).product_id!,
                                newQty
                              )
                            }}
                          >
                            <Plus className="h-2.5 w-2.5 rotate-45" />
                          </Button>
                          <span className="font-semibold text-blue-700 px-2">Qty: {quantity}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            onClick={() => {
                              const newQty = quantity + 1
                              updateQuantity(
                                'package_id' in selectedItem ? selectedItem.package_id! : (selectedItem as any).product_id!,
                                newQty
                              )
                            }}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                        
                        <div className="border-t pt-1 flex items-center justify-between font-semibold text-green-700">
                          <span>Total:</span>
                          <span>{formatCurrency(totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <p className="text-sm">No products selected</p>
              </div>
            )}

            {/* Summary Footer - Grand Total */}
            {selectedItems.length > 0 && (
              <div className="px-4 py-4 border-t bg-white flex-shrink-0">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Grand Total:</span>
                    <span className="font-bold text-lg text-green-700">
                      {formatCurrency(
                        selectedItems.reduce((sum, item) => {
                          const price = 'package_id' in item 
                            ? (item.package?.base_price ?? 0)
                            : ((item as any).product?.rental_price ?? 0)
                          return sum + ((price || 0) * (item.quantity || 1))
                        }, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="px-6 py-4 border-t bg-white flex-shrink-0 space-y-3">
          <div className="text-sm text-gray-600">
            Showing {filteredItems.length} of {items.length} {type}s
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button 
              onClick={() => onOpenChange(false)}
              disabled={selectedItems.length === 0}
              className={mode === 'edit' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {mode === 'edit' ? (
                <>💾 Save Changes ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'})</>
              ) : (
                <>✓ Finish Selection ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'})</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
