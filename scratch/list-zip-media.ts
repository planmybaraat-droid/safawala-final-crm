import admZip from 'adm-zip';
import * as path from 'path';

const BASE_DIR = "/Applications/SAFAWALA MASTERPLAN/INVENTORY DETAILS/MALAS";
const EXCEL_PATH = path.join(BASE_DIR, "MALAS.xlsx");

function checkZip() {
  try {
    const zip = new admZip(EXCEL_PATH);
    const zipEntries = zip.getEntries();
    
    console.log("=== Zip Entries under xl/media ===");
    let count = 0;
    zipEntries.forEach((entry) => {
      if (entry.entryName.startsWith("xl/media/")) {
        console.log(`- ${entry.entryName} (${entry.header.size} bytes)`);
        count++;
      }
    });
    console.log(`Total embedded media files in Excel: ${count}`);
  } catch (err: any) {
    console.error("Error reading zip structure:", err.message);
  }
}

checkZip();
