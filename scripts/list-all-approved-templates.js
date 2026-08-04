const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllApprovedTemplates() {
  const { getTemplates } = require('../lib/services/wati-service');
  const res = await getTemplates();
  if (res.success) {
    const approved = res.templates.filter(t => t.status === 'APPROVED');
    console.log(`Found ${approved.length} approved templates:`);
    approved.forEach(t => {
      console.log(`- Name: ${t.elementName}`);
      console.log(`  Header Type: ${t.header ? (t.header.headerTypeString || t.header.typeString || t.header.type) : 'None'}`);
      console.log(`  Body: ${t.body.replace(/\n/g, '\\n')}`);
      console.log('---');
    });
  } else {
    console.error("Failed to fetch templates:", res.error);
  }
}

listAllApprovedTemplates();
