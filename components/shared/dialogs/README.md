# 🚀 Reusable Item Management Dialogs

> **World-class, production-ready dialog components for managing products and packages across your application.**

Built with the philosophy of Steve Jobs (simplicity), Bill Gates (scalability), and Elon Musk (innovation).

---

## 📦 Components Overview

### 1. **ItemsDisplayDialog** - The Cart Viewer
Display and manage selected items with full CRUD operations.

### 2. **ItemsSelectionDialog** - The Smart Selector
Browse, search, filter, and select items with real-time availability checking.

### 3. **Custom Hooks** - The Business Logic
Reusable hooks for item management, filtering, and calculations.

---

## 🎯 Features

### ItemsDisplayDialog
- ✅ View all selected items (products/packages)
- ✅ Inline quantity editing
- ✅ Remove items with confirmation
- ✅ Add more items button
- ✅ Pricing breakdown with GST
- ✅ Security deposit tracking
- ✅ Variant information display
- ✅ Stock availability warnings
- ✅ Image previews
- ✅ Responsive design

### ItemsSelectionDialog
- ✅ Grid and list view modes
- ✅ Real-time search
- ✅ Category/subcategory filtering
- ✅ Stock availability indicators
- ✅ In-stock filter toggle
- ✅ Availability checking
- ✅ Quick quantity selection
- ✅ Image previews
- ✅ Pricing display (rental/sale)
- ✅ Security deposit info
- ✅ Selected items tracking
- ✅ Barcode scanner ready

---

## 🚀 Quick Start

### Installation

1. Copy the components to your project:
```bash
components/
├── shared/
│   ├── dialogs/
│   │   ├── items-display-dialog.tsx
│   │   ├── items-selection-dialog.tsx
│   │   └── example-usage.tsx
│   ├── hooks/
│   │   └── useItems.ts
│   └── types/
│       └── items.ts
```

2. Install required dependencies (if not already installed):
```bash
npm install lucide-react date-fns
```

### Basic Usage

```tsx
import { ItemsDisplayDialog } from '@/components/shared/dialogs/items-display-dialog'
import { ItemsSelectionDialog } from '@/components/shared/dialogs/items-selection-dialog'
import { useItemSelection } from '@/components/shared/hooks/useItems'

function MyBookingPage() {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
  } = useItemSelection()

  const [showCart, setShowCart] = useState(false)
  const [showSelection, setShowSelection] = useState(false)

  return (
    <>
      <Button onClick={() => setShowSelection(true)}>
        Select Products
      </Button>
      
      <Button onClick={() => setShowCart(true)}>
        View Cart ({items.length})
      </Button>

      {/* Selection Dialog */}
      <ItemsSelectionDialog
        open={showSelection}
        onOpenChange={setShowSelection}
        type="product"
        items={products}
        context={{
          bookingType: 'rental',
          eventDate: '2025-10-25',
          onItemSelect: (product) => {
            // Add your item
          }
        }}
      />

      {/* Display Dialog */}
      <ItemsDisplayDialog
        open={showCart}
        onOpenChange={setShowCart}
        items={items}
        context={{ bookingType: 'rental' }}
        onQuantityChange={updateQuantity}
        onRemoveItem={removeItem}
      />
    </>
  )
}
```

---

## 📚 Detailed Documentation

### ItemsDisplayDialog Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | Yes | - | Dialog open state |
| `onOpenChange` | `(open: boolean) => void` | Yes | - | Handle dialog state change |
| `items` | `SelectedItem[]` | Yes | - | Array of selected items |
| `context` | `ItemsDisplayContext` | Yes | - | Display configuration |
| `onQuantityChange` | `(id: string, qty: number) => void` | No | - | Quantity change handler |
| `onRemoveItem` | `(id: string) => void` | No | - | Item removal handler |
| `onAddItems` | `() => void` | No | - | Add more items handler |
| `onItemEdit` | `(id: string) => void` | No | - | Edit item handler |
| `title` | `string` | No | 'Selected Items' | Dialog title |
| `description` | `string` | No | - | Dialog description |
| `showSummary` | `boolean` | No | `true` | Show pricing summary |
| `summaryData` | `object` | No | - | Summary calculations |

