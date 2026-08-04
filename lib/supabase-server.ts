import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Lazy, import-safe server-side Supabase client creator
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    // Defer failure to call sites; keep import side-effect free
    throw new Error('Missing Supabase environment variables')
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

export default createServerSupabaseClient
