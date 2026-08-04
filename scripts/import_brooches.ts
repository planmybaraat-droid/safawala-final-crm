import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

// Load .env.local explicitly
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Initialize Supabase using service role key (for RLS bypass on write)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xplnyaxkusvuajtmorss.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'REDACTED_JWT';

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const BASE_DIR = "/Applications/SAFAWALA MASTERPLAN/INVENTORY DETAILS/BROOCH/images";
const BROOCH_CATEGORY_ID = "25698521-da90-4f3e-9c5a-c7c1a99d5188";
const DEFAULT_FRANCHISE_ID = "1a518dde-85b7-44ef-8bc4-092f53ddfd99";

function parseAttributes(filename: string): { color: string | null; material: string | null; size: string } {
  const low = filename.toLowerCase().replace(/_/g, ' ');
  
  // Color detection
  let color: string | null = null;
  const colorKeywords = [
    { keys: ['maroon'], val: 'Maroon' },
    { keys: ['crimson'], val: 'Crimson' },
    { keys: ['ruby'], val: 'Ruby' },
    { keys: ['royal pink', 'pink', 'blush', 'rose quartz'], val: 'Pink' },
    { keys: ['peach'], val: 'Peach' },
    { keys: ['emerald'], val: 'Green' },
    { keys: ['turquoise'], val: 'Turquoise' },
    { keys: ['silver'], val: 'Silver' },
    { keys: ['gold', 'golden'], val: 'Gold' },
    { keys: ['white', 'ivory', 'pearlescent'], val: 'White' },
    { keys: ['royal blue', 'azure', 'peacock'], val: 'Blue' }
  ];

  for (const group of colorKeywords) {
    if (group.keys.some(k => low.includes(k))) {
      color = group.val;
      break;
    }
  }

  // Material detection
  let material: string | null = null;
  const materialKeywords = [
    { keys: ['kundan'], val: 'Kundan' },
    { keys: ['polki'], val: 'Polki' },
    { keys: ['pearl', 'pearlescent'], val: 'Pearls' },
    { keys: ['crystal'], val: 'Crystals' },
    { keys: ['feather', 'plume', 'plumed'], val: 'Feather' },
    { keys: ['stone', 'gemstone'], val: 'Stones' },
    { keys: ['filigree', 'aigrette', 'crest', 'emblem', 'sarpech', 'kalgi', 'turban', 'tassel', 'trident', 'elephant', 'garuda'], val: 'Metal' }
  ];

  for (const group of materialKeywords) {
    if (group.keys.some(k => low.includes(k))) {
      material = group.val;
      break;
    }
  }

  // Fallbacks if not detected
  if (!color) color = null;
  if (!material) material = 'Metal'; // default material for brooches is Metal

  return { color, material, size: 'Standard' };
}

let barcodeCounter = 0;
function generateBarcode(): string {
  const timestamp = Date.now().toString().slice(-8); 
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  barcodeCounter++;
  const counterStr = (barcodeCounter % 1000).toString().padStart(3, '0');
  return timestamp + random + counterStr;
}

async function run() {
  console.log("Checking folder existence...");
  if (!fs.existsSync(BASE_DIR)) {
    throw new Error(`Brooch images directory not found at ${BASE_DIR}`);
  }

  // Clear existing BROOCH products only to avoid touching other inventory items
  console.log("Clearing existing products in Brooch category from products table...");
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('category_id', BROOCH_CATEGORY_ID)
    .eq('description', 'Brooch imported from Stock Inventory Register');

  if (deleteError) {
    console.error("Warning during delete:", deleteError.message);
  } else {
    console.log("Existing brooches cleared successfully from products table.");
  }

  // Read all files from images directory
  const files = fs.readdirSync(BASE_DIR);
  
  // Filter out thumb_ files and non-image files
  const imageFiles = files.filter(file => {
    const isThumb = file.startsWith('thumb_');
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file);
    return !isThumb && isImage;
  });

  console.log(`Found ${imageFiles.length} original brooch images to import.`);

  let successCount = 0;
  let failCount = 0;
  const tempPngDir = path.join(process.cwd(), 'scratch', 'temp_pngs_brooch');

  if (!fs.existsSync(tempPngDir)) {
    fs.mkdirSync(tempPngDir, { recursive: true });
  }

  for (const filename of imageFiles) {
    console.log(`\nProcessing image: ${filename}`);

    const { color, material, size } = parseAttributes(filename);
    console.log(`  -> Attributes parsed - Color: ${color}, Material: ${material}, Size: ${size}`);

    const fullPhotoPath = path.join(BASE_DIR, filename);
    const baseNameWithoutExt = path.basename(fullPhotoPath, path.extname(fullPhotoPath));
    const tempPngPath = path.join(tempPngDir, `${Date.now()}_${baseNameWithoutExt}.png`);

    let publicUrl = null;

    try {
      console.log(`  -> Converting local JPEG to PNG (resized to max 800px)`);
      execSync(`sips --resampleHeightWidthMax 800 -s format png "${fullPhotoPath}" --out "${tempPngPath}"`, { stdio: 'ignore' });
    } catch (err: any) {
      console.error(`  -> Failed to convert image to PNG using sips:`, err.message);
    }

    const uploadPath = fs.existsSync(tempPngPath) ? tempPngPath : fullPhotoPath;
    const baseName = path.basename(uploadPath);
    const fileBuffer = fs.readFileSync(uploadPath);

    // Clean up the temp file if it was created
    if (uploadPath === tempPngPath) {
      try {
        fs.unlinkSync(tempPngPath);
      } catch (err: any) {
        console.error(`  -> Failed to delete temp file:`, err.message);
      }
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(baseName, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error(`  -> Error uploading image:`, uploadError.message);
      failCount++;
      continue;
    }

    const { data: { publicUrl: url } } = supabase.storage.from('product-images').getPublicUrl(baseName);
    publicUrl = url;
    console.log(`  -> Image uploaded as PNG: ${baseName}`);

    // Generate code and barcodes
    const barcode = generateBarcode();
    const productCode = `BRO-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: parentData, error: parentError } = await supabase
      .from('products')
      .insert({
        name: "BROOCH",
        description: 'Brooch imported from Stock Inventory Register',
        category_id: BROOCH_CATEGORY_ID,
        sku: `BROOCH-${barcode.slice(-6)}`,
        barcode: barcode,
        barcode_number: barcode,
        price: 0,
        cost_price: 0,
        rental_price: 0,
        regular_price: 0,
        sale_price: 0,
        stock_total: 1,
        stock_available: 1,
        stock_booked: 0,
        stock_damaged: 0,
        stock_in_laundry: 0,
        reorder_level: 0,
        franchise_id: DEFAULT_FRANCHISE_ID,
        is_active: true,
        image_url: publicUrl,
        color: color,
        size: size,
        material: material,
        product_code: productCode
      })
      .select('id')
      .single();

    if (parentError) {
      console.error(`  -> Error inserting product into database:`, parentError.message);
      failCount++;
    } else {
      console.log(`  -> Product registered with ID: ${parentData.id}, Barcode: ${barcode}`);
      successCount++;
    }
  }

  // Cleanup temp dir
  if (fs.existsSync(tempPngDir)) {
    try {
      fs.rmdirSync(tempPngDir);
    } catch (e) {}
  }

  console.log("\n=================================");
  console.log(`Import Complete!`);
  console.log(`Successfully imported brooch products: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log("=================================");
}

run().catch(console.error);
