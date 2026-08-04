import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

// Load .env.local explicitly
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Initialize Supabase using service role key (for RLS bypass on write)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("Supabase URL:", supabaseUrl);
console.log("Using Service Role Key:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const BASE_DIR = "/Applications/SAFAWALA MASTERPLAN/INVENTORY DETAILS/MALAS";
const EXCEL_PATH = path.join(BASE_DIR, "MALAS.xlsx");
const CSV_PATH = path.join(BASE_DIR, "MALAS PRICING.xlsx - Sheet1.csv");
const MALA_CATEGORY_ID = "c2788e4d-1195-403b-a87b-c98c8974b88c";
const DEFAULT_FRANCHISE_ID = "1a518dde-85b7-44ef-8bc4-092f53ddfd99";

function shortenColor(col: string): string {
  if (!col) return "";
  const low = col.toLowerCase().trim();
  
  const keywords = [
    { key: 'maroon', val: 'Maroon' },
    { key: 'crimson', val: 'Crimson' },
    { key: 'ruby', val: 'Ruby' },
    { key: 'red', val: 'Red' },
    { key: 'pink', val: 'Pink' },
    { key: 'blush', val: 'Pink' },
    { key: 'peach', val: 'Peach' },
    { key: 'emerald', val: 'Green' },
    { key: 'green', val: 'Green' },
    { key: 'turquoise', val: 'Turquoise' },
    { key: 'silver', val: 'Silver' },
    { key: 'gold', val: 'Gold' },
    { key: 'champagne', val: 'Gold' },
    { key: 'white', val: 'White' },
    { key: 'ivory', val: 'White' },
    { key: 'cream', val: 'White' },
    { key: 'mixed', val: 'Mixed' }
  ];

  let earliestIdx = Infinity;
  let matchedVal: string | null = null;

  for (const kw of keywords) {
    const idx = low.indexOf(kw.key);
    if (idx !== -1 && idx < earliestIdx) {
      earliestIdx = idx;
      matchedVal = kw.val;
    }
  }

  if (matchedVal) return matchedVal;

  const match = col.match(/[a-zA-Z]+/);
  if (match) {
    const word = match[0];
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return col;
}

function shortenSize(size: string): string {
  if (!size) return "Standard";
  const low = size.toLowerCase().trim();

  if (low.includes('adjustable')) return 'Adjustable';
  if (low.includes('standard')) return 'Standard';

  const match = size.match(/[a-zA-Z]+/);
  if (match) {
    const word = match[0];
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return 'Standard';
}

function getUltraShortMaterial(mat: string): string {
  if (!mat) return "Beads";
  const low = mat.toLowerCase().trim();

  const keywords = [
    { key: 'kundan', val: 'Kundan' },
    { key: 'polki', val: 'Polki' },
    { key: 'pearl', val: 'Pearls' },
    { key: 'zircon', val: 'Zircon' },
    { key: 'cz', val: 'Zircon' },
    { key: 'crystal', val: 'Crystals' },
    { key: 'stone', val: 'Beads' },
    { key: 'bead', val: 'Beads' },
    { key: 'metal', val: 'Metal' },
    { key: 'alloy', val: 'Metal' }
  ];

  let earliestIdx = Infinity;
  let matchedVal: string | null = null;

  for (const kw of keywords) {
    const idx = low.indexOf(kw.key);
    if (idx !== -1 && idx < earliestIdx) {
      earliestIdx = idx;
      matchedVal = kw.val;
    }
  }

  if (matchedVal) return matchedVal;

  const match = mat.match(/[a-zA-Z]+/);
  if (match) {
    const word = match[0];
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return "Beads";
}

// Generates a 14-digit numeric barcode (similar to the existing system)
function generateBarcode(): string {
  const timestamp = Date.now().toString().slice(-10); // Last 10 digits of timestamp
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // 4 random digits
  return timestamp + random;
}

async function run() {
  console.log("Checking file existence...");
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel file not found at ${EXCEL_PATH}`);
  }
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV pricing file not found at ${CSV_PATH}`);
  }

  // Fetch parent product IDs to clear variations
  console.log("Fetching existing mala product IDs to clear variations...");
  const { data: existingMalas } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', MALA_CATEGORY_ID)
    .eq('description', 'Mala imported from Stock Inventory Register');

  if (existingMalas && existingMalas.length > 0) {
    const malaIds = existingMalas.map(m => m.id);
    console.log(`Clearing variations for ${malaIds.length} malas...`);
    const { error: deleteVarsError } = await supabase
      .from('product_variations')
      .delete()
      .in('product_id', malaIds);

    if (deleteVarsError) {
      console.error("Warning clearing variations:", deleteVarsError.message);
    }
  }

  // Clear existing MALA products only to avoid touching other inventory items
  console.log("Clearing existing products in MALA category from products table...");
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('category_id', MALA_CATEGORY_ID)
    .eq('description', 'Mala imported from Stock Inventory Register');

  if (deleteError) {
    console.error("Warning during delete:", deleteError.message);
  } else {
    console.log("Existing malas cleared successfully from products table.");
  }

  // 1. Read Excel workbook and parse rows
  console.log("Reading metadata from Excel...");
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const excelRaw: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Skip title and subtitle; headers are at index 2, data starts from index 3
  const excelData = excelRaw.slice(3); 
  const excelRowMap = new Map<number, any[]>();
  for (const row of excelData) {
    if (!row || row.length < 2) continue;
    const sno = Number(row[0]);
    if (isNaN(sno)) continue;
    excelRowMap.set(sno, row);
  }
  console.log(`Loaded metadata for ${excelRowMap.size} unique S.No from Excel.`);

  // 2. Read and parse CSV pricing file
  console.log("Reading pricing from CSV...");
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const csvLines = csvContent.split('\n');
  const csvData = csvLines.slice(3); // skip title, register, headers
  
  const mergedData: any[][] = [];
  for (const line of csvData) {
    if (!line.trim()) continue;
    const cells = line.split(',').map(c => c.trim());
    const sno = Number(cells[0]);
    if (isNaN(sno)) continue;

    const excelRow = excelRowMap.get(sno);
    if (!excelRow) {
      console.warn(`S.No ${sno} found in CSV but missing in Excel!`);
      continue;
    }

    const mergedRow = [...excelRow];

    // Override Sale Price (column index 4) from CSV if specified and valid
    const csvSalePriceStr = cells[4];
    const csvSalePrice = csvSalePriceStr ? Number(csvSalePriceStr) : NaN;
    if (csvSalePriceStr !== '' && !isNaN(csvSalePrice)) {
      mergedRow[4] = csvSalePrice;
    }

    // Override Regular Price (column index 5) from CSV if specified and valid
    const csvRegPriceStr = cells[5];
    const csvRegPrice = csvRegPriceStr ? Number(csvRegPriceStr) : NaN;
    if (csvRegPriceStr !== '' && !isNaN(csvRegPrice)) {
      mergedRow[5] = csvRegPrice;
    }

    mergedData.push(mergedRow);
  }
  console.log(`Merged data has ${mergedData.length} rows to process.`);

  // Group by image path (Column G / index 6), fallback to name if missing
  const groups = new Map<string, any[]>();
  for (const row of mergedData) {
    if (!row || row.length < 2) continue;
    const name = row[1];
    if (!name || name === "Safa Name" || name === "Name") continue;
    
    const imagePath = row[6];
    const groupKey = imagePath ? String(imagePath).trim() : name;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(row);
  }

  let successCount = 0;
  let failCount = 0;
  const uploadedUrls = new Map<string, string>();

  async function uploadImage(photoPathRelative: string): Promise<string | null> {
    if (uploadedUrls.has(photoPathRelative)) {
      return uploadedUrls.get(photoPathRelative)!;
    }

    const fullPhotoPath = path.join(BASE_DIR, photoPathRelative);
    if (fs.existsSync(fullPhotoPath)) {
      const baseNameWithoutExt = path.basename(fullPhotoPath, path.extname(fullPhotoPath));
      const tempPngDir = path.join(process.cwd(), 'scratch', 'temp_pngs');
      if (!fs.existsSync(tempPngDir)) {
        fs.mkdirSync(tempPngDir, { recursive: true });
      }
      const tempPngPath = path.join(tempPngDir, `${Date.now()}_${baseNameWithoutExt}.png`);

      try {
        console.log(`  -> Converting local JPEG to PNG (resized to max 800px): ${path.basename(fullPhotoPath)} -> ${path.basename(tempPngPath)}`);
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

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(baseName, fileBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error(`  -> Error uploading image:`, uploadError.message);
        return null;
      } else {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(baseName);
        uploadedUrls.set(photoPathRelative, publicUrl);
        console.log(`  -> Image uploaded as PNG: ${baseName}`);
        return publicUrl;
      }
    } else {
      console.warn(`  -> Image file missing locally: ${fullPhotoPath}`);
      return null;
    }
  }

  for (const [groupKey, rows] of groups.entries()) {
    // First row is the parent
    const parentRow = rows[0];
    const parentName = parentRow[1];
    console.log(`\nProcessing product group "${parentName}" (key: ${groupKey}) with ${rows.length} rows...`);

    const details = String(parentRow[2] || "");
    const [colorStr, sizeStr, materialStr] = details.split('|').map(s => s?.trim() || "");

    const finalColor = shortenColor(colorStr) || null;
    const finalSize = shortenSize(sizeStr) || null;
    const finalMaterial = getUltraShortMaterial(materialStr) || null;

    const quantity = Number(parentRow[3]) || 0;
    const sale_price = Number(parentRow[4]) || 0;
    const regular_price = Number(parentRow[5]) || 0;
    
    const photoPathRelative = parentRow[6];
    let main_photo_url = null;
    if (photoPathRelative && typeof photoPathRelative === 'string') {
      main_photo_url = await uploadImage(photoPathRelative);
    }

    const barcode = generateBarcode();
    const productCode = `MAL-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: parentData, error: parentError } = await supabase
      .from('products')
      .insert({
        name: parentName,
        description: 'Mala imported from Stock Inventory Register',
        category_id: MALA_CATEGORY_ID,
        sku: `MALA-${barcode.slice(-6)}`,
        barcode: barcode,
        barcode_number: barcode,
        price: sale_price,
        cost_price: 0,
        rental_price: 0,
        regular_price: regular_price,
        sale_price: sale_price,
        stock_total: quantity,
        stock_available: quantity,
        stock_booked: 0,
        stock_damaged: 0,
        stock_in_laundry: 0,
        reorder_level: 5,
        franchise_id: DEFAULT_FRANCHISE_ID,
        is_active: true,
        image_url: main_photo_url,
        color: finalColor,
        size: finalSize,
        material: finalMaterial,
        product_code: productCode
      })
      .select('id, price, regular_price')
      .single();

    if (parentError || !parentData) {
      console.error(`  -> Error inserting parent product:`, parentError?.message);
      failCount++;
      continue;
    }

    console.log(`  -> Parent inserted with ID: ${parentData.id}, Barcode: ${barcode}`);
    successCount++;

    // Sub-rows are variations
    for (let i = 1; i < rows.length; i++) {
      const varRow = rows[i];
      const varName = varRow[1];
      const varDetails = String(varRow[2] || "");
      const [varColorStr, varSizeStr, varMaterialStr] = varDetails.split('|').map(s => s?.trim() || "");

      const varColor = shortenColor(varColorStr) || null;
      const varSize = shortenSize(varSizeStr) || null;
      const varMaterial = getUltraShortMaterial(varMaterialStr) || null;

      const varQty = Number(varRow[3]) || 0;
      const varSalePrice = Number(varRow[4]) || 0;
      const varRegPrice = Number(varRow[5]) || 0;

      const varPhotoPathRelative = varRow[6];
      let var_photo_url = main_photo_url;
      if (varPhotoPathRelative && typeof varPhotoPathRelative === 'string') {
        var_photo_url = await uploadImage(varPhotoPathRelative);
      }

      const varBarcode = generateBarcode();
      const priceAdjustment = varSalePrice - parentData.price;
      const regularPriceAdjustment = varRegPrice - parentData.regular_price;

      const { error: varError } = await supabase
        .from('product_variations')
        .insert({
          product_id: parentData.id,
          franchise_id: DEFAULT_FRANCHISE_ID,
          variation_name: varName,
          color: varColor,
          material: varMaterial,
          size: varSize,
          sku: `MALA-VAR-${varBarcode.slice(-6)}`,
          price_adjustment: priceAdjustment,
          regular_price_adjustment: regularPriceAdjustment,
          rental_price_adjustment: 0,
          stock_total: varQty,
          stock_available: varQty,
          stock_booked: 0,
          stock_damaged: 0,
          barcode: varBarcode,
          image_url: var_photo_url,
          is_active: true
        });

      if (varError) {
        console.error(`    -> Error inserting variation:`, varError.message);
      } else {
        console.log(`    -> Variation inserted with Barcode: ${varBarcode}`);
      }
    }
  }

  console.log("\n=================================");
  console.log(`Import Complete!`);
  console.log(`Successfully imported parent products: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log("=================================");
}

run().catch(console.error);
