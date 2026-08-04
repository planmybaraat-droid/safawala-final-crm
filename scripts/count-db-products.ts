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
  console.log("=== COUNT PRODUCTS IN DATABASE ===");
  
  // Total count
  const { count: totalCount, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true });
  
  if (countError) {
    console.error("Error getting total count:", countError.message);
  } else {
    console.log("Total products in database:", totalCount);
  }

  // Count by franchise_id
  const { data: franchiseCounts, error: franchiseError } = await supabase
    .from("products")
    .select("franchise_id, id");

  if (franchiseError) {
    console.error("Error getting franchise counts:", franchiseError.message);
  } else {
    const counts: Record<string, number> = {};
    for (const p of franchiseCounts || []) {
      const fid = p.franchise_id || "null";
      counts[fid] = (counts[fid] || 0) + 1;
    }
    console.log("\nProducts by Franchise ID:");
    console.log(counts);
  }

  // Count by category_id
  const { data: categoryCounts, error: categoryError } = await supabase
    .from("products")
    .select("category_id, id");

  if (categoryError) {
    console.error("Error getting category counts:", categoryError.message);
  } else {
    const counts: Record<string, number> = {};
    for (const p of categoryCounts || []) {
      const cid = p.category_id || "null";
      counts[cid] = (counts[cid] || 0) + 1;
    }
    console.log("\nProducts by Category ID:");
    console.log(counts);
  }

  // Let's resolve the franchise names for these counts
  const { data: franchises } = await supabase.from("franchises").select("id, name");
  console.log("\nFranchise Names mapping:");
  console.log(franchises?.reduce((acc, f) => ({ ...acc, [f.id]: f.name }), {}));
}

run().catch(console.error);
