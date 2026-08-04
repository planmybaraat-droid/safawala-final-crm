/**
 * Example Usage: Reusable Item Dialog Components
 * 
 * This file demonstrates how to use ItemsDisplayDialog and ItemsSelectionDialog
 * in various scenarios across your application.
 */

"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ItemsDisplayDialog } from '@/components/shared/dialogs/items-display-dialog'
import { ItemsSelectionDialog } from '@/components/shared/dialogs/items-selection-dialog'
import { useItemSelection, useOrderCalculations } from '@/components/shared/hooks/useItems'
import type { Product, SelectedProductItem } from '@/components/shared/types/items'
import { toast } from '@/hooks/use-toast'

export default function ExampleUsage() {
  // State management using custom hooks
  const {
    items: selectedItems,
    addItem,
    removeItem,
    updateQuantity,
    totalAmount,
  } = useItemSelection<SelectedProductItem>()

  const [showDisplayDialog, setShowDisplayDialog] = useState(false)
  const [showSelectionDialog, setShowSelectionDialog] = useState(false)

  // Mock data for demonstration
  const [products] = useState<Product[]>([
    {
      id: '1',
      name: 'Premium Wedding Sherwani',
      category: 'Groom Wear',
      product_code: 'SHW-001',
      rental_price: 5000,
      sale_price: 25000,
      security_deposit: 2000,
      stock_available: 5,
      stock_total: 10,
      image_url: '/images/sherwani.jpg'
    },
    {
      id: '2',
      name: 'Designer Lehenga',
      category: 'Bride Wear',
      product_code: 'LEH-002',
      rental_price: 8000,
      sale_price: 40000,
      security_deposit: 3000,
      stock_available: 3,
      stock_total: 8,
      image_url: '/images/lehenga.jpg'
    },
  ])

  const [categories] = useState([
    { id: 'cat1', name: 'Groom Wear' },
    { id: 'cat2', name: 'Bride Wear' },
    { id: 'cat3', name: 'Accessories' },
  ])

  // Calculate order totals
  const calculations = useOrderCalculations(selectedItems, {
    discountType: 'flat',
    discountAmount: 500,
    gstRate: 0.05,
  })

  // Handle product selection from selection dialog
  const handleProductSelect = (item: Product | any) => {
    // Type guard to ensure it's a product
    if (!('rental_price' in item)) return
    
    const product = item as Product
    const newItem: SelectedProductItem = {
      id: `item-${Date.now()}`,
      product_id: product.id,
      product,
      quantity: 1,
      unit_price: product.rental_price, // or sale_price based on booking type
      total_price: product.rental_price,
    }
    
    addItem(newItem)
    toast({
      title: 'Product Added',
      description: `${product.name} has been added to your cart`,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reusable Dialog Components Demo
          </h1>
          <p className="text-gray-600">
            Click the buttons below to see the dialogs in action
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={() => setShowSelectionDialog(true)}>
            Open Selection Dialog
          </Button>
          <Button onClick={() => setShowDisplayDialog(true)} disabled={selectedItems.length === 0}>
            View Selected Items ({selectedItems.length})
          </Button>
        </div>

        {/* Current Selection Summary */}
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold">Current Selection</h2>
            <div className="space-y-2">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.product.name}</span>
                  <span className="text-gray-600">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₹{calculations.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <span className="text-green-600">-₹{calculations.discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (5%):</span>
                <span>₹{calculations.gst.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total:</span>
                <span>₹{calculations.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Items Selection Dialog */}
        <ItemsSelectionDialog
          open={showSelectionDialog}
          onOpenChange={setShowSelectionDialog}
          type="product"
          items={products}
          categories={categories}
          context={{
            bookingType: 'rental',
            eventDate: '2025-10-25',
            onItemSelect: handleProductSelect,
          }}
          selectedItems={selectedItems}
          title="Select Products for Booking"
          description="Choose products from our inventory"
        />

        {/* Items Display Dialog */}
        <ItemsDisplayDialog
          open={showDisplayDialog}
          onOpenChange={setShowDisplayDialog}
          items={selectedItems}
          context={{
            bookingType: 'rental',
            eventDate: '2025-10-25',
            isEditable: true,
            showPricing: true,
          }}
          onQuantityChange={updateQuantity}
          onRemoveItem={removeItem}
          onAddItems={() => setShowSelectionDialog(true)}
          title="Your Cart"
          description="Review and modify your selected items"
          showSummary={true}
          summaryData={{
            subtotal: calculations.subtotal,
            discount: calculations.discount,
            gst: calculations.gst,
            total: calculations.total,
            securityDeposit: calculations.securityDeposit,
          }}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Additional Example: Integration with Existing Booking Flow
// ============================================================================

export function BookingFlowExample() {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    totalAmount,
  } = useItemSelection<SelectedProductItem>()

  const [step, setStep] = useState<'customer' | 'items' | 'review'>('customer')
  const [showItemSelection, setShowItemSelection] = useState(false)

  return (
    <div className="space-y-6">
      {/* Step 1: Customer Selection */}
      {step === 'customer' && (
        <div>
          <h2>Step 1: Select Customer</h2>
          <Button onClick={() => setStep('items')}>Next</Button>
        </div>
      )}

      {/* Step 2: Items Selection */}
      {step === 'items' && (
        <div className="space-y-4">
          <h2>Step 2: Select Items</h2>
          <Button onClick={() => setShowItemSelection(true)}>
            Add Products ({items.length})
          </Button>
          
          {items.length > 0 && (
            <div className="text-sm text-gray-600">
              Total: ₹{totalAmount.toLocaleString()}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('customer')}>
              Back
            </Button>
            <Button onClick={() => setStep('review')} disabled={items.length === 0}>
              Review Order
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <div>
          <h2>Step 3: Review & Confirm</h2>
          <ItemsDisplayDialog
            open={true}
            onOpenChange={() => {}}
            items={items}
            context={{
              bookingType: 'rental',
              isEditable: false,
              showPricing: true,
            }}
            showSummary={true}
          />
        </div>
      )}

      {/* Item Selection Dialog */}
      <ItemsSelectionDialog
        open={showItemSelection}
        onOpenChange={setShowItemSelection}
        type="product"
        items={[]} // Load from your data source
        context={{
          bookingType: 'rental',
          onItemSelect: (product) => {
            // Add item logic
            setShowItemSelection(false)
          },
        }}
      />
    </div>
  )
}

// ============================================================================
// Example: Quick Add with Barcode Scanner
// ============================================================================

export function BarcodeQuickAddExample() {
  const { items, addItem } = useItemSelection<SelectedProductItem>()
  const [barcode, setBarcode] = useState('')

  const handleBarcodeSearch = async (code: string) => {
    // Fetch product by barcode
    // const product = await fetchProductByBarcode(code)
    // if (product) {
    //   addItem({
    //     id: `item-${Date.now()}`,
    //     product_id: product.id,
    //     product,
    //     quantity: 1,
    //     unit_price: product.rental_price,
    //     total_price: product.rental_price,
    //   })
    // }
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Scan barcode..."
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleBarcodeSearch(barcode)
              setBarcode('')
            }
          }}
          className="border rounded px-3 py-2"
        />
      </div>
      
      <div className="text-sm text-gray-600">
        Items scanned: {items.length}
      </div>
    </div>
  )
}
