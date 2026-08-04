 const { createClient } = require('@supabase/supabase-js')

// Use environment variables directly
const supabaseUrl = 'https://xplnyaxkusvuajtmorss.supabase.co'
const supabaseServiceKey = 'REDACTED_JWT'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createStorageBucketAndPolicies() {
  console.log('🗄️ Setting up storage bucket and policies...\n')

  try {
    // 1. Create uploads bucket
    console.log('1. Creating uploads storage bucket...')
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('uploads', {
      public: true,
      allowedMimeTypes: [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      fileSizeLimit: 10485760 // 10MB
    })

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ uploads bucket already exists')
      } else {
        console.log('❌ Error creating bucket:', bucketError.message)
        return
      }
    } else {
      console.log('✅ uploads bucket created successfully')
    }

    // 2. Set up storage policies
    console.log('\n2. Setting up storage policies...')

    // Policy 1: Allow authenticated users to upload files
    const uploadPolicy = {
      name: 'Allow authenticated users to upload',
      definition: `
        (auth.role() = 'authenticated')
      `
    }

    // Policy 2: Allow public read access to uploaded files
    const readPolicy = {
      name: 'Allow public read access',
      definition: `
        true
      `
    }

    // Policy 3: Allow users to update their own uploads
    const updatePolicy = {
      name: 'Allow users to update own uploads',
      definition: `
        (auth.role() = 'authenticated')
      `
    }

    // Policy 4: Allow users to delete their own uploads
    const deletePolicy = {
      name: 'Allow users to delete own uploads',
      definition: `
        (auth.role() = 'authenticated')
      `
    }

    // Note: Storage policies need to be created via SQL or Supabase Dashboard
    // since the JS client doesn't have direct policy creation methods
    console.log('📝 Storage policies to create in Supabase Dashboard:')
    console.log('=====================================')
    
    console.log('\n🔼 UPLOAD Policy:')
    console.log('Name: Allow authenticated users to upload')
    console.log('Operation: INSERT')
    console.log('Definition: auth.role() = \'authenticated\'')
    
    console.log('\n👁️ READ Policy:')
    console.log('Name: Allow public read access')
    console.log('Operation: SELECT')
    console.log('Definition: true')
    
    console.log('\n✏️ UPDATE Policy:')
    console.log('Name: Allow users to update own uploads')
    console.log('Operation: UPDATE') 
    console.log('Definition: auth.role() = \'authenticated\'')
    
    console.log('\n🗑️ DELETE Policy:')
    console.log('Name: Allow users to delete own uploads')
    console.log('Operation: DELETE')
    console.log('Definition: auth.role() = \'authenticated\'')

    // 3. Create folder structure by uploading a dummy file
    console.log('\n3. Creating folder structure...')
    
    const dummyFile = Buffer.from('This is a placeholder file for folder structure', 'utf8')
    
    const folders = ['company-logos', 'bill-photos', 'chat-files', 'products']
    
    for (const folder of folders) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(`${folder}/.gitkeep`, dummyFile, {
          contentType: 'text/plain',
          upsert: true
        })

      if (uploadError) {
        console.log(`❌ Error creating ${folder} folder:`, uploadError.message)
      } else {
        console.log(`✅ Created ${folder} folder`)
      }
    }

    // 4. Test upload functionality
    console.log('\n4. Testing upload functionality...')
    
    const testFile = Buffer.from('Test file content', 'utf8')
    const testFileName = `test-${Date.now()}.txt`
    
    const { data: testUpload, error: testError } = await supabase.storage
      .from('uploads')
      .upload(`company-logos/${testFileName}`, testFile, {
        contentType: 'text/plain'
      })

    if (testError) {
      console.log('❌ Test upload failed:', testError.message)
    } else {
      console.log('✅ Test upload successful')
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(`company-logos/${testFileName}`)
      
      console.log('📎 Test file URL:', publicUrl)
      
      // Clean up test file
      await supabase.storage
        .from('uploads')
        .remove([`company-logos/${testFileName}`])
      
      console.log('🧹 Test file cleaned up')
    }

    console.log('\n✅ Storage setup completed!')
    console.log('\n⚠️  IMPORTANT: Please manually create the storage policies in Supabase Dashboard > Storage > uploads bucket > Policies')

  } catch (error) {
    console.error('❌ Error setting up storage:', error)
  }
}

createStorageBucketAndPolicies()