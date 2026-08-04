const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xplnyaxkusvuajtmorss.supabase.co',
  'REDACTED_JWT'
)

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to company_settings table...')

    // First, let's try to fetch a record to see current structure
    console.log('Checking current company_settings table structure...')
    const { data: existingData, error: fetchError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)

    if (fetchError) {
      console.log('Fetch error (table might not exist):', fetchError.message)
    } else {
      console.log('Current table structure (from existing data):')
      if (existingData && existingData.length > 0) {
        console.log('Existing columns:', Object.keys(existingData[0]))
      } else {
        console.log('No existing data found')
      }
    }

    // Let's try to add the columns directly and see what happens
    console.log('\nAttempting to add missing columns...')
    
    // First, let's try adding them via the API directly by attempting to save data
    const testData = {
      company_name: 'Test Company',
      email: 'test@example.com',
      phone: '1234567890',
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      gst_number: 'TEST123',
      logo_url: 'https://example.com/logo.png',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      website: 'https://example.com',
      language: 'en',
      date_format: 'DD/MM/YYYY'
    }

    console.log('Testing insert with all fields...')
    const { data: insertData, error: insertError } = await supabase
      .from('company_settings')
      .insert(testData)
      .select()

    if (insertError) {
      console.log('Insert error:', insertError.message)
      console.log('Error details:', insertError)
      
      // If insert fails due to missing columns, let's check what columns exist
      console.log('\nTrying to insert minimal data to test existing columns...')
      const minimalData = {
        company_name: 'Test Company',
        email: 'test@example.com'
      }
      
      const { data: minInsert, error: minError } = await supabase
        .from('company_settings')
        .insert(minimalData)
        .select()
        
      if (minError) {
        console.log('Minimal insert error:', minError.message)
      } else {
        console.log('Minimal insert successful:', minInsert)
        
        // Now try to update with additional fields one by one to identify missing columns
        const updateFields = {
          city: 'Test City',
          state: 'Test State', 
          logo_url: 'https://example.com/logo.png',
          timezone: 'Asia/Kolkata',
          currency: 'INR',
          website: 'https://example.com',
          language: 'en',
          date_format: 'DD/MM/YYYY'
        }
        
        for (const [field, value] of Object.entries(updateFields)) {
          console.log(`Testing field: ${field}`)
          const { error: updateError } = await supabase
            .from('company_settings')
            .update({ [field]: value })
            .eq('id', minInsert[0].id)
            
          if (updateError) {
            console.log(`❌ Field ${field} - Error: ${updateError.message}`)
          } else {
            console.log(`✓ Field ${field} - Success`)
          }
        }
        
        // Clean up test record
        await supabase
          .from('company_settings')
          .delete()
          .eq('id', minInsert[0].id)
      }
    } else {
      console.log('✓ Insert successful! All columns exist:', insertData)
      
      // Clean up test record
      await supabase
        .from('company_settings')
        .delete()
        .eq('id', insertData[0].id)
    }

  } catch (error) {
    console.error('Error in addMissingColumns:', error)
  }
}

addMissingColumns()