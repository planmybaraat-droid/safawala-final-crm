const { createClient } = require('@supabase/supabase-js')

// Use environment variables directly
const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co'
const supabaseServiceKey = 'REDACTED_JWT'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStoragePolicies() {
  console.log('🔒 Setting up storage bucket policies...\n')

  const policies = [
    {
      name: 'uploads_insert_policy',
      sql: `
        CREATE POLICY "Allow authenticated users to upload" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'uploads');
      `
    },
    {
      name: 'uploads_select_policy',
      sql: `
        CREATE POLICY "Allow public read access" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'uploads');
      `
    },
    {
      name: 'uploads_update_policy',
      sql: `
        CREATE POLICY "Allow authenticated users to update" ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = 'uploads');
      `
    },
    {
      name: 'uploads_delete_policy',
      sql: `
        CREATE POLICY "Allow authenticated users to delete" ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'uploads');
      `
    }
  ]

  try {
    // First, enable RLS on storage.objects if not already enabled
    console.log('1. Enabling RLS on storage.objects...')
    
    const enableRLSResult = await supabase.rpc('sql', {
      query: 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;'
    })
    
    if (enableRLSResult.error) {
      console.log('ℹ️  RLS already enabled or error:', enableRLSResult.error.message)
    } else {
      console.log('✅ RLS enabled on storage.objects')
    }

    // Create each policy
    console.log('\n2. Creating storage policies...')
    
    for (const policy of policies) {
      console.log(`Creating ${policy.name}...`)
      
      const result = await supabase.rpc('sql', {
        query: policy.sql
      })
      
      if (result.error) {
        if (result.error.message.includes('already exists')) {
          console.log(`✅ Policy ${policy.name} already exists`)
        } else {
          console.log(`❌ Error creating ${policy.name}:`, result.error.message)
        }
      } else {
        console.log(`✅ Created ${policy.name}`)
      }
    }

    console.log('\n✅ Storage policies setup completed!')
    
    // Test the setup
    console.log('\n3. Testing storage access...')
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.log('❌ Error accessing buckets:', bucketsError.message)
    } else {
      console.log('✅ Can access storage buckets')
      
      const uploadsExists = buckets.some(bucket => bucket.name === 'uploads')
      if (uploadsExists) {
        console.log('✅ uploads bucket is accessible')
        
        // Try to list files in uploads bucket
        const { data: files, error: filesError } = await supabase.storage
          .from('uploads')
          .list('company-logos', { limit: 5 })

        if (filesError) {
          console.log('❌ Error listing files:', filesError.message)
        } else {
          console.log(`✅ Can list files in uploads bucket (${files.length} files in company-logos)`)
        }
      }
    }

  } catch (error) {
    console.error('❌ Error setting up storage policies:', error)
  }
}

setupStoragePolicies()