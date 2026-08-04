import xlsx from 'xlsx';
import * as path from 'path';

const BASE_DIR = "/Applications/SAFAWALA MASTERPLAN/INVENTORY DETAILS/MALAS";
const EXCEL_PATH = path.join(BASE_DIR, "MALAS.xlsx");

function run() {
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const data = rawData.slice(3); // Skip title, register, headers
  console.log(`Analyzing ${data.length} rows of data...`);

  const nameToImages = new Map<string, Set<string>>();
  const imageToNames = new Map<string, Set<string>>();
  const rows = [];

  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];
    if (!row || row.length < 2) continue;
    const name = row[1];
    const imagePath = row[6];
    if (!name || name === "Safa Name" || name === "Name") continue;

    const img = String(imagePath || 'no_image').trim();
    
    if (!nameToImages.has(name)) nameToImages.set(name, new Set());
    nameToImages.get(name)!.add(img);

    if (!imageToNames.has(img)) imageToNames.set(img, new Set());
    imageToNames.get(img)!.add(name);

    rows.push({ line: idx + 4, name, img, details: row[2], salePrice: row[4], regPrice: row[5] });
  }

  console.log(`\nUnique Names: ${nameToImages.size}`);
  console.log(`Unique Image Paths: ${imageToNames.size}`);

  console.log("\n--- Checking for names with multiple images ---");
  let multiImgNames = 0;
  for (const [name, imgs] of nameToImages.entries()) {
    if (imgs.size > 1) {
      console.log(`Name: "${name}" has images:`, Array.from(imgs));
      multiImgNames++;
    }
  }
  if (multiImgNames === 0) console.log("None! All unique names map to exactly one image path.");

  console.log("\n--- Checking for images with multiple names ---");
  let multiNameImgs = 0;
  for (const [img, names] of imageToNames.entries()) {
    if (names.size > 1) {
      console.log(`Image: "${img}" is shared by names:`, Array.from(names));
      multiNameImgs++;
    }
  }
  if (multiNameImgs === 0) console.log("None! All image paths map to exactly one product name.");
}

run();
