// User and Authentication Types
export interface User {
  id: string
  email: string
  name: string
  role: "super_admin" | "franchise_admin" | "staff" | "readonly"
  department?: "admin" | "manager" | "booking" | "warehouse" | "qc" | "delivery" | "styling" | "accounts" | "franchise"
  franchise_id?: string
  franchise_name?: string
  franchise_code?: string
  permissions?: UserPermissions
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserPermissions {
  // Main Navigation
  dashboard: boolean
  bookings: boolean
  customers: boolean
  inventory: boolean
  packages: boolean
  vendors: boolean
  
  // Business Operations
  quotes: boolean
  invoices: boolean
  invoice_payment_access: boolean
  laundry: boolean
  expenses: boolean
  deliveries: boolean
  productArchive: boolean
  payroll: boolean
  attendance: boolean
  
  // Analytics & Reports
  reports: boolean
  financials: boolean
  
  // Administration
  franchises: boolean
  staff: boolean
  integrations: boolean
  settings: boolean
}

// Customer Types
export interface Customer {
  id: string
  customer_code: string
  name: string
  phone: string
  whatsapp?: string
  email?: string
  address?: string
  city?: string
  pincode?: string
  state?: string
  franchise_id: string
  assigned_staff_id?: string
  last_contact_date?: string
  status?: 'active' | 'inactive' | 'lead' | 'prospect'
  kyc_status?: 'pending' | 'submitted' | 'verified' | 'rejected'
  aadhar_number?: string
  pan_number?: string
  kyc_document_url?: string
  kyc_notes?: string
  lead_id?: string
  created_at: string
  updated_at: string
  // Related data
  franchise?: {
    id: string
    name: string
    code: string
  }
  staff_assignments?: Array<{
    id: string
    role: string
    staff: {
      id: string
      email: string
      first_name: string
      last_name: string
      role: string
    }
  }>
  notes?: Array<{
    id: string
    note: string
    created_at: string
    created_by: {
      id: string
      email: string
      first_name: string
      last_name: string
    }
  }>
}

// Franchise Types
export interface Franchise {
  id: string
  name: string
  code: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  manager_name: string
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

// Product Variation Types
export interface ProductVariation {
  id: string
  product_id: string
  franchise_id: string
  variation_name: string
  color?: string
  design?: string
  material?: string
  size?: string
  sku?: string
  price_adjustment: number
  rental_price_adjustment: number
  stock_total: number
  stock_available: number
  stock_booked: number
  stock_damaged: number
  barcode?: string
  qr_code?: string
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Product Types
export interface Product {
  id: string
  name: string
  description?: string
  category_id?: string
  sku: string
  barcode?: string
  price: number
  cost_price: number
  stock_quantity: number
  min_stock_level: number
  unit: string
  franchise_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description?: string
  parent_id?: string
  franchise_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Booking Types - Adding both Booking and BookingType for compatibility
export interface Booking {
  id: string
  booking_number: string
  customer_id: string
  franchise_id: string
  booking_date: string
  pickup_date: string
  delivery_date: string
  event_date: string
  status:
    | "pending_selection"
    | "confirmed"
    | "delivered"
    | "returned"
    | "order_complete"
    | "cancelled"
  total_amount: number
  paid_amount: number
  amount_paid?: number // Alias for paid_amount (some tables use this)
  subtotal_amount?: number // Subtotal before taxes and fees
  payment_status: "pending" | "partial" | "paid" | "refunded"
  payment_method?: string // Payment method used
  notes?: string
  created_at: string
  updated_at: string
  customer?: Customer
  franchise?: Franchise
  items?: BookingItem[]
  event_type?: string
  event_for?: "groom" | "bride" | "both"
  discount_amount?: number
  coupon_code?: string // Coupon code applied
  coupon_discount?: number // Discount amount from coupon
  tax_amount?: number
  gst_amount?: number // GST/Tax amount calculated
  gst_percentage?: number // GST percentage (default 18%)
  security_deposit?: number
  distance_amount?: number // Distance-based delivery charge
  distance_km?: number // Distance in kilometers
  priority?: string
  groom_name?: string
  groom_home_address?: string
  groom_additional_whatsapp?: string
  bride_name?: string
  bride_additional_whatsapp?: string
  venue_name?: string
  venue_address?: string
  special_instructions?: string
  delivery_time?: string // Scheduled delivery time
  return_time?: string // Scheduled return/pickup time
  event_time?: string // Event start time
  participant?: string // Event participant (groom/bride/both) - alias for event_for
  invoice_generated?: boolean
  whatsapp_sent?: boolean
  has_modifications?: boolean // Whether modifications are required
  modification_date?: string // Date for modifications/requirements
  modification_details?: string // Description of modifications needed
}

// Alias for compatibility
export type BookingType = Booking

export interface BookingItem {
  id: string
  booking_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
  created_at: string
  updated_at: string
  product?: Product
}

// Payment Types - Adding both Payment and PaymentType for compatibility
export interface Payment {
  id: string
  booking_id?: string
  customer_id: string
  franchise_id: string
  amount: number
  payment_method: "cash" | "card" | "upi" | "bank_transfer" | "cheque"
  payment_status: "pending" | "completed" | "failed" | "cancelled"
  transaction_id?: string
  reference_number?: string
  payment_date: string
  notes?: string
  created_at: string
  updated_at: string
  customer?: Customer
  booking?: Booking
}

// Alias for compatibility
export type PaymentType = Payment

// Inventory Types
export interface InventoryTransaction {
  id: string
  product_id: string
  franchise_id: string
  transaction_type: "in" | "out" | "adjustment"
  quantity: number
  unit_price?: number
  total_value?: number
  reference_type?: "purchase" | "sale" | "booking" | "adjustment" | "return"
  reference_id?: string
  notes?: string
  created_at: string
  updated_at: string
  product?: Product
}

// Financial Types
export interface Expense {
  id: string
  franchise_id: string
  category: string
  description: string
  amount: number
  expense_date: string
  payment_method: "cash" | "card" | "bank_transfer" | "cheque"
  receipt_number?: string
  vendor_name?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Revenue {
  id: string
  franchise_id: string
  source: "booking" | "direct_sale" | "other"
  amount: number
  revenue_date: string
  reference_id?: string
  description?: string
  created_at: string
  updated_at: string
}

// Report Types
export interface ReportData {
  title: string
  period: string
  data: any[]
  summary: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    totalBookings: number
    totalCustomers: number
  }
  charts?: {
    revenue: any[]
    expenses: any[]
    bookings: any[]
  }
}

export interface DashboardStats {
  totalRevenue: number
  totalBookings: number
  totalCustomers: number
  pendingBookings: number
  revenueGrowth: number
  bookingGrowth: number
  customerGrowth: number
  lowStockItems: number
}

// Chart Data Type
export interface ChartData {
  name: string
  value: number
  date?: string
  category?: string
}

// Settings Types
export interface CompanySettings {
  id: string
  company_name: string
  company_logo?: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  website?: string
  gst_number?: string
  pan_number?: string
  bank_details?: string
  terms_conditions?: string
  created_at: string
  updated_at: string
}

export interface NotificationSettings {
  id: string
  user_id: string
  email_notifications: boolean
  sms_notifications: boolean
  push_notifications: boolean
  marketing_notifications: boolean
  booking_reminders: boolean
  payment_reminders: boolean
  inventory_alerts: boolean
  system_updates: boolean
  low_stock_alerts: boolean
  customer_updates: boolean
  created_at: string
  updated_at: string
}

export interface BusinessHours {
  id: string
  franchise_id: string
  day_of_week: number
  day_name: string
  is_open: boolean
  open_time?: string
  close_time?: string
  break_start_time?: string
  break_end_time?: string
  created_at: string
  updated_at: string
}

// Quote Types
export interface Quote {
  id: string
  quote_number: string
  customer_id?: string
  franchise_id?: string

