import { supabase } from './supabase';

export async function initializeSettingsTables() {
  try {
    // Check if company_settings table exists
    const { error: checkError } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1);

    // If table doesn't exist, create it
    if (checkError && checkError.code === 'PGRST116') {
      console.log('Creating settings tables...');
      
      // Create company_settings table
      const { error: createError } = await supabase.rpc('create_settings_tables');
      
      if (createError) {
        // If RPC fails, try direct SQL (this is a fallback and might not work in all environments)
        console.error('Failed to create tables via RPC:', createError);
        
        // For demo purposes, we'll create a minimal company_settings table
        await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS company_settings (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              company_name VARCHAR(255) NOT NULL DEFAULT 'Safawala Laundry Services',
              business_type VARCHAR(50) NOT NULL DEFAULT 'laundry',
              timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
              currency VARCHAR(10) NOT NULL DEFAULT 'INR',
              language VARCHAR(10) NOT NULL DEFAULT 'en',
              date_format VARCHAR(20) NOT NULL DEFAULT 'dd-mm-yyyy',
              address TEXT,
              phone VARCHAR(20),
              email VARCHAR(255),
              website VARCHAR(255),
              gst_number VARCHAR(50),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            INSERT INTO company_settings (
              company_name, business_type, timezone, currency, language
            ) VALUES (
              'Safawala Laundry Services',
              'laundry',
              'Asia/Kolkata',
              'INR',
              'en'
            ) ON CONFLICT DO NOTHING;
          `
        });
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error initializing settings tables:', error);
    return false;
  }
}
