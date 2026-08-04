import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// R2 Client
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || ""
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || ""

const BUCKETS_TO_MIGRATE = ['product-images', 'uploads', 'delivery-handovers', 'invoices']

const TABLES_WITH_IMAGE_URL = ['products', 'product_order_items']
const TABLES_WITH_PDF_URL = ['invoices', 'quotes', 'bookings', 'package_bookings', 'direct_sales_orders']

async function uploadToR2(buffer: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })
  await s3Client.send(command)
  return `${PUBLIC_URL}/${key}`
}

async function run() {
  console.log("Starting Storage Migration to Cloudflare R2...")
  
  const migratedUrls = new Map<string, string>() // Map old URL to new URL

  for (const bucket of BUCKETS_TO_MIGRATE) {
    console.log(`\n--- Processing Bucket: ${bucket} ---`)
    
    // List all files in bucket
    const { data: files, error: listError } = await supabase.storage.from(bucket).list()
    
    if (listError) {
      console.warn(`Could not list bucket ${bucket}:`, listError.message)
      continue
    }

    if (!files || files.length === 0) {
      console.log(`Bucket ${bucket} is empty.`)
      continue
    }

    for (const file of files) {
      // Skip folders
      if (file.id === null) continue 

      const filePath = file.name
      console.log(`Migrating: ${filePath}`)

      // Download from Supabase
      const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(filePath)
      
      if (downloadError || !fileData) {
        console.error(`  -> Failed to download ${filePath}:`, downloadError?.message)
        continue
      }

      const buffer = Buffer.from(await fileData.arrayBuffer())
      const r2Key = `${bucket}/${filePath}`
      const contentType = file.metadata?.mimetype || 'application/octet-stream'

      try {
        // Upload to R2
        const newUrl = await uploadToR2(buffer, r2Key, contentType)
        
        // Get old public URL for replacement mapping
        const { data: { publicUrl: oldUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
        
        migratedUrls.set(oldUrl, newUrl)
        console.log(`  -> Success! New URL: ${newUrl}`)
      } catch (uploadErr: any) {
        console.error(`  -> Failed to upload to R2:`, uploadErr.message)
      }
    }
  }

  console.log("\n--- File Migration Complete. Updating Database Records ---")
  console.log(`Found ${migratedUrls.size} migrated URLs to replace in DB.`)

  // Helper to update columns
  async function updateTableUrls(tables: string[], columnName: string) {
    for (const table of tables) {
      console.log(`Checking table: ${table} for ${columnName}...`)
      // Fetch all rows with a url
      const { data: rows, error: fetchErr } = await supabase.from(table).select(`id, ${columnName}`).not(columnName, 'is', null)
      
      if (fetchErr) {
        console.warn(`  -> Could not fetch from ${table}`)
        continue
      }

      let updatedCount = 0
      for (const row of rows || []) {
        const currentUrl = row[columnName]
        if (!currentUrl) continue

        // Check if current URL matches any old URL we migrated
        let matchedOldUrl = null
        let newUrl = null

        for (const [oldU, newU] of migratedUrls.entries()) {
          // Sometimes URLs in DB have query params or slightly different host if using custom domain
          // So we check if the currentUrl contains the file path from the old URL
          const pathPart = new URL(oldU).pathname.split('/storage/v1/object/public/')[1]
          if (pathPart && currentUrl.includes(pathPart)) {
            matchedOldUrl = oldU
            newUrl = newU
            break
          }
        }

        if (newUrl && matchedOldUrl && currentUrl !== newUrl) {
          const { error: upErr } = await supabase.from(table).update({ [columnName]: newUrl }).eq('id', row.id)
          if (upErr) {
            console.error(`  -> Failed to update ${table} ID ${row.id}:`, upErr.message)
          } else {
            updatedCount++
          }
        }
      }
      console.log(`  -> Updated ${updatedCount} rows in ${table}.`)
    }
  }

  await updateTableUrls(TABLES_WITH_IMAGE_URL, 'image_url')
  await updateTableUrls(TABLES_WITH_PDF_URL, 'pdf_url')

  console.log("\n✅ Database Update Complete!")
  console.log("Migration finished. Please verify the images on your frontend before deleting from Supabase Storage.")
}

run().catch(console.error)
