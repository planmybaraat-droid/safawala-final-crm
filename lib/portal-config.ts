export type DepartmentSlug =
  | "admin"
  | "booking"
  | "warehouse"
  | "qc"
  | "delivery"
  | "styling"
  | "accounts"
  | "hr"
  | "travels"

export interface PortalTab {
  icon: string
  label: string
  href: string
}

export interface PortalConfig {
  slug: DepartmentSlug
  label: string
  portalName: string
  icon: string
  color: string
  gradient: string
  allowedRoles: string[]
  tabs: PortalTab[]
}

export const PORTAL_CONFIG: Record<DepartmentSlug, PortalConfig> = {
  admin: {
    slug: "admin",
    label: "Administration",
    portalName: "Admin Portal",
    icon: "crown",
    color: "#f97316",
    gradient: "from-orange-500 to-orange-600",
    allowedRoles: ["super_admin"],
    tabs: [
      { icon: "home", label: "Home", href: "/portal/admin" },
      { icon: "globe", label: "Franchises", href: "/portal/admin/franchises" },
      { icon: "users", label: "Staff", href: "/portal/admin/staff" },
      { icon: "bar-chart", label: "Reports", href: "/portal/admin/reports" },
      { icon: "settings", label: "Settings", href: "/portal/admin/settings" },
    ],
  },

  booking: {
    slug: "booking",
    label: "Sales & Booking",
    portalName: "Booking Portal",
    icon: "target",
    color: "#22c55e",
    gradient: "from-green-500 to-green-600",
    allowedRoles: ["super_admin", "franchise_admin", "staff", "booking_staff"],
    tabs: [
      { icon: "home", label: "Home", href: "/portal/booking" },
      { icon: "calendar", label: "Bookings", href: "/portal/booking/bookings" },
      { icon: "users", label: "Customers", href: "/portal/booking/customers" },
      { icon: "document", label: "Quotes", href: "/portal/booking/quotes" },
      { icon: "user", label: "Me", href: "/portal/booking/profile" },
    ],
  },

  warehouse: {
    slug: "warehouse",
    label: "Inventory & Warehouse",
    portalName: "Warehouse Portal",
    icon: "box",
    color: "#a855f7",
    gradient: "from-purple-500 to-purple-600",
    allowedRoles: ["super_admin", "franchise_admin", "staff", "warehouse_staff"],
    tabs: [
      { icon: "home", label: "Home", href: "/portal/warehouse" },
      { icon: "clipboard", label: "Pick & Pack", href: "/portal/warehouse/tasks" },
      { icon: "package", label: "Stock", href: "/portal/warehouse/inventory" },
      { icon: "laundry", label: "Laundry", href: "/portal/warehouse/laundry" },
      { icon: "user", label: "Me", href: "/portal/warehouse/profile" },
    ],
  },

  qc: {
    slug: "qc",
    label: "Quality Control",
    portalName: "QC Portal",
    icon: "search",
    color: "#eab308",
    gradient: "from-yellow-500 to-yellow-600",
    allowedRoles: ["super_admin", "franchise_admin", "staff", "qc_staff"],
    tabs: [
      { icon: "home", label: "Home", href: "/portal/qc" },
      { icon: "search", label: "Inspect", href: "/portal/qc/inspect" },
      { icon: "alert-triangle", label: "Damage", href: "/portal/qc/damage" },
      { icon: "clipboard", label: "Orders", href: "/portal/qc/work-orders" },
      { icon: "user", label: "Me", href: "/portal/qc/profile" },
    ],
  },

  delivery: {
    slug: "delivery",
    label: "Dispatch & Shipping",
    portalName: "Dispatch Portal",
    icon: "truck",
    color: "#14b8a6",
    gradient: "from-teal-500 to-teal-600",
    allowedRoles: ["super_admin", "franchise_admin", "staff", "delivery_staff"],
    tabs: [
      { icon: "home", label: "Home", href: "/portal/delivery" },
      { icon: "truck", label: "Dispatch", href: "/portal/delivery/deliveries" },
      { icon: "refresh", label: "Returns", href: "/portal/delivery/returns" },
      { icon: "map-pin", label: "Track", href: "/portal/delivery/routes" },
      { icon: "user", label: "Me", href: "/portal/delivery/profile" },
    ],
  },

  styling: {
    slug: "styling",
    label: "Safa Styling",
    portalName: "Stylist Portal",
    icon: "crown",
    color: "#ec4899",
    gradient: "from-pink-500 to-pink-600",
    allowedRoles: ["super_admin", "franchise_admin", "staff", "stylist"],
    tabs: [
      { icon: "home", label: "Home", href: "/portal/styling" },
      { icon: "clipboard", label: "Assignments", href: "/portal/styling/assignments" },
      { icon: "rupee", label: "Earnings", href: "/portal/styling/earnings" },
      { icon: "user", label: "Me", href: "/portal/styling/profile" },
    ],
  },

  accounts: {
    slug: "accounts",
    label: "Finance & Accounts",
    portalName: "Accounts Portal",
    icon: "rupee",
    color: "#ef4444",
    gradient: "from-red-500 to-red-600",
    allowedRoles: ["super_admin", "franchise_admin", "accounts_staff"],
    tabs: [
      { icon: "home", label: "Home", href: "/portal/accounts" },
      { icon: "credit-card", label: "Payments", href: "/portal/accounts/payments" },
      { icon: "receipt", label: "Expenses", href: "/portal/accounts/expenses" },
      { icon: "bar-chart", label: "Reports", href: "/portal/accounts/reports" },
      { icon: "user", label: "Me", href: "/portal/accounts/profile" },
    ],
  },

  hr: {
    slug: "hr",
    label: "Human Resources",
    portalName: "HR Portal",
    icon: "users",
    color: "#6366f1",
    gradient: "from-indigo-500 to-indigo-600",
    allowedRoles: ["super_admin", "franchise_admin", "staff", "hr_staff"],
    tabs: [
      { icon: "home",      label: "Home",       href: "/portal/hr" },
      { icon: "team",      label: "Staff",      href: "/portal/hr/staff" },
      { icon: "calendar",  label: "Attendance", href: "/portal/hr/attendance" },
      { icon: "rupee",     label: "Payroll",    href: "/portal/hr/payroll" },
      { icon: "clipboard", label: "Recruit",    href: "/portal/hr/recruitment" },
      { icon: "document",  label: "Letters",    href: "/portal/hr/letters" },
      { icon: "search",    label: "KYC",        href: "/portal/hr/kyc" },
      { icon: "rupee",     label: "Ledger",     href: "/portal/hr/ledger" },
      { icon: "user",      label: "Me",         href: "/portal/hr/profile" },
    ],
  },

  travels: {
    slug: "travels",
    label: "Travels & Tickets",
    portalName: "Travel Portal",
    icon: "map-pin",
    color: "#0891b2",
    gradient: "from-cyan-600 to-cyan-700",
    allowedRoles: ["super_admin", "franchise_admin", "staff", "travels_staff"],
    tabs: [
      { icon: "home",      label: "Home",       href: "/portal/travels" },
      { icon: "calendar",  label: "Events",     href: "/portal/travels/assignments" },
      { icon: "map-pin",   label: "Tickets",    href: "/portal/travels/tickets" },
      { icon: "team",      label: "Stylists",   href: "/portal/travels/stylists" },
      { icon: "user",      label: "Me",         href: "/portal/travels/profile" },
    ],
  },
}

export function getPortalConfig(dept: string): PortalConfig | null {
  return PORTAL_CONFIG[dept as DepartmentSlug] ?? null
}

/** Map a user role to their default portal slug */
export function getDefaultPortalForRole(role: string): string {
  switch (role) {
    case "super_admin":
      return "admin"
    case "franchise_admin":
    case "franchise_owner":
    case "manager":
      return "__dashboard__"
    default:
      return "booking"
  }
}
