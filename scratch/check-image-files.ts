import xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const BASE_DIR = "/Applications/SAFAWALA MASTERPLAN/INVENTORY DETAILS/MALAS";
const EXCEL_PATH = path.join(BASE_DIR, "MALAS.xlsx");

function run() {
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const data = rawData.slice(3); // Skip title, register, headers
  console.log(`Checking ${data.length} rows for image paths...`);

  let missingPathsCount = 0;
  let missingFilesCount = 0;

  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];
    if (!row || row.length < 2) continue;
    const name = row[1];
    const imagePath = row[6];
    if (!name || name === "Safa Name" || name === "Name") continue;

    if (!imagePath) {
      console.log(`Row ${idx + 4}: Product "${name}" has NO image path in Column G.`);
      missingPathsCount++;
      continue;
    }

    const fullPath = path.join(BASE_DIR, String(imagePath));
    if (!fs.existsSync(fullPath)) {
      console.log(`Row ${idx + 4}: Product "${name}" references image "${imagePath}" which does NOT exist locally.`);
      missingFilesCount++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`- Rows with missing image path: ${missingPathsCount}`);
  console.log(`- Rows referencing missing local files: ${missingFilesCount}`);
}

run();
