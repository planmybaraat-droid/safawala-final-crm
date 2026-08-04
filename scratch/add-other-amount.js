const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Adding other_amount column to bookings...');
  
  const sql = `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'bookings' AND column_name = 'other_amount') THEN
            ALTER TABLE bookings ADD COLUMN other_amount DECIMAL DEFAULT 0;
        END IF;
    END $$;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Failed to add other_amount column:', error);
  } else {
    console.log('other_amount column added successfully!', data);
  }
}

run();
