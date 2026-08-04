// =====================================================
// BARCODE SYSTEM - TYPESCRIPT TYPES
// =====================================================
// Type definitions for barcode scanning system
// =====================================================

// =====================================================
// 1. DATABASE TYPES
// =====================================================

export type BarcodeStatus =
  | 'available'      // Ready to rent
  | 'rented'         // Currently with customer
  | 'in_laundry'     // Sent to laundry
  | 'in_transit'     // Being delivered/returned
  | 'maintenance'    // Under repair
  | 'damaged'        // Damaged, not usable
  | 'archived'       // Stored, not in active circulation

export type ScanAction =
  | 'booking_add'        // Added to booking
  | 'booking_remove'     // Removed from booking
  | 'delivery_out'       // Delivered to customer
  | 'return_in'          // Returned from customer
  | 'laundry_send'       // Sent to laundry
  | 'laundry_receive'    // Received from laundry
  | 'archive_in'         // Moved to archive
  | 'archive_out'        // Removed from archive
  | 'inventory_check'    // General inventory scan
  | 'damage_report'      // Item marked as damaged
  | 'maintenance_in'     // Sent for maintenance
  | 'maintenance_out'    // Returned from maintenance

export type BookingLinkStatus =
  | 'assigned'       // Assigned to booking
  | 'delivered'      // Delivered to customer
  | 'with_customer'  // Currently with customer
  | 'in_laundry'     // In laundry during rental
  | 'returned'       // Returned from customer
  | 'completed'      // Booking completed

export type LaundryItemStatus =
  | 'sent'           // Sent to laundry
  | 'in_process'     // Being cleaned
  | 'ready'          // Ready for pickup
  | 'received'       // Received back
  | 'damaged'        // Damaged during laundry
  | 'lost'           // Lost at laundry

// =====================================================
// 2. TABLE INTERFACES
// =====================================================

export interface ProductBarcode {
  id: string
  barcode: string
  product_id: string
  variant_id?: string | null
  status: BarcodeStatus
  current_booking_id?: string | null
  current_location?: string | null
  last_scanned_at?: string | null
  last_scanned_by?: string | null
  total_scans: number
  total_rentals: number
  total_laundry_cycles: number
  notes?: string | null
  franchise_id?: string | null
  created_at: string
  updated_at: string
  
  // Relations
  products?: {
    id: string
    name: string
    category: string
    product_code: string
  }
  package_bookings?: {
    id: string
    package_number: string
    customer_id: string
  }
}

export interface BarcodeScanHistory {
  id: string
  barcode: string
  scan_action: ScanAction
  booking_id?: string | null
  order_id?: string | null
  laundry_batch_id?: string | null
  status_before?: string | null
  status_after?: string | null
  scanned_by?: string | null
  scanned_location?: string | null
  device_info?: Record<string, any> | null
  notes?: string | null
  metadata?: Record<string, any> | null
  scanned_at: string
  franchise_id?: string | null
  
  // Relations
  users?: {
    id: string
    name: string
    email: string
  }
}

export interface BookingBarcodeLink {
  id: string
  booking_id: string
  barcode_id: string
  product_id: string
  quantity: number
  status: BookingLinkStatus
  assigned_at: string
  delivered_at?: string | null
  returned_at?: string | null
  notes?: string | null
  franchise_id?: string | null
  
  // Relations
  product_barcodes?: ProductBarcode
  products?: {
    id: string
    name: string
    category: string
  }
}

export interface LaundryBarcodeItem {
  id: string
  batch_id: string
  barcode_id: string
  product_id: string
  status: LaundryItemStatus
  sent_at: string
  received_at?: string | null
  expected_return_date?: string | null
  cleaning_cost: number
  notes?: string | null
  franchise_id?: string | null
  
  // Relations
  product_barcodes?: ProductBarcode
  laundry_batches?: {
    id: string
    batch_number: string
    vendor_name: string
  }
}

// =====================================================
// 3. CONTEXT & HOOK TYPES
// =====================================================

export type BarcodeContext =
  | 'booking'        // Adding items to booking
  | 'delivery'       // Delivering items to customer
  | 'return'         // Processing returns
  | 'laundry'        // Laundry operations
  | 'archive'        // Archive/inventory management
  | 'maintenance'    // Maintenance operations

export interface BarcodeContextConfig {
  context: BarcodeContext
  bookingId?: string
  orderId?: string
  batchId?: string
  onSuccess?: (barcode: string, data?: any) => void
  onError?: (error: string) => void
  continuous?: boolean  // Keep scanning after successful scan
}

export interface ScanResult {
  success: boolean
  barcode: string
  product?: {
    id: string
    name: string
    category: string
  }
  previousStatus?: BarcodeStatus
  newStatus?: BarcodeStatus
  message?: string
  error?: string
}

export interface BarcodeStats {
  totalScans: number
  totalItems: number
  byStatus: Record<BarcodeStatus, number>
  byAction: Record<ScanAction, number>
  recentScans: BarcodeScanHistory[]
}

// =====================================================
// 4. COMPONENT PROPS
// =====================================================

export interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onError?: (error: Error) => void
  continuous?: boolean
  className?: string
}

export interface BarcodeScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (barcode: string) => void
  title?: string
  description?: string
  context?: BarcodeContext
  bookingId?: string
}

export interface ManualBarcodeEntryProps {
  onSubmit: (barcode: string) => void
  onCancel: () => void
  placeholder?: string
}

export interface BarcodeFeedbackProps {
  type: 'success' | 'error' | 'warning'
  message: string
  visible: boolean
  onClose: () => void
}

export interface BarcodeListProps {
  items: ProductBarcode[]
  onItemClick?: (item: ProductBarcode) => void
  showStatus?: boolean
  showProduct?: boolean
  emptyMessage?: string
}

