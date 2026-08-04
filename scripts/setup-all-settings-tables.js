import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupSettingsTables() {
  console.log('🚀 Starting settings tables setup...')
  
  try {
    // Read and execute the SQL file
    const fs = await import('fs')
    const path = await import('path')
    
    const sqlFilePath = path.join(process.cwd(), 'scripts', 'create-all-settings-tables.sql')
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8')
    
    console.log('📄 Executing SQL script...')
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    })
    
    if (error) {
      console.error('❌ Error executing SQL:', error)
      return
    }
    
    console.log('✅ SQL script executed successfully!')
    
    // Verify tables were created
    console.log('🔍 Verifying tables...')
    
    const tables = [
      'company_settings',
      'user_settings', 
      'notification_settings',
      'business_hours',
      'tax_settings',
      'payment_gateway_settings',
      'system_settings',
      'integration_settings'
    ]
    
    for (const table of tables) {
      const { data: tableData, error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (tableError) {
        console.log(`❌ Table ${table}: ${tableError.message}`)
      } else {
        console.log(`✅ Table ${table}: Created successfully`)
      }
    }
    
    // Show sample data counts
    console.log('\n📊 Sample data counts:')
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        console.log(`   ${table}: ${count} records`)
      }
    }
    
    console.log('\n🎉 Settings tables setup completed successfully!')
    console.log('You can now use the settings page in your application.')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Alternative method using direct SQL execution
async function setupWithDirectSQL() {
  console.log('🚀 Starting settings tables setup with direct SQL...')
  
  const queries = [
    // Company Settings
    `CREATE TABLE IF NOT EXISTS public.company_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_name TEXT NOT NULL DEFAULT 'Safawala Laundry Services',
      business_type TEXT NOT NULL DEFAULT 'laundry',
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      currency TEXT NOT NULL DEFAULT 'INR',
      language TEXT NOT NULL DEFAULT 'en',
      date_format TEXT NOT NULL DEFAULT 'dd-mm-yyyy',
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      gst_number TEXT,
      logo_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    // User Settings
    `CREATE TABLE IF NOT EXISTS public.user_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'en',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      date_format TEXT DEFAULT 'dd-mm-yyyy',
      currency TEXT DEFAULT 'INR',
      items_per_page INTEGER DEFAULT 10,
      auto_logout_minutes INTEGER DEFAULT 60,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    // Notification Settings
    `CREATE TABLE IF NOT EXISTS public.notification_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      email_notifications BOOLEAN DEFAULT true,
      sms_notifications BOOLEAN DEFAULT false,
      push_notifications BOOLEAN DEFAULT true,
      marketing_notifications BOOLEAN DEFAULT false,
      booking_reminders BOOLEAN DEFAULT true,
      payment_reminders BOOLEAN DEFAULT true,
      inventory_alerts BOOLEAN DEFAULT true,
      system_updates BOOLEAN DEFAULT true,
      low_stock_alerts BOOLEAN DEFAULT true,
      customer_updates BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id)
    )`,
    
    // Tax Settings
    `CREATE TABLE IF NOT EXISTS public.tax_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      franchise_id UUID,
      tax_name TEXT NOT NULL,
      tax_rate DECIMAL(5,2) NOT NULL,
      tax_type TEXT NOT NULL DEFAULT 'percentage',
      is_active BOOLEAN DEFAULT true,
      applies_to TEXT NOT NULL DEFAULT 'all',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    // Payment Gateway Settings
    `CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      franchise_id UUID,
      gateway_name TEXT NOT NULL,
      is_enabled BOOLEAN DEFAULT false,
      is_test_mode BOOLEAN DEFAULT true,
      supported_methods TEXT[] DEFAULT '{}',
      api_key_encrypted TEXT,
      api_secret_encrypted TEXT,
      webhook_url TEXT,
      configuration JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    // System Settings
    `CREATE TABLE IF NOT EXISTS public.system_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT,
      setting_type TEXT DEFAULT 'string',
      description TEXT,
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    // Integration Settings
    `CREATE TABLE IF NOT EXISTS public.integration_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      integration_name TEXT NOT NULL,
      is_enabled BOOLEAN DEFAULT false,
      configuration JSONB DEFAULT '{}',
      api_credentials JSONB DEFAULT '{}',
      webhook_url TEXT,
      status TEXT DEFAULT 'disconnected',
      last_sync_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(integration_name)
    )`
  ]
  
  for (const query of queries) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: query })
      if (error) {
        console.error('❌ Error:', error)
      } else {
        console.log('✅ Query executed successfully')
      }
    } catch (err) {
      console.error('❌ Query failed:', err)
    }
  }
  
  console.log('🎉 Direct SQL setup completed!')
}

// Run the setup
if (process.argv.includes('--direct')) {
  setupWithDirectSQL()
} else {
  setupSettingsTables()
}
