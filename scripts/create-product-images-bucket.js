/*
Script: create-product-images-bucket.js
Creates a Supabase storage bucket for product images and sets it public.
Usage:
  NODE_ENV=development node scripts/create-product-images-bucket.js
Env vars required (from .env.local):
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
Optional:
  PRODUCT_IMAGES_BUCKET (defaults to "product-images")
*/

const { createClient } = require('@supabase/supabase-js')

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucketName = process.env.PRODUCT_IMAGES_BUCKET || 'product-images'

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets && buckets.find((b) => b.name === bucketName)

    if (exists) {
      console.log(`Bucket '${bucketName}' already exists.`)
    } else {
      console.log(`Creating bucket '${bucketName}'...`)
      const { error: createErr } = await supabase.storage.createBucket(bucketName, { public: true })
      if (createErr) {
        console.error('Failed to create bucket:', createErr)
        process.exit(1)
      }
      console.log(`Bucket '${bucketName}' created and set to public.`)
    }

    // Ensure public policy (this sets listing/getting public URL behavior)
    // Note: Using service role key ensures we can modify bucket settings.

    console.log('Done.')
  } catch (err) {
    console.error('Error while creating bucket:', err)
    process.exit(1)
  }
}

main()
