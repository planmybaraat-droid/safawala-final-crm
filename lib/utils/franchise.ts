import { createClient } from "@/lib/supabase/server"

/**
 * Get the franchise ID for the current user
 * - For regular users: returns their assigned franchise_id
 * - For super_admin: returns their assigned franchise_id only; otherwise explicit selection is required
 */
export async function getCurrentFranchiseId(): Promise<string | null> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error("[getCurrentFranchiseId] No authenticated user")
    return null
  }

  // Get user details from users table
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role, franchise_id")
    .eq("id", user.id)
    .single()

  if (userError) {
    console.error("[getCurrentFranchiseId] Error fetching user:", userError)
    return null
  }

  // If user has franchise_id, return it
  if (userData.franchise_id) {
    console.log(`[getCurrentFranchiseId] User has franchise_id: ${userData.franchise_id}`)
    return userData.franchise_id
  }

  if (userData.role === "super_admin") {
    console.warn("[getCurrentFranchiseId] Super admin has no franchise_id; explicit franchise selection is required")
    return null
  }

  console.warn("[getCurrentFranchiseId] ⚠️ User has no franchise_id and is not super_admin")
  return null
}

/**
 * Get user with franchise information
 */
export async function getCurrentUserWithFranchise() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from("users")
    .select(`
      *,
      franchise:franchises(*)
    `)
    .eq("id", user.id)
    .single()

  return userData
}
