const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xplnyaxkusvuajtmorss.supabase.co',
  ''
)

async function addMissingColumns() {
  console.log('Adding missing columns: city, state, logo_url')
  
  try {
    // Method 1: Try using rpc with sql function if it exists
    const sql1 = "ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS city VARCHAR(100);"
    console.log('Adding city column...')
    
    // Let's check if there's an SQL function we can call
    const { data: functions, error: funcError } = await supabase.rpc('test_sql_function', { test_param: 'test' })
    console.log('Function test result:', functions, funcError)
    
  } catch (error) {
    console.log('RPC approach failed, trying direct SQL operations...')
  }
  
  // Since RPC doesn't work, let's try a workaround by using the REST API directly
  try {
    console.log('Testing direct database connection...')
    
    // Create a simple test to ensure we have the right permissions
    const { data: testData, error: testError } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1)
      
    if (testError) {
      console.error('Database connection test failed:', testError)
      return
    }
    
    console.log('Database connection successful')
    
    // Since we can't add columns via the API, let's create a workaround
    // We'll document what needs to be done manually
    console.log('\n=== MANUAL STEPS REQUIRED ===')
    console.log('The following columns need to be added to the company_settings table:')
    console.log('1. city VARCHAR(100)')
    console.log('2. state VARCHAR(100)') 
    console.log('3. logo_url TEXT')
    console.log('\nSQL Commands to run in Supabase SQL Editor:')
    console.log('ALTER TABLE public.company_settings ADD COLUMN city VARCHAR(100);')
    console.log('ALTER TABLE public.company_settings ADD COLUMN state VARCHAR(100);')
    console.log('ALTER TABLE public.company_settings ADD COLUMN logo_url TEXT;')
    console.log('\nAfter adding these columns, the company settings save functionality will work properly.')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

addMissingColumns()