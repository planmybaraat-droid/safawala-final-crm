import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MALA_CATEGORY_ID = "c2788e4d-1195-403b-a87b-c98c8974b88c";

async function run() {
  console.log("Fetching all products in MALA category...");
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name, barcode')
    .eq('category_id', MALA_CATEGORY_ID);

  if (fetchError) {
    console.error("Error fetching products:", fetchError.message);
    return;
  }

  console.log(`Found ${products.length} products total in Mala category.`);

  const toKeep = products.filter(p => p.name.trim().toLowerCase() === "emerald kundan mala");
  const toDelete = products.filter(p => p.name.trim().toLowerCase() !== "emerald kundan mala");

  console.log(`Products to keep (${toKeep.length}):`);
  toKeep.forEach(p => console.log(`- ID: ${p.id}, Name: "${p.name}"`));

  if (toDelete.length === 0) {
    console.log("No other products to process.");
    return;
  }

  console.log(`\nProcessing ${toDelete.length} products (Delete or Archive)...`);

  let deletedCount = 0;
  let archivedCount = 0;

  for (const p of toDelete) {
    // 1. Delete variations for this product first
    const { error: varDelErr } = await supabase
      .from('product_variations')
      .delete()
      .eq('product_id', p.id);

    if (varDelErr) {
      console.warn(`  Warning deleting variations for "${p.name}" (${p.id}):`, varDelErr.message);
    }

    // 2. Try to delete the product
    const { error: prodDelErr } = await supabase
      .from('products')
      .delete()
      .eq('id', p.id);

    if (prodDelErr) {
      // Deletion failed (likely due to FK constraint) - archive the product
      console.log(`  -> Cannot delete "${p.name}" (${p.id}) due to references. Archiving instead...`);
      
      const { error: archiveErr } = await supabase
        .from('products')
        .update({
          is_active: false,
          barcode: null,
          barcode_number: null,
          description: 'Mala archived (referenced in transactions)'
        })
        .eq('id', p.id);

      if (archiveErr) {
        console.error(`    ❌ Failed to archive "${p.name}":`, archiveErr.message);
      } else {
        archivedCount++;
      }
    } else {
      console.log(`  -> Successfully deleted "${p.name}" (${p.id}).`);
      deletedCount++;
    }
  }

  console.log(`\n=================================`);
  console.log(`Processing Complete!`);
  console.log(`Deleted: ${deletedCount}`);
  console.log(`Archived: ${archivedCount}`);
  console.log(`=================================`);
}

run().catch(console.error);
