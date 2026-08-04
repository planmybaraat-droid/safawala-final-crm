const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function listAllFiles(bucketId, path = "") {
  let allFiles = [];
  try {
    const { data, error } = await supabase.storage.from(bucketId).list(path, {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" }
    });

    if (error) {
      console.error(`Error listing folder "${path}" in bucket "${bucketId}":`, error.message);
      return [];
    }

    for (const item of data) {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      if (item.id === undefined) {
        // It's a folder (Supabase lists folders with id as undefined or metadata empty)
        const subFiles = await listAllFiles(bucketId, fullPath);
        allFiles = allFiles.concat(subFiles);
      } else {
        // It's a file
        allFiles.push({
          name: item.name,
          path: fullPath,
          size: item.metadata?.size || 0,
          created_at: item.created_at,
          mimeType: item.metadata?.mimetype
        });
      }
    }
  } catch (err) {
    console.error(`Exception listing files in "${bucketId}/${path}":`, err.message);
  }
  return allFiles;
}

async function main() {
  console.log("Connecting to Supabase at:", supabaseUrl);
  
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  
  if (bucketError) {
    console.error("Failed to list buckets:", bucketError.message);
    process.exit(1);
  }
  
  console.log(`Found ${buckets.length} storage buckets.`);
  
  let grandTotalSize = 0;
  
  for (const bucket of buckets) {
    console.log(`\n--- Bucket: "${bucket.name}" (Public: ${bucket.public}) ---`);
    const files = await listAllFiles(bucket.name);
    console.log(`Total files: ${files.length}`);
    
    let bucketSize = 0;
    // Sort files by size descending
    files.sort((a, b) => b.size - a.size);
    
    // Print top 15 largest files
    if (files.length > 0) {
      console.log("Top files by size:");
      files.slice(0, 15).forEach((file, idx) => {
        const mb = (file.size / (1024 * 1024)).toFixed(2);
        console.log(`  ${idx + 1}. ${file.path} (${mb} MB) - Type: ${file.mimeType || "unknown"}`);
      });
      
      files.forEach(f => { bucketSize += f.size; });
      grandTotalSize += bucketSize;
      console.log(`Bucket Total Size: ${(bucketSize / (1024 * 1024)).toFixed(2)} MB`);
    } else {
      console.log("  (No files found in bucket)");
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Grand Total Storage Size: ${(grandTotalSize / (1024 * 1024)).toFixed(2)} MB (${(grandTotalSize / (1024*1024*1024)).toFixed(3)} GB)`);
  console.log(`========================================`);
}

main();
