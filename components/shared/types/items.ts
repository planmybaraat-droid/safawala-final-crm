/**
 * Shared TypeScript types for item management across the application
 * Used by both product orders and package bookings
 */

// Base product/item structure
export interface BaseProduct {
  id: string
  name: string
  category?: string
  category_id?: string
  image_url?: string
  stock_available?: number
  stock_total?: number
}

// Product for product orders
export interface Product extends BaseProduct {
  product_code?: string
  rental_price: number
  sale_price: number
  security_deposit?: number
  subcategory_id?: string
  barcode?: string
}

// Package for package bookings
export interface PackageSet extends BaseProduct {
  base_price: number
  extra_safa_price?: number
  security_deposit?: number
  description?: string
  package_variants: PackageVariant[]
}

export interface PackageVariant {
  id: string
  name?: string
  variant_name?: string
  base_price: number
  security_deposit?: number
  inclusions?: string[] | string
  size?: string
  quantity_safas?: number
  package_id: string
}

// Selected item structures
export interface SelectedProductItem {
  id: string // Unique local ID
  product_id: string
  product: Product
  quantity: number
  unit_price: number
  total_price: number
  variant_name?: string
  variant_id?: string
}

export interface SelectedPackageItem {
  id: string // Unique local ID
  package_id: string
  variant_id: string
  package: PackageSet
  variant: PackageVariant
  quantity: number
  extra_safas?: number
  unit_price: number
  total_price: number
  distance_addon?: number
  security_deposit?: number
  products_pending?: boolean
}

// Union type for selected items
export type SelectedItem = SelectedProductItem | SelectedPackageItem

// Category structures
export interface Category {
  id: string
  name: string
  display_order?: number
  is_active?: boolean
}

export interface Subcategory {
  id: string
  name: string
  parent_id: string
  category_id?: string
}

// Availability checking
export interface AvailabilityConflict {
  booking_id: string
  booking_number?: string
  delivery_date: string
  return_date: string
  quantity: number
  customer_name?: string
  return_status?: 'returned' | 'in_progress'
}

export interface AvailabilityData {
  product_id: string
  product_name: string
  available_quantity: number
  stock_total: number
  conflicts: AvailabilityConflict[]
  status: 'available' | 'limited' | 'unavailable'
}

// Dialog context types
export interface ProductSelectionContext {
  bookingType: 'rental' | 'sale'
  eventDate?: string
  deliveryDate?: string
  returnDate?: string
  customerId?: string
  distanceKm?: number
  pincode?: string
  // Callbacks
  onItemSelect?: (item: Product | PackageSet) => void
  onQuantityChange?: (itemId: string, quantity: number) => void
  onCheckAvailability?: (productId: string, productName: string) => void
}

export interface ItemsDisplayContext {
  bookingType: 'rental' | 'sale'
  eventDate?: string
  isEditable?: boolean
  showPricing?: boolean
  showAvailability?: boolean
  // Callbacks
  onQuantityChange?: (itemId: string, quantity: number) => void
  onRemoveItem?: (itemId: string) => void
  onAddItem?: () => void
  onItemEdit?: (itemId: string) => void
}
