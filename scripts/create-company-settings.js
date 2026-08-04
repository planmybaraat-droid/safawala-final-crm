const { createClient } = require('@supabase/supabase-js')

// Use environment variables directly
const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co'
const supabaseServiceKey = 'REDACTED_JWT'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createCompanySettingsTable() {
  try {
    console.log('Creating company_settings table...')
    
    // First, check if table already exists
    const { data: existingData, error: checkError } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1)

    if (!checkError) {
      console.log('Company settings table already exists')
      
      if (!existingData || existingData.length === 0) {
        // Insert default company settings
        const { data: insertData, error: insertError } = await supabase
          .from('company_settings')
          .insert([{
            company_name: 'Safawala CRM',
            email: 'admin@safawala.com',
            phone: '',
            address: '',
            city: '',
            state: '',
            gst_number: '',
            logo_url: ''
          }])
          .select()

        if (insertError) {
          console.error('Error inserting default data:', insertError)
          return
        }

        console.log('Default company settings inserted:', insertData)
      } else {
        console.log('Company settings already exist')
      }
    } else {
      console.log('Table does not exist. Please create it manually in Supabase dashboard.')
      console.log('SQL to create table:')
      console.log(`
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    gst_number VARCHAR(50),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
      `)
    }

    console.log('Company settings table setup completed!')

  } catch (error) {
    console.error('Error:', error)
  }
}

createCompanySettingsTable()