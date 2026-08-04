const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateApiKey() {
  const newApiKey = "REDACTED_JWT";

  console.log("Updating WATI API key in integration_settings...");
  const { data, error } = await supabase
    .from('integration_settings')
    .update({ api_key: newApiKey })
    .eq('integration_name', 'whatsapp-wati')
    .select();

  if (error) {
    console.error("Failed to update API key:", error);
  } else {
    console.log("Successfully updated API key:", JSON.stringify(data, null, 2));
  }
}

updateApiKey();
