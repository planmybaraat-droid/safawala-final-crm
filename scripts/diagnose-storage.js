const { createClient } = require('@supabase/supabase-js')

// Use environment variables directly
const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co'
const supabaseServiceKey = ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnosePoliciesIssue() {
  console.log('🔍 Diagnosing Storage Policies Issue\n')

  try {
    // Test basic storage access
    console.log('1. Testing basic storage access...')
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.log('❌ Cannot access storage buckets:', bucketsError.message)
      return
    }
    
    console.log('✅ Can access storage buckets')
    
    const uploadsExists = buckets.find(bucket => bucket.name === 'uploads')
    if (!uploadsExists) {
      console.log('❌ uploads bucket not found')
      return
    }
    
    console.log('✅ uploads bucket exists')
    console.log('   Public:', uploadsExists.public ? 'Yes' : 'No')
    console.log('   Created:', uploadsExists.created_at)
    
    // Test file upload
    console.log('\n2. Testing file upload...')
    
    const testContent = Buffer.from('Test file for policy check', 'utf8')
    const testFileName = `policy-test-${Date.now()}.txt`
    
    const { data: uploadResult, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(`company-logos/${testFileName}`, testContent, {
        contentType: 'text/plain'
      })
    
    if (uploadError) {
      console.log('❌ Upload test failed:', uploadError.message)
      
      if (uploadError.message.includes('RLS')) {
        console.log('\n💡 This is a Row Level Security (RLS) policy issue')
        console.log('   Solutions:')
        console.log('   1. Set bucket to public in Supabase Dashboard')
        console.log('   2. Create storage policies through Dashboard (not SQL)')
        console.log('   3. Check if you have owner permissions')
      }
    } else {
      console.log('✅ Upload test successful')
      
      // Test public URL access
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(`company-logos/${testFileName}`)
      
      console.log('📎 Public URL:', publicUrl)
      
      // Clean up test file
      await supabase.storage
        .from('uploads')
        .remove([`company-logos/${testFileName}`])
      
      console.log('🧹 Test file cleaned up')
    }
    
    // Test with anon key (what the frontend uses)
    console.log('\n3. Testing with anonymous key (frontend simulation)...')
    
    const anonSupabase = createClient(supabaseUrl, '')
    
    const { data: anonBuckets, error: anonError } = await anonSupabase.storage.listBuckets()
    
    if (anonError) {
      console.log('❌ Anonymous access failed:', anonError.message)
    } else {
      console.log('✅ Anonymous access to buckets works')
      
      // Test listing files
      const { data: files, error: listError } = await anonSupabase.storage
        .from('uploads')
        .list('company-logos', { limit: 1 })
      
      if (listError) {
        console.log('❌ Anonymous file listing failed:', listError.message)
      } else {
        console.log('✅ Anonymous file listing works')
      }
    }
    
    console.log('\n📋 Summary & Solutions:')
    console.log('======================')
    console.log('The error you saw is because you need to be the bucket owner to create policies via SQL.')
    console.log('\n✅ Quick Solutions:')
    console.log('1. Go to Supabase Dashboard > Storage > uploads bucket')
    console.log('2. Click "Make Public" button (easiest solution)')
    console.log('3. OR create policies through the Dashboard UI (not SQL)')
    console.log('\nThe upload functionality should work even without custom policies')
    console.log('as long as the bucket exists and is accessible.')

  } catch (error) {
    console.error('❌ Error during diagnosis:', error)
  }
}

diagnosePoliciesIssue()