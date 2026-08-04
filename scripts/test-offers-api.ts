import dotenv from 'dotenv';
import path from 'path';
import { supabaseServer, getDefaultFranchiseId } from '@/lib/supabase-server-simple';

// Load local env (so this script can be run directly)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  try {
    console.log('Starting offers smoke test...');

    const franchiseId = await getDefaultFranchiseId();
    if (!franchiseId) {
      console.error('No franchise found in database. Aborting.');
      process.exit(1);
    }

    console.log('Using franchise id:', franchiseId);

    const code = `SMOKE_${Date.now().toString().slice(-6)}`;

    // Insert test offer
    const { data: inserted, error: insertErr } = await supabaseServer
      .from('offers')
      .insert({
        code,
        name: 'Smoke Test Offer',
        discount_type: 'fixed',
        discount_value: 10,
        is_active: true,
        franchise_id: franchiseId
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Insert error:', insertErr);
      process.exit(1);
    }

    console.log('Inserted offer:', inserted);

    // Fetch offers for this franchise
    const { data: offers, error: fetchErr } = await supabaseServer
      .from('offers')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchErr) {
      console.error('Fetch error:', fetchErr);
      process.exit(1);
    }

    console.log('Recent offers (up to 5):', offers);

    // Cleanup: delete inserted offer
    const { error: deleteErr } = await supabaseServer
      .from('offers')
      .delete()
      .eq('id', inserted.id);

    if (deleteErr) {
      console.error('Cleanup delete error:', deleteErr);
      process.exit(1);
    }

    console.log('Cleanup complete. Smoke test success.');
  } catch (e) {
    console.error('Unexpected error during smoke test:', e);
    process.exit(1);
  }
}

run();