### ItemsSelectionDialog Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | Yes | - | Dialog open state |
| `onOpenChange` | `(open: boolean) => void` | Yes | - | Handle dialog state change |
| `type` | `'product' \| 'package'` | Yes | - | Type of items to display |
| `items` | `(Product \| PackageSet)[]` | Yes | - | Items to select from |
| `categories` | `Category[]` | No | `[]` | Categories for filtering |
| `subcategories` | `Subcategory[]` | No | `[]` | Subcategories for filtering |
| `context` | `ProductSelectionContext` | Yes | - | Selection configuration |
| `selectedItems` | `SelectedItem[]` | No | `[]` | Currently selected items |
| `title` | `string` | No | Auto | Dialog title |
| `description` | `string` | No | - | Dialog description |
| `onBarcodeSearch` | `(barcode: string) => void` | No | - | Barcode search handler |

---

## 🎨 Advanced Usage

### Example 1: Product Booking with Availability

```tsx
function ProductBooking() {
  const { items, addItem, updateQuantity, removeItem } = useItemSelection()
  const { checkAvailability, data: availabilityData } = useAvailabilityCheck()
  
  const handleSelectProduct = (product: Product) => {
    const newItem: SelectedProductItem = {
      id: `item-${Date.now()}`,
      product_id: product.id,
      product,
      quantity: 1,
      unit_price: product.rental_price,
      total_price: product.rental_price,
    }
    addItem(newItem)
  }

  const handleCheckAvailability = (productId: string) => {
    if (eventDate) {
      checkAvailability([productId], eventDate, { [productId]: 1 })
    }
  }

  return (
    <ItemsSelectionDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      type="product"
      items={products}
      categories={categories}
      context={{
        bookingType: 'rental',
        eventDate: selectedDate,
        onItemSelect: handleSelectProduct,
        onCheckAvailability: handleCheckAvailability,
      }}
      selectedItems={items}
    />
  )
}
```

### Example 2: Package Booking with Custom Pricing

```tsx
function PackageBooking() {
  const { items, addItem } = useItemSelection<SelectedPackageItem>()
  
  const handleSelectPackage = (pkg: PackageSet) => {
    // Open variant selector first
    setSelectedPackage(pkg)
    setShowVariantDialog(true)
  }

  const handleVariantSelect = (variant: PackageVariant, extraSafas: number) => {
    const newItem: SelectedPackageItem = {
      id: `item-${Date.now()}`,
      package_id: selectedPackage.id,
      variant_id: variant.id,
      package: selectedPackage,
      variant,
      quantity: 1,
      extra_safas: extraSafas,
      unit_price: calculatePrice(selectedPackage, variant, extraSafas),
      total_price: calculatePrice(selectedPackage, variant, extraSafas),
      distance_addon: 0,
      security_deposit: variant.security_deposit || 0,
    }
    addItem(newItem)
  }

  return (
    <ItemsSelectionDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      type="package"
      items={packages}
      categories={categories}
      context={{
        bookingType: 'rental',
        eventDate: selectedDate,
        onItemSelect: handleSelectPackage,
      }}
    />
  )
}
```

### Example 3: Order Calculations with Discounts

```tsx
function OrderSummary() {
  const { items } = useItemSelection()
  
  const calculations = useOrderCalculations(items, {
    discountType: 'percentage',
    discountAmount: 10, // 10% discount
    couponDiscount: 500, // Additional ₹500 coupon
    gstRate: 0.05, // 5% GST
  })

  return (
    <ItemsDisplayDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      items={items}
      context={{ bookingType: 'rental', isEditable: false }}
      showSummary={true}
      summaryData={{
        subtotal: calculations.subtotal,
        discount: calculations.discount + calculations.couponDiscount,
        gst: calculations.gst,
        total: calculations.total,
        securityDeposit: calculations.securityDeposit,
      }}
    />
  )
}
```

### Example 4: Barcode Scanner Integration

```tsx
function BarcodeBooking() {
  const { items, addItem } = useItemSelection()
  const [barcode, setBarcode] = useState('')

  const handleBarcodeSearch = async (code: string) => {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', code)
      .single()

    if (product) {
      const newItem: SelectedProductItem = {
        id: `item-${Date.now()}`,
        product_id: product.id,
        product,
        quantity: 1,
        unit_price: product.rental_price,
        total_price: product.rental_price,
      }
      addItem(newItem)
      toast.success(`Added ${product.name}`)
      setBarcode('')
    } else {
      toast.error('Product not found')
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Scan or enter barcode..."
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleBarcodeSearch(barcode)
          }
        }}
      />
      
      <ItemsDisplayDialog
        open={showCart}
        onOpenChange={setShowCart}
        items={items}
        context={{ bookingType: 'rental' }}
      />
    </div>
  )
}
```

---

## 🎯 Custom Hooks API

### `useItemSelection<T>()`

Manages a collection of selected items with CRUD operations.

