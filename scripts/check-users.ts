import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log("=== USERS / PROFILES IN DATABASE ===");
  
  // We can query the custom users or profiles table. Let's see what tables exist by querying profiles
  const { data: profiles, error: pError } = await supabase
    .from("profiles")
    .select("id, email, name, role, franchise_id");

  if (pError) {
    // If profiles table doesn't exist, try users table
    const { data: users, error: uError } = await supabase
      .from("users")
      .select("id, email, name, role, franchise_id");
    
    if (uError) console.error("Error fetching users:", uError.message);
    else console.log(users);
  } else {
    console.log(profiles);
  }
}

run().catch(console.error);
