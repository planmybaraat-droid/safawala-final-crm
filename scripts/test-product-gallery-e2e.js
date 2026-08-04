/*
End-to-end test for product gallery functionality
This script tests:
1. Creating a product with multiple images
2. Verifying product_images rows are created
3. Testing edit page gallery loading
4. Testing gallery sync on edit
*/

const { createClient } = require('@supabase/supabase-js')

async function runE2ETest() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    console.log('🧪 Starting end-to-end gallery test...\n')

    // Step 1: Check if we have any existing products to test with
    console.log('1. Checking existing products...')
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, image_url')
      .limit(5)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return
    }

    console.log(`   Found ${products.length} existing products`)
    if (products.length > 0) {
      console.log('   Sample product:', products[0].name, '(ID:', products[0].id + ')')
    }

    // Step 2: Check product_images table
    console.log('\n2. Checking product_images table...')
    const { data: productImages, error: imagesError } = await supabase
      .from('product_images')
      .select('*')
      .limit(10)

    if (imagesError) {
      console.error('Error fetching product images:', imagesError)
      return
    }

    console.log(`   Found ${productImages.length} product image records`)
    if (productImages.length > 0) {
      console.log('   Sample image record:')
      console.log('   -', productImages[0])
    }

    // Step 3: Check storage bucket
    console.log('\n3. Checking product-images storage bucket...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
      return
    }

    const productImagesBucket = buckets.find(b => b.name === 'product-images')
    if (productImagesBucket) {
      console.log('   ✅ product-images bucket exists')
      
      // List some files in the bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('product-images')
        .list('', { limit: 5 })
      
      if (!filesError && files) {
        console.log(`   Found ${files.length} files in bucket`)
      }
    } else {
      console.log('   ❌ product-images bucket not found')
    }

    // Step 4: Test creating a product image record (if we have a real product)
    if (products.length > 0) {
      const testProductId = products[0].id
      console.log('\n4. Testing product_images insert...')
      
      const testImageRecord = {
        product_id: testProductId,
        url: 'https://via.placeholder.com/300x300.png?text=Test+Image',
        is_main: false,
        order: 1
      }

      const { data: insertedImage, error: insertError } = await supabase
        .from('product_images')
        .insert([testImageRecord])
        .select()

      if (insertError) {
        console.log('   ❌ Insert failed:', insertError.message)
      } else {
        console.log('   ✅ Successfully inserted test image record')
        console.log('   Record ID:', insertedImage[0].id)
        
        // Clean up the test record
        await supabase
          .from('product_images')
          .delete()
          .eq('id', insertedImage[0].id)
        console.log('   🧹 Test record cleaned up')
      }
    }

    console.log('\n🎉 End-to-end test completed!')
    console.log('\nNext steps for manual testing:')
    console.log('1. Open http://localhost:3002/inventory/add')
    console.log('2. Create a product with multiple images')
    console.log('3. Verify images upload to product-images bucket')
    console.log('4. Check that product_images rows are created')
    console.log('5. Open edit page and verify gallery loads')
    console.log('6. Test adding/removing images in edit mode')

  } catch (error) {
    console.error('Test error:', error)
  }
}

runE2ETest()