```tsx
const {
  items,              // Array of selected items
  setItems,           // Set items directly
  addItem,            // Add a new item
  removeItem,         // Remove item by ID
  updateQuantity,     // Update item quantity
  updateItem,         // Update any item property
  clearItems,         // Clear all items
  getItem,            // Get item by ID
  totalItems,         // Total count of items
  totalQuantity,      // Sum of all quantities
  totalAmount,        // Sum of all prices
} = useItemSelection<SelectedProductItem>()
```

### `useAvailabilityCheck()`

Checks product availability for date ranges.

```tsx
const {
  loading,            // Loading state
  data,               // Availability data array
  error,              // Error message
  checkAvailability,  // Check multiple products
  checkSingleProduct, // Check one product
} = useAvailabilityCheck()

// Usage
await checkAvailability(
  ['product-id-1', 'product-id-2'],
  '2025-10-25',
  { 'product-id-1': 2, 'product-id-2': 1 }
)
```

### `useProductFilter<T>(items)`

Filters and searches through products/packages.

```tsx
const {
  searchTerm,         // Current search term
  setSearchTerm,      // Update search
  selectedCategory,   // Selected category ID
  setSelectedCategory,// Update category
  selectedSubcategory,// Selected subcategory ID
  setSelectedSubcategory, // Update subcategory
  inStockOnly,        // Stock filter state
  setInStockOnly,     // Toggle stock filter
  filteredItems,      // Filtered results
} = useProductFilter(products)
```

### `useOrderCalculations(items, options)`

Calculates order totals with discounts and taxes.

```tsx
const {
  subtotal,           // Items subtotal
  discount,           // Discount amount
  subtotalAfterDiscount, // After discount
  couponDiscount,     // Coupon amount
  subtotalAfterCoupon,// After coupon
  gst,                // GST amount
  gstRate,            // GST rate used
  total,              // Final total
  securityDeposit,    // Total deposits
  grandTotal,         // Total + deposits
} = useOrderCalculations(items, {
  discountType: 'flat',
  discountAmount: 500,
  couponDiscount: 200,
  gstRate: 0.05,
})
```

---

## 🎨 Styling & Customization

All components use Tailwind CSS and shadcn/ui components. Customize using:

1. **Tailwind Classes**: Pass `className` to customize styling
2. **Theme Variables**: Modify your theme colors in `globals.css`
3. **Component Variants**: Use built-in variant props

```tsx
// Example: Custom styling
<ItemsDisplayDialog
  className="max-w-4xl"
  // ... other props
/>
```

---

## 🔧 TypeScript Support

All components are fully typed with comprehensive TypeScript interfaces:

- `SelectedProductItem`
- `SelectedPackageItem`
- `Product`
- `PackageSet`
- `Category`
- `Subcategory`
- `ItemsDisplayContext`
- `ProductSelectionContext`
- `AvailabilityData`

Import types from: `@/components/shared/types/items`

---

## 📱 Responsive Design

Both dialogs are fully responsive:
- **Mobile**: Stacked layout, simplified controls
- **Tablet**: 2-column grid
- **Desktop**: 3-column grid, full features

---

## ♿ Accessibility

- ✅ Keyboard navigation support
- ✅ ARIA labels and roles
- ✅ Focus management
- ✅ Screen reader friendly
- ✅ Color contrast compliance

---

## 🚀 Performance

- ✅ Memoized calculations
- ✅ Optimized re-renders
- ✅ Lazy loading support
- ✅ Virtualization ready
- ✅ Debounced search

---

## 🧪 Testing

```tsx
// Example test setup
import { render, screen, fireEvent } from '@testing-library/react'
import { ItemsDisplayDialog } from '@/components/shared/dialogs/items-display-dialog'

test('renders items correctly', () => {
  const items = [/* mock items */]
  render(
    <ItemsDisplayDialog
      open={true}
      onOpenChange={() => {}}
      items={items}
      context={{ bookingType: 'rental' }}
    />
  )
  expect(screen.getByText('Selected Items')).toBeInTheDocument()
})
```

---

## 🐛 Troubleshooting

### Items not displaying
- Check `items` array is not empty
- Verify item types match expected structure
- Check console for TypeScript errors

### Availability not working
- Ensure `eventDate` is provided in context
- Check Supabase connection
- Verify table permissions

### Styling issues
- Ensure Tailwind CSS is configured
- Check shadcn/ui components are installed
- Verify CSS imports

---

## 📄 License

MIT License - feel free to use in your projects!

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 🎉 Credits

Built with inspiration from:
- **Steve Jobs**: Simplicity and user experience
- **Bill Gates**: Scalability and robustness
- **Elon Musk**: Innovation and pushing boundaries

Made with ❤️ for the Safawala CRM team
