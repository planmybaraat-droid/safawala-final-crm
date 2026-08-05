import type { AuthenticatedUser } from "@/lib/auth-middleware"

/**
 * Department staff (role='staff') sometimes need an endpoint that's
 * otherwise gated at franchise_admin — e.g. HR needs the staff directory to
 * manage employees, Travels needs it to list stylists for assignment. The
 * CRM's generic role hierarchy only grants that to franchise_admin/
 * super_admin. Widening minRole to franchise_admin for those endpoints
 * would let ANY staff account in the listed departments act like a
 * franchise admin everywhere; changing their `role` column to
 * franchise_admin would break the department-portal boundary
 * (franchise_admin is allowed into every department portal). This check is
 * scoped to exactly the departments/actions that need it, without either
 * tradeoff.
 */
export function hasElevatedDepartmentAccess(user: AuthenticatedUser, departments: string[]): boolean {
  if (user.is_super_admin || user.role === "franchise_admin") return true
  return user.role === "staff" && !!user.department && departments.includes(user.department)
}

/** @deprecated use hasElevatedDepartmentAccess(user, ["hr"]) */
export function isHrOrFranchiseAdmin(user: AuthenticatedUser): boolean {
  return hasElevatedDepartmentAccess(user, ["hr"])
}