// =====================================================
// 5. API REQUEST/RESPONSE TYPES
// =====================================================

export interface RecordScanRequest {
  barcode: string
  action: ScanAction
  bookingId?: string
  orderId?: string
  batchId?: string
  userId?: string
  notes?: string
  franchiseId?: string
  location?: string
  metadata?: Record<string, any>
}

export interface RecordScanResponse {
  success: boolean
  scanId: string
  barcode: ProductBarcode
  message: string
}

export interface GetBarcodeStatusRequest {
  barcode: string
}

export interface GetBarcodeStatusResponse {
  success: boolean
  barcode: string
  status: BarcodeStatus
  product: {
    id: string
    name: string
    category: string
  }
  currentLocation?: string
  lastScannedAt?: string
  currentBooking?: {
    id: string
    bookingNumber: string
    customerName: string
  }
}

export interface BulkScanRequest {
  barcodes: string[]
  action: ScanAction
  bookingId?: string
  userId?: string
  franchiseId?: string
}

export interface BulkScanResponse {
  success: boolean
  totalScanned: number
  successful: string[]
  failed: Array<{
    barcode: string
    error: string
  }>
}

// =====================================================
// 6. BOOKING INTEGRATION TYPES
// =====================================================

export interface BookingWithBarcodes {
  id: string
  package_number: string
  customer_id: string
  event_date: string
  delivery_date?: string
  return_date?: string
  status: string
  
  // Barcode-specific fields
  barcoded_items: Array<{
    barcode: string
    product_id: string
    product_name: string
    status: BookingLinkStatus
    assigned_at: string
    delivered_at?: string
    returned_at?: string
  }>
  
  items_count: {
    total: number
    assigned: number
    delivered: number
    returned: number
    pending: number
  }
}

export interface DeliveryChecklistItem {
  barcode: string
  product_id: string
  product_name: string
  category: string
  expected: boolean
  scanned: boolean
  status: BookingLinkStatus
}

export interface ReturnProcessingItem {
  barcode: string
  product_id: string
  product_name: string
  scanned: boolean
  condition: 'clean' | 'dirty' | 'damaged' | 'unknown'
  nextAction?: 'archive' | 'laundry' | 'maintenance'
  notes?: string
}

// =====================================================
// 7. LAUNDRY INTEGRATION TYPES
// =====================================================

export interface LaundryBatchWithBarcodes {
  id: string
  batch_number: string
  vendor_id: string
  vendor_name: string
  sent_date: string
  expected_return_date?: string
  received_date?: string
  status: string
  total_amount: number
  
  items: Array<{
    barcode: string
    product_id: string
    product_name: string
    status: LaundryItemStatus
    cleaning_cost: number
  }>
  
  items_count: {
    total: number
    sent: number
    in_process: number
    ready: number
    received: number
  }
}

// =====================================================
// 8. ANALYTICS TYPES
// =====================================================

export interface ScanAnalytics {
  period: {
    start: string
    end: string
  }
  
  totals: {
    scans: number
    uniqueItems: number
    uniqueUsers: number
  }
  
  byAction: Array<{
    action: ScanAction
    count: number
    percentage: number
  }>
  
  byStatus: Array<{
    status: BarcodeStatus
    count: number
    percentage: number
  }>
  
  topScannedItems: Array<{
    barcode: string
    product_name: string
    scan_count: number
  }>
  
  topUsers: Array<{
    user_id: string
    user_name: string
    scan_count: number
  }>
  
  hourlyDistribution: Array<{
    hour: number
    count: number
  }>
}

// =====================================================
// 9. UTILITY TYPES
// =====================================================

export interface BarcodeGenerationOptions {
  prefix: string
  productId: string
  sequence?: number
  includeCheckDigit?: boolean
}

export interface BarcodeValidationResult {
  valid: boolean
  errors?: string[]
  warnings?: string[]
}

export interface OfflineScanQueue {
  id: string
  barcode: string
  action: ScanAction
  context: BarcodeContext
  bookingId?: string
  timestamp: string
  synced: boolean
}

// =====================================================
// 10. SCANNER CONFIGURATION
// =====================================================

export interface ScannerConfig {
  // Camera settings
  preferredCamera: 'front' | 'back'
  resolution: 'low' | 'medium' | 'high'
  
  // Feedback settings
  enableVibration: boolean
  enableSound: boolean
  enableVisualFeedback: boolean
  
  // Behavior settings
  continuousScanning: boolean
  deduplicationWindow: number  // milliseconds
  autoCloseDelay?: number       // milliseconds
  
  // Validation settings
  validateBeforeAction: boolean
  requireConfirmation: boolean
  
  // Offline settings
  enableOfflineQueue: boolean
  autoSyncInterval: number      // milliseconds
}

// =====================================================
// 11. ERROR TYPES
// =====================================================

export class BarcodeNotFoundError extends Error {
  constructor(barcode: string) {
    super(`Barcode not found: ${barcode}`)
    this.name = 'BarcodeNotFoundError'
  }
}

export class InvalidBarcodeStatusError extends Error {
  constructor(barcode: string, currentStatus: string, requiredStatus: string) {
    super(`Invalid status: ${currentStatus}, required: ${requiredStatus} for ${barcode}`)
    this.name = 'InvalidBarcodeStatusError'
  }
}

export class DuplicateScanError extends Error {
  constructor(barcode: string) {
    super(`Item already scanned: ${barcode}`)
    this.name = 'DuplicateScanError'
  }
}

export class CameraPermissionError extends Error {
  constructor() {
    super('Camera permission denied')
    this.name = 'CameraPermissionError'
  }
}

// =====================================================
// 12. EXPORT ALL
// =====================================================

export type {
  // Re-export all types for convenient import
}
