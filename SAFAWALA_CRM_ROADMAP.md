# SAFAWALA CRM — Full System Roadmap & Architecture Analysis
> **Every Root, Branch & Process — Detailed**  
> Generated: May 2026 | Stack: Next.js 14 · Supabase · TypeScript · Tailwind CSS  
> Total modules: 25+ | API routes: 130+ | Page routes: 50+ | TypeScript files: 230+

---

## Table of Contents
1. [Executive Overview](#1-executive-overview)
2. [System Architecture](#2-system-architecture)
3. [All Modules — Roots & Branches](#3-all-modules--roots--branches)
   - 3.1 Auth & Session
   - 3.2 Dashboard
   - 3.3 Bookings (Core)
   - 3.4 Customers
   - 3.5 Inventory & Products
   - 3.6 Barcode & QR System
   - 3.7 Packages (Sets)
   - 3.8 Quotes
   - 3.9 Invoices
   - 3.10 Deliveries & Returns
   - 3.11 Laundry
   - 3.12 Expenses
   - 3.13 Staff, Payroll & Attendance
   - 3.14 Vendors
   - 3.15 Franchises
   - 3.16 Reports & Financials
   - 3.17 Notifications & Tasks
   - 3.18 Settings & Configuration
   - 3.19 Integrations (WhatsApp + WooCommerce)
   - 3.20 Pricing Engine (Distance + Offers + Coupons)
   - 3.21 Admin & Health
   - 3.22 Cron Automation
4. [Database & Data Model](#4-database--data-model)
5. [Gaps, Issues & Improvements](#5-gaps-issues--improvements)
6. [Phased Roadmap](#6-phased-roadmap)
7. [Complete Route Map](#7-complete-route-map)
8. [Summary & Quick Wins](#8-summary--quick-wins)

---

## 1. Executive Overview

Safawala CRM is a **full-stack, multi-tenant business management platform** purpose-built for the **wedding accessories rental and direct-sales industry**. It covers the complete order lifecycle:

```
Lead → Quote → Booking → Inventory Reserve → Delivery → Return → Laundry → Invoice → Payment
```

The platform operates in a **franchise model** where a single super-admin controls multiple franchise locations. Each franchise has completely isolated data enforced via Supabase Row-Level Security (RLS) and a `franchise_id` column on every core table.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 14.2.16 (App Router, RSC + Client Components) |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL 15) with Row-Level Security |
| Auth | Custom cookie auth (`safawala_user`) + Supabase Auth sessions |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix UI primitives) |
| Forms | React Hook Form 7 + Zod 3 validation |
| Charts | Recharts |
| PDF Generation | jsPDF + jspdf-autotable |
| Barcode/QR | JSBarcode + qrcode library |
| WhatsApp | WATI (WhatsApp Business API) |
| E-Commerce | WooCommerce REST API (bidirectional sync) |
| Package Manager | pnpm 10 |
| Deployment | Vercel (vercel.json present) |

### User Roles

| Role | Access Level |
|------|-------------|
| `super_admin` | Full access across ALL franchises |
| `franchise_admin` | Full access within own franchise |
| `staff` | Operational access (bookings, deliveries, inventory) |
| `readonly` | View-only access to permitted modules |

### Permissions Matrix

| Module | Super Admin | Franchise Admin | Staff | Readonly |
|--------|:-----------:|:---------------:|:-----:|:--------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Bookings | ✅ | ✅ | ✅ | View |
| Customers | ✅ | ✅ | ✅ | View |
| Inventory | ✅ | ✅ | ✅ | View |
| Packages | ✅ | ✅ | ✅ | View |
| Quotes | ✅ | ✅ | ✅ | — |
| Invoices | ✅ | ✅ | ✅ | — |
| Deliveries | ✅ | ✅ | ✅ | — |
| Laundry | ✅ | ✅ | ✅ | — |
| Expenses | ✅ | ✅ | — | — |
| Payroll | ✅ | ✅ | — | — |
| Attendance | ✅ | ✅ | ✅ | — |
| Reports | ✅ | ✅ | — | — |
| Financials | ✅ | ✅ | — | — |
| Staff Mgmt | ✅ | ✅ | — | — |
| Franchises | ✅ | — | — | — |
| Integrations | ✅ | ✅ | — | — |
| Settings | ✅ | ✅ | — | — |

---

## 2. System Architecture

### 2.1 Directory Structure

```
safawala-crm/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/                # ~130 API route handlers
│   │   ├── auth/           # Login, logout, user, change-password
│   │   ├── bookings/       # Booking CRUD, status, items, barcodes
│   │   ├── customers/      # Customer CRUD, addresses
│   │   ├── products/       # Product CRUD, variations, barcodes, stock
│   │   ├── packages/       # Package sets, variants, categories
│   │   ├── deliveries/     # Delivery management & returns
│   │   ├── invoices/       # Invoice CRUD, archive, PDF
│   │   ├── quotes/         # Quote CRUD, convert, PDF
│   │   ├── expenses/       # Expenses & categories
│   │   ├── staff/          # Staff CRUD, status toggle
│   │   ├── payroll/        # Payroll calculation
│   │   ├── reports/        # Inventory & export reports
│   │   ├── settings/       # All settings endpoints
│   │   ├── wati/           # WATI WhatsApp integration
│   │   ├── whatsapp/       # Generic WhatsApp send
│   │   ├── woocommerce/    # WooCommerce sync
│   │   ├── cron/           # Automated scheduled jobs
│   │   ├── admin/          # Health check, cleanup
│   │   ├── distance-pricing/  # Distance pricing tiers
│   │   ├── offers/         # Promotional offers
│   │   ├── coupons/        # Coupon codes
│   │   ├── barcodes/       # Barcode CRUD & scan
│   │   ├── v2/, v3/        # Versioned barcode APIs (⚠️ legacy)
│   │   └── ...
│   ├── dashboard/          # Dashboard page
│   ├── bookings/           # Booking pages (list, detail, create)
│   ├── customers/          # Customer pages
│   ├── inventory/          # Inventory pages
│   ├── sets/               # Package sets pages
│   ├── quotes/             # Quote pages
│   ├── invoices/           # Invoice pages
│   ├── deliveries/         # Delivery pages
│   ├── laundry/            # Laundry pages
│   ├── expenses/           # Expense pages
│   ├── staff/              # Staff management pages
│   ├── payroll/            # Payroll page
│   ├── attendance/         # Attendance page
│   ├── reports/            # Reports page
│   ├── franchises/         # Franchise management
│   ├── settings/           # Settings pages
│   ├── integrations/       # Integration pages
│   ├── admin/              # Admin utility pages
│   └── auth/               # Login page
├── components/
│   ├── bookings/           # Booking-related UI components
│   ├── customers/          # Customer UI components
│   ├── inventory/          # Inventory UI (barcode, photo, pricing)
│   ├── deliveries/         # Delivery dialogs
│   ├── quotes/             # Quote forms & PDF selector
│   ├── invoices/           # Invoice components
│   ├── settings/           # Settings sections (company, banking, branding)
│   ├── layout/             # App sidebar, dashboard layout, company header
│   ├── charts/             # Revenue & inventory charts
│   ├── tasks/              # Task management components
│   ├── barcode/            # Barcode input & scanner
│   ├── qr-barcode/         # QR code generator
│   ├── shared/             # Shared dialogs & hooks
│   └── ui/                 # shadcn/ui primitives (50+ components)
├── lib/
│   ├── types.ts            # Master TypeScript type definitions
│   ├── auth.ts             # Client-side auth (signIn, signOut, getCurrentUser)
│   ├── auth-middleware.ts  # Server-side auth (requireAuth, authenticateRequest)
│   ├── supabase/           # Supabase client (server + client)
│   ├── services/           # Service classes (BookingService, QuoteService, etc.)
│   ├── pdf/                # PDF generators (quote, professional, compact)
│   ├── barcode/            # Barcode utilities
│   ├── middleware/         # Franchise isolation middleware
│   ├── utils/              # Franchise utils, etc.
│   ├── payroll.ts          # Payroll computation engine
│   ├── distance-pricing.ts # Distance-based pricing engine
│   ├── notification-system.ts  # In-app notification creation
│   ├── invoice-generator.ts    # jsPDF invoice generator
│   ├── woocommerce-service.ts  # WooCommerce API wrapper
│   ├── whatsapp-service.ts     # WhatsApp send helpers
│   └── ...
├── hooks/                  # Custom React hooks
├── scripts/                # DB maintenance scripts
├── migrations/             # SQL migration files
├── supabase/migrations/    # Supabase migration files
├── sql/                    # Ad-hoc SQL scripts
├── middleware.ts           # Next.js route protection middleware
└── package.json            # Dependencies
```

### 2.2 Authentication & Session Flow

```
[User] → POST /api/auth/login
         ↓
[Server] validates email+password against Supabase `users` table (bcryptjs)
         ↓
[Server] sets cookies: safawala_user (JSON) + Supabase sb-* session cookies
         ↓
[Client] stores user JSON in localStorage (fast access)
         ↓
[Next.js middleware] intercepts ALL protected routes
         ↓
Checks: safawala_user cookie OR safawala_session (legacy) OR sb-* cookies
         ↓
If unauthenticated → redirect to /?redirect=<path>
         ↓
[API routes] call requireAuth() → checks cookie → extracts user + franchise context
         ↓
Permission check: role ≥ required level AND module permission flag = true
```

**Auth files:**
- `middleware.ts` — route protection
- `lib/auth.ts` — client-side signIn/signOut/getCurrentUser
- `lib/auth-middleware.ts` — server-side requireAuth/authenticateRequest
- `app/api/auth/login/route.ts` — login handler
- `lib/api/authorization.ts` — permission logic
- `lib/api/permission-middleware.ts` — permission middleware helper

### 2.3 Multi-Tenancy (Franchise Isolation)

Three-layer isolation:

1. **Database layer (Supabase RLS)** — SQL policies in `scripts/FRANCHISE_ISOLATION.sql` and `scripts/AUTH_RLS_BASELINE.sql`
2. **API layer** — every API route filters by `authContext.user.franchise_id`. Super admins pass `scope=all` to bypass.
3. **Application layer** — `lib/middleware/franchise-isolation.ts`, `lib/utils/franchise.ts`, `lib/supabase/franchise-helpers.ts`

### 2.4 Primary Business Flow: Quote → Booking → Invoice

```
Step 1:  Staff opens /create-invoice (New Booking wizard)
Step 2:  Selects customer (existing or inline new customer entry)
Step 3:  Chooses booking type: Product Rental | Direct Sale | Package Booking
Step 4:  Selects products/package + quantities
Step 5:  Pricing computed: subtotal + GST (18%) + distance charge + coupon + security deposit
Step 6:  Quote saved → status: generated
Step 7:  PDF generated via /api/quotes/download-pdf (Professional or Compact template)
Step 8:  Sent via WhatsApp (WATI) or printed → status: sent
Step 9:  Customer confirms → /api/quotes/convert → creates product_orders or package_bookings record
Step 10: Barcodes auto-assigned to booking items → status: confirmed
Step 11: Delivery created, staff assigned, delivery date set
Step 12: Delivery executed → photo + signature uploaded → status: delivered
Step 13: Return scheduled, items barcode-scanned back in → status: returned
Step 14: Items sent to laundry batch → tracked until return
Step 15: Invoice generated from booking, sent via WhatsApp/email → payment recorded
Step 16: Booking status → order_complete
Step 17: Reports and dashboard updated
```

---

## 3. All Modules — Roots & Branches

### Module Status Summary

| Module | Key Routes | Status | Priority |
|--------|-----------|--------|----------|
| Auth & Session | `/auth/login`, `/api/auth/*` | ✅ Complete | 🔴 Critical |
| Dashboard | `/dashboard`, `/api/dashboard/stats` | ✅ Complete | 🔴 Critical |
| Bookings (Rental) | `/bookings/*`, `/api/bookings/*` | ✅ Complete | 🔴 Critical |
| Direct Sales | `/create-invoice`, `/api/direct-sales` | ✅ Complete | 🔴 Critical |
| Customers | `/customers/*`, `/api/customers/*` | ✅ Complete | 🔴 Critical |
| Inventory & Products | `/inventory/*`, `/api/products/*` | ✅ Complete | 🔴 Critical |
| Barcode/QR System | `/barcode-search`, `/api/barcodes/*` | ✅ Complete | 🟠 High |
| Packages (Sets) | `/sets/*`, `/api/packages/*` | ✅ Complete | 🟠 High |
| Quotes | `/quotes/*`, `/api/quotes/*` | ✅ Complete | 🟠 High |
| Invoices | `/invoices/*`, `/api/invoices/*` | ✅ Complete | 🟠 High |
| Deliveries & Returns | `/deliveries/*`, `/api/deliveries/*` | ✅ Complete | 🔴 Critical |
| Laundry | `/laundry`, `/api/laundry/*` | ✅ Complete | 🟡 Medium |
| Expenses | `/expenses`, `/api/expenses` | ✅ Complete | 🟡 Medium |
| Staff Management | `/staff`, `/api/staff/*` | ✅ Complete | 🟠 High |
| Payroll | `/payroll`, `/api/payroll/*` | ✅ Complete | 🟡 Medium |
| Attendance | `/attendance` | ⚠️ Partial | 🟡 Medium |
| Vendors | `/vendors`, `/api/vendors/*` | ✅ Complete | 🟡 Medium |
| Franchises | `/franchises/*`, `/api/franchises` | ✅ Complete | 🔴 Critical |
| Reports | `/reports`, `/api/reports/*` | ⚠️ Partial | 🟠 High |
| Financials | `/financials` (hidden) | 🚫 Hidden | 🟡 Medium |
| Notifications | `/notifications`, `/api/notifications/create` | ⚠️ Partial | 🟡 Medium |
| Tasks | `/tasks`, `/api/tasks/*` | ⚠️ Partial | 🟢 Low |
| Settings | `/settings`, `/api/settings/*` | ✅ Complete | 🟠 High |
| Integrations | `/integrations/*`, `/api/woocommerce/*`, `/api/wati/*` | ✅ Complete | 🟠 High |
| Distance Pricing | `/api/distance-pricing/*` | ✅ Complete | 🟠 High |
| Offers & Coupons | `/api/offers/*`, `/api/coupons/*` | ✅ Complete | 🟡 Medium |
| Admin / Health | `/admin/*`, `/api/admin/*` | ⚠️ Partial | 🟢 Low |
| Cron Automation | `/api/cron/*` | ⚠️ Partial | 🟠 High |

---

### 3.1 Auth & Session Module

**Routes:**
- `GET /` → Login page (root)
- `GET /auth/login` → Login UI
- `POST /api/auth/login` → Validate credentials, set cookies, return user+session
- `POST /api/auth/logout` → Clear all session cookies
- `GET /api/auth/user` → Return current user from cookie
- `POST /api/auth/change-password` → Update password (bcryptjs hash)

**Session Storage:**
- `localStorage.safawala_user` — full user JSON (client fast-access)
- Cookie `safawala_user` — server-readable session cookie
- Cookie `safawala_session` — legacy session format (still supported)
- Cookies `sb-*` — Supabase auth tokens (real-time DB access)

**⚠️ Issues:**
- Dual auth systems can desync (custom + Supabase)
- `AUTH_ENABLED` env flag disables all auth if accidentally omitted
- User permissions stored in localStorage (XSS risk)

---

### 3.2 Dashboard Module

**Routes:** `/dashboard`  
**API:** `GET /api/dashboard/stats`, `GET /api/recent-bookings`, `GET /api/calendar-bookings`

**KPI Cards:**
- Total Bookings | Active Bookings | Total Customers | Total Revenue
- Monthly Growth % | Low Stock Items | Conversion Rate | Avg Booking Value

**Widgets:**
- Revenue by Month chart (bar chart via Recharts)
- Bookings by Type: Package vs Product (donut)
- Booking Calendar (visual event calendar)
- Payment Reminders: Urgent / Soon / Upcoming / Later buckets with ₹ pending amounts
- Delivery Reminders: Today / Tomorrow / This Week
- Recent Bookings quick-list with status badges
- Pending Actions: Payments due, Deliveries due, Returns due, Overdue

---

### 3.3 Bookings Module (Core Revenue Driver)

**Two booking types:**
1. **Product Orders** (Rental + Direct Sale) — `product_orders` table
2. **Package Bookings** (Curated sets) — `package_bookings` table

**Booking Status Flow:**
```
pending_selection → confirmed → delivered → returned → order_complete
                                                  ↘ cancelled (at any stage)
```

**Status Meanings:**
- `pending_selection` — booking created, products not yet chosen
- `confirmed` — products selected, booking locked
- `delivered` — items at customer/venue
- `returned` — items scanned back in
- `order_complete` — payment settled, cycle complete
- `cancelled` — soft-deleted booking

**Payment Status:** `pending | partial | paid | refunded`  
**Payment Methods:** `cash | card | upi | bank_transfer | cheque`

**Financial Fields per Booking:**
```
total_amount          Full order value
paid_amount           Amount collected so far
subtotal_amount       Before tax/fees
gst_amount            GST computed (configurable %)
gst_percentage        Default: 18%
discount_amount       Manual discount
coupon_code           Applied coupon
coupon_discount       Coupon discount value
security_deposit      Refundable deposit
distance_amount       Computed from distance_pricing table
distance_km           KM to venue
```

**Event Fields:**
```
event_type            Wedding, Reception, Engagement, etc.
event_for             groom | bride | both
groom_name            Groom details
bride_name            Bride details
venue_name            Event venue
venue_address         Venue address
event_date            Main event date
delivery_date         When to deliver
delivery_time         Delivery time slot
return_date           When items return
return_time           Return time slot
```

**API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bookings` | GET | List all bookings (product + package merged, franchise-filtered) |
| `/api/bookings` | POST | Create new booking record |
| `/api/bookings/[id]` | GET | Full booking with customer, items, delivery info |
| `/api/bookings/[id]` | PUT | Update booking fields |
| `/api/bookings/[id]/items` | GET/POST | Get/add booking line items |
| `/api/bookings/[id]/status` | PATCH | Update booking status |
| `/api/bookings/[id]/barcodes` | GET/POST | Auto-assign/list barcodes for items |
| `/api/bookings/archive` | POST | Soft-archive booking |
| `/api/bookings/archived` | GET | List archived bookings |
| `/api/bookings/restore` | POST | Restore archived booking |
| `/api/bookings/details` | GET | Denormalized detail for invoice/PDF |
| `/api/bookings-items` | GET | Cross-booking items query |
| `/api/direct-sales` | GET/POST | Direct sale (non-rental) orders |
| `/api/recent-bookings` | GET | Last N bookings for dashboard widget |
| `/api/calendar-bookings` | GET | Bookings formatted for calendar view |
| `/api/debug-bookings` | GET | ⚠️ Debug route (should be removed from prod) |

**Page Routes:**
- `/create-invoice` — **Primary** New Booking wizard (main entry point)
- `/bookings` — List view (tabs: Active, Delivered, Returned, Complete, Cancelled)
- `/bookings/calendar` — Calendar view by event_date / delivery_date
- `/bookings/[id]` — Detail view (customer info, items, timeline, payments)
- `/bookings/[id]/edit` — Edit booking
- `/bookings/[id]/select-products` — Product selection sub-flow
- `/bookings/add` | `/bookings/new` | `/bookings/create` — ⚠️ Duplicate creation routes
- `/bookings/package-booking` — Package booking shortcut
- `/create-product-order` — Product order creation
- `/book-package` — Package booking shortcut

---

### 3.4 Customers Module

**Customer Statuses:** `active | inactive | lead | prospect`

**Customer Data Model:**
```
id, customer_code (auto-generated), name, phone, whatsapp
email, address, city, pincode, state
franchise_id, assigned_staff_id
last_contact_date, status
notes[] (with created_by staff info)
staff_assignments[] (staff-customer relationship)
```

**API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/customers` | GET | List with search, filter, pagination |
| `/api/customers` | POST | Create new customer |
| `/api/customers/[id]` | GET | Detail with notes, booking history, assignments |
| `/api/customers/[id]` | PUT | Update customer record |
| `/api/customers/[id]` | DELETE | Soft delete |
| `/api/customer-addresses` | GET/POST | Multiple delivery addresses per customer |
| `/api/v1/customers` | GET | External API (versioned) |

---

### 3.5 Inventory & Products Module

**Product Features:**
- Full catalog with categories, SKU, barcode, cost_price, rental price
- **Product Variations**: color, design, material, size — each with own stock + barcode
- **Stock tracking**: `stock_total`, `stock_available`, `stock_booked`, `stock_damaged`
- Multi-image photo gallery per product
- Bulk CSV import/export
- Stock movement transaction log
- Inventory availability checker (check if items are free for date range)
- **Product Archive** — track damaged/lost/stolen/discontinued items

**Product Variation Fields:**
```
variation_name        e.g., "Gold - Large"
color, design, material, size
sku, barcode, qr_code
price_adjustment      Add/subtract from base price
rental_price_adjustment
stock_total, stock_available, stock_booked, stock_damaged
image_url, is_active
```

**API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/products` | GET | List with category/stock/search filters |
| `/api/products` | POST | Create product |
| `/api/products/[id]/variations` | GET/POST | List/create variations |
| `/api/products/generate-barcode` | POST | Auto-generate barcode |
| `/api/products/bulk-update-stock` | POST | Bulk stock quantity update |
| `/api/products/bulk-insert` | POST | Bulk product import |
| `/api/inventory/import` | POST | Import from CSV |
| `/api/inventory/export` | GET | Export as CSV/Excel |
| `/api/inventory/reserve` | POST | Reserve stock for booking (decrement available) |
| `/api/inventory/transactions` | GET | Stock movement history |
| `/api/product-archive` | GET/POST | Manage archived items |
| `/api/reports/inventory` | GET | Low stock report |
| `/api/delete-franchise-products` | DELETE | ⚠️ Admin: bulk delete franchise products |

---

### 3.6 Barcode & QR System

**Complete barcode ecosystem covering products, bookings, deliveries, and returns.**

**Barcode Flow:**
```
1. Product created → barcode auto-generated (or manually assigned)
2. Booking confirmed → barcodes auto-assigned from available pool
3. Delivery team scans barcodes to verify items before dispatch
4. Return team scans barcodes to check items back in
5. Laundry batch links to barcodes for post-return tracking
```

**Print Formats:**
- Standard barcode labels (JSBarcode SVG)
- 2×5 grid print layout (`/barcode-print-2x5`)
- Bulk barcode PDF download (`lib/barcode/bulk-download-pdf.ts`)
- **ZPL format** for Zebra industrial label printers (`lib/zebra-zpl-service.ts`)
- QR codes (qrcode library)

**API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/barcodes` | GET/POST | CRUD for barcode records |
| `/api/barcodes/scan` | POST | Look up product/booking by scanned barcode |
| `/api/barcodes/available` | GET | List unassigned barcodes in pool |
| `/api/barcode/lookup` | GET | Lookup by barcode string |
| `/api/v2/barcode-search` | GET | ⚠️ v2 search (legacy) |
| `/api/v2/generate-barcode` | POST | ⚠️ v2 generation (legacy) |
| `/api/v2/product-search-by-barcode` | GET | ⚠️ v2 product lookup (legacy) |
| `/api/v3/search-product-by-barcode` | GET | Latest barcode search |
| `/api/cleanup-barcodes` | POST | Remove orphaned barcode records |

⚠️ **Issue**: Four separate barcode search APIs (v1, v2, v2 alt, v3) need consolidation.

---

### 3.7 Packages Module (Sets & Variants)

**Packages are curated product collections sold as complete sets (e.g., "Groom's Wedding Package - Gold").**

**Data Structure:**
```
package_sets          Parent package (name, description, category, base pricing, franchise_id)
  └── package_variants  Tiers (Silver/Gold/Platinum, price_adjustment, stock_available)
packages_categories   Category taxonomy for sets
distance_pricing      Per-package or global distance surcharge tiers
```

**API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/packages` | GET | List sets (optionally with variants) |
| `/api/packages` | POST | Create package set |
| `/api/packages/categories` | GET/POST | Manage package categories |
| `/api/packages/variants` | GET | List all variants |
| `/api/packages/update` | PUT | Update set or variant |
| `/api/packages/delete` | DELETE | Soft-delete package |
| `/api/distance-pricing` | GET | Fetch distance pricing tiers |
| `/api/distance-pricing/save` | POST | Save/update distance tiers |
| `/api/distance-pricing/delete` | DELETE | Remove a tier |
| `/api/distance-pricing/compute` | POST | Compute distance charge for a given km |
| `/api/calculate-distance` | POST | Calculate road distance from address |

---

### 3.8 Quotes Module

**Quote Status Flow:**
```
generated → sent → viewed → accepted → converted (to booking)
                         ↘ rejected
```

**Quote Features:**
- Two booking subtypes: `rental` and `direct_sale`
- Two booking types: `product` (individual items) and `package` (curated sets)
- Inline new-customer entry (no prior customer record needed)
- Full event details: groom/bride names, venue, event type/date/time
- Full pricing: subtotal + GST + security deposit + coupon + distance
- **Two PDF templates**: Professional and Compact (`lib/pdf/`)
- WhatsApp sharing via WATI
- Conversion to booking creates `product_orders` or `package_bookings`
- `valid_until` date (7 days from creation by default)
- `sales_closed_by` / `sales_staff_name` attribution

**API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/quotes/download-pdf` | POST | Generate and return quote PDF |
| `/api/quotes/convert` | POST | Convert quote → confirmed booking |

---

### 3.9 Invoices Module

**Invoice Types:** `product_order | package_booking`

**Invoice Status Flow:**
```
draft → sent → partially_paid → paid
           ↘ overdue (past due_date)
           ↘ cancelled
```

**Invoice Features:**
- Auto-sequential invoice numbers via `invoice_sequences` table (per franchise, per year)
- GST calculation (default 18%)
- Coupon code application
- Distance charge inclusion
- Security deposit tracking
- PDF generation (jsPDF + autotable + HTML template)
- WhatsApp delivery via `/api/whatsapp/send-invoice`
- Archive and restore
- Settlement invoices for final payment adjustments

**API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/invoices/[id]` | GET | Full invoice with line items |
| `/api/invoices/[id]` | PUT | Update / mark paid |
| `/api/invoice-sequences` | GET/POST | Sequential number management |
| `/api/generate-invoice` | POST | Generate PDF from booking |
| `/api/generate-invoice-html` | POST | HTML invoice preview |
| `/api/invoices/archive` | POST | Archive invoice |
| `/api/invoices/restore` | POST | Restore archived invoice |
| `/api/whatsapp/send-invoice` | POST | Send invoice PDF via WhatsApp |
| `/api/settlements/[bookingId]` | GET/POST | Settlement/final invoice |

---

### 3.10 Deliveries & Returns Module

**Delivery Status Flow:**
```
pending → in_transit → delivered
                    ↘ returned (items picked back up)
                    ↘ cancelled
```

**Delivery Features:**
- Linked to booking record
- Staff assignment (delivery team)
- Photo proof upload (Supabase Storage)
- Digital signature capture at handover
- Unified handover dialog (delivery + item scan combined)
- Barcode scan verification at dispatch and return

**Returns Features:**
- Item-by-item condition assessment
- Damage notes per returned item
- Preview summary before confirming return
- Automatic stock level updates on return completion

**API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/deliveries` | GET | List deliveries (franchise-filtered) |
| `/api/deliveries/create` | POST | Create delivery from booking |
| `/api/deliveries/[id]` | GET/PUT | Get/update delivery |
| `/api/deliveries/[id]/mark-delivered` | POST | Mark delivered + upload proof |
| `/api/deliveries/[id]/status` | PATCH | Update delivery status |
| `/api/deliveries/[id]/staff` | POST | Assign staff to delivery |
| `/api/deliveries/[id]/handover` | POST | Handover with barcode scan |
| `/api/deliveries/[id]/unified-handover` | POST | Combined handover+signature+photo |
| `/api/deliveries/upload-photo` | POST | Upload delivery proof photo |
| `/api/deliveries/upload-signature` | POST | Upload digital signature |
| `/api/deliveries/process-return` | POST | Process return + update stock |
| `/api/returns/[id]/preview` | GET | Preview return impact |
| `/api/returns/[id]/process` | POST | Finalize return |
| `/api/returns/[id]/save` | POST | Save return record |
| `/api/returns` | GET | List all returns |

---

### 3.11 Laundry Module

**Routes:** `/laundry`  
**API:** `GET/POST /api/laundry`, `GET/POST /api/laundry/items`

**Features:**
- Track laundry batches (pickup date, return date, vendor assignment)
- Item-level tracking within each batch
- Link to vendor records for outsourced laundry
- Status tracking per batch

---

### 3.12 Expenses Module

**Routes:** `/expenses`  
**API:** `GET/POST /api/expenses`, `GET/POST /api/expense-categories`

**Expense Fields:**
```
category              (linked to expense_categories)
description
amount
expense_date
payment_method        cash | card | bank_transfer | cheque
receipt_number
vendor_name
notes
```

---

### 3.13 Staff, Payroll & Attendance

**Staff Management:**
- Staff are `users` records with `role = staff`
- Activate/deactivate via toggle-status
- Assign to deliveries via delivery_team
- Link to salary configurations for payroll

**Payroll Engine (`lib/payroll.ts`):**
```
Earnings:
  basic_salary
  hra (House Rent Allowance)
  transport_allowance
  medical_allowance
  other_allowances
  overtime_amount = overtime_hours × overtime_rate
  bonus

Deductions:
  pf_deduction = gross × pf_rate
  esi_deduction = gross × esi_rate
  tax_deduction = gross × tax_rate
  other_deductions

Net = Gross - Total Deductions

Attendance-driven:
  payable_days = present_days + leave_days
  Net scaled by: payable_days / working_days
```

**Payroll API Routes:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/staff` | GET/POST | List/create staff |
| `/api/staff/[id]` | GET/PUT | Get/update staff member |
| `/api/staff/[id]/toggle-status` | PATCH | Activate/deactivate |
| `/api/staff/delivery-team` | GET | Staff available for delivery |
| `/api/payroll/calculate` | POST | Compute payroll for month |
| `/api/payroll/seed` | POST | Seed demo payroll data |

---

### 3.14 Vendors Module

**Routes:** `/vendors`  
**API:** `GET/POST /api/vendors`, `GET/PUT/DELETE /api/vendors/[id]`, `PUT /api/vendors/update`

Used for: laundry vendors, product suppliers, service providers.

---

### 3.15 Franchises Module

**Routes:** `/franchises`, `/franchises/new`, `/franchises/[id]`  
**API:** `GET/POST /api/franchises`

**Franchise Fields:**
```
name, code (short identifier)
address, city, state, pincode
phone, email
manager_name
status: active | inactive
```

**All core tables carry `franchise_id` pointing to this table.**

---

### 3.16 Reports & Financials

**Reports (Partial):**
- Route: `/reports`
- API: `GET /api/reports/inventory`, `GET /api/reports/export`
- Current coverage: inventory levels, basic export

**Financials (Hidden):**
- Route: `/financials` — **commented out of sidebar navigation**
- No dedicated API
- Decision needed: build properly or remove entirely

---

### 3.17 Notifications & Tasks

**Notifications:**
- Route: `/notifications`
- API: `POST /api/notifications/create`
- System: `lib/notification-system.ts` (NotificationSystem class)
- Types: `info | success | warning | error`
- Priority: `low | medium | high | urgent`
- Bell icon component: `components/notifications/notification-bell.tsx`
- Auto-created on: quote created/sent, booking confirmed, delivery scheduled, etc.

**Tasks:**
- Route: `/tasks`
- API: `GET/POST /api/tasks`, `POST /api/tasks/create`, `PATCH /api/tasks/update-status`
- Features: assign tasks to staff, set due dates, track status

---

### 3.18 Settings & Configuration

**Settings Sections:**

| Section | API Route | What it controls |
|---------|-----------|-----------------|
| Company Info | `/api/settings/company` | Name, address, GST number, PAN, phone, email, website |
| Branding | `/api/settings/branding` | Logo, brand colors, document headers |
| Banking | `/api/settings/banking` | Bank account details on invoices |
| Documents | `/api/settings/documents` | Invoice/quote footer, terms & conditions |
| Templates | `/api/settings/templates` | HTML/PDF document layouts |
| WhatsApp | `/api/settings/whatsapp` | WATI credentials, notification toggles |
| Profile | `/api/settings/profile` | Personal password change, avatar |
| All | `/api/settings/all` | Fetch all settings in single request |

⚠️ **Issue**: Company settings is also exposed via `/api/company-settings` and `/api/company-settings-simple` — three overlapping routes for the same data.

---

### 3.19 Integrations

**WhatsApp — WATI Integration:**
- Send booking confirmations, payment reminders, invoices
- Template management (create, list, use)
- Automated reminder cron: `/api/cron/whatsapp-reminders`
- Manual triggers from booking/invoice/quote pages
- Central trigger service: `lib/services/whatsapp-triggers.ts`
- WATI API wrapper: `lib/services/wati-service.ts`

**WooCommerce Integration:**
- Bidirectional product sync (CRM ↔ WooCommerce)
- Stock level sync
- Auto-setup wizard for credentials
- Config stored in `integration_settings` table

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/wati/send` | POST | Send custom WhatsApp message |
| `/api/wati/notify` | POST | Send notification message |
| `/api/wati/templates` | GET | List available templates |
| `/api/wati/create-template` | POST | Create new template |
| `/api/wati/setup` | POST | Configure WATI credentials |
| `/api/whatsapp/send` | POST | Generic WhatsApp send |
| `/api/whatsapp/send-invoice` | POST | Send invoice PDF via WhatsApp |
| `/api/cron/whatsapp-reminders` | GET | Automated booking reminders cron |
| `/api/woocommerce/sync-products` | POST | Push products to WooCommerce |
| `/api/woocommerce/sync-from-woocommerce` | POST | Pull products from WooCommerce |
| `/api/woocommerce/sync-stock` | POST | Sync stock levels |
| `/api/woocommerce/config` | GET | Get integration config |
| `/api/woocommerce/auto-setup` | POST | Auto-configure WooCommerce |

---

### 3.20 Pricing Engine

**Distance-Based Pricing (`lib/distance-pricing.ts`):**
```
distance_pricing table:
  package_id (nullable → applies to all packages)
  min_km, max_km
  base_price_addition   Fixed amount added to order
  extra_price           Alternative fixed amount
  price_multiplier      Multiplier on base amount
  franchise_id
```
- Robust column name resolution (handles schema variations)
- Per-package rules checked first, then global tiers

**Offers Engine:**
- `offers` table: code, discount_type (%, fixed), discount_value, min_order_value
- Validate via `/api/offers/validate`, apply via `/api/offers/apply`
- Manage via `/api/offers` (CRUD)

**Coupons Engine:**
- `coupons` table: code, discount_type, discount_value, uses_remaining
- Validate via `/api/coupons/validate`, CRUD via `/api/coupons`

---

### 3.21 Admin & Health

**Routes:** `/admin/system-health`, `/admin/cleanup`  
**API:** `GET /api/admin/health-check`, `POST /api/admin/cleanup-logs`, `GET /api/audit`

**Audit Logger (`lib/audit-logger.ts`):**
- Logs sensitive operations: user creation, permission changes, data deletes
- `audit_logs` table: user_id, action, entity, entity_id, old_value, new_value

---

### 3.22 Cron Automation

| Cron Route | Schedule | Purpose |
|-----------|----------|---------|
| `/api/cron/whatsapp-reminders` | Daily | Send WhatsApp reminders for upcoming events |
| `/api/cron/cleanup-customers` | Weekly | Remove orphaned/test customer records |

⚠️ **Issue**: No monitoring/alerting if cron jobs fail. No Vercel Cron dashboard setup visible.

---

## 4. Database & Data Model

### Core Tables Reference

| Table | Key Columns | Relationships |
|-------|------------|---------------|
| `users` | id, email, name, role, franchise_id, permissions (JSONB), is_active, password_hash | Root auth entity |
| `franchises` | id, name, code, address, city, state, phone, email, manager_name, status | Parent of all data |
| `customers` | id, customer_code, name, phone, whatsapp, email, address, franchise_id, status | belongs_to franchise |
| `customer_addresses` | id, customer_id, label, address, city, pincode, is_default | belongs_to customer |
| `products` | id, name, sku, barcode, price, cost_price, stock_quantity, franchise_id, category_id | belongs_to category |
| `product_variations` | id, product_id, variation_name, color, size, sku, stock_total, stock_available, barcode | belongs_to product |
| `product_categories` | id, name, parent_id, franchise_id | hierarchical (self-ref) |
| `product_orders` | id, order_number, customer_id, franchise_id, status, event_date, delivery_date, total_amount, paid_amount | primary booking table |
| `product_order_items` | id, order_id, product_id, variation_id, quantity, unit_price, barcode | belongs_to product_order |
| `package_bookings` | id, booking_number, customer_id, franchise_id, status, package_set_id, variant_id | booking for package |
| `package_sets` | id, name, category_id, franchise_id, description, base_price | curated package |
| `package_variants` | id, set_id, name, price_adjustment, stock_available, franchise_id | tier of package_set |
| `packages_categories` | id, name, franchise_id | categories for sets |
| `deliveries` | id, booking_id, booking_type, customer_id, franchise_id, status, delivery_date | delivery records |
| `delivery_items` | id, delivery_id, product_id, barcode, quantity, condition_on_return | items per delivery |
| `quotes` | id, quote_number, customer_id, franchise_id, type, status, total_amount, valid_until | pre-booking estimate |
| `quote_items` | id, quote_id, product_id, product_name, quantity, unit_price | line items |
| `invoices` | id, invoice_number, customer_id, franchise_id, invoice_type, booking_id, status | financial invoice |
| `invoice_items` | id, invoice_id, product_name, quantity, unit_price, total_price | invoice line items |
| `invoice_sequences` | id, franchise_id, year, sequence_number, prefix | sequential numbering |
| `expenses` | id, franchise_id, category, description, amount, expense_date | business expenses |
| `expense_categories` | id, name, franchise_id | expense taxonomy |
| `laundry` | id, franchise_id, status, pickup_date, return_date, vendor_id | laundry batches |
| `laundry_items` | id, laundry_id, product_id, barcode, notes | items in batch |
| `barcodes` | id, barcode_string, product_id, variation_id, franchise_id, is_assigned | central registry |
| `vendors` | id, name, phone, email, address, franchise_id, type | suppliers |
| `notifications` | id, title, message, type, priority, user_id, franchise_id, read, action_url | in-app inbox |
| `tasks` | id, title, description, assigned_to, franchise_id, status, due_date | task management |
| `distance_pricing` | id, package_id (nullable), min_km, max_km, base_price_addition, franchise_id | delivery pricing |
| `offers` | id, code, discount_type, discount_value, min_order_value, franchise_id, is_active | promotions |
| `coupons` | id, code, discount_type, discount_value, uses_remaining, franchise_id | coupon codes |
| `banks` | id, account_name, account_number, ifsc, bank_name, franchise_id | business accounts |
| `integration_settings` | id, integration_name, is_active, settings (JSONB), franchise_id | 3rd-party configs |
| `salary_configurations` | id, user_id, franchise_id, basic_salary, hra, pf_rate, esi_rate, is_active | payroll setup |
| `attendance` | id, user_id, franchise_id, date, status, check_in, check_out, hours_worked | daily attendance |
| `audit_logs` | id, user_id, action, entity, entity_id, old_value, new_value, created_at | audit trail |

---

## 5. Gaps, Issues & Improvements

### 5.1 🔴 Critical Issues (Fix Immediately)

| Issue | Description | Impact | Effort |
|-------|-------------|--------|--------|
| Dual Auth Systems | Custom cookie + Supabase auth can desync → sporadic 401 errors. Consolidate to Supabase-only. | High | Medium |
| Fragmented Booking Entry | 5 routes for creating a booking: `/bookings/add`, `/bookings/new`, `/bookings/create`, `/bookings/package-booking`, `/create-invoice`. Confusing for staff. | High | Low |
| No Auth Production Guard | `AUTH_ENABLED=true` env var can be accidentally omitted, disabling ALL auth in production. Add hard fail-safe. | High | Low |
| User Data in localStorage | Full user JSON (incl. permissions) stored in localStorage — vulnerable to XSS attacks. Move to httpOnly cookie only. | High | Medium |
| Multiple Settings Routes | Company settings exposed via 3 separate API paths. Causes stale data and confusion. | High | Low |

### 5.2 🟠 Technical Debt (Address Soon)

| Issue | Description | Impact | Effort |
|-------|-------------|--------|--------|
| Backup Files in Codebase | `invoice-generator.old.ts`, `pdf-components.backup.ts`, `page-OLD-BACKUP.tsx`, `route-old.ts`, `page-old.tsx` etc. pollute the repo. | Medium | Low |
| Barcode API Versioning | 4 separate barcode search endpoints (v1/v2/v3). Should be a single `/api/barcodes/search` endpoint. | Medium | Low |
| Debug Routes in Production | `/api/settings/debug`, `/api/debug-bookings`, `/api/test-franchise`, `/app/dev/tests`, `/app/test-auth`, `/app/test-barcode-scanner` — dangerous if accessible. | Medium | Low |
| Financials Page Hidden | Module code exists but is commented out of navigation. Needs decision: build or remove. | Medium | Medium |
| Console.log Overload | Extensive `console.log` throughout API routes (especially bookings). Pollutes production logs. Replace with `lib/log-service.ts`. | Low | Low |

### 5.3 🟠 Feature Gaps (Build Soon)

| Gap | Description | Impact | Effort |
|-----|-------------|--------|--------|
| Email Notifications | System is WhatsApp-only. No transactional email for invoices, confirmations, password resets. Add SendGrid / Resend. | High | Medium |
| Automated Test Coverage | auth.spec.ts exists but minimal coverage. Need unit tests for pricing logic, payroll, E2E for booking flow. | High | High |
| Payment Gateway | Payments recorded manually. Add Razorpay / Stripe for online payment links sent via WhatsApp. | High | High |
| Mobile App / PWA | Delivery staff need mobile interface for barcode scanning, photo upload, signature, status updates. | High | High |
| Customer Portal | No customer-facing portal for viewing bookings, downloading invoices, or making payments online. | Medium | High |
| Reporting Depth | Add: Revenue by staff, Product rental frequency, Customer LTV, Seasonal forecasting. | Medium | Medium |
| Attendance Self-Service | Staff can't self-clock in/out. Add QR-based or location-based clock-in. | Low | Medium |
| SMS Fallback | No fallback if WhatsApp fails. Add SMS via Twilio/MSG91. | Medium | Low |
| Inventory Reorder Alerts | Low-stock alerts exist but no automated reorder workflow or vendor emails. | Medium | Low |
| Cron Monitoring | Cron routes exist but no monitoring if they fail. Add Cronitor or Vercel Cron dashboard. | Medium | Low |

### 5.4 🟡 Design / UX Improvements

| Issue | Description | Impact | Effort |
|-------|-------------|--------|--------|
| Booking Creation UX | `/create-invoice` URL is misleading for the New Booking wizard. Rename + consolidate. | Medium | Low |
| Mobile Responsiveness | `lib/responsive-patterns.ts` exists but complex pages (bookings list, inventory table) may not render well on mobile. | Medium | Medium |
| Dark Mode | `next-themes` installed but dark mode likely incomplete. Complete it across all modules. | Low | Medium |
| Skeleton Loaders | Only dashboard has skeleton loaders. Extend to all pages for better perceived performance. | Low | Low |

---

## 6. Phased Roadmap

### Phase 1 — Stability & Security (Weeks 1–4)

| # | Task | Priority |
|---|------|----------|
| 1 | Consolidate auth to Supabase-only, remove legacy `safawala_session` cookie | 🔴 Critical |
| 2 | Move user data from localStorage to httpOnly cookie | 🔴 Critical |
| 3 | Add hard fail-safe: AUTH_ENABLED cannot be false in production | 🔴 Critical |
| 4 | Delete all `*.old.ts`, `*.backup.ts`, `*OLD*.tsx` files from codebase | 🟠 High |
| 5 | Remove/protect debug API routes (`/api/debug-*`, `/app/dev/*`, `/app/test-*`) | 🟠 High |
| 6 | Merge company-settings API routes into single canonical endpoint | 🟠 High |
| 7 | Consolidate booking creation to single `/bookings/new` entry point | 🟠 High |
| 8 | Replace `console.log` with structured logging via `lib/log-service.ts` | 🟡 Medium |

### Phase 2 — Core Enhancements (Weeks 5–10)

| # | Task | Priority |
|---|------|----------|
| 9 | Add transactional email (SendGrid/Resend) — booking confirmations, invoices | 🟠 High |
| 10 | Implement Razorpay payment links — generate + send via WhatsApp | 🟠 High |
| 11 | Build full Reports module — revenue by staff, product frequency, CLV, seasonal | 🟠 High |
| 12 | Consolidate barcode API versions into `/api/barcodes/search` | 🟡 Medium |
| 13 | Add automated test suite — pricing unit tests + booking E2E flow | 🟠 High |
| 14 | Add Cron monitoring (Cronitor or Vercel Cron dashboard) | 🟡 Medium |
| 15 | Implement SMS fallback via Twilio/MSG91 | 🟡 Medium |
| 16 | Complete Attendance — staff self clock-in via QR code | 🟡 Medium |

### Phase 3 — Growth Features (Weeks 11–20)

| # | Task | Priority |
|---|------|----------|
| 17 | Build mobile PWA for delivery staff — scan, photo, signature, status | 🟠 High |
| 18 | Customer self-service portal — view bookings, download invoices, pay online | 🟡 Medium |
| 19 | AI demand forecasting — predict peak periods from booking history | 🟡 Medium |
| 20 | Build Financials module (P&L, cash flow, margin analysis) | 🟡 Medium |
| 21 | Inventory reorder automation — vendor-linked auto reorder at min_stock_level | 🟡 Medium |
| 22 | Franchise analytics — super-admin comparing performance across franchises | 🟡 Medium |
| 23 | Automated payment collection reminders — scheduled follow-ups for overdue | 🟡 Medium |
| 24 | Complete dark mode across all modules | 🟢 Low |

---

## 7. Complete Route Map

### 7.1 All Page Routes

| Route | Description | Module |
|-------|-------------|--------|
| `/` | Login page (root, always public) | Auth |
| `/auth/login` | Login form | Auth |
| `/dashboard` | Main KPI dashboard | Dashboard |
| `/bookings` | Bookings list (Active/Delivered/Returned/Complete/Cancelled tabs) | Bookings |
| `/bookings/calendar` | Calendar view by event/delivery date | Bookings |
| `/bookings/add` | ⚠️ Add booking (duplicate route) | Bookings |
| `/bookings/new` | ⚠️ New booking (duplicate route) | Bookings |
| `/bookings/create` | ⚠️ Create booking (duplicate route) | Bookings |
| `/bookings/[id]` | Booking detail view | Bookings |
| `/bookings/[id]/edit` | Edit booking | Bookings |
| `/bookings/[id]/select-products` | Product selection sub-flow | Bookings |
| `/bookings/package-booking` | ⚠️ Package booking shortcut | Bookings |
| `/create-invoice` | **Primary** New Booking wizard (main entry point) | Bookings |
| `/create-product-order` | Product order creation | Bookings |
| `/book-package` | Package booking shortcut | Bookings |
| `/customers` | Customer list | Customers |
| `/customers/new` | New customer form | Customers |
| `/customers/[id]` | Customer profile with history | Customers |
| `/customers/[id]/edit` | Edit customer | Customers |
| `/inventory` | Inventory list + dashboard | Inventory |
| `/inventory/add` | Add new product | Inventory |
| `/inventory/edit/[id]` | Edit product | Inventory |
| `/inventory/categories` | Manage product categories | Inventory |
| `/product-archive` | Damaged/lost/stolen product records | Inventory |
| `/barcode-search` | Search by barcode | Barcodes |
| `/barcode-print-2x5` | 2×5 barcode print layout | Barcodes |
| `/sets` | Package sets list | Packages |
| `/quotes` | Quotes list with analytics | Quotes |
| `/quotes/new` | Create new quote | Quotes |
| `/invoices` | Invoice list | Invoices |
| `/product-rental-invoices` | Rental invoice list | Invoices |
| `/deliveries` | Deliveries & returns list | Deliveries |
| `/deliveries/[id]` | Delivery detail | Deliveries |
| `/laundry` | Laundry batch management | Laundry |
| `/expenses` | Business expense records | Expenses |
| `/vendors` | Vendor management | Vendors |
| `/staff` | Staff list & management | Staff |
| `/payroll` | Payroll computation by month | Payroll |
| `/attendance` | Attendance tracking | Attendance |
| `/reports` | Business reports & export | Reports |
| `/financials` | ⚫ Financial P&L (hidden from nav) | Financials |
| `/franchises` | Franchise list | Franchises |
| `/franchises/new` | Add new franchise | Franchises |
| `/franchises/[id]` | Franchise detail | Franchises |
| `/notifications` | In-app notification inbox | Notifications |
| `/tasks` | Internal task list | Tasks |
| `/integrations` | Integration management hub | Integrations |
| `/integrations/woocommerce` | WooCommerce config & sync | Integrations |
| `/integrations/wati-templates` | WATI message templates | Integrations |
| `/integrations/wati-test` | ⚠️ WATI test page | Dev/Test |
| `/settings` | Full settings panel | Settings |
| `/settings-simple` | ⚠️ Simplified settings (duplicate?) | Settings |
| `/admin/system-health` | System health dashboard | Admin |
| `/admin/cleanup` | Data cleanup utilities | Admin |
| `/sales` | Sales overview | Sales |
| `/dev/tests` | ⚠️ Dev test runner | Dev only |
| `/test-auth` | ⚠️ Auth test page | Dev only |
| `/test-barcode-scanner` | ⚠️ Barcode scanner test | Dev only |
| `/test-staff` | ⚠️ Staff test page | Dev only |

### 7.2 Complete API Route List

#### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/user`
- `POST /api/auth/change-password`

#### Bookings
- `GET/POST /api/bookings`
- `GET/PUT/DELETE /api/bookings/[id]`
- `GET/POST /api/bookings/[id]/items`
- `PATCH /api/bookings/[id]/status`
- `GET/POST /api/bookings/[id]/barcodes`
- `POST /api/bookings/archive`
- `GET /api/bookings/archived`
- `POST /api/bookings/restore`
- `GET /api/bookings/details`
- `GET /api/bookings-items`
- `GET/POST /api/direct-sales`
- `GET /api/recent-bookings`
- `GET /api/calendar-bookings`
- `GET /api/debug-bookings` ⚠️

#### Customers
- `GET/POST /api/customers`
- `GET/PUT/DELETE /api/customers/[id]`
- `GET/POST /api/customer-addresses`
- `GET /api/v1/customers`

#### Products & Inventory
- `GET/POST /api/products`
- `GET/POST /api/products/[id]/variations`
- `POST /api/products/generate-barcode`
- `POST /api/products/bulk-update-stock`
- `POST /api/products/bulk-insert`
- `POST /api/inventory/import`
- `GET /api/inventory/export`
- `POST /api/inventory/reserve`
- `GET /api/inventory/transactions`
- `GET/POST /api/product-archive`
- `DELETE /api/delete-franchise-products` ⚠️

#### Barcodes
- `GET/POST /api/barcodes`
- `POST /api/barcodes/scan`
- `GET /api/barcodes/available`
- `GET /api/barcode/lookup`
- `GET /api/v2/barcode-search` ⚠️
- `POST /api/v2/generate-barcode` ⚠️
- `GET /api/v2/product-search-by-barcode` ⚠️
- `GET /api/v3/search-product-by-barcode`
- `POST /api/cleanup-barcodes`

#### Packages
- `GET/POST /api/packages`
- `GET/POST /api/packages/categories`
- `GET /api/packages/variants`
- `PUT /api/packages/update`
- `DELETE /api/packages/delete`

#### Deliveries & Returns
- `GET /api/deliveries`
- `POST /api/deliveries/create`
- `GET/PUT/DELETE /api/deliveries/[id]`
- `POST /api/deliveries/[id]/mark-delivered`
- `PATCH /api/deliveries/[id]/status`
- `POST /api/deliveries/[id]/staff`
- `POST /api/deliveries/[id]/handover`
- `POST /api/deliveries/[id]/unified-handover`
- `PUT /api/deliveries/update`
- `POST /api/deliveries/update-status`
- `POST /api/deliveries/upload-photo`
- `POST /api/deliveries/upload-signature`
- `POST /api/deliveries/process-return`
- `GET /api/returns`
- `GET /api/returns/[id]/preview`
- `POST /api/returns/[id]/process`
- `POST /api/returns/[id]/save`

#### Quotes & Invoices
- `POST /api/quotes/download-pdf`
- `POST /api/quotes/convert`
- `GET/POST/DELETE /api/invoices/[id]`
- `POST /api/invoices/archive`
- `POST /api/invoices/restore`
- `GET/POST /api/invoice-sequences`
- `POST /api/generate-invoice`
- `POST /api/generate-invoice-html`
- `GET/POST /api/settlements/[bookingId]`

#### Staff & Payroll
- `GET/POST /api/staff`
- `GET/PUT/DELETE /api/staff/[id]`
- `POST /api/staff/update`
- `DELETE /api/staff/delete`
- `PATCH /api/staff/toggle-status`
- `PATCH /api/staff/[id]/toggle-status`
- `GET /api/staff/delivery-team`
- `POST /api/payroll/calculate`
- `POST /api/payroll/seed`

#### Expenses, Laundry, Vendors
- `GET/POST /api/expenses`
- `GET/POST /api/expense-categories`
- `GET/POST /api/laundry`
- `GET/POST /api/laundry/items`
- `GET/POST /api/vendors`
- `GET/PUT/DELETE /api/vendors/[id]`
- `PUT /api/vendors/update`

#### Franchises
- `GET/POST /api/franchises`
- `GET /api/test-franchise` ⚠️

#### Pricing, Offers, Coupons
- `GET /api/distance-pricing`
- `POST /api/distance-pricing/save`
- `DELETE /api/distance-pricing/delete`
- `POST /api/distance-pricing/compute`
- `POST /api/calculate-distance`
- `GET/POST /api/offers`
- `POST /api/offers/validate`
- `POST /api/offers/apply`
- `GET/POST /api/coupons`
- `POST /api/coupons/validate`
- `GET/POST /api/banks`
- `GET/PUT/DELETE /api/banks/[id]`
- `GET/POST /api/services`

#### Settings
- `GET/PUT /api/settings/company`
- `GET /api/settings/company/all`
- `GET/PUT /api/settings/branding`
- `GET/PUT /api/settings/banking`
- `GET/PUT /api/settings/documents`
- `GET/PUT /api/settings/templates`
- `GET/PUT /api/settings/whatsapp`
- `GET/PUT /api/settings/profile`
- `GET /api/settings/all`
- `GET /api/settings/debug` ⚠️
- `GET/PUT /api/company-settings` ⚠️ (duplicate)
- `GET/PUT /api/company-settings-simple` ⚠️ (duplicate)

#### Integrations (WhatsApp + WooCommerce)
- `POST /api/wati/send`
- `POST /api/wati/notify`
- `GET /api/wati/templates`
- `POST /api/wati/create-template`
- `POST /api/wati/setup`
- `POST /api/whatsapp/send`
- `POST /api/whatsapp/send-invoice`
- `GET /api/cron/whatsapp-reminders`
- `POST /api/woocommerce/sync-products`
- `POST /api/woocommerce/sync-from-woocommerce`
- `POST /api/woocommerce/sync-stock`
- `GET /api/woocommerce/config`
- `POST /api/woocommerce/auto-setup`
- `POST /api/woocommerce/update-credentials`
- `GET /api/integrations/load`
- `POST /api/integrations/save`
- `GET /api/ecommerce/auth`

#### Admin, Health, Tasks, Notifications
- `GET /api/admin/health-check`
- `POST /api/admin/cleanup-logs`
- `GET /api/audit`
- `GET /api/health`
- `GET/POST /api/tasks`
- `POST /api/tasks/create`
- `PATCH /api/tasks/update-status`
- `POST /api/notifications/create`
- `GET /api/reports/inventory`
- `GET /api/reports/export`
- `GET /api/dashboard/stats`
- `POST /api/upload`
- `POST /api/upload-simple`
- `POST /api/uploads/presign`
- `GET /api/uploads/fallback`
- `GET /api/files`
- `POST /api/images/save`
- `GET /api/proxy-image`
- `POST /api/venue-area-extractor`
- `POST /api/pincode-service` (via `lib/pincode-service.ts`)
- `DELETE /api/delete`
- `POST /api/setup/add-columns`
- `POST /api/setup/add-gst-percentage`
- `POST /api/setup/company-settings`
- `POST /api/setup/exec-sql` ⚠️
- `POST /api/data`
- `POST /api/cron/cleanup-customers`
- `GET /api/tests` ⚠️
- `GET /api/v2/barcode-search` ⚠️

---

## 8. Summary & Quick Wins

### Strengths of the Current System

- **Complete rental cycle management** — Quote → Booking → Delivery → Return → Laundry → Invoice
- **Strong multi-tenancy** — RLS + franchise_id isolation throughout
- **Rich barcode/QR ecosystem** — generation, scanning, printing, bulk ops, ZPL for Zebra printers
- **WhatsApp-first communication** — well-integrated WATI system
- **WooCommerce channel** — bidirectional sync for online sales
- **Good data model** — types well-defined, relationships clear, proper JSONB for flexible fields
- **Modern tech stack** — Next.js 14, TypeScript, Supabase — maintainable and scalable
- **Payroll engine** — comprehensive with PF/ESI/tax, overtime, attendance integration
- **Distance pricing** — flexible, per-package or global, with formula variants

### 8.1 Immediate Quick Wins (< 1 week each)

1. **Delete all backup/old files** — `*.old.ts`, `*.backup.ts`, `*OLD*.tsx` — reduce codebase noise immediately
2. **Redirect duplicate booking routes** — `/bookings/add`, `/bookings/new`, `/bookings/create` → all redirect to `/bookings/new` (canonical)
3. **Add AUTH_ENABLED production guard** — one `if (!AUTH_ENABLED && process.env.NODE_ENV === 'production') throw` line
4. **Move permissions out of localStorage** — write to httpOnly cookie instead
5. **Protect debug routes** — add role check to `/api/debug-*`, `/api/test-*`, remove `/app/dev/*`, `/app/test-*`
6. **Write a README.md** — module overview, env vars required, setup instructions
7. **Unify company settings API** — single `/api/settings/company` endpoint, deprecate others

### 8.2 Key Metrics to Track Post-Improvements

- **Booking conversion rate** — quotes that become confirmed bookings (%)
- **Quote-to-booking time** — hours from quote creation to booking confirmation
- **Delivery on-time rate** — deliveries made by scheduled delivery_date (%)
- **Return damage rate** — items returned damaged vs total returned (%)
- **Staff utilization** — booked delivery hours / total available hours (%)
- **Revenue per franchise** — monthly breakdown by franchise
- **Customer retention rate** — repeat bookings within 12 months (%)
- **Invoice collection time** — average days from invoice to payment

---

*Document generated from full static analysis of the `safawala-crm` repository.*  
*Analyzed: 230+ TypeScript files | 130+ API routes | 50+ page routes | 25+ modules | 35+ database tables*
