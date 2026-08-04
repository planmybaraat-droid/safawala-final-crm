import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(__dirname, "../.env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.verification_codes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      phone text NOT NULL,
      code text NOT NULL,
      expires_at timestamp with time zone NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS verification_codes_phone_idx ON public.verification_codes(phone);
  `
  console.log("Executing SQL to create verification_codes table...")
  
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql })
  
  if (error) {
    console.error("RPC execution failed:", error)
    process.exit(1)
  }
  
  console.log("SQL executed successfully! verification_codes table created.")
}

run().catch(console.error)
