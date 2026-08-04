import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Server-side Supabase client using service role key for admin operations
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('[Supabase Server] Missing environment variables:', {
      hasUrl: !!url,
      hasKey: !!key
    })
    throw new Error('Supabase configuration error: Missing required environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Vercel environment settings.')
  }

  return createSupabaseClient(url, key)
}
