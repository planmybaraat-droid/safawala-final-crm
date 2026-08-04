/*
Check product_images table structure and content
*/

const { createClient } = require('@supabase/supabase-js')

async function checkTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    console.log('Checking product_images table...')
    
    // Try to query the table structure
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .limit(5)

    if (error) {
      console.error('Error accessing product_images table:', error)
      return
    }

    console.log('✅ product_images table exists and is accessible')
    console.log('Current rows in table:', data.length)
    
    if (data.length > 0) {
      console.log('Sample data:')
      console.log(data)
    } else {
      console.log('Table is empty (expected for new migration)')
    }

    // Test insert permissions
    console.log('\nTesting insert permissions...')
    const testRow = {
      product_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      url: 'https://test.com/test.jpg',
      is_main: true,
      order: 0
    }

    const { data: insertData, error: insertError } = await supabase
      .from('product_images')
      .insert([testRow])
      .select()

    if (insertError) {
      console.log('Insert test failed (this might be expected due to foreign key):', insertError.message)
    } else {
      console.log('✅ Insert test successful, cleaning up...')
      // Clean up test row
      await supabase
        .from('product_images')
        .delete()
        .eq('id', insertData[0].id)
      console.log('Test row cleaned up')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkTable()