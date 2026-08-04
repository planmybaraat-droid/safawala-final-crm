// ============================================
// SAFEGUARD: Helper functions to ensure franchise filtering
// Prevents accidental data leakage in multi-franchise app
// ============================================

import { createClient } from "@/lib/supabase/server"

/**
 * Safe query builder that ALWAYS filters by franchise_id
 * Prevents accidental data leakage
 * 
 * @example
 * const query = franchiseQuery('customers', franchiseId, isSuperAdmin)
 * const { data } = await query
 */
export function franchiseQuery(
  table: string,
  franchiseId: string,
  isSuperAdmin: boolean = false
) {
  const supabase = createClient()
  
  let query = supabase.from(table).select('*')
  
  // CRITICAL: Always filter unless super admin
  if (!isSuperAdmin && franchiseId) {
    query = query.eq('franchise_id', franchiseId)
    console.log(`[Franchise Query] ✅ Filtered ${table} by franchise: ${franchiseId}`)
  } else {
    console.log(`[Franchise Query] ⚠️  Super admin - showing all ${table}`)
  }
  
  return query
}

/**
 * Safe insert that ALWAYS sets franchise_id
 * Prevents creating records without franchise association
 * 
 * @example
 * const result = await franchiseInsert('customers', newCustomer, franchiseId)
 */
export function franchiseInsert(
  table: string,
  data: Record<string, any>,
  franchiseId: string
) {
  const supabase = createClient()
  
  // CRITICAL: Force franchise_id
  const safeData = {
    ...data,
    franchise_id: franchiseId
  }
  
  console.log(`[Franchise Insert] ✅ Adding to ${table} with franchise: ${franchiseId}`)
  return supabase.from(table).insert(safeData)
}

/**
 * Safe update that ONLY updates records from user's franchise
 * 
 * @example
 * const result = await franchiseUpdate('customers', customerId, updates, franchiseId)
 */
export function franchiseUpdate(
  table: string,
  recordId: string,
  data: Record<string, any>,
  franchiseId: string,
  isSuperAdmin: boolean = false
) {
  const supabase = createClient()
  
  let query = supabase
    .from(table)
    .update(data)
    .eq('id', recordId)
  
  // CRITICAL: Only update if belongs to franchise
  if (!isSuperAdmin) {
    query = query.eq('franchise_id', franchiseId)
    console.log(`[Franchise Update] ✅ Updating ${table} (${recordId}) for franchise: ${franchiseId}`)
  } else {
    console.log(`[Franchise Update] ⚠️  Super admin - updating ${table} (${recordId})`)
  }
  
  return query
}

/**
 * Safe delete that ONLY deletes records from user's franchise
 * 
 * @example
 * const result = await franchiseDelete('customers', customerId, franchiseId)
 */
export function franchiseDelete(
  table: string,
  recordId: string,
  franchiseId: string,
  isSuperAdmin: boolean = false
) {
  const supabase = createClient()
  
  let query = supabase
    .from(table)
    .delete()
    .eq('id', recordId)
  
  // CRITICAL: Only delete if belongs to franchise
  if (!isSuperAdmin) {
    query = query.eq('franchise_id', franchiseId)
    console.log(`[Franchise Delete] ✅ Deleting ${table} (${recordId}) for franchise: ${franchiseId}`)
  } else {
    console.log(`[Franchise Delete] ⚠️  Super admin - deleting ${table} (${recordId})`)
  }
  
  return query
}
