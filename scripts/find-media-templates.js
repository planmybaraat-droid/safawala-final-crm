const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findMediaTemplates() {
  const { getTemplates } = require('../lib/services/wati-service');
  const res = await getTemplates();
  if (res.success) {
    const matching = res.templates.filter(t => 
      t.status === 'APPROVED' && t.header && (t.header.headerTypeString === 'document' || t.header.typeString === 'document' || t.header.headerTypeString === 'image' || t.header.typeString === 'image')
    );
    console.log(`Found ${matching.length} approved media/document templates:`);
    matching.forEach(t => {
      console.log(`- Name: ${t.elementName}`);
      console.log(`  Header Type: ${t.header.headerTypeString || t.header.typeString}`);
      console.log(`  Body: ${t.body.replace(/\n/g, '\\n')}`);
      console.log('---');
    });
  } else {
    console.error("Failed to fetch templates:", res.error);
  }
}

findMediaTemplates();