  // Quote details
  type: "rental" | "direct_sale"
  booking_type?: "product" | "package" // Added to differentiate product orders vs package bookings
  booking_subtype?: "rental" | "sale" // Added to show Rent/Sale for products
  event_type?: string
  event_participant?: string // Groom, Bride, or Both
  event_date?: string
  delivery_date?: string
  return_date?: string
  payment_type?: string // full, advance, partial
  amount_paid?: number
  pending_amount?: number

  // Customer details (for new customers who haven't been saved yet)
  customer_name?: string
  customer_phone?: string
  customer_whatsapp?: string
  customer_whatsapp2?: string
  customer_email?: string
  customer_address?: string
  customer_city?: string
  customer_pincode?: string
  customer_state?: string

  // Event details
  event_for?: "groom" | "bride" | "both"
  groom_name?: string
  groom_whatsapp?: string
  groom_address?: string
  bride_name?: string
  bride_whatsapp?: string
  bride_address?: string
  venue_name?: string
  venue_address?: string

  // Financial details
  total_amount: number
  subtotal_amount?: number
  security_deposit?: number
  tax_amount?: number
  discount_amount?: number
  payment_method?: string
  coupon_code?: string
  coupon_discount?: number
  distance_amount?: number
  distance_km?: number
  custom_amount?: number

  // Quote status and tracking
  status: "generated" | "sent" | "viewed" | "accepted" | "rejected" | "quote" | "converted"
  valid_until?: string

  // Additional information
  special_instructions?: string
  notes?: string
  terms_conditions?: string

  // PDF and sharing
  pdf_generated?: boolean
  pdf_url?: string
  whatsapp_sent?: boolean
  email_sent?: boolean

  // Tracking
  created_at: string
  updated_at?: string
  created_by?: string
  sales_closed_by?: string
  sales_staff_name?: string

  // Conversion tracking
  converted_to_booking_id?: string
  converted_at?: string

  // Relations
  customer?: Customer
  franchise?: Franchise
  quote_items?: QuoteItem[]
}

export interface QuoteItem {
  id: string
  quote_id: string
  product_id: string

