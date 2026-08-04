import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MALA_CATEGORY_ID = "c2788e4d-1195-403b-a87b-c98c8974b88c";

function cleanColor(col: string | null | undefined): string | null {
  if (!col) return null;
  const low = col.toLowerCase().trim();
  
  const keywords = [
    { key: 'maroon', val: 'Maroon' },
    { key: 'crimson', val: 'Crimson' },
    { key: 'ruby', val: 'Ruby' },
    { key: 'red', val: 'Red' },
    { key: 'pink', val: 'Pink' },
    { key: 'blush', val: 'Pink' },
    { key: 'peach', val: 'Peach' },
    { key: 'emerald', val: 'Green' },
    { key: 'green', val: 'Green' },
    { key: 'turquoise', val: 'Turquoise' },
    { key: 'silver', val: 'Silver' },
    { key: 'gold', val: 'Gold' },
    { key: 'champagne', val: 'Gold' },
    { key: 'white', val: 'White' },
    { key: 'ivory', val: 'White' },
    { key: 'cream', val: 'White' },
    { key: 'mixed', val: 'Mixed' }
  ];

  let earliestIdx = Infinity;
  let matchedVal: string | null = null;

  for (const kw of keywords) {
    const idx = low.indexOf(kw.key);
    if (idx !== -1 && idx < earliestIdx) {
      earliestIdx = idx;
      matchedVal = kw.val;
    }
  }

  if (matchedVal) return matchedVal;

  const match = col.match(/[a-zA-Z]+/);
  if (match) {
    const word = match[0];
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return null;
}

function cleanMaterial(mat: string | null | undefined): string | null {
  if (!mat) return null;
  const low = mat.toLowerCase().trim();

  const keywords = [
    { key: 'kundan', val: 'Kundan' },
    { key: 'polki', val: 'Polki' },
    { key: 'pearl', val: 'Pearls' },
    { key: 'zircon', val: 'Zircon' },
    { key: 'cz', val: 'Zircon' },
    { key: 'crystal', val: 'Crystals' },
    { key: 'stone', val: 'Beads' },
    { key: 'bead', val: 'Beads' },
    { key: 'metal', val: 'Metal' },
    { key: 'alloy', val: 'Metal' }
  ];

  let earliestIdx = Infinity;
  let matchedVal: string | null = null;

  for (const kw of keywords) {
    const idx = low.indexOf(kw.key);
    if (idx !== -1 && idx < earliestIdx) {
      earliestIdx = idx;
      matchedVal = kw.val;
    }
  }

  if (matchedVal) return matchedVal;

  const match = mat.match(/[a-zA-Z]+/);
  if (match) {
    const word = match[0];
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return null;
}

function cleanSize(size: string | null | undefined): string | null {
  if (!size) return 'Standard';
  const low = size.toLowerCase().trim();

  if (low.includes('adjustable')) return 'Adjustable';
  if (low.includes('standard')) return 'Standard';

  const match = size.match(/[a-zA-Z]+/);
  if (match) {
    const word = match[0];
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return 'Standard';
}

async function runCleanup() {
  console.log("1. Cleaning parent malas in products table...");
  const { data: malas, error: errMalas } = await supabase
    .from('products')
    .select('id, name, color, material, size')
    .eq('category_id', MALA_CATEGORY_ID);

  if (errMalas) {
    console.error("Error fetching malas:", errMalas.message);
    return;
  }

  let parentsUpdated = 0;
  for (const m of malas) {
    const finalColor = cleanColor(m.color);
    const finalMaterial = cleanMaterial(m.material);
    const finalSize = cleanSize(m.size);

    const { error: updateError } = await supabase
      .from('products')
      .update({
        color: finalColor,
        material: finalMaterial,
        size: finalSize
      })
      .eq('id', m.id);

    if (updateError) {
      console.error(`  -> Failed to update product ${m.id}:`, updateError.message);
    } else {
      parentsUpdated++;
    }
  }
  console.log(`Successfully updated ${parentsUpdated}/${malas.length} parent malas.`);

  console.log("\n2. Cleaning variant malas in product_variations table...");
  const { data: variations, error: errVars } = await supabase
    .from('product_variations')
    .select('id, color, size, material, product_id, products(name, category_id)');

  if (errVars) {
    console.error("Error fetching variations:", errVars.message);
    return;
  }

  const malaVariations = variations.filter(v => v.products && v.products.category_id === MALA_CATEGORY_ID);

  let varsUpdated = 0;
  for (const v of malaVariations) {
    const finalColor = cleanColor(v.color);
    const finalMaterial = cleanMaterial(v.material);
    const finalSize = cleanSize(v.size);

    const { error: updateError } = await supabase
      .from('product_variations')
      .update({
        color: finalColor,
        material: finalMaterial,
        size: finalSize
      })
      .eq('id', v.id);

    if (updateError) {
      console.error(`  -> Failed to update variation ${v.id}:`, updateError.message);
    } else {
      varsUpdated++;
    }
  }
  console.log(`Successfully updated ${varsUpdated}/${malaVariations.length} variant malas.`);
}

runCleanup().catch(console.error);
