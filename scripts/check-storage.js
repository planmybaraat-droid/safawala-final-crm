const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xplnyaxkusvuajtmorss.supabase.co',
  ''
)

async function checkStorageBucket() {
  try {
    // Check if the uploads bucket exists
    console.log('Checking storage buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
      return
    }

    console.log('Available buckets:', buckets.map(b => b.name))
    
    // Check if uploads bucket exists
    const uploadsBucket = buckets.find(b => b.name === 'uploads')
    if (!uploadsBucket) {
      console.log('❌ The "uploads" bucket does not exist!')
      
      // Create the uploads bucket
      console.log('Creating uploads bucket...')
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('uploads', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
        fileSizeLimit: 10485760 // 10MB
      })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
      } else {
        console.log('✅ Uploads bucket created successfully!')
      }
    } else {
      console.log('✅ The "uploads" bucket exists')
      
      // Check bucket settings
      const { data: bucketDetails, error: detailsError } = await supabase.storage.getBucket('uploads')
      if (detailsError) {
        console.error('Error getting bucket details:', detailsError)
      } else {
        console.log('Bucket details:', bucketDetails)
        
        // Update bucket to be public if it's not
        if (bucketDetails.public_access !== 'full') {
          console.log('Making bucket public...')
          await supabase.storage.updateBucket('uploads', {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
            fileSizeLimit: 10485760 // 10MB
          })
          console.log('✅ Bucket updated to be public')
        }
      }
    }
    
    // Set up public policy
    console.log('Setting up storage policies...')
    const { data: policy, error: policyError } = await supabase.storage.from('uploads').getPublicUrl('test.jpg')
    
    if (policyError) {
      console.error('Error with public policy:', policyError)
    } else {
      console.log('Public URL test:', policy)
    }
    
    console.log('Storage check completed!')
  } catch (error) {
    console.error('Error checking storage:', error)
  }
}

checkStorageBucket()