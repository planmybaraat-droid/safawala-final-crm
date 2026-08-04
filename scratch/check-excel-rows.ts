import xlsx from 'xlsx';
import * as path from 'path';

const BASE_DIR = "/Applications/SAFAWALA MASTERPLAN/INVENTORY DETAILS/MALAS";
const EXCEL_PATH = path.join(BASE_DIR, "MALAS.xlsx");

function run() {
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  console.log("Total rows in rawData:", rawData.length);
  console.log("Row 0 (Title):", rawData[0]);
  console.log("Row 1 (Headers):", rawData[1]);
  console.log("First 3 data rows:");
  rawData.slice(2, 5).forEach((row, i) => {
    console.log(`Row ${i + 2}:`, row);
  });
}

run();
