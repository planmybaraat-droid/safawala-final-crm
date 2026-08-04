export const CRM_ADMIN_ROLES = [
  "super_admin",
  "franchise_admin",
  "franchise_owner",
  "manager",
] as const

export const CRM_DEPARTMENT_STAFF_ROLES = [
  "staff",
  "booking_staff",
  "warehouse_staff",
  "qc_staff",
  "delivery_staff",
  "accounts_staff",
  "hr_staff",
  "travels_staff",
  "stylist",
] as const

export const CRM_READONLY_ROLES = ["readonly"] as const

export const CRM_USER_ROLES = [
  ...CRM_ADMIN_ROLES,
  ...CRM_DEPARTMENT_STAFF_ROLES,
  ...CRM_READONLY_ROLES,
] as const

export const DELIVERY_TEAM_ROLES = [
  "super_admin",
  "franchise_admin",
  "franchise_owner",
  "manager",
  "staff",
  "delivery_staff",
] as const

export const SALES_TEAM_ROLES = [
  "super_admin",
  "franchise_admin",
  "franchise_owner",
  "manager",
  "staff",
  "booking_staff",
] as const

export const ATTENDANCE_EMPLOYEE_ROLES = [
  ...CRM_ADMIN_ROLES,
  ...CRM_DEPARTMENT_STAFF_ROLES,
  ...CRM_READONLY_ROLES,
] as const

export function isAdminRole(role?: string | null): boolean {
  return CRM_ADMIN_ROLES.includes(role as (typeof CRM_ADMIN_ROLES)[number])
}

export function isStaffExecutionRole(role?: string | null): boolean {
  return role === "staff" || role === "stylist" || role?.endsWith("_staff") === true
}

export function getRoleLabel(role?: string | null): string {
  switch (role) {
    case "super_admin":
      return "Super Admin"
    case "franchise_admin":
      return "Franchise Admin"
    case "franchise_owner":
      return "Franchise Owner"
    case "manager":
      return "Manager"
    case "booking_staff":
      return "Booking Staff"
    case "warehouse_staff":
      return "Warehouse Staff"
    case "qc_staff":
      return "QC Staff"
    case "delivery_staff":
      return "Delivery Staff"
    case "accounts_staff":
      return "Accounts Staff"
    case "hr_staff":
      return "HR Staff"
    case "travels_staff":
      return "Travels Staff"
    case "stylist":
      return "Stylist"
    case "readonly":
      return "Readonly"
    case "staff":
      return "Staff"
    default:
      return role ? role.replace(/_/g, " ") : "Staff"
  }
}