  // Item details
  product_name: string
  product_code: string
  category: string
  quantity: number
  unit_price: number
  total_price: number
  security_deposit?: number

  // Tracking
  created_at: string

  // Relations
  product?: Product
}

export interface CreateQuoteData {
  customer_id?: string
  type?: "rental" | "direct_sale"
  event_type?: string
  event_date?: string
  delivery_date?: string
  return_date?: string

  // Customer details (for new customers)
  customer_name?: string
  customer_phone?: string
  customer_whatsapp?: string
  customer_email?: string
  customer_address?: string
  customer_city?: string
  customer_pincode?: string
  customer_state?: string

  // Event details
  event_for?: "groom" | "bride" | "both"
  groom_name?: string
  bride_name?: string
  venue_name?: string
  venue_address?: string
  special_instructions?: string

  // Financial
  total_amount: number
  subtotal?: number
  security_deposit?: number
  tax_amount?: number
  discount_amount?: number

  notes?: string

  // Items
  items: Array<{
    product_id?: string
    product_name: string
    product_code: string
    category?: string
    quantity: number
    unit_price: number
    total_price: number
    security_deposit?: number
  }>
}

export interface QuoteFilters {
  status?: string
  customer_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

// Invoice Types
export interface Invoice {
  id: string
  invoice_number: string
  customer_id?: string
  franchise_id?: string

  // Invoice details
  invoice_type: "product_order" | "package_booking"
  booking_id?: string // Reference to product_orders or package_bookings
  order_number?: string // Original order/booking number
  event_type?: string
  event_date?: string
  delivery_date?: string
  return_date?: string

  // Customer details
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
  customer_city?: string
  customer_pincode?: string
  customer_state?: string

  // Event details
  groom_name?: string
  bride_name?: string
  venue_address?: string
  participant?: string // Event participant (groom/bride/both)
  event_time?: string // Event start time

  // Timeline details
  delivery_time?: string // Scheduled delivery time
  return_time?: string // Scheduled return/pickup time

  // Financial details
  total_amount: number
  subtotal_amount?: number
  tax_amount?: number
  gst_amount?: number // GST/Tax amount calculated
  gst_percentage?: number // GST percentage (default 18%)
  discount_amount?: number
  coupon_code?: string // Coupon code applied
  coupon_discount?: number // Discount amount from coupon
  paid_amount?: number
  pending_amount?: number
  security_deposit?: number
  distance_amount?: number // Distance-based delivery charge
  distance_km?: number // Distance in kilometers
  payment_method?: string // Payment method used

  // Invoice status
  status: "draft" | "sent" | "paid" | "partially_paid" | "overdue" | "cancelled"
  payment_status?: "pending" | "partial" | "paid"
  due_date?: string

  // Additional information
  notes?: string
  terms_conditions?: string

  // PDF and sharing
  pdf_generated?: boolean
  pdf_url?: string
  sent_at?: string

  // Tracking
  created_at: string
  updated_at?: string
  created_by?: string

  // Relations
  customer?: Customer
  franchise?: Franchise
  invoice_items?: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  product_id?: string
  product_name: string
  product_code?: string
  category?: string
  quantity: number
  unit_price: number
  total_price: number
  security_deposit?: number
  notes?: string
}

export interface CreateInvoiceData {
  booking_id: string
  invoice_type: "product_order" | "package_booking"
  customer_id?: string
  due_date?: string
  notes?: string
  terms_conditions?: string
}

export interface InvoiceFilters {
  status?: string
  payment_status?: string
  customer_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Form Types
export interface LoginForm {
  email: string
  password: string
}

export interface CustomerForm {
  name: string
  phone: string
  whatsapp?: string
  email?: string
  address?: string
  city?: string
  pincode?: string
  franchise_id?: string
}

export interface BookingForm {
  customer_id: string
  pickup_date: string
  delivery_date: string
  items: {
    product_id: string
    quantity: number
    unit_price: number
  }[]
  notes?: string
}

export interface ProductForm {
  name: string
  description?: string
  category_id?: string
  sku: string
  barcode?: string
  price: number
  cost_price: number
  stock_quantity: number
  min_stock_level: number
  unit: string
}

// Utility Types
export type Status = "active" | "inactive" | "pending" | "completed" | "cancelled"
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "failed"
export type UserRole = "super_admin" | "franchise_admin" | "staff" | "readonly"
export type PaymentMethod = "cash" | "card" | "upi" | "bank_transfer" | "cheque"
export type TransactionType = "in" | "out" | "adjustment"
export type QuoteStatus = "generated" | "sent" | "viewed" | "accepted" | "rejected"

// Staff Ledger Types
export interface StaffLedger {
  id: string
  user_id: string
  base_salary: number
  utilized_credit: number
  credit_limit: number
  created_at: string
  updated_at: string
  user?: {
    id: string
    email: string
    name: string
    role: string
    department?: string
  }
}

export interface StaffLedgerTransaction {
  id: string
  ledger_id: string
  title: string
  amount: number
  type: "credit" | "debit"
  transaction_date: string
  created_by?: string
  created_at: string
}
