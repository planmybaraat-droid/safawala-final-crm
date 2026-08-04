import xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const BASE_DIR = "/Applications/SAFAWALA MASTERPLAN/INVENTORY DETAILS/MALAS";
const EXCEL_PATH = path.join(BASE_DIR, "MALAS.xlsx");
const CSV_PATH = path.join(BASE_DIR, "MALAS PRICING.xlsx - Sheet1.csv");

function run() {
  // Read Excel
  const excelWorkbook = xlsx.readFile(EXCEL_PATH);
  const excelSheet = excelWorkbook.Sheets[excelWorkbook.SheetNames[0]];
  const excelRaw: any[][] = xlsx.utils.sheet_to_json(excelSheet, { header: 1 });
  const excelData = excelRaw.slice(3); // skip title, subtitle, headers

  // Read CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const csvRows = csvContent.split('\n').map(line => {
    // simple csv parsing (split by comma)
    return line.split(',').map(cell => cell.trim());
  });
  const csvData = csvRows.slice(3); // skip title, subtitle, headers

  console.log(`Excel rows: ${excelData.length}, CSV rows: ${csvData.length}`);

  const excelMap = new Map<number, any>();
  for (const row of excelData) {
    if (!row || row.length < 2) continue;
    const sno = Number(row[0]);
    if (isNaN(sno)) continue;
    excelMap.set(sno, row);
  }

  const csvMap = new Map<number, any>();
  for (const row of csvData) {
    if (!row || row.length < 1) continue;
    const sno = Number(row[0]);
    if (isNaN(sno)) continue;
    csvMap.set(sno, row);
  }

  console.log(`Unique S.No in Excel: ${excelMap.size}`);
  console.log(`Unique S.No in CSV: ${csvMap.size}`);

  // Compare some values
  console.log("\nSample comparison (S.No, Excel Name, Excel Price, CSV Price):");
  let diffCount = 0;
  for (const sno of excelMap.keys()) {
    const excelRow = excelMap.get(sno);
    const csvRow = csvMap.get(sno);
    if (!csvRow) {
      console.log(`S.No ${sno} missing in CSV!`);
      continue;
    }

    const excelPrice = Number(excelRow[4]);
    const csvPrice = Number(csvRow[4]); // Col 4 (index 4) is Sale price

    if (excelPrice !== csvPrice) {
      console.log(`Diff S.No ${sno}: Excel: ${excelPrice}, CSV: ${csvPrice}`);
      diffCount++;
    }
  }

  console.log(`Total rows with pricing differences: ${diffCount}`);
}

run();
