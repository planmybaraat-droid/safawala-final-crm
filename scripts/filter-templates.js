const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function filterTemplates() {
  const { getTemplates } = require('../lib/services/wati-service');
  console.log("Fetching WATI templates...");
  const res = await getTemplates();
  if (res.success) {
    const keywords = ['booking', 'invoice', 'confirm', 'sent'];
    const matching = res.templates.filter(t => 
      keywords.some(k => t.elementName.toLowerCase().includes(k))
    );
    console.log(`Found ${matching.length} matching templates out of ${res.templates.length}:`);
    matching.forEach(t => {
      console.log(`- Name: ${t.elementName}`);
      console.log(`  Header Type: ${t.header ? (t.header.headerTypeString || t.header.typeString || t.header.type) : 'None'}`);
      console.log(`  Body: ${t.body.replace(/\n/g, '\\n')}`);
      if (t.header && t.header.link) {
        console.log(`  Header Link: ${t.header.link}`);
      }
      console.log('---');
    });
  } else {
    console.error("Failed to fetch templates:", res.error);
  }
}

filterTemplates();
