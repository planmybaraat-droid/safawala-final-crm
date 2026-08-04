import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server-simple'
import { authenticateRequest } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, { minRole: 'super_admin' })
    if (!auth.authorized) {
      return NextResponse.json(auth.error, { status: auth.statusCode })
    }

    console.log('🚀 Starting settings tables setup via API...')
    
    // Define all table creation queries
    const tableQueries = [
      // Company Settings Table
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
      
      // User Settings Table
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
      
      // Notification Settings Table
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
      
      // Business Hours Table with proper handling
      `DO $$
      BEGIN
        CREATE TABLE IF NOT EXISTS public.business_hours (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          franchise_id UUID,
          day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
          is_open BOOLEAN DEFAULT true,
          open_time TIME,
          close_time TIME,
          break_start_time TIME,
          break_end_time TIME,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'business_hours' AND column_name = 'day_name') THEN
          ALTER TABLE public.business_hours ADD COLUMN day_name TEXT;
        END IF;
      END $$`,
      
      // Tax Settings Table
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
      
      // Payment Gateway Settings Table
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
      
      // System Settings Table
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
      
      // Integration Settings Table
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
    
    // Execute table creation queries
    const results = []
    for (const query of tableQueries) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: query
        })
        
          if (error) {
            console.error('❌ Table creation error:', error)
            const msg = error instanceof Error ? error.message : 'Unknown error'
            results.push({ success: false, error: msg })
        } else {
          results.push({ success: true })
        }
      } catch (err) {
        console.error('❌ Query execution error:', err)
          const msg = err instanceof Error ? err.message : 'Unknown error'
          results.push({ success: false, error: msg })
      }
    }
    
    // Disable RLS for demo
    const rlsQueries = [
      'ALTER TABLE public.company_settings DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.notification_settings DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.business_hours DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.tax_settings DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.payment_gateway_settings DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.integration_settings DISABLE ROW LEVEL SECURITY'
    ]
    
    for (const query of rlsQueries) {
      await supabase.rpc('exec_sql', { sql_query: query })
    }
    
    // Insert default data
    const defaultDataQueries = [
      // Default company settings
      `INSERT INTO public.company_settings (
        company_name, business_type, timezone, currency, language, 
        address, phone, email, website, gst_number
      ) 
      SELECT 
        'Safawala Laundry Services',
        'laundry',
        'Asia/Kolkata',
        'INR',
        'en',
        '123 Main Street, Downtown, City - 400001',
        '+91 9876543210',
        'info@safawala.com',
        'www.safawala.com',
        '27AAAAA0000A1Z5'
      WHERE NOT EXISTS (SELECT 1 FROM public.company_settings)`,
      
      // Default tax settings
      `INSERT INTO public.tax_settings (tax_name, tax_rate, tax_type, is_active, applies_to)
      SELECT 'GST', 18.00, 'percentage', true, 'all'
      WHERE NOT EXISTS (SELECT 1 FROM public.tax_settings WHERE tax_name = 'GST')`,
      
      // Default payment gateways
      `INSERT INTO public.payment_gateway_settings (gateway_name, is_enabled, is_test_mode, supported_methods)
      SELECT 'Razorpay', true, true, ARRAY['card', 'upi', 'netbanking']
      WHERE NOT EXISTS (SELECT 1 FROM public.payment_gateway_settings WHERE gateway_name = 'Razorpay')`,
      
      // Default integrations
      `INSERT INTO public.integration_settings (integration_name, is_enabled, status)
      SELECT 'WhatsApp Business API', true, 'connected'
      WHERE NOT EXISTS (SELECT 1 FROM public.integration_settings WHERE integration_name = 'WhatsApp Business API')`,
      
      // Default system settings
      `INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
      SELECT 'app_version', '1.0.0', 'string', 'Application version', true
      WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'app_version')`
    ]
    
    for (const query of defaultDataQueries) {
      await supabase.rpc('exec_sql', { sql_query: query })
    }
    
    // Verify tables exist
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
    
    const verification: any[] = []
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        verification.push({
          table,
          exists: !error,
          error: error?.message
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        verification.push({
          table,
          exists: false,
          error: msg
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Settings tables setup completed successfully!',
      tables: verification,
      results
    })
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      message: 'Settings tables setup failed',
      error: msg
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, { minRole: 'super_admin' })
  if (!auth.authorized) {
    return NextResponse.json(auth.error, { status: auth.statusCode })
  }

  return NextResponse.json({
    message: 'Settings tables setup API',
    usage: 'Send POST request to create all settings tables'
  })
}
