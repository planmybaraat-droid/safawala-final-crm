import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MALA_CATEGORY_ID = "c2788e4d-1195-403b-a87b-c98c8974b88c";

async function verify() {
  // Query count of parents
  const { data: parentProducts, error: parentError } = await supabase
    .from('products')
    .select('id, name, image_url')
    .eq('category_id', MALA_CATEGORY_ID);

  if (parentError) {
    console.error("Error fetching parent products:", parentError.message);
    return;
  }

  console.log(`\n--- Verification Summary ---`);
  console.log(`Total Parent Products in category: ${parentProducts.length}`);

  // Query variations
  const parentIds = parentProducts.map(p => p.id);
  const { data: variations, error: varError } = await supabase
    .from('product_variations')
    .select('id, variation_name, image_url, color, size, material, product_id')
    .in('product_id', parentIds);

  if (varError) {
    console.error("Error fetching variations:", varError.message);
    return;
  }

  console.log(`Total Product Variations: ${variations.length}`);
  
  // Total entries (parent + variations) should equal 88 (since there were 88 rows in the excel excluding headers)
  console.log(`Total Malas in CRM (Parents + Variations): ${parentProducts.length + variations.length}`);

  // Spot-check group for "Five-Strand Pearl" / "Five Strand Pearl"
  const fiveStrandParents = parentProducts.filter(p => p.name.includes("Five"));
  console.log("\nSpot checking Five Strand Pearl Mala:");
  for (const parent of fiveStrandParents) {
    console.log(`- Parent Product: ID: ${parent.id}, Name: "${parent.name}", Image: ${parent.image_url}`);
    const vars = variations.filter(v => v.product_id === parent.id);
    console.log(`  Variations: ${vars.length}`);
    for (const v of vars) {
      console.log(`    * Var ID: ${v.id}, Var Name: "${v.variation_name}", Image: ${v.image_url}`);
    }
  }
}

verify();
