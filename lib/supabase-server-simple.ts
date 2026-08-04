import { createClient } from "@supabase/supabase-js"

// Lazy-initialized Supabase client to prevent build-time errors
let _supabaseServer: any | null = null;

function getSupabaseServer() {
  if (!_supabaseServer) {
    _supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return _supabaseServer;
}

// Export as a getter to maintain backward compatibility
export const supabaseServer = new Proxy({} as any, {
  get(target, prop) {
    return getSupabaseServer()[prop as keyof ReturnType<typeof createClient>];
  }
});

// Helper function to get a default franchise ID for testing (first franchise in database)
export async function getDefaultFranchiseId(): Promise<string | null> {
  try {
    const { data: franchises, error } = await supabaseServer
      .from("franchises")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
    
    if (error) {
      console.error("Error getting default franchise:", error)
      return null
    }
    
    // franchises is an array, get first element
    const firstFranchise = Array.isArray(franchises) ? franchises[0] : franchises
    return firstFranchise?.id || null
  } catch (error) {
    console.error("Error getting default franchise:", error)
    return null
  }
}

// Helper to check if we're in a development environment
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development"
}