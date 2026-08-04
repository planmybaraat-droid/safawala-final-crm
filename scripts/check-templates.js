const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTemplates() {
  const { getTemplates } = require('../lib/services/wati-service');
  console.log("Fetching WATI templates...");
  const res = await getTemplates();
  if (res.success) {
    console.log("Templates found:", JSON.stringify(res.templates, null, 2));
  } else {
    console.error("Failed to fetch templates:", res.error);
  }
}

checkTemplates();
