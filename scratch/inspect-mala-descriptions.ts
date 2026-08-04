import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MALA_CATEGORY_ID = "c2788e4d-1195-403b-a87b-c98c8974b88c";

async function verify() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, created_at')
    .eq('category_id', MALA_CATEGORY_ID);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${products.length} products in MALA category.`);
  
  // Count by description
  const descCounts = new Map<string, number>();
  for (const p of products) {
    const desc = p.description || 'null';
    descCounts.set(desc, (descCounts.get(desc) || 0) + 1);
  }

  console.log("\nCounts by description:");
  for (const [desc, count] of descCounts.entries()) {
    console.log(`- "${desc}": ${count}`);
  }

  console.log("\nSample of products with other descriptions:");
  for (const p of products) {
    if (p.description !== 'Mala imported from Stock Inventory Register') {
      console.log(`- ID: ${p.id}, Name: "${p.name}", Desc: "${p.description}", Created: ${p.created_at}`);
    }
  }
}

verify();
