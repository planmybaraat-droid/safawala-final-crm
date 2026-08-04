import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js"

// Singleton instance to prevent multiple clients
let supabaseInstance: SupabaseClient | null = null

export function createClient() {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Create new instance with proper auth config
  supabaseInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: 'sb-xplnyaxkusvuajtmorss-auth-token',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  )

  // Immediately try to restore session from storage
  if (typeof window !== 'undefined') {
    supabaseInstance.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('[Supabase Client] Session restored from storage')
      } else {
        console.warn('[Supabase Client] No session found in storage')
      }
    })
  }

  return supabaseInstance
}
