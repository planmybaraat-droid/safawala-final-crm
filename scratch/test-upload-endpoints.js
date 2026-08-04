const fs = require('fs');
const path = require('path');

async function testSupabaseUpload() {
  console.log('--- Testing /api/upload/product-image (Supabase) ---');
  
  // 1. Without franchiseId
  try {
    const fileData = fs.readFileSync(path.resolve(__dirname, 'test_img.jpeg'));
    const file = new File([fileData], 'test_img.jpeg', { type: 'image/jpeg' });
    const form = new FormData();
    form.append('file', file);
    
    const res = await fetch('http://localhost:3003/api/upload/product-image', {
      method: 'POST',
      body: form
    });
    console.log('Without franchiseId response:', res.status, await res.json());
  } catch (err) {
    console.error('Error without franchiseId:', err.message);
  }

  // 2. With franchiseId
  try {
    const fileData = fs.readFileSync(path.resolve(__dirname, 'test_img.jpeg'));
    const file = new File([fileData], 'test_img.jpeg', { type: 'image/jpeg' });
    const form = new FormData();
    form.append('file', file);
    form.append('franchiseId', '1a518dde-85b7-44ef-8bc4-092f53ddfd99');
    
    const res = await fetch('http://localhost:3003/api/upload/product-image', {
      method: 'POST',
      body: form
    });
    console.log('With franchiseId response:', res.status, await res.json());
  } catch (err) {
    console.error('Error with franchiseId:', err.message);
  }
}

async function testR2Upload() {
  console.log('\n--- Testing /api/upload (Cloudflare R2) ---');
  
  try {
    const fileData = fs.readFileSync(path.resolve(__dirname, 'test_img.jpeg'));
    const file = new File([fileData], 'test_img.jpeg', { type: 'image/jpeg' });
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'inventory');
    
    const res = await fetch('http://localhost:3003/api/upload', {
      method: 'POST',
      body: form
    });
    console.log('R2 Upload response:', res.status, await res.json());
  } catch (err) {
    console.error('Error with R2 upload:', err.message);
  }
}

async function run() {
  // Create a dummy test image if not exist
  const imgPath = path.resolve(__dirname, 'test_img.jpeg');
  if (!fs.existsSync(imgPath)) {
    fs.writeFileSync(imgPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9]));
  }
  
  await testSupabaseUpload();
  await testR2Upload();
}

run();
