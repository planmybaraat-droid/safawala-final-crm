/**
 * Franchise-aware Supabase helper
 * Automatically adds franchise_id filtering to all queries
 */

import { supabase } from "./supabase"

export function getCurrentUserFranchise(): string | null {
  if (typeof window === "undefined") return null
  
  try {
    const storedUser = localStorage.getItem("safawala_user")
    if (!storedUser) return null
    
    const user = JSON.parse(storedUser)
    return user.franchise_id || null
  } catch {
    return null
  }
}

export function getCurrentUserRole(): string | null {
  if (typeof window === "undefined") return null
  
  try {
    const storedUser = localStorage.getItem("safawala_user")
    if (!storedUser) return null
    
    const user = JSON.parse(storedUser)
    return user.role || null
  } catch {
    return null
  }
}

export function isSuperAdmin(): boolean {
  return getCurrentUserRole() === 'super_admin'
}

/**
 * Supabase query builder that automatically adds franchise filtering
 * Use this instead of direct supabase.from() calls for tenant-scoped tables
 */
export const franchiseSupabase = {
  /**
   * Query customers with automatic franchise filtering
   */
  customers() {
    const franchiseId = getCurrentUserFranchise()
    const query = supabase.from("customers").select("*")
    
    // Super admins see all, others see only their franchise
    if (!isSuperAdmin() && franchiseId) {
      return query.eq("franchise_id", franchiseId)
    }
    return query
  },

  /**
   * Query products with automatic franchise filtering
   */
  products() {
    const franchiseId = getCurrentUserFranchise()
    const query = supabase.from("products").select("*")
    
    if (!isSuperAdmin() && franchiseId) {
      return query.eq("franchise_id", franchiseId)
    }
    return query
  },

  /**
   * Query bookings with automatic franchise filtering
   */
  bookings() {
    const franchiseId = getCurrentUserFranchise()
    const query = supabase.from("bookings").select("*")
    
    if (!isSuperAdmin() && franchiseId) {
      return query.eq("franchise_id", franchiseId)
    }
    return query
  },

  /**
   * Query purchases with automatic franchise filtering
   */
  purchases() {
    const franchiseId = getCurrentUserFranchise()
    const query = supabase.from("purchases").select("*")
    
    if (!isSuperAdmin() && franchiseId) {
      return query.eq("franchise_id", franchiseId)
    }
    return query
  },

  /**
   * Query expenses with automatic franchise filtering
   */
  expenses() {
    const franchiseId = getCurrentUserFranchise()
    const query = supabase.from("expenses").select("*")
    
    if (!isSuperAdmin() && franchiseId) {
      return query.eq("franchise_id", franchiseId)
    }
    return query
  },

  /**
   * Query users with automatic franchise filtering
   */
  users() {
    const franchiseId = getCurrentUserFranchise()
    const query = supabase.from("users").select("*")
    
    if (!isSuperAdmin() && franchiseId) {
      return query.eq("franchise_id", franchiseId)
    }
    return query
  },

  /**
   * Insert with automatic franchise_id
   */
  insertCustomer(data: any) {
    const franchiseId = getCurrentUserFranchise()
    if (!franchiseId && !isSuperAdmin()) {
      throw new Error("No franchise_id available for insert")
    }
    
    return supabase.from("customers").insert({
      ...data,
      franchise_id: franchiseId
    }).select()
  },

  insertProduct(data: any) {
    const franchiseId = getCurrentUserFranchise()
    if (!franchiseId && !isSuperAdmin()) {
      throw new Error("No franchise_id available for insert")
    }
    
    return supabase.from("products").insert({
      ...data,
      franchise_id: franchiseId
    }).select()
  },

  insertBooking(data: any) {
    const franchiseId = getCurrentUserFranchise()
    if (!franchiseId && !isSuperAdmin()) {
      throw new Error("No franchise_id available for insert")
    }
    
    return supabase.from("bookings").insert({
      ...data,
      franchise_id: franchiseId
    }).select()
  },

  insertPurchase(data: any) {
    const franchiseId = getCurrentUserFranchise()
    if (!franchiseId && !isSuperAdmin()) {
      throw new Error("No franchise_id available for insert")
    }
    
    return supabase.from("purchases").insert({
      ...data,
      franchise_id: franchiseId
    }).select()
  },

  insertExpense(data: any) {
    const franchiseId = getCurrentUserFranchise()
    if (!franchiseId && !isSuperAdmin()) {
      throw new Error("No franchise_id available for insert")
    }
    
    return supabase.from("expenses").insert({
      ...data,
      franchise_id: franchiseId
    }).select()
  },
}

export default franchiseSupabase
