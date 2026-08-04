const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createBanksTable() {
  try {
    console.log('Creating banks table...')
    
    // First, check if table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'banks')
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError)
    } else if (tables && tables.length > 0) {
      console.log('✅ Banks table already exists')
      return
    }
    
    console.log('Creating banks table...')
    
    // SQL to create the banks table
    const createTableSQL = `
      -- Create banks table without account_type field
      CREATE TABLE IF NOT EXISTS banks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
        bank_name TEXT NOT NULL,
        account_holder TEXT NOT NULL,
        account_number TEXT NOT NULL,
        ifsc_code VARCHAR(11) NOT NULL,
        branch_name TEXT,
        upi_id TEXT,
        qr_file_path TEXT,
        is_primary BOOLEAN DEFAULT false,
        show_on_invoices BOOLEAN DEFAULT false,
        show_on_quotes BOOLEAN DEFAULT false,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT valid_account_number CHECK (LENGTH(account_number) BETWEEN 8 AND 24),
        CONSTRAINT valid_ifsc_code CHECK (ifsc_code ~ '^[A-Z][A-Z][A-Z][A-Z]0[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]$'),
        CONSTRAINT valid_upi_id CHECK (upi_id IS NULL OR upi_id ~ '^[a-zA-Z0-9._-]+@[a-zA-Z]+$'),
        CONSTRAINT valid_bank_name CHECK (LENGTH(bank_name) BETWEEN 2 AND 100),
        CONSTRAINT valid_account_holder CHECK (LENGTH(account_holder) BETWEEN 2 AND 100)
      );
    `
    
    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    })
    
    if (createError) {
      console.error('Error creating table:', createError)
      
      // Try alternative method
      console.log('Trying alternative table creation...')
      const { error: altError } = await supabase
        .from('banks')
        .select('*')
        .limit(1)
        
      if (altError && altError.code === '42P01') {
        console.log('Table definitely does not exist. Manual creation needed.')
        console.log('Please run the SQL script in Supabase dashboard:')
        console.log(createTableSQL)
      }
    } else {
      console.log('✅ Banks table created successfully')
    }
    
  } catch (error) {
    console.error('Error:', error)
    console.log('\n📝 Manual Setup Required:')
    console.log('Please create the banks table manually in your Supabase dashboard.')
    console.log('Go to SQL Editor and run the script: scripts/create-banking-schema.sql')
  }
}

createBanksTable()