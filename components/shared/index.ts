/**
 * Reusable Item Management System
 * 
 * Central export point for all dialog components, hooks, and types
 */

// ============================================================================
// COMPONENTS
// ============================================================================

export { ItemsDisplayDialog } from './dialogs/items-display-dialog'
export { ItemsSelectionDialog } from './dialogs/items-selection-dialog'
export { CompactItemsDisplayDialog } from './dialogs/compact-items-display-dialog'
export { BookingWorkflowStepper } from './booking-workflow-stepper'

// ============================================================================
// HOOKS
// ============================================================================

export {
  useItemSelection,
  useAvailabilityCheck,
  useProductFilter,
  useOrderCalculations,
} from './hooks/useItems'

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Base types
  BaseProduct,
  Product,
  PackageSet,
  PackageVariant,
  
  // Selected items
  SelectedProductItem,
  SelectedPackageItem,
  SelectedItem,
  
  // Categories
  Category,
  Subcategory,
  
  // Availability
  AvailabilityConflict,
  AvailabilityData,
  
  // Context
  ProductSelectionContext,
  ItemsDisplayContext,
} from './types/items'

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Quick Example:
 * 
 * ```tsx
 * import { 
 *   ItemsDisplayDialog,
 *   ItemsSelectionDialog,
 *   useItemSelection,
 *   useOrderCalculations 
 * } from '@/components/shared'
 * 
 * function MyPage() {
 *   const { items, addItem, removeItem, updateQuantity } = useItemSelection()
 *   const calculations = useOrderCalculations(items)
 *   
 *   return (
 *     <>
 *       <ItemsSelectionDialog
 *         type="product"
 *         items={products}
 *         context={{ bookingType: 'rental', onItemSelect: addItem }}
 *       />
 *       
 *       <ItemsDisplayDialog
 *         items={items}
 *         context={{ bookingType: 'rental' }}
 *         onQuantityChange={updateQuantity}
 *         onRemoveItem={removeItem}
 *         summaryData={calculations}
 *       />
 *     </>
 *   )
 * }
 * ```
 */
