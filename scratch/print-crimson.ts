import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, color, material, size')
    .eq('category_id', 'c2788e4d-1195-403b-a87b-c98c8974b88c')
    .ilike('name', '%Crimson Stone Mala%');

  if (error) {
    console.error("Error fetching malas:", error.message);
    return;
  }

  console.log(`Found ${data.length} Crimson Stone Malas:`);
  data.forEach((m, i) => {
    console.log(`${i+1}. Name: "${m.name}" | Color: "${m.color}" | Material: "${m.material}" | Size: "${m.size}"`);
  });
}

check().catch(console.error);
