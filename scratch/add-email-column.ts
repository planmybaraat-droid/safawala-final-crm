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
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected'));
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS aadhar_number text;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pan_number text;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_document_url text;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_notes text;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id);
  `
  console.log("Executing SQL:", sql)
  
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql })
  
  if (error) {
    console.error("RPC execution failed:", error)
    process.exit(1)
  }
  
  console.log("SQL executed successfully! Column 'email' should be added.")
}

run().catch(console.error)